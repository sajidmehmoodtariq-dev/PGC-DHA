const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findMissingStudent() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgc_dha');
    console.log('Connected to MongoDB');

    // Count all students (like enquiry management)
    const allStudents = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 } 
    });
    console.log('Total Students (Enquiry Management count):', allStudents);

    // Count students with level 1+ (like principal dashboard)
    const level1PlusStudents = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 },
      prospectusStage: { $gte: 1 } 
    });
    console.log('Level 1+ Students (Principal Dashboard count):', level1PlusStudents);

    // Find the difference
    console.log('Difference:', allStudents - level1PlusStudents);

    // Find students with prospectusStage 0 or null
    const studentsLevel0 = await User.find({ 
      role: 'Student', 
      status: { $ne: 3 },
      $or: [
        { prospectusStage: 0 },
        { prospectusStage: null },
        { prospectusStage: { $exists: false } }
      ]
    }).select('name email prospectusStage');

    console.log('\nStudents with prospectusStage 0 or null:');
    studentsLevel0.forEach(student => {
      console.log(`- ${student.name} (${student.email}) - Level: ${student.prospectusStage}`);
    });

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findMissingStudent();
