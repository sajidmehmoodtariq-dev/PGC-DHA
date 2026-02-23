const mongoose = require('mongoose');
require('dotenv').config();

// Test the analytics system
async function testAnalyticsSystem() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Database connected');

    // Test 1: Check if models are available
    const StudentAnalytics = require('../models/StudentAnalytics');
    const ZoneStatistics = require('../models/ZoneStatistics');
    const User = require('../models/User');
    console.log('✅ Models imported successfully');

    // Test 2: Check if services are available
    const ClassAssignmentService = require('../services/classAssignmentService');
    const AnalyticsPrerequisiteChecker = require('../services/analyticsPrerequisiteChecker');
    const ZoneAnalyticsService = require('../services/zoneAnalyticsService');
    console.log('✅ Services imported successfully');

    // Test 3: Get assignment statistics
    console.log('\n📊 Testing Class Assignment Service...');
    const assignmentStats = await ClassAssignmentService.getAssignmentStatistics();
    console.log('Assignment Statistics:', assignmentStats);

    // Test 4: Get data quality report
    console.log('\n📋 Testing Data Quality Report...');
    const qualityReport = await AnalyticsPrerequisiteChecker.getDataQualityReport();
    console.log('Data Quality Report:', {
      totalStudents: qualityReport.totalStudents,
      readyForAnalytics: qualityReport.readyForAnalytics,
      dataQualityScore: qualityReport.dataQualityScore + '%'
    });

    // Test 5: Test zone calculation
    console.log('\n🎯 Testing Zone Calculation...');
    const testPercentages = [85, 73, 68, 45];
    testPercentages.forEach(percentage => {
      const zone = ZoneAnalyticsService.calculateZone(percentage);
      console.log(`${percentage}% → ${zone} zone`);
    });

    // Test 6: Count existing analytics
    console.log('\n📈 Checking existing analytics...');
    const analyticsCount = await StudentAnalytics.countDocuments();
    const statisticsCount = await ZoneStatistics.countDocuments();
    console.log(`Existing analytics records: ${analyticsCount}`);
    console.log(`Existing statistics records: ${statisticsCount}`);

    // Test 7: Get sample student for testing
    console.log('\n👨‍🎓 Finding sample student...');
    const sampleStudent = await User.findOne({ 
      role: 'Student', 
      enquiryLevel: 5 
    }).populate('classId');
    
    if (sampleStudent) {
      console.log(`Sample student found: ${sampleStudent.fullName?.firstName} ${sampleStudent.fullName?.lastName}`);
      console.log(`Class assignment: ${sampleStudent.classId ? sampleStudent.classId.name : 'Not assigned'}`);
      
      if (!sampleStudent.classId) {
        console.log('🔧 Testing class assignment for sample student...');
        const assignmentResult = await ClassAssignmentService.autoAssignClass(sampleStudent._id);
        console.log('Assignment result:', assignmentResult);
      }
    } else {
      console.log('No admitted students found');
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n🚀 Analytics system is ready for use.');
    console.log('\nNext steps:');
    console.log('1. Run: node scripts/initializeAnalytics.js init');
    console.log('2. Start the server and navigate to /analytics');
    console.log('3. Test the frontend components');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
  }
}

// Run the test if called directly
if (require.main === module) {
  testAnalyticsSystem();
}

module.exports = testAnalyticsSystem;
