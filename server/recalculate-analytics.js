const mongoose = require('mongoose');
const StudentAnalytics = require('./models/StudentAnalytics');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGO_URI);

async function recalculateAnalytics() {
  try {
    console.log('🔄 Starting analytics recalculation...');
    
    // Find all students who have results for the quiz tests from 8/28/2025
    const quizTests = await Test.find({
      testDate: {
        $gte: new Date('2025-08-28'),
        $lt: new Date('2025-08-29')
      }
    });
    
    console.log(`📝 Found ${quizTests.length} tests from 8/28/2025`);
    
    // Get all students who took these tests
    const studentIds = await TestResult.distinct('studentId', {
      testId: { $in: quizTests.map(t => t._id) }
    });
    
    console.log(`👥 Found ${studentIds.length} students to recalculate`);
    
    let recalculatedCount = 0;
    
    for (const studentId of studentIds) {
      try {
        // Find the student's analytics record
        let analytics = await StudentAnalytics.findOne({ 
          studentId: studentId,
          academicYear: '2024-2025' 
        });
        
        if (!analytics) {
          console.log(`⚠️ No analytics record found for student ${studentId}`);
          continue;
        }
        
        // Get all test results for this student
        const testResults = await TestResult.find({ 
          studentId: studentId 
        }).populate('testId', 'subject totalMarks testDate testType');
        
        if (testResults.length === 0) {
          continue;
        }
        
        // Recalculate analytics
        analytics.updateOverallAnalytics(testResults);
        analytics.updateSubjectAnalytics(testResults);
        
        await analytics.save();
        recalculatedCount++;
        
        if (recalculatedCount % 10 === 0) {
          console.log(`✅ Recalculated ${recalculatedCount} students...`);
        }
        
      } catch (error) {
        console.error(`❌ Error recalculating for student ${studentId}:`, error.message);
      }
    }
    
    console.log(`\n🎉 Successfully recalculated analytics for ${recalculatedCount} students!`);
    
  } catch (error) {
    console.error('❌ Error recalculating analytics:', error);
  } finally {
    mongoose.disconnect();
  }
}

recalculateAnalytics();
