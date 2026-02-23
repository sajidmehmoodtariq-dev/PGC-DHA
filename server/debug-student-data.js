const mongoose = require('mongoose');
const StudentAnalytics = require('./models/StudentAnalytics');
const TestResult = require('./models/TestResult');
const User = require('./models/User');
const Test = require('./models/Test');
require('dotenv').config();

mongoose.connect(process.env.MONGO_URI);

async function debugStudentData() {
  try {
    console.log('🔍 Checking student data for performance matrix...');
    
    // Find a student who took the biology quiz from 8/28/2025
    const biologyTest = await TestResult.findOne({})
      .populate({
        path: 'testId',
        match: { 
          testDate: {
            $gte: new Date('2025-08-28'),
            $lt: new Date('2025-08-29')
          },
          subject: 'Biology'
        }
      })
      .populate('studentId', 'fullName rollNumber');
      
    // Filter out results where testId is null (didn't match the criteria)
    const validBiologyResult = await TestResult.findOne({
      testId: { $in: await TestResult.distinct('testId', {}).then(async (testIds) => {
        const tests = await require('./models/Test').find({
          _id: { $in: testIds },
          testDate: {
            $gte: new Date('2025-08-28'),
            $lt: new Date('2025-08-29')
          },
          $or: [
            { subject: 'Biology' },
            { title: { $regex: /biology/i } }
          ]
        });
        return tests.map(t => t._id);
      }) }
    }).populate('testId', 'title subject testDate').populate('studentId', 'fullName rollNumber');
    
    if (!validBiologyResult) {
      console.log('❌ No biology quiz results found from 8/28/2025');
      return;
    }
    
    const studentId = validBiologyResult.studentId._id;
    const studentName = `${validBiologyResult.studentId.fullName?.firstName || ''} ${validBiologyResult.studentId.fullName?.lastName || ''}`.trim();
    
    console.log(`\n👤 Checking data for: ${studentName} (${validBiologyResult.studentId.rollNumber})`);
    console.log(`📝 Biology Test: ${validBiologyResult.testId.title} - ${validBiologyResult.obtainedMarks}/${validBiologyResult.testId.totalMarks} = ${validBiologyResult.percentage}%`);
    
    // Check student analytics
    const analytics = await StudentAnalytics.findOne({ 
      studentId: studentId,
      academicYear: '2024-2025' 
    });
    
    if (!analytics) {
      console.log('❌ No analytics found for student');
      return;
    }
    
    console.log('\n📊 Analytics Overview:');
    console.log(`- Overall Current: ${analytics.overallAnalytics?.currentOverallPercentage}%`);
    console.log(`- Matriculation: ${analytics.overallAnalytics?.matriculationPercentage}%`);
    console.log(`- Subjects: ${analytics.subjectAnalytics?.length || 0}`);
    
    // Get performance matrix
    const matrix = await analytics.getPerformanceMatrix();
    
    console.log('\n🎯 Performance Matrix:');
    console.log('Matriculation Baseline:');
    console.log(`- Overall: ${matrix.matriculationBaseline?.overall}%`);
    console.log(`- Subjects:`, Object.keys(matrix.matriculationBaseline?.subjects || {}));
    
    console.log('\nClass Test Results:');
    console.log(`- Number of tests: ${matrix.classTestResults?.length || 0}`);
    if (matrix.classTestResults && matrix.classTestResults.length > 0) {
      matrix.classTestResults.forEach((test, index) => {
        console.log(`- Test ${index + 1}: ${test.testName}`);
        console.log(`  Subjects: ${Object.keys(test.subjects)}`);
        Object.entries(test.subjects).forEach(([subject, data]) => {
          console.log(`    ${subject}: ${data.percentage}%`);
        });
      });
    }
    
    console.log('\nCurrent Averages:');
    console.log(`- Overall: ${matrix.currentAverages?.overall}%`);
    Object.entries(matrix.currentAverages?.subjects || {}).forEach(([subject, data]) => {
      console.log(`- ${subject}: ${data.percentage}%`);
    });
    
    // Check raw exam data
    const examResults = await TestResult.find({ studentId }).populate('testId', 'title subject testDate totalMarks');
    console.log(`\n📝 Raw Exam Results: ${examResults.length} tests`);
    examResults.slice(0, 3).forEach(result => {
      console.log(`- ${result.testId?.title}: ${result.obtainedMarks}/${result.testId?.totalMarks} = ${result.percentage}%`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugStudentData();
