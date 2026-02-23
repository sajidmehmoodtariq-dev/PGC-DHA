const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function comprehensiveEnquiryAnalysis() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== COMPREHENSIVE ENQUIRY DATABASE ANALYSIS ===\n');

    // 1. Basic student counts
    const totalStudents = await User.countDocuments({ role: 'Student' });
    const activeStudents = await User.countDocuments({ role: 'Student', status: { $ne: 3 } });
    const deletedStudents = await User.countDocuments({ role: 'Student', status: 3 });

    console.log('1. BASIC STUDENT COUNTS:');
    console.log(`   Total Students: ${totalStudents}`);
    console.log(`   Active Students (status ≠ 3): ${activeStudents}`);
    console.log(`   Deleted Students (status = 3): ${deletedStudents}`);

    // 2. Prospectus stage breakdown for active students
    console.log('\n2. ACTIVE STUDENTS BY PROSPECTUS STAGE:');
    for (let stage = 0; stage <= 5; stage++) {
      const count = await User.countDocuments({ 
        role: 'Student', 
        status: { $ne: 3 },
        prospectusStage: stage 
      });
      console.log(`   Stage ${stage}: ${count} students`);
    }

    const nullProspectus = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 },
      $or: [
        { prospectusStage: null },
        { prospectusStage: { $exists: false } }
      ]
    });
    console.log(`   Null/Undefined: ${nullProspectus} students`);

    // 3. Level History analysis
    console.log('\n3. LEVEL HISTORY ANALYSIS:');
    const studentsWithLevelHistory = await User.countDocuments({
      role: 'Student',
      status: { $ne: 3 },
      levelHistory: { $exists: true, $not: { $size: 0 } }
    });
    
    const studentsWithoutLevelHistory = await User.countDocuments({
      role: 'Student',
      status: { $ne: 3 },
      $or: [
        { levelHistory: { $exists: false } },
        { levelHistory: { $size: 0 } }
      ]
    });

    console.log(`   Students WITH levelHistory: ${studentsWithLevelHistory}`);
    console.log(`   Students WITHOUT levelHistory: ${studentsWithoutLevelHistory}`);

    // 4. Level distribution from levelHistory (for 2025)
    console.log('\n4. LEVEL DISTRIBUTION FROM LEVEL HISTORY (2025):');
    const levelDistribution = await User.aggregate([
      {
        $match: {
          role: 'Student',
          status: { $ne: 3 },
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
            $gte: new Date('2024-12-31T19:00:00.000Z'),
            $lte: new Date('2025-12-31T18:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: '$levelHistory.level',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    let totalLevelHistoryCount = 0;
    levelDistribution.forEach(level => {
      console.log(`   Level ${level._id}: ${level.count} achievements`);
      totalLevelHistoryCount += level.count;
    });
    console.log(`   Total level achievements in 2025: ${totalLevelHistoryCount}`);

    // 5. Unique students with level achievements in 2025
    const uniqueStudentsWithAchievements = await User.aggregate([
      {
        $match: {
          role: 'Student',
          status: { $ne: 3 },
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
            $gte: new Date('2024-12-31T19:00:00.000Z'),
            $lte: new Date('2025-12-31T18:59:59.999Z')
          }
        }
      },
      {
        $group: {
          _id: '$_id'
        }
      },
      {
        $count: 'uniqueStudents'
      }
    ]);

    const uniqueCount = uniqueStudentsWithAchievements.length > 0 ? uniqueStudentsWithAchievements[0].uniqueStudents : 0;
    console.log(`   Unique students with achievements in 2025: ${uniqueCount}`);

    // 6. Data consistency checks
    console.log('\n5. DATA CONSISTENCY CHECKS:');
    console.log(`   Users API count (active students): ${activeStudents}`);
    console.log(`   Level History count (unique students): ${uniqueCount}`);
    console.log(`   Difference: ${activeStudents - uniqueCount}`);

    if (activeStudents !== uniqueCount) {
      console.log('\n   ⚠️  INCONSISTENCY DETECTED!');
      
      // Find students causing the inconsistency
      const problematicStudents = await User.find({
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
      }).select('name email prospectusStage levelHistory createdAt').limit(5);

      console.log('\n   Problematic students (first 5):');
      problematicStudents.forEach((student, index) => {
        console.log(`   ${index + 1}. ${student.name || 'N/A'} (${student.email || 'N/A'})`);
        console.log(`      - ID: ${student._id}`);
        console.log(`      - prospectusStage: ${student.prospectusStage}`);
        console.log(`      - levelHistory: ${student.levelHistory ? student.levelHistory.length + ' entries' : 'null'}`);
        console.log(`      - created: ${student.createdAt || 'N/A'}`);
      });
    } else {
      console.log('   ✅ Data is consistent!');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

comprehensiveEnquiryAnalysis();
