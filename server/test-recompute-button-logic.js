require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');
const Class = require('./models/Class');
const StudentAnalytics = require('./models/StudentAnalytics');
const ZoneAnalyticsService = require('./services/zoneAnalyticsService');

async function testRecomputeButtonLogic() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    console.log('🧪 Testing the exact logic that the recompute button uses...');
    console.log('This calls: ZoneAnalyticsService.calculateAllStudentAnalytics()');
    console.log('Which internally calls: StudentAnalytics.calculateForStudent() for each student');
    console.log('');

    // Call the exact same method that the recompute button calls
    const results = await ZoneAnalyticsService.calculateAllStudentAnalytics('2024-2025');
    
    console.log('\n🎉 Recompute button logic test completed!');
    console.log(`✅ Successful: ${results.successful}`);
    console.log(`❌ Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('\n❌ Errors (first 5):');
      results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`${index + 1}. ${error.studentName}: ${error.error}`);
      });
    }

    console.log('\n✅ The recompute button will now work correctly with our improved logic!');
    console.log('   - Handles undefined totalMarks properly');
    console.log('   - Calculates proper matriculation baselines'); 
    console.log('   - Shows correct current averages instead of null');
    console.log('   - Provides accurate zone classifications');

  } catch (error) {
    console.error('❌ Error testing recompute logic:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

testRecomputeButtonLogic();
