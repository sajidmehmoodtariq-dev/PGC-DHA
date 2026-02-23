const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function addComprehensiveTestData() {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/pgcdha';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB');

    // Date ranges for testing
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    const aug7 = new Date('2025-08-07T10:00:00.000Z');
    const aug15 = new Date('2025-08-15T14:30:00.000Z');

    console.log('\n=== ADDING COMPREHENSIVE TEST DATA ===');
    console.log('Today:', today.toISOString());
    console.log('Yesterday:', yesterday.toISOString());
    console.log('Two days ago:', twoDaysAgo.toISOString());
    console.log('One week ago:', oneWeekAgo.toISOString());
    console.log('One month ago:', oneMonthAgo.toISOString());

    // Clean up any existing test users
    const testUsernames = [
      'test_scenario_progressive',
      'test_scenario_mixed_dates',
      'test_scenario_week_old',
      'test_scenario_month_old',
      'test_scenario_same_day_multiple',
      'test_scenario_regression',
      'test_scenario_bulk_today',
      'test_scenario_bulk_yesterday',
      'test_scenario_bulk_week',
      'test_scenario_level_5_direct'
    ];

    await User.deleteMany({ userName: { $in: testUsernames } });
    console.log('✅ Cleaned up existing test data');

    const testStudents = [];

    // SCENARIO 1: Progressive level advancement over multiple days
    const progressiveStudent = new User({
      userName: 'test_scenario_progressive',
      email: 'progressive@test.com',
      password: 'test123',
      fullName: { firstName: 'Progressive', lastName: 'Student' },
      role: 'Student',
      gender: 'Male',
      program: 'ICS-PHY',
      prospectusStage: 4,
      enquiryLevel: 4,
      createdOn: oneWeekAgo,
      admissionInfo: { grade: '11th', program: 'ICS-PHY', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: oneWeekAgo, updatedByName: 'Test System' },
        { level: 2, achievedOn: new Date(oneWeekAgo.getTime() + 24 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 3, achievedOn: new Date(oneWeekAgo.getTime() + 48 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 4, achievedOn: yesterday, updatedByName: 'Test System' }
      ]
    });
    testStudents.push(progressiveStudent);

    // SCENARIO 2: Mixed dates with some levels today, some yesterday
    const mixedDatesStudent = new User({
      userName: 'test_scenario_mixed_dates',
      email: 'mixed@test.com',
      password: 'test123',
      fullName: { firstName: 'Mixed', lastName: 'Dates' },
      role: 'Student',
      gender: 'Female',
      program: 'Pre Medical',
      prospectusStage: 5,
      enquiryLevel: 5,
      createdOn: twoDaysAgo,
      admissionInfo: { grade: '12th', program: 'Pre Medical', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: twoDaysAgo, updatedByName: 'Test System' },
        { level: 2, achievedOn: twoDaysAgo, updatedByName: 'Test System' },
        { level: 3, achievedOn: yesterday, updatedByName: 'Test System' },
        { level: 4, achievedOn: today, updatedByName: 'Test System' },
        { level: 5, achievedOn: today, updatedByName: 'Test System' }
      ]
    });
    testStudents.push(mixedDatesStudent);

    // SCENARIO 3: Week-old student with no recent activity
    const weekOldStudent = new User({
      userName: 'test_scenario_week_old',
      email: 'weekold@test.com',
      password: 'test123',
      fullName: { firstName: 'Week', lastName: 'Old' },
      role: 'Student',
      gender: 'Male',
      program: 'ICOM',
      prospectusStage: 2,
      enquiryLevel: 2,
      createdOn: oneWeekAgo,
      admissionInfo: { grade: '11th', program: 'ICOM', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: oneWeekAgo, updatedByName: 'Test System' },
        { level: 2, achievedOn: new Date(oneWeekAgo.getTime() + 12 * 60 * 60 * 1000), updatedByName: 'Test System' }
      ]
    });
    testStudents.push(weekOldStudent);

    // SCENARIO 4: Month-old student
    const monthOldStudent = new User({
      userName: 'test_scenario_month_old',
      email: 'monthold@test.com',
      password: 'test123',
      fullName: { firstName: 'Month', lastName: 'Old' },
      role: 'Student',
      gender: 'Female',
      program: 'FA',
      prospectusStage: 3,
      enquiryLevel: 3,
      createdOn: oneMonthAgo,
      admissionInfo: { grade: '12th', program: 'FA', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: oneMonthAgo, updatedByName: 'Test System' },
        { level: 2, achievedOn: new Date(oneMonthAgo.getTime() + 24 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 3, achievedOn: new Date(oneMonthAgo.getTime() + 48 * 60 * 60 * 1000), updatedByName: 'Test System' }
      ]
    });
    testStudents.push(monthOldStudent);

    // SCENARIO 5: Multiple level achievements in same day (today)
    const sameDayStudent = new User({
      userName: 'test_scenario_same_day_multiple',
      email: 'sameday@test.com',
      password: 'test123',
      fullName: { firstName: 'Same', lastName: 'Day' },
      role: 'Student',
      gender: 'Male',
      program: 'Pre Engineering',
      prospectusStage: 5,
      enquiryLevel: 5,
      createdOn: today,
      admissionInfo: { grade: '11th', program: 'Pre Engineering', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: new Date(today.getTime() + 1 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 2, achievedOn: new Date(today.getTime() + 2 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 3, achievedOn: new Date(today.getTime() + 3 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 4, achievedOn: new Date(today.getTime() + 4 * 60 * 60 * 1000), updatedByName: 'Test System' },
        { level: 5, achievedOn: new Date(today.getTime() + 5 * 60 * 60 * 1000), updatedByName: 'Test System' }
      ]
    });
    testStudents.push(sameDayStudent);

    // SCENARIO 6: Level regression (decrease) test
    const regressionStudent = new User({
      userName: 'test_scenario_regression',
      email: 'regression@test.com',
      password: 'test123',
      fullName: { firstName: 'Regression', lastName: 'Test' },
      role: 'Student',
      gender: 'Female',
      program: 'ICS-STAT',
      prospectusStage: 2,
      enquiryLevel: 2,
      createdOn: yesterday,
      admissionInfo: { grade: '11th', program: 'ICS-STAT', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: yesterday, updatedByName: 'Test System' },
        { level: 2, achievedOn: yesterday, updatedByName: 'Test System' },
        { level: 3, achievedOn: yesterday, updatedByName: 'Test System' },
        { 
          level: 2, 
          achievedOn: today, 
          updatedByName: 'Test System',
          isDecrement: true,
          previousLevel: 3,
          reason: 'Documentation issues'
        }
      ]
    });
    testStudents.push(regressionStudent);

    // SCENARIO 7-9: Bulk students for today (to test volume)
    for (let i = 1; i <= 3; i++) {
      const bulkTodayStudent = new User({
        userName: `test_scenario_bulk_today_${i}`,
        email: `bulktoday${i}@test.com`,
        password: 'test123',
        fullName: { firstName: `BulkToday${i}`, lastName: 'Student' },
        role: 'Student',
        gender: i % 2 === 0 ? 'Female' : 'Male',
        program: ['ICS-PHY', 'Pre Medical', 'ICOM'][i - 1],
        prospectusStage: i + 2, // Levels 3, 4, 5
        enquiryLevel: i + 2,
        createdOn: today,
        admissionInfo: { grade: '11th', program: ['ICS-PHY', 'Pre Medical', 'ICOM'][i - 1], className: 'Test Class' },
        levelHistory: []
      });

      // Add progressive levels for each student
      for (let level = 1; level <= i + 2; level++) {
        bulkTodayStudent.levelHistory.push({
          level: level,
          achievedOn: new Date(today.getTime() + level * 30 * 60 * 1000), // 30 minutes apart
          updatedByName: 'Test System'
        });
      }
      testStudents.push(bulkTodayStudent);
    }

    // SCENARIO 10-12: Bulk students for yesterday
    for (let i = 1; i <= 3; i++) {
      const bulkYesterdayStudent = new User({
        userName: `test_scenario_bulk_yesterday_${i}`,
        email: `bulkyesterday${i}@test.com`,
        password: 'test123',
        fullName: { firstName: `BulkYesterday${i}`, lastName: 'Student' },
        role: 'Student',
        gender: i % 2 === 0 ? 'Female' : 'Male',
        program: ['FA', 'Pre Engineering', 'General Science'][i - 1],
        prospectusStage: i + 1, // Levels 2, 3, 4
        enquiryLevel: i + 1,
        createdOn: yesterday,
        admissionInfo: { grade: '12th', program: ['FA', 'Pre Engineering', 'General Science'][i - 1], className: 'Test Class' },
        levelHistory: []
      });

      // Add progressive levels for each student
      for (let level = 1; level <= i + 1; level++) {
        bulkYesterdayStudent.levelHistory.push({
          level: level,
          achievedOn: new Date(yesterday.getTime() + level * 45 * 60 * 1000), // 45 minutes apart
          updatedByName: 'Test System'
        });
      }
      testStudents.push(bulkYesterdayStudent);
    }

    // SCENARIO 13: Direct to Level 5 (skipping intermediate levels)
    const directLevel5Student = new User({
      userName: 'test_scenario_level_5_direct',
      email: 'directlevel5@test.com',
      password: 'test123',
      fullName: { firstName: 'Direct', lastName: 'Level5' },
      role: 'Student',
      gender: 'Male',
      program: 'FA IT',
      prospectusStage: 5,
      enquiryLevel: 5,
      createdOn: today,
      admissionInfo: { grade: '11th', program: 'FA IT', className: 'Test Class' },
      levelHistory: [
        { level: 1, achievedOn: today, updatedByName: 'Test System' },
        { level: 2, achievedOn: today, updatedByName: 'Test System' },
        { level: 3, achievedOn: today, updatedByName: 'Test System' },
        { level: 4, achievedOn: today, updatedByName: 'Test System' },
        { level: 5, achievedOn: today, updatedByName: 'Test System' }
      ]
    });
    testStudents.push(directLevel5Student);

    // Save all test students
    console.log('\n=== CREATING TEST STUDENTS ===');
    const savedStudents = await User.insertMany(testStudents);
    console.log(`✅ Created ${savedStudents.length} test students`);

    // Verify the data
    console.log('\n=== VERIFICATION ===');
    for (const student of savedStudents) {
      console.log(`✅ ${student.fullName.firstName} ${student.fullName.lastName}:`);
      console.log(`   - Username: ${student.userName}`);
      console.log(`   - Current Level: ${student.prospectusStage}`);
      console.log(`   - Level History: ${student.levelHistory.length} entries`);
      console.log(`   - Created: ${student.createdOn.toISOString()}`);
      console.log(`   - Latest Level Achievement: ${student.levelHistory[student.levelHistory.length - 1]?.achievedOn.toISOString()}`);
    }

    // Test aggregation on new data
    console.log('\n=== TESTING AGGREGATION ON NEW DATA ===');
    
    const pipeline = [
      {
        $match: {
          role: 'Student',
          userName: { $in: testUsernames }
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
                      { $gte: ['$levelHistory.achievedOn', today] },
                      { $lte: ['$levelHistory.achievedOn', new Date(today.getTime() + 24 * 60 * 60 * 1000)] }
                    ]
                  },
                  then: 'today'
                },
                {
                  case: { 
                    $and: [
                      { $gte: ['$levelHistory.achievedOn', yesterday] },
                      { $lt: ['$levelHistory.achievedOn', today] }
                    ]
                  },
                  then: 'yesterday'
                },
                {
                  case: { 
                    $and: [
                      { $gte: ['$levelHistory.achievedOn', oneWeekAgo] },
                      { $lt: ['$levelHistory.achievedOn', today] }
                    ]
                  },
                  then: 'week'
                }
              ],
              default: 'older'
            }
          }
        }
      },
      {
        $group: {
          _id: {
            level: '$levelHistory.level',
            timePeriod: '$timePeriod'
          },
          count: { $sum: 1 },
          students: { $push: '$fullName.firstName' }
        }
      },
      { $sort: { '_id.timePeriod': 1, '_id.level': 1 } }
    ];

    const results = await User.aggregate(pipeline);
    
    console.log('\n=== AGGREGATION RESULTS BY TIME PERIOD ===');
    const groupedResults = {};
    results.forEach(result => {
      const period = result._id.timePeriod;
      if (!groupedResults[period]) groupedResults[period] = {};
      groupedResults[period][`level${result._id.level}`] = {
        count: result.count,
        students: result.students
      };
    });

    Object.entries(groupedResults).forEach(([period, levels]) => {
      console.log(`\n${period.toUpperCase()}:`);
      Object.entries(levels).forEach(([level, data]) => {
        console.log(`  ${level}: ${data.count} students (${data.students.join(', ')})`);
      });
    });

    console.log('\n=== SUCCESS SUMMARY ===');
    console.log('✅ Added comprehensive test data covering multiple scenarios:');
    console.log('   - Progressive level advancement over time');
    console.log('   - Mixed date achievements');
    console.log('   - Week-old and month-old students');
    console.log('   - Same-day multiple level achievements');
    console.log('   - Level regression scenarios');
    console.log('   - Bulk students for volume testing');
    console.log('   - Direct level 5 achievements');
    console.log('');
    console.log('🎯 This data will help validate:');
    console.log('   - Date-based level counting accuracy');
    console.log('   - Today vs yesterday vs week statistics');
    console.log('   - Edge cases and regression scenarios');
    console.log('   - Performance with multiple students');

    await mongoose.disconnect();

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addComprehensiveTestData();