const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findExactDiscrepancy() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== FINDING EXACT DISCREPANCY ===\n');

    // 1. Count students as done in users.js (Enquiry Management)
    const usersApiCount = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 } 
    });
    console.log('1. Users API Count (Enquiry Management):', usersApiCount);

    // 2. Count students as done in principalEnquiries.js monthly breakdown
    // This uses the levelHistory aggregation
    const levelHistoryPipeline = [
      {
        $match: {
          role: 'Student',
          levelHistory: { $exists: true, $not: { $size: 0 } }
        }
      },
      {
        $unwind: '$levelHistory'
      },
      {
        $match: {
          'levelHistory.level': { $gte: 1, $lte: 5 },
          'levelHistory.achievedOn': {
            $gte: new Date('2024-12-31T19:00:00.000Z'), // Year start
            $lte: new Date('2025-12-31T18:59:59.999Z')  // Year end
          }
        }
      },
      {
        $group: {
          _id: '$_id' // Group by unique student ID to avoid duplicates
        }
      },
      {
        $count: 'totalStudents'
      }
    ];

    const levelHistoryResult = await User.aggregate(levelHistoryPipeline);
    const levelHistoryCount = levelHistoryResult.length > 0 ? levelHistoryResult[0].totalStudents : 0;
    console.log('2. Level History Count (Dashboard calculation):', levelHistoryCount);

    console.log('\n=== DIFFERENCE ANALYSIS ===');
    console.log('Difference:', usersApiCount - levelHistoryCount);

    // 3. Find students who are in users count but NOT in level history count
    const studentsWithoutLevelHistory = await User.find({
      role: 'Student',
      status: { $ne: 3 },
      $or: [
        { levelHistory: { $exists: false } },
        { levelHistory: { $size: 0 } },
        { 
          levelHistory: { 
            $not: { 
              $elemMatch: { 
                level: { $gte: 1, $lte: 5 },
                achievedOn: {
                  $gte: new Date('2024-12-31T19:00:00.000Z'),
                  $lte: new Date('2025-12-31T18:59:59.999Z')
                }
              } 
            } 
          } 
        }
      ]
    }).select('name email prospectusStage levelHistory createdAt');

    console.log('\n=== STUDENTS MISSING FROM LEVEL HISTORY COUNT ===');
    if (studentsWithoutLevelHistory.length === 0) {
      console.log('No students found without proper levelHistory');
    } else {
      studentsWithoutLevelHistory.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   - prospectusStage: ${student.prospectusStage}`);
        console.log(`   - levelHistory:`, student.levelHistory ? student.levelHistory.length + ' entries' : 'null/undefined');
        console.log(`   - created: ${student.createdAt}`);
        console.log('');
      });
    }

    // 4. Also check for students with prospectusStage but no levelHistory
    const studentsWithStageButNoHistory = await User.find({
      role: 'Student',
      status: { $ne: 3 },
      prospectusStage: { $exists: true, $ne: null },
      $or: [
        { levelHistory: { $exists: false } },
        { levelHistory: { $size: 0 } }
      ]
    }).select('name email prospectusStage levelHistory');

    console.log('=== STUDENTS WITH PROSPECTUS STAGE BUT NO LEVEL HISTORY ===');
    if (studentsWithStageButNoHistory.length === 0) {
      console.log('No students found with prospectusStage but no levelHistory');
    } else {
      studentsWithStageButNoHistory.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   - prospectusStage: ${student.prospectusStage}`);
        console.log(`   - levelHistory:`, student.levelHistory || 'null/undefined');
        console.log('');
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findExactDiscrepancy();
