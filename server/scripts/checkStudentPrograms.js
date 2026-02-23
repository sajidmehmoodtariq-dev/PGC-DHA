require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function checkStudentPrograms() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgc-dha');
    console.log('Connected to database');
    
    const students = await User.find({});
    console.log('\nAll users:');
    students.forEach(s => {
      console.log(`- ${s.fullName?.firstName || 'Unknown'} ${s.fullName?.lastName || 'Student'}: ${s.role} - ${s.program} (${s.gender}, ${s.admissionInfo?.grade})`);
    });
    
    console.log(`\nTotal students: ${students.length}`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkStudentPrograms();
