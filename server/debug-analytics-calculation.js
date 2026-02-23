require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const StudentAnalytics = require('./models/StudentAnalytics');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');

async function debugAnalyticsCalculation() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find student by roll number OZONE-16-048
    const student = await User.findOne({ 
      rollNumber: { $regex: /OZONE-16-048/i } 
    });

    if (!student) {
      console.log('❌ Student with roll number OZONE-16-048 not found');
      // Try to find any student with analytics
      const anyStudent = await User.findOne({ 
        role: 'Student',
        rollNumber: { $exists: true, $ne: null }
      });
      if (anyStudent) {
        console.log(`🔍 Found alternative student: ${anyStudent.fullName?.firstName} ${anyStudent.fullName?.lastName} (${anyStudent.rollNumber})`);
        return;
      }
      return;
    }

    console.log(`👤 Found student: ${student.fullName?.firstName} ${student.fullName?.lastName} (${student.rollNumber})`);

    // Get their test results
    const testResults = await TestResult.find({
      studentId: student._id
    }).populate('testId');

    console.log(`\n📊 Test Results (${testResults.length} total):`);
    testResults.forEach((result, index) => {
      console.log(`${index + 1}. Test: ${result.testId?.subject || 'Unknown'}`);
      console.log(`   Marks: ${result.obtainedMarks}/${result.totalMarks}`);
      console.log(`   Percentage: ${result.percentage}`);
      console.log(`   Date: ${result.testId?.testDate}`);
    });

    // Get their analytics
    const analytics = await StudentAnalytics.findOne({
      studentId: student._id
    });

    if (!analytics) {
      console.log('❌ No analytics found');
      return;
    }

    console.log(`\n📈 Subject Analytics:`);
    analytics.subjectAnalytics.forEach(subject => {
      console.log(`${subject.subjectName}:`);
      console.log(`  Current Percentage: ${subject.currentPercentage}`);
      console.log(`  Total CT Marks: ${subject.totalMarksObtained}/${subject.totalMaxMarks}`);
      console.log(`  Test Results Count: ${subject.testResults.length}`);
      
      subject.testResults.forEach((test, idx) => {
        console.log(`    Test ${idx + 1}: ${test.obtainedMarks}/${test.totalMarks} = ${test.percentage}%`);
      });
    });

    // Manual calculation check
    console.log(`\n🔍 Manual Calculation Check:`);
    
    // Group results by subject for manual calculation
    const subjectGroups = {};
    testResults.forEach(result => {
      const subject = result.testId?.subject || result.subject || 'Unknown Subject';
      if (!subjectGroups[subject]) {
        subjectGroups[subject] = [];
      }
      subjectGroups[subject].push(result);
    });

    Object.keys(subjectGroups).forEach(subjectName => {
      const results = subjectGroups[subjectName];
      console.log(`\n${subjectName}:`);
      
      const totalObtained = results.reduce((sum, result) => sum + (Number(result.obtainedMarks) || 0), 0);
      const totalMaximum = results.reduce((sum, result) => sum + (Number(result.totalMarks) || 0), 0);
      
      console.log(`  Total Obtained: ${totalObtained}`);
      console.log(`  Total Maximum: ${totalMaximum}`);
      
      let percentage = null;
      if (totalMaximum > 0) {
        percentage = (totalObtained / totalMaximum) * 100;
        percentage = Math.round(percentage * 100) / 100;
      }
      
      console.log(`  Calculated Percentage: ${percentage}`);
      console.log(`  Results: ${results.map(r => `${r.obtainedMarks}/${r.totalMarks}`).join(', ')}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugAnalyticsCalculation();
