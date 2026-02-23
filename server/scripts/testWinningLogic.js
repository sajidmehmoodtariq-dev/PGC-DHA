const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgcdha');
    console.log('🚀 Testing Winning Logic from Ultimate Analysis');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test the winning logic
const testWinningLogic = async () => {
  try {
    console.log('\n🎯 TESTING WINNING LOGIC');
    console.log('='.repeat(60));
    
    const User = mongoose.model('User', require('../models/User').schema);
    
    // Expected results from your spreadsheet
    const expected = {
      monday: [30, 28, 18, 9, 6],
      tuesday: [27, 26, 8, 7, 4]
    };
    
    // Date ranges for testing
    const dateRanges = {
      monday: {
        start: new Date('2025-08-04T00:00:00.000Z'),
        end: new Date('2025-08-04T23:59:59.999Z')
      },
      tuesday: {
        start: new Date('2025-08-05T00:00:00.000Z'),
        end: new Date('2025-08-05T23:59:59.999Z')
      }
    };
    
    // Test both days
    for (const [day, range] of Object.entries(dateRanges)) {
      console.log(`\n📅 Testing ${day.toUpperCase()} (${range.start.toISOString().split('T')[0]})`);
      console.log('-'.repeat(50));
      
      // Get users created in date range
      const usersInRange = await User.find({
        createdOn: { $gte: range.start, $lte: range.end }
      }).select('levelHistory createdOn');
      
      console.log(`👥 Total users created on ${day}: ${usersInRange.length}`);
      
      // Count users by level progression (winning logic)
      const results = [];
      const levels = [1, 2, 3, 4, 5];
      
      for (const level of levels) {
        let count = 0;
        usersInRange.forEach(user => {
          if (user.levelHistory && user.levelHistory.length > 0) {
            // Check if user has achieved this level
            const hasLevel = user.levelHistory.some(lh => lh.level === level);
            if (hasLevel) count++;
          }
        });
        results.push(count);
        console.log(`📊 Level ${level}: ${count} users`);
      }
      
      // Compare with expected results
      const expectedResults = expected[day];
      console.log(`\n🎯 COMPARISON FOR ${day.toUpperCase()}:`);
      console.log('Level | Result | Expected | Match');
      console.log('------|--------|----------|------');
      
      let allMatch = true;
      for (let i = 0; i < levels.length; i++) {
        const match = results[i] === expectedResults[i] ? '✅' : '❌';
        if (results[i] !== expectedResults[i]) allMatch = false;
        console.log(`  L${levels[i]}  |   ${results[i].toString().padStart(2)}   |    ${expectedResults[i].toString().padStart(2)}    | ${match}`);
      }
      
      console.log(`\n📈 ${day.toUpperCase()} SUMMARY:`);
      console.log(`Results:  [${results.join(', ')}]`);
      console.log(`Expected: [${expectedResults.join(', ')}]`);
      console.log(`Status: ${allMatch ? '✅ PERFECT MATCH' : '❌ MISMATCH'}`);
      
      if (!allMatch) {
        // Calculate differences
        console.log('\n🔍 DIFFERENCES:');
        for (let i = 0; i < levels.length; i++) {
          const diff = results[i] - expectedResults[i];
          if (diff !== 0) {
            console.log(`   Level ${levels[i]}: ${diff > 0 ? '+' : ''}${diff}`);
          }
        }
      }
    }
    
    console.log('\n✅ Winning logic test complete!');
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error(error.stack);
  }
};

// Main execution
const runTest = async () => {
  await connectDB();
  await testWinningLogic();
  await mongoose.connection.close();
  console.log('\n💾 Database connection closed.');
  process.exit(0);
};

// Handle uncaught exceptions
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Run the test
runTest();
