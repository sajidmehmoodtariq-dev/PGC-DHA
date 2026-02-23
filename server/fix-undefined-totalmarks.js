require('dotenv').config();
const mongoose = require('mongoose');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');

async function fixUndefinedTotalMarks() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find all TestResult records with undefined or null totalMarks
    const problemResults = await TestResult.find({
      $or: [
        { totalMarks: { $exists: false } },
        { totalMarks: null },
        { totalMarks: undefined }
      ]
    }).populate('testId');

    console.log(`📝 Found ${problemResults.length} TestResult records with undefined totalMarks`);

    let fixed = 0;
    let errors = 0;

    for (const result of problemResults) {
      try {
        let totalMarks = null;
        
        // Try to get totalMarks from the populated testId
        if (result.testId && result.testId.totalMarks) {
          totalMarks = result.testId.totalMarks;
        } else if (result.testId) {
          // If testId exists but doesn't have totalMarks, try to find it separately
          const test = await Test.findById(result.testId._id || result.testId);
          if (test && test.totalMarks) {
            totalMarks = test.totalMarks;
          }
        }
        
        // If we found a valid totalMarks, update the record
        if (totalMarks && totalMarks > 0) {
          await TestResult.findByIdAndUpdate(result._id, {
            totalMarks: totalMarks
          });
          console.log(`✅ Fixed TestResult ${result._id}: set totalMarks to ${totalMarks}`);
          fixed++;
        } else {
          // Calculate from percentage if available
          if (result.percentage && result.obtainedMarks) {
            const calculatedTotal = Math.round(result.obtainedMarks / (result.percentage / 100));
            if (calculatedTotal > 0) {
              await TestResult.findByIdAndUpdate(result._id, {
                totalMarks: calculatedTotal
              });
              console.log(`🔧 Calculated totalMarks for ${result._id}: ${calculatedTotal} (from ${result.obtainedMarks}/${result.percentage}%)`);
              fixed++;
            } else {
              console.log(`❌ Could not fix TestResult ${result._id}: no valid totalMarks found`);
              errors++;
            }
          } else {
            console.log(`❌ Could not fix TestResult ${result._id}: no totalMarks, percentage, or obtainedMarks data`);
            errors++;
          }
        }
      } catch (error) {
        console.error(`❌ Error fixing TestResult ${result._id}:`, error.message);
        errors++;
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`✅ Fixed: ${fixed} records`);
    console.log(`❌ Errors: ${errors} records`);
    console.log(`🎉 Total processed: ${problemResults.length} records`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

fixUndefinedTotalMarks();
