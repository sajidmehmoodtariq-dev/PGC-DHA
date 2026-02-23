require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function testTodaysAPI() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    console.log('=== TESTING TODAY\'S COMPREHENSIVE API LOGIC ===');
    console.log('Today start:', todayStart.toISOString());
    console.log('Today end:', todayEnd.toISOString());
    
    // Test the EXACT same pipeline as the fixed comprehensive-data endpoint
    const pipeline = [
      {
        $match: {
          role: 'Student',
          prospectusStage: { $gte: 1, $lte: 5 },
          classId: { $exists: false },
          levelHistory: { $exists: true, $ne: [] }
        }
      },
      // Unwind levelHistory first to work with individual level achievements
      { $unwind: '$levelHistory' },
      // Add time period categorization based on LEVEL ACHIEVEMENT dates (levelHistory.achievedOn)
      {
        $addFields: {
          timePeriod: {
            $switch: {
              branches: [
                {
                  case: { 
                    $and: [
                      { $gte: ['$levelHistory.achievedOn', todayStart] },
                      { $lte: ['$levelHistory.achievedOn', todayEnd] }
                    ]
                  },
                  then: 'today'
                }
              ],
              default: 'other'
            }
          }
        }
      },
      // Filter to only today's achievements
      { $match: { timePeriod: 'today' } },
      // Group by user, time period, and level to get unique user-level combinations for each time period
      {
        $group: {
          _id: {
            studentId: '$_id',
            timePeriod: '$timePeriod',
            level: '$levelHistory.level'
          },
          gender: { $first: '$gender' },
          program: { $first: '$program' },
          achievedOn: { $first: '$levelHistory.achievedOn' }
        }
      },
      // Group by level to count students who achieved each level today
      {
        $group: {
          _id: '$_id.level',
          count: { $sum: 1 },
          students: {
            $push: {
              gender: '$gender',
              program: '$program'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const results = await User.aggregate(pipeline);
    
    console.log('=== PIPELINE RESULTS ===');
    const todayData = {};
    let totalToday = 0;
    
    for (let level = 1; level <= 5; level++) {
      const levelResult = results.find(r => r._id === level);
      const count = levelResult ? levelResult.count : 0;
      todayData[level] = {
        total: count,
        boys: 0,
        girls: 0,
        programs: { boys: {}, girls: {} }
      };
      
      if (levelResult) {
        levelResult.students.forEach(student => {
          if (student.gender === 'Male' || student.gender === 'male' || student.gender === 'M') {
            todayData[level].boys++;
          } else if (student.gender === 'Female' || student.gender === 'female' || student.gender === 'F') {
            todayData[level].girls++;
          }
        });
      }
      
      totalToday += count;
      console.log(`Level ${level}: ${count} achievements`);
    }
    
    console.log('');
    console.log('🎯 EXPECTED FRONTEND DATA STRUCTURE:');
    console.log('dateRanges.today.levelData:', JSON.stringify(todayData, null, 2));
    console.log('');
    console.log('📱 WHAT TODAYS STATS COMPONENT SHOULD RECEIVE:');
    for (let level = 1; level <= 5; level++) {
      console.log(`level${level}: ${todayData[level].total}`);
    }
    console.log(`Total: ${totalToday}`);
    
    await mongoose.disconnect();
    console.log('Test complete!');
  } catch (error) {
    console.error('Test error:', error);
    process.exit(1);
  }
}

testTodaysAPI();
