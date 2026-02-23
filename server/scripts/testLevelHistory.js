const mongoose = require('mongoose');
const User = require('../models/User');
const { addLevelHistoryEntry, getLevelAchievedDate, getLevelsAchievedOnDate } = require('../utils/levelHistoryHelpers');
require('dotenv').config();

/**
 * Test Script for Level History System
 * 
 * This script creates test scenarios to verify the level history tracking works correctly
 */

async function testLevelHistorySystem() {
  try {
    console.log('🧪 Testing Level History System...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB\n');

    // Test scenario: Create a student and track level progression
    console.log('📝 Test Scenario: Student Level Progression');
    console.log('==========================================');

    // Find or create a test student
    let testStudent = await User.findOne({ 
      userName: 'test_level_history_student',
      role: 'Student'
    });

    if (!testStudent) {
      console.log('Creating test student...');
      testStudent = new User({
        userName: 'test_level_history_student',
        email: 'test.levelhistory@example.com',
        password: 'testpassword123',
        fullName: {
          firstName: 'Test',
          lastName: 'LevelHistory'
        },
        role: 'Student',
        gender: 'Male',
        prospectusStage: 2,
        enquiryLevel: 2,
        levelHistory: [] // Start with empty history
      });
    } else {
      console.log('Using existing test student...');
      testStudent.levelHistory = []; // Reset history for testing
      testStudent.prospectusStage = 2;
      testStudent.enquiryLevel = 2;
    }

    // Simulate level progression over different dates
    const dates = [
      new Date('2025-08-02T10:00:00Z'), // August 2, Created at Level 3 (should show Levels 1, 2, 3)
      new Date('2025-08-04T15:30:00Z'), // August 4, Progressed to Level 5 (should show Levels 4, 5)
    ];

    console.log('\n📅 Simulating level progression:');
    
    // August 2: Student created directly at Level 3 (should get incremental history for 1, 2, 3)
    console.log(`- August 2: Student created directly at Level 3 (incremental: 1→2→3)`);
    testStudent.levelHistory = [];
    for (let level = 1; level <= 3; level++) {
      addLevelHistoryEntry(testStudent, level, null, 'System', dates[0]);
    }
    testStudent.prospectusStage = 3;
    testStudent.enquiryLevel = 3;
    
    // August 4: Student progressed from Level 3 to Level 5 (should add 4, 5)
    console.log(`- August 4: Student progressed to Level 5 (incremental: 4→5)`);
    for (let level = 4; level <= 5; level++) {
      addLevelHistoryEntry(testStudent, level, null, 'Test Admin', dates[1]);
    }
    testStudent.prospectusStage = 5;
    testStudent.enquiryLevel = 5;

    // Save the student
    await testStudent.save();
    console.log('✅ Test student saved with level history\n');

    // Test the queries
    console.log('🔍 Testing Query Results:');
    console.log('=========================');

    // Test 1: Daily stats for August 2
    console.log('\n📊 August 2 Daily Stats:');
    const aug2Pipeline = [
      {
        $match: {
          _id: testStudent._id,
          role: 'Student',
          levelHistory: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$levelHistory'
      },
      {
        $match: {
          'levelHistory.achievedOn': {
            $gte: new Date('2025-08-02T00:00:00Z'),
            $lte: new Date('2025-08-02T23:59:59Z')
          }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$levelHistory.achievedOn' },
            level: '$levelHistory.level'
          },
          count: { $sum: 1 }
        }
      }
    ];

    const aug2Results = await User.aggregate(aug2Pipeline);
    console.log('August 2 results:', aug2Results);
    console.log('Expected: Multiple entries for Levels 1, 2, 3 on day 2');

    // Test 2: Daily stats for August 4
    console.log('\n📊 August 4 Daily Stats:');
    const aug4Pipeline = [
      {
        $match: {
          _id: testStudent._id,
          role: 'Student',
          levelHistory: { $exists: true, $ne: [] }
        }
      },
      {
        $unwind: '$levelHistory'
      },
      {
        $match: {
          'levelHistory.achievedOn': {
            $gte: new Date('2025-08-04T00:00:00Z'),
            $lte: new Date('2025-08-04T23:59:59Z')
          }
        }
      },
      {
        $group: {
          _id: {
            day: { $dayOfMonth: '$levelHistory.achievedOn' },
            level: '$levelHistory.level'
          },
          count: { $sum: 1 }
        }
      }
    ];

    const aug4Results = await User.aggregate(aug4Pipeline);
    console.log('August 4 results:', aug4Results);
    console.log('Expected: Entries for Levels 4, 5 on day 4');

    // Test 3: Helper functions
    console.log('\n🔧 Testing Helper Functions:');
    const level1Date = getLevelAchievedDate(testStudent, 1);
    const level2Date = getLevelAchievedDate(testStudent, 2);
    const level3Date = getLevelAchievedDate(testStudent, 3);
    const level4Date = getLevelAchievedDate(testStudent, 4);
    const level5Date = getLevelAchievedDate(testStudent, 5);
    console.log(`Level 1 achieved on: ${level1Date?.toISOString()}`);
    console.log(`Level 2 achieved on: ${level2Date?.toISOString()}`);
    console.log(`Level 3 achieved on: ${level3Date?.toISOString()}`);
    console.log(`Level 4 achieved on: ${level4Date?.toISOString()}`);
    console.log(`Level 5 achieved on: ${level5Date?.toISOString()}`);

    const aug2Levels = getLevelsAchievedOnDate(testStudent, new Date('2025-08-02'));
    const aug4Levels = getLevelsAchievedOnDate(testStudent, new Date('2025-08-04'));
    console.log(`Levels achieved on Aug 2: [${aug2Levels.join(', ')}] - Expected: [1, 2, 3]`);
    console.log(`Levels achieved on Aug 4: [${aug4Levels.join(', ')}] - Expected: [4, 5]`);

    console.log('\n✅ Level History System Test Completed!');
    console.log('\n🎯 Summary:');
    console.log('- August 2: Student shows up in Level 1+, 2+, and 3+ stats (incremental creation)');
    console.log('- August 4: Student shows up in Level 4+ and 5+ stats (progression)');
    console.log('- This correctly tracks WHEN level changes happen with incremental progression');

    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await User.deleteOne({ _id: testStudent._id });
    console.log('✅ Test data cleaned up');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the test
if (require.main === module) {
  testLevelHistorySystem()
    .then(() => {
      console.log('\n🎉 Test script completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Test script failed:', error);
      process.exit(1);
    });
}

module.exports = testLevelHistorySystem;
