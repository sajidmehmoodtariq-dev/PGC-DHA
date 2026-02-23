require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const StudentAnalytics = require('./models/StudentAnalytics');

async function debugPerformanceMatrix() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the specific student analytics for AQSA JAMSHAID (OZONE-16-048)
    const analytics = await StudentAnalytics.findOne({
      academicYear: '2024-2025'
    }).populate({
      path: 'studentId',
      match: { rollNumber: { $regex: /OZONE-16-048/i } },
      select: 'fullName rollNumber academicRecords'
    });

    if (!analytics || !analytics.studentId) {
      console.log('❌ No analytics record found for OZONE-16-048');
      
      // Try to find all students with analytics to see what's available
      const allAnalytics = await StudentAnalytics.find({
        academicYear: '2024-2025'
      }).populate('studentId', 'fullName rollNumber')
      .limit(5);
      
      console.log('\n🔍 Available students with analytics:');
      allAnalytics.forEach((a, index) => {
        if (a.studentId) {
          console.log(`${index + 1}. ${a.studentId.fullName?.firstName} ${a.studentId.fullName?.lastName} (${a.studentId.rollNumber})`);
        }
      });
      return;
    }

    console.log(`👤 Found analytics for: ${analytics.studentId.fullName?.firstName} ${analytics.studentId.fullName?.lastName}`);
    
    // Get the performance matrix
    const matrix = await analytics.getPerformanceMatrix();
    
    console.log('\n📊 Performance Matrix:');
    console.log('Matriculation Baseline:', JSON.stringify(matrix.matriculationBaseline, null, 2));
    console.log('\nCurrent Averages:', JSON.stringify(matrix.currentAverages, null, 2));
    console.log('\nClass Test Results:', JSON.stringify(matrix.classTestResults, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

debugPerformanceMatrix();
