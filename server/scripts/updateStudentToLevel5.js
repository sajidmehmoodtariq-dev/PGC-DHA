const mongoose = require('mongoose');
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

updateStudentToLevel5();