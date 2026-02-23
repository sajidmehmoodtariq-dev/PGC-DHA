const mongoose = require('mongoose');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');
const User = require('./models/User');
const Class = require('./models/Class');

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function debugQuizData() {
  try {
    console.log('🔍 Searching for Quiz test results...');
    
    // Find all tests with "Quiz" in the title or testType
    const quizTests = await Test.find({
      $or: [
        { title: { $regex: /quiz/i } },
        { testType: { $regex: /quiz/i } }
      ]
    }).populate('classId', 'name');
    
    console.log(`\n📝 Found ${quizTests.length} Quiz tests:`);
    quizTests.forEach(test => {
      console.log(`- ${test.title} (${test.subject}) - ${test.testDate?.toLocaleDateString()} - Total: ${test.totalMarks}`);
    });
    
    if (quizTests.length > 0) {
      // Look for the specific quiz from 8/28/2025 that matches the screenshot
      const targetQuiz = quizTests.find(test => 
        test.testDate && 
        test.testDate.toISOString().includes('2025-08-28') &&
        (test.title.toLowerCase().includes('biology') || test.title.toLowerCase().includes('physics'))
      ) || quizTests[4]; // Default to biology test graphn which is index 4
      
      console.log(`\n🎯 Checking results for: ${targetQuiz.title} (${targetQuiz.subject})`);
      
      const results = await TestResult.find({ 
        testId: targetQuiz._id 
      }).populate('studentId', 'fullName rollNumber');
      
      console.log(`\n📊 Found ${results.length} student results:`);
      results.forEach(result => {
        const studentName = result.studentId ? 
          `${result.studentId.fullName?.firstName || ''} ${result.studentId.fullName?.lastName || ''}`.trim() || 'Unknown' :
          'Unknown';
        console.log(`- ${studentName}: ${result.obtainedMarks}/${targetQuiz.totalMarks} = ${result.percentage}% (Grade: ${result.grade})`);
      });
      
      // Check if any results have percentage issues
      const problemResults = results.filter(r => r.obtainedMarks > 0 && (r.percentage === null || r.percentage === undefined || r.percentage === 0));
      if (problemResults.length > 0) {
        console.log(`\n⚠️ Found ${problemResults.length} results with percentage calculation issues:`);
        problemResults.forEach(result => {
          const studentName = result.studentId ? 
            `${result.studentId.fullName?.firstName || ''} ${result.studentId.fullName?.lastName || ''}`.trim() || 'Unknown' :
            'Unknown';
          console.log(`- ${studentName}: obtainedMarks=${result.obtainedMarks}, percentage=${result.percentage}, totalMarks=${targetQuiz.totalMarks}`);
          
          // Calculate what the percentage should be
          const shouldBe = Math.round((result.obtainedMarks / targetQuiz.totalMarks) * 100 * 100) / 100;
          console.log(`  Should be: ${shouldBe}%`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error debugging quiz data:', error);
  } finally {
    mongoose.disconnect();
  }
}

debugQuizData();
