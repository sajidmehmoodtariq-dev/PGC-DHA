const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function analyzeStudentCounts() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get comprehensive statistics
    console.log('=== STUDENT COUNT ANALYSIS ===\n');

    // 1. Total students (like enquiry management)
    const totalStudents = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 } 
    });
    console.log('1. Total Students (Enquiry Management logic):', totalStudents);

    // 2. Students with level 1+ (like principal dashboard)
    const level1PlusStudents = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 },
      prospectusStage: { $gte: 1 } 
    });
    console.log('2. Level 1+ Students (Principal Dashboard logic):', level1PlusStudents);

    // 3. Breakdown by prospectusStage
    console.log('\n=== BREAKDOWN BY PROSPECTUS STAGE ===');
    
    for (let level = 0; level <= 5; level++) {
      const count = await User.countDocuments({ 
        role: 'Student', 
        status: { $ne: 3 },
        prospectusStage: level 
      });
      console.log(`Level ${level}: ${count} students`);
    }

    // 4. Students with null/undefined prospectusStage
    const nullProspectusCount = await User.countDocuments({ 
      role: 'Student', 
      status: { $ne: 3 },
      $or: [
        { prospectusStage: null },
        { prospectusStage: { $exists: false } }
      ]
    });
    console.log(`Null/Undefined prospectusStage: ${nullProspectusCount} students`);

    // 5. Summary
    console.log('\n=== SUMMARY ===');
    console.log(`Total Students: ${totalStudents}`);
    console.log(`Level 1+ Students: ${level1PlusStudents}`);
    console.log(`Difference: ${totalStudents - level1PlusStudents}`);

    // 6. Find specific students with level 0 or null
    const problematicStudents = await User.find({ 
      role: 'Student', 
      status: { $ne: 3 },
      $or: [
        { prospectusStage: 0 },
        { prospectusStage: null },
        { prospectusStage: { $exists: false } }
      ]
    }).select('name email prospectusStage status createdAt').limit(10);

    if (problematicStudents.length > 0) {
      console.log('\n=== STUDENTS NOT IN LEVEL 1+ COUNT ===');
      problematicStudents.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   - prospectusStage: ${student.prospectusStage}`);
        console.log(`   - status: ${student.status}`);
        console.log(`   - created: ${student.createdAt}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeStudentCounts();
