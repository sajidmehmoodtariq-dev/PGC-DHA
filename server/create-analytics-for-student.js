require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');
const Class = require('./models/Class');
const StudentAnalytics = require('./models/StudentAnalytics');

async function createAnalyticsForStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find the student AQSA JAMSHAID
    const student = await User.findOne({ 
      rollNumber: { $regex: /OZONE-16-048/i } 
    });

    if (!student) {
      console.log('❌ Student OZONE-16-048 not found');
      return;
    }

    console.log(`👤 Found student: ${student.fullName?.firstName} ${student.fullName?.lastName} (${student.rollNumber})`);
    
    // Use the StudentAnalytics.calculateForStudent method (the same one the recompute button uses)
    console.log('\n🔄 Calculating analytics for student...');
    const analytics = await StudentAnalytics.calculateForStudent(student._id, '2024-2025');
    
    console.log('✅ Analytics calculation completed!');
    
    // Now get the performance matrix
    const matrix = await analytics.getPerformanceMatrix();
    
    console.log('\n📊 Performance Matrix Results:');
    console.log('Matriculation Baseline:', JSON.stringify(matrix.matriculationBaseline, null, 2));
    console.log('\nCurrent Averages:', JSON.stringify(matrix.currentAverages, null, 2));
    
    if (matrix.classTestResults.length > 0) {
      console.log('\nClass Test Results:', JSON.stringify(matrix.classTestResults[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

createAnalyticsForStudent();
