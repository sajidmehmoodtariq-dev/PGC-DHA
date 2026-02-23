const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function addTestEnquiryData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Create test enquiry data for August 7, 2025
    const testDate = new Date('2025-08-07T10:00:00.000Z'); // August 7, 2025 at 10:00 AM
    
    console.log('Creating test enquiry with Level 3 achievement on August 7, 2025...');
    
    // Create a test student with level progression up to Level 3
    const testStudent = new User({
      userName: `test_enquiry_${Date.now()}`,
      email: `test.enquiry.${Date.now()}@example.com`,
      password: 'hashedPassword123', // This will be hashed by the pre-save hook
      fullName: {
        firstName: 'Test',
        lastName: 'Enquiry Student'
      },
      role: 'Student',
      phoneNumber: '+92-300-1234567',
      gender: 'Male',
      program: 'ICS-PHY',
      prospectusStage: 3, // Current level is 3
      enquiryLevel: 3,
      createdOn: testDate,
      updatedOn: testDate,
      isActive: true,
      isApproved: false,
      campus: 'Boys'
    });

    // Manually set the levelHistory to simulate progression on August 7, 2025
    // This student achieved levels 1, 2, and 3 all on August 7, 2025
    testStudent.levelHistory = [
      {
        level: 1,
        achievedOn: testDate,
        updatedByName: 'System Test',
        isDecrement: false
      },
      {
        level: 2,
        achievedOn: testDate,
        updatedByName: 'System Test',
        isDecrement: false
      },
      {
        level: 3,
        achievedOn: testDate,
        updatedByName: 'System Test',
        isDecrement: false
      }
    ];

    // Save the student (this will not trigger the pre-save levelHistory logic since we're setting it manually)
    await testStudent.save();
    
    console.log('✅ Test enquiry data created successfully!');
    console.log('Student details:');
    console.log(`- ID: ${testStudent._id}`);
    console.log(`- Name: ${testStudent.fullName.firstName} ${testStudent.fullName.lastName}`);
    console.log(`- Email: ${testStudent.email}`);
    console.log(`- Current Level: ${testStudent.prospectusStage}`);
    console.log(`- Created On: ${testStudent.createdOn}`);
    console.log(`- Level History:`);
    testStudent.levelHistory.forEach((entry, index) => {
      console.log(`  ${index + 1}. Level ${entry.level} achieved on ${entry.achievedOn.toISOString()}`);
    });

    // Let's also create a test case for the scenario you described
    console.log('\n=== Creating test case for your scenario ===');
    
    // Scenario: Student takes prospectus today (Level 1), submits fees tomorrow (jumps to Level 5)
    const todayDate = new Date(); // Today (August 20, 2025)
    const tomorrowDate = new Date();
    tomorrowDate.setDate(tomorrowDate.getDate() + 1); // Tomorrow (August 21, 2025)
    
    // Create student who achieves Level 1 today
    const scenarioStudent = new User({
      userName: `scenario_test_${Date.now()}`,
      email: `scenario.test.${Date.now()}@example.com`,
      password: 'hashedPassword123',
      fullName: {
        firstName: 'Scenario',
        lastName: 'Test Student'
      },
      role: 'Student',
      phoneNumber: '+92-300-9876543',
      gender: 'Female',
      program: 'Pre Medical',
      prospectusStage: 1, // Currently at Level 1
      enquiryLevel: 1,
      createdOn: todayDate,
      updatedOn: todayDate,
      isActive: true,
      isApproved: false,
      campus: 'Girls'
    });

    // Set levelHistory - student achieved Level 1 today
    scenarioStudent.levelHistory = [
      {
        level: 1,
        achievedOn: todayDate,
        updatedByName: 'System Test',
        isDecrement: false
      }
    ];

    await scenarioStudent.save();
    
    console.log('✅ Scenario test student created (Level 1 today):');
    console.log(`- ID: ${scenarioStudent._id}`);
    console.log(`- Name: ${scenarioStudent.fullName.firstName} ${scenarioStudent.fullName.lastName}`);
    console.log(`- Level 1 achieved on: ${todayDate.toISOString()}`);
    console.log('- Next step: Update this student to Level 5 tomorrow to test the scenario');

    // Provide instructions for tomorrow's test
    console.log('\n=== Instructions for tomorrow\'s test ===');
    console.log('Run this command tomorrow to complete the scenario test:');
    console.log(`node scripts/updateStudentToLevel5.js ${scenarioStudent._id}`);

    // Create the update script for tomorrow
    const updateScript = `const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function updateStudentToLevel5() {
  try {
    const studentId = process.argv[2];
    if (!studentId) {
      console.log('Please provide student ID as argument');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const student = await User.findById(studentId);
    if (!student) {
      console.log('Student not found');
      process.exit(1);
    }

    console.log('Updating student to Level 5...');
    const tomorrowDate = new Date();
    
    // Add Level 2, 3, 4, 5 entries for tomorrow
    student.levelHistory.push(
      {
        level: 2,
        achievedOn: tomorrowDate,
        updatedByName: 'System Test - Tomorrow',
        isDecrement: false
      },
      {
        level: 3,
        achievedOn: tomorrowDate,
        updatedByName: 'System Test - Tomorrow',
        isDecrement: false
      },
      {
        level: 4,
        achievedOn: tomorrowDate,
        updatedByName: 'System Test - Tomorrow',
        isDecrement: false
      },
      {
        level: 5,
        achievedOn: tomorrowDate,
        updatedByName: 'System Test - Tomorrow',
        isDecrement: false
      }
    );

    student.prospectusStage = 5;
    student.enquiryLevel = 5;
    student.updatedOn = tomorrowDate;

    await student.save();

    console.log('✅ Student updated to Level 5!');
    console.log('Now check today vs tomorrow stats:');
    console.log('- Today should show: Level 1 = 1 student');
    console.log('- Tomorrow should show: Level 2,3,4,5 = 1 student each, Level 1 = 0');
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updateStudentToLevel5();`;

    // Save the update script
    const fs = require('fs');
    fs.writeFileSync('./scripts/updateStudentToLevel5.js', updateScript);
    console.log('✅ Update script created: scripts/updateStudentToLevel5.js');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');

  } catch (error) {
    console.error('Error adding test enquiry data:', error);
    process.exit(1);
  }
}

addTestEnquiryData();