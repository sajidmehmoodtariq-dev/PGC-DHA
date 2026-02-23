const mongoose = require('mongoose');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');
const User = require('./models/User');
require('dotenv').config();

// Connect to database
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function fixQuizPercentages() {
  try {
    console.log('🔧 Starting to fix Quiz test percentages...');
    
    // Find all test results where percentage is null or undefined but obtainedMarks exists
    const problemResults = await TestResult.find({
      $and: [
        { obtainedMarks: { $exists: true, $ne: null } },
        { $or: [
          { percentage: { $exists: false } },
          { percentage: null },
          { percentage: undefined }
        ]}
      ]
    }).populate('testId', 'title subject totalMarks');
    
    console.log(`📊 Found ${problemResults.length} test results with missing percentages`);
    
    if (problemResults.length === 0) {
      console.log('✅ No issues found!');
      return;
    }
    
    let fixedCount = 0;
    
    for (const result of problemResults) {
      if (!result.testId || !result.testId.totalMarks) {
        console.log(`⚠️ Skipping result ${result._id} - missing test data`);
        continue;
      }
      
      // Calculate percentage
      const percentage = Math.round((result.obtainedMarks / result.testId.totalMarks) * 100 * 100) / 100;
      
      // Calculate grade based on percentage
      let grade;
      if (percentage >= 90) grade = 'A+';
      else if (percentage >= 85) grade = 'A';
      else if (percentage >= 80) grade = 'B+';
      else if (percentage >= 75) grade = 'B';
      else if (percentage >= 70) grade = 'C+';
      else if (percentage >= 60) grade = 'C';
      else if (percentage >= 50) grade = 'D';
      else grade = 'F';
      
      // Update the result
      await TestResult.findByIdAndUpdate(result._id, {
        percentage: percentage,
        grade: grade
      });
      
      fixedCount++;
      console.log(`✅ Fixed: ${result.testId.title} - ${result.obtainedMarks}/${result.testId.totalMarks} = ${percentage}% (${grade})`);
    }
    
    console.log(`\n🎉 Successfully fixed ${fixedCount} test results!`);
    
  } catch (error) {
    console.error('❌ Error fixing quiz percentages:', error);
  } finally {
    mongoose.disconnect();
  }
}

fixQuizPercentages();
