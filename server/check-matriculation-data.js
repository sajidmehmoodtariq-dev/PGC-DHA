require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const StudentAnalytics = require('./models/StudentAnalytics');

async function checkMatriculationData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the student
    const student = await User.findOne({ 
      rollNumber: { $regex: /OZONE-16-048/i } 
    });

    if (!student) {
      console.log('❌ Student not found');
      return;
    }

    console.log(`👤 Found student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);
    
    console.log('\n📊 Matriculation Data Check:');
    console.log('matricMarks:', student.matricMarks);
    console.log('matricTotal:', student.matricTotal);
    console.log('academicRecords:', JSON.stringify(student.academicRecords, null, 2));
    
    // Check their analytics record
    const analytics = await StudentAnalytics.findOne({ studentId: student._id });
    if (analytics) {
      console.log('\n📈 Analytics Record:');
      console.log('Matriculation Percentage:', analytics.overallAnalytics?.matriculationPercentage);
      console.log('Current Overall Percentage:', analytics.overallAnalytics?.currentOverallPercentage);
    } else {
      console.log('\n❌ No analytics record found');
    }

    // Let's also check a few other students to see the pattern
    console.log('\n🔍 Checking other students for matriculation data pattern:');
    const otherStudents = await User.find({ 
      role: 'Student', 
      rollNumber: { $exists: true, $ne: null }
    }).limit(3);

    otherStudents.forEach((s, index) => {
      console.log(`\nStudent ${index + 1}: ${s.fullName?.firstName} ${s.fullName?.lastName} (${s.rollNumber})`);
      console.log('  matricMarks:', s.matricMarks);
      console.log('  matricTotal:', s.matricTotal);
      console.log('  academicRecords.matriculation:', s.academicRecords?.matriculation?.percentage);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkMatriculationData();
