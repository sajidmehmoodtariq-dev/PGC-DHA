const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Class = require('../models/Class');

async function assignFAITStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    // Find the student with FA IT program
    const student = await User.findOne({ program: 'FA IT' });
    if (!student) {
      console.log('No student with FA IT program found');
      return;
    }
    
    console.log(`Found student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);
    console.log(`Gender: ${student.gender}, Grade: ${student.admissionInfo?.grade}`);
    
    // Find the FA Boys class
    const faClass = await Class.findOne({ 
      program: 'FA', 
      campus: 'Boys',
      grade: '11th'
    });
    
    if (!faClass) {
      console.log('No FA Boys class found');
      return;
    }
    
    console.log(`Found class: ${faClass.name}`);
    
    // Assign the student to the class
    student.classId = faClass._id;
    await student.save();
    
    console.log(`✅ Assigned ${student.fullName?.firstName} to ${faClass.name}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

assignFAITStudent();
