require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function analyzeDatabase() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    
    console.log('=== DATABASE ANALYSIS FOR TODAY\'S STATS ===');
    console.log('Current time:', now.toISOString());
    console.log('Today start:', todayStart.toISOString());
    console.log('Today end:', todayEnd.toISOString());
    console.log('');
    
    // Check total students with levelHistory
    const totalStudents = await User.countDocuments({
      role: 'Student',
      prospectusStage: { $gte: 1, $lte: 5 },
      classId: { $exists: false },
      levelHistory: { $exists: true, $ne: [] }
    });
    console.log('Total students with levelHistory:', totalStudents);
    
    // Check students with level achievements TODAY (achievedOn date)
    const todayAchievements = await User.aggregate([
      {
        $match: {
          role: 'Student',
          prospectusStage: { $gte: 1, $lte: 5 },
          classId: { $exists: false },
          levelHistory: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$levelHistory' },
      {
        $match: {
          $and: [
            { 'levelHistory.achievedOn': { $gte: todayStart } },
            { 'levelHistory.achievedOn': { $lte: todayEnd } }
          ]
        }
      },
      {
        $group: {
          _id: '$levelHistory.level',
          count: { $sum: 1 },
          students: {
            $push: {
              name: { $concat: ['$fullName.firstName', ' ', '$fullName.lastName'] },
              achievedOn: '$levelHistory.achievedOn'
            }
          }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    console.log('=== LEVEL ACHIEVEMENTS TODAY (NEW LOGIC) ===');
    if (todayAchievements.length === 0) {
      console.log('❌ No level achievements recorded for today');
      console.log('This means no students progressed to new levels today');
      console.log('Expected Today\'s Stats: All zeros (0, 0, 0, 0, 0)');
    } else {
      console.log('✅ Found level achievements for today:');
      const expectedStats = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
      
      todayAchievements.forEach(achievement => {
        expectedStats[`level${achievement._id}`] = achievement.count;
        console.log(`Level ${achievement._id}: ${achievement.count} achievements`);
        achievement.students.forEach(student => {
          console.log(`  - ${student.name} at ${student.achievedOn.toISOString()}`);
        });
      });
      
      console.log('');
      console.log('🎯 EXPECTED TODAY\'S STATS:');
      console.log(`Level 1: ${expectedStats.level1}`);
      console.log(`Level 2: ${expectedStats.level2}`);
      console.log(`Level 3: ${expectedStats.level3}`);
      console.log(`Level 4: ${expectedStats.level4}`);
      console.log(`Level 5: ${expectedStats.level5}`);
      console.log(`Total: ${Object.values(expectedStats).reduce((a, b) => a + b, 0)}`);
    }
    
    console.log('');
    
    // Show some sample students with their levelHistory
    const sampleStudents = await User.find({
      role: 'Student',
      prospectusStage: { $gte: 1, $lte: 5 },
      classId: { $exists: false },
      levelHistory: { $exists: true, $ne: [] }
    }).select('fullName levelHistory createdOn prospectusStage').limit(5);
    
    console.log('=== SAMPLE STUDENTS WITH LEVEL HISTORY ===');
    sampleStudents.forEach(student => {
      const name = `${student.fullName?.firstName || 'Unknown'} ${student.fullName?.lastName || ''}`.trim();
      console.log(`${name} (Current Stage: ${student.prospectusStage}, Created: ${student.createdOn?.toISOString()})`);
      console.log('  Level History:');
      student.levelHistory.forEach(lh => {
        const isToday = lh.achievedOn >= todayStart && lh.achievedOn <= todayEnd;
        console.log(`    Level ${lh.level} achieved on ${lh.achievedOn.toISOString()} ${isToday ? '🟢 TODAY' : ''}`);
      });
      console.log('');
    });
    
    // Check students created today (OLD LOGIC for comparison)
    const studentsCreatedToday = await User.countDocuments({
      role: 'Student',
      prospectusStage: { $gte: 1, $lte: 5 },
      classId: { $exists: false },
      createdOn: { $gte: todayStart, $lte: todayEnd }
    });
    
    console.log('=== COMPARISON WITH OLD LOGIC ===');
    console.log(`Students created today (old logic): ${studentsCreatedToday}`);
    console.log(`Level achievements today (new logic): ${todayAchievements.reduce((sum, a) => sum + a.count, 0)}`);
    
    // Check if we need to create test data
    if (todayAchievements.length === 0 && studentsCreatedToday === 0) {
      console.log('');
      console.log('💡 SUGGESTION: No activity today. To test the new logic:');
      console.log('1. Create a new student (will get levels 1-N in levelHistory with today\'s date)');
      console.log('2. Or update an existing student\'s level (will add new level achievement for today)');
      console.log('3. Or manually update levelHistory.achievedOn dates in database for testing');
    }
    
    await mongoose.disconnect();
    console.log('Analysis complete!');
  } catch (error) {
    console.error('Database analysis error:', error);
    process.exit(1);
  }
}

analyzeDatabase();
