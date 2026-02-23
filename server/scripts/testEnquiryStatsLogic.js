const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function testEnquiryStatsLogic() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pgcdha';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayEnd = new Date(todayEnd.getTime() - 24 * 60 * 60 * 1000);

    console.log('\n=== TESTING ENQUIRY STATS LOGIC ===');
    console.log('Today:', todayStart.toISOString(), 'to', todayEnd.toISOString());
    console.log('Yesterday:', yesterdayStart.toISOString(), 'to', yesterdayEnd.toISOString());

    // Create test scenario as described by user
    console.log('\n=== CREATING TEST SCENARIO ===');
    
    // Clean up any existing test users first
    await User.deleteMany({ 
      userName: { $in: ['test_student_scenario1', 'test_student_scenario2'] }
    });

    // SCENARIO 1: Student takes prospectus today AND submits fees today
    // Should show in all levels 1-5 in today's stats
    const scenario1Student = new User({
      userName: 'test_student_scenario1',
      email: 'scenario1@test.com',
      password: 'test123',
      fullName: { firstName: 'Scenario', lastName: 'One' },
      role: 'Student',
      gender: 'Male',
      program: 'ICS-PHY',
      prospectusStage: 5,
      enquiryLevel: 5,
      createdOn: todayStart,
      updatedOn: new Date(),
      admissionInfo: {
        grade: '11th',
        program: 'ICS-PHY',
        className: 'Test Class'
      }
    });

    // Manually create level history for scenario 1 - all levels achieved today
    scenario1Student.levelHistory = [
      { level: 1, achievedOn: todayStart, updatedByName: 'Test System' },
      { level: 2, achievedOn: todayStart, updatedByName: 'Test System' },
      { level: 3, achievedOn: todayStart, updatedByName: 'Test System' },
      { level: 4, achievedOn: todayStart, updatedByName: 'Test System' },
      { level: 5, achievedOn: todayStart, updatedByName: 'Test System' }
    ];

    await scenario1Student.save();
    console.log('✅ Created Scenario 1: Student progresses from Level 1 to 5 TODAY');

    // SCENARIO 2: Student took prospectus yesterday, submits fees today
    // Should show ONLY in levels achieved today (not in yesterday's levels)
    const scenario2Student = new User({
      userName: 'test_student_scenario2',
      email: 'scenario2@test.com',
      password: 'test123',
      fullName: { firstName: 'Scenario', lastName: 'Two' },
      role: 'Student',
      gender: 'Female',
      program: 'Pre Medical',
      prospectusStage: 5,
      enquiryLevel: 5,
      createdOn: yesterdayStart,
      updatedOn: new Date(),
      admissionInfo: {
        grade: '12th',
        program: 'Pre Medical',
        className: 'Test Class'
      }
    });

    // Manually create level history for scenario 2
    // Levels 1-2 achieved yesterday, levels 3-5 achieved today
    scenario2Student.levelHistory = [
      { level: 1, achievedOn: yesterdayStart, updatedByName: 'Test System' },
      { level: 2, achievedOn: yesterdayStart, updatedByName: 'Test System' },
      { level: 3, achievedOn: todayStart, updatedByName: 'Test System' },
      { level: 4, achievedOn: todayStart, updatedByName: 'Test System' },
      { level: 5, achievedOn: todayStart, updatedByName: 'Test System' }
    ];

    await scenario2Student.save();
    console.log('✅ Created Scenario 2: Student at Level 1-2 YESTERDAY, progresses to 3-5 TODAY');

    // Test the current comprehensive-data aggregation logic
    console.log('\n=== TESTING COMPREHENSIVE-DATA AGGREGATION ===');
    
    const pipeline = [
      {
        $match: {
          role: 'Student',
          prospectusStage: { $gte: 1, $lte: 5 },
          classId: { $exists: false },
          levelHistory: { $exists: true, $ne: [] },
          userName: { $in: ['test_student_scenario1', 'test_student_scenario2'] } // Only test users
        }
      },
      { $unwind: '$levelHistory' },
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
                },
                {
                  case: { 
                    $and: [
                      { $gte: ['$levelHistory.achievedOn', yesterdayStart] },
                      { $lte: ['$levelHistory.achievedOn', yesterdayEnd] }
                    ]
                  },
                  then: 'yesterday'
                }
              ],
              default: 'other'
            }
          }
        }
      },
      {
        $match: {
          timePeriod: { $in: ['today', 'yesterday'] }
        }
      },
      {
        $group: {
          _id: {
            studentId: '$_id',
            studentName: { $concat: ['$fullName.firstName', ' ', '$fullName.lastName'] },
            timePeriod: '$timePeriod',
            level: '$levelHistory.level'
          },
          achievedOn: { $first: '$levelHistory.achievedOn' }
        }
      },
      {
        $group: {
          _id: {
            level: '$_id.level',
            timePeriod: '$_id.timePeriod'
          },
          count: { $sum: 1 },
          students: {
            $push: {
              name: '$_id.studentName',
              achievedOn: '$achievedOn'
            }
          }
        }
      },
      { $sort: { '_id.timePeriod': 1, '_id.level': 1 } }
    ];

    const results = await User.aggregate(pipeline);
    
    console.log('\n=== AGGREGATION RESULTS ===');
    results.forEach(result => {
      console.log(`${result._id.timePeriod.toUpperCase()} - Level ${result._id.level}: ${result.count} students`);
      result.students.forEach(student => {
        console.log(`  - ${student.name} (${student.achievedOn.toISOString()})`);
      });
    });

    // Expected results:
    console.log('\n=== EXPECTED RESULTS ===');
    console.log('TODAY - Level 1: 1 student (Scenario One)');
    console.log('TODAY - Level 2: 1 student (Scenario One)');
    console.log('TODAY - Level 3: 2 students (Scenario One + Scenario Two)');
    console.log('TODAY - Level 4: 2 students (Scenario One + Scenario Two)');
    console.log('TODAY - Level 5: 2 students (Scenario One + Scenario Two)');
    console.log('YESTERDAY - Level 1: 1 student (Scenario Two)');
    console.log('YESTERDAY - Level 2: 1 student (Scenario Two)');

    // Check what user wants:
    console.log('\n=== USER REQUIREMENT CHECK ===');
    console.log('✅ Case 1: Student takes prospectus + submits fees TODAY');
    console.log('   Should appear in TODAY stats for ALL levels (1,2,3,4,5) ✅');
    console.log('');
    console.log('✅ Case 2: Student takes prospectus YESTERDAY, submits fees TODAY');
    console.log('   TODAY stats should show ONLY levels achieved TODAY (3,4,5)');
    console.log('   Should NOT show in Level 1,2 for TODAY stats');
    console.log('   YESTERDAY stats should show Level 1,2');

    // Verify this is working
    const todayResults = results.filter(r => r._id.timePeriod === 'today');
    const yesterdayResults = results.filter(r => r._id.timePeriod === 'yesterday');

    console.log('\n=== VERIFICATION ===');
    
    // Today's stats should show:
    // Level 1: 1 (only scenario 1)
    // Level 2: 1 (only scenario 1)  
    // Level 3: 2 (scenario 1 + scenario 2)
    // Level 4: 2 (scenario 1 + scenario 2)
    // Level 5: 2 (scenario 1 + scenario 2)
    
    const todayLevel1 = todayResults.find(r => r._id.level === 1)?.count || 0;
    const todayLevel2 = todayResults.find(r => r._id.level === 2)?.count || 0;
    const todayLevel3 = todayResults.find(r => r._id.level === 3)?.count || 0;
    const todayLevel4 = todayResults.find(r => r._id.level === 4)?.count || 0;
    const todayLevel5 = todayResults.find(r => r._id.level === 5)?.count || 0;

    console.log(`Today Level 1: ${todayLevel1} (expected: 1) ${todayLevel1 === 1 ? '✅' : '❌'}`);
    console.log(`Today Level 2: ${todayLevel2} (expected: 1) ${todayLevel2 === 1 ? '✅' : '❌'}`);
    console.log(`Today Level 3: ${todayLevel3} (expected: 2) ${todayLevel3 === 2 ? '✅' : '❌'}`);
    console.log(`Today Level 4: ${todayLevel4} (expected: 2) ${todayLevel4 === 2 ? '✅' : '❌'}`);
    console.log(`Today Level 5: ${todayLevel5} (expected: 2) ${todayLevel5 === 2 ? '✅' : '❌'}`);

    // Clean up test data
    console.log('\n=== CLEANUP ===');
    await User.deleteMany({ 
      userName: { $in: ['test_student_scenario1', 'test_student_scenario2'] }
    });
    console.log('✅ Cleaned up test data');

    // Summary
    const allPassed = todayLevel1 === 1 && todayLevel2 === 1 && todayLevel3 === 2 && todayLevel4 === 2 && todayLevel5 === 2;
    console.log('\n=== SUMMARY ===');
    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - The logic is working correctly!');
      console.log('✅ Students only appear in levels they achieved on specific dates');
      console.log('✅ Case 2 scenario: Student does NOT appear in Level 1,2 for today');
    } else {
      console.log('❌ TESTS FAILED - The logic needs to be fixed');
      console.log('❌ Issue: Students are still appearing in previous levels for new dates');
    }

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testEnquiryStatsLogic();