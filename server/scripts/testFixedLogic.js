const mongoose = require('mongoose');
require('dotenv').config();

// Test the fixed endpoints
const testFixedEndpoints = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🚀 Testing Fixed Application Logic');
    
    const User = mongoose.model('User', require('../models/User').schema);
    
    console.log('\n🧪 Testing Monday (Aug 4, 2025) with FIXED logic:');
    console.log('='.repeat(60));
    
    // Test the exact logic that should now be in the application
    const mondayStart = new Date('2025-08-04T00:00:00.000Z');
    const mondayEnd = new Date('2025-08-04T23:59:59.999Z');
    
    console.log(`📅 Date Range: ${mondayStart.toISOString()} to ${mondayEnd.toISOString()}`);
    
    // Get users created on Monday who have achieved specific levels (1-5)
    const usersCreatedMonday = await User.find({
      createdOn: { $gte: mondayStart, $lte: mondayEnd }
    }).select('levelHistory createdOn');
    
    console.log(`\n👥 Users created on Monday: ${usersCreatedMonday.length}`);
    
    // Count by level achievement (the WINNING formula from ultimate analysis)
    const levelCounts = [0, 0, 0, 0, 0]; // For levels 1-5
    
    usersCreatedMonday.forEach(user => {
      if (user.levelHistory && user.levelHistory.length > 0) {
        // Count each level the user has achieved
        [1, 2, 3, 4, 5].forEach((level, index) => {
          if (user.levelHistory.some(lh => lh.level === level)) {
            levelCounts[index]++;
          }
        });
      }
    });
    
    console.log('\n📊 Fixed Application Results:');
    levelCounts.forEach((count, index) => {
      console.log(`  Level ${index + 1}: ${count} users`);
    });
    
    console.log('\n🎯 Expected Results (from spreadsheet):');
    const expected = [30, 28, 18, 9, 6];
    expected.forEach((count, index) => {
      console.log(`  Level ${index + 1}: ${count} users`);
    });
    
    console.log('\n🔍 Comparison:');
    let allMatch = true;
    levelCounts.forEach((actual, index) => {
      const exp = expected[index];
      const match = actual === exp ? '✅' : '❌';
      if (actual !== exp) allMatch = false;
      console.log(`  Level ${index + 1}: Expected=${exp}, Actual=${actual} ${match}`);
    });
    
    if (allMatch) {
      console.log('\n🎉 SUCCESS! All levels match exactly!');
      console.log('🚀 Your application should now show the correct data!');
    } else {
      console.log('\n⚠️  Some levels still don\'t match. Further investigation needed.');
    }
    
    // Also test Tuesday
    console.log('\n🧪 Testing Tuesday (Aug 5, 2025) with FIXED logic:');
    console.log('='.repeat(60));
    
    const tuesdayStart = new Date('2025-08-05T00:00:00.000Z');
    const tuesdayEnd = new Date('2025-08-05T23:59:59.999Z');
    
    const usersCreatedTuesday = await User.find({
      createdOn: { $gte: tuesdayStart, $lte: tuesdayEnd }
    }).select('levelHistory createdOn');
    
    const tuesdayLevelCounts = [0, 0, 0, 0, 0];
    
    usersCreatedTuesday.forEach(user => {
      if (user.levelHistory && user.levelHistory.length > 0) {
        [1, 2, 3, 4, 5].forEach((level, index) => {
          if (user.levelHistory.some(lh => lh.level === level)) {
            tuesdayLevelCounts[index]++;
          }
        });
      }
    });
    
    console.log('\n📊 Tuesday Fixed Results:');
    const tuesdayExpected = [27, 26, 8, 7, 4];
    let tuesdayAllMatch = true;
    tuesdayLevelCounts.forEach((actual, index) => {
      const exp = tuesdayExpected[index];
      const match = actual === exp ? '✅' : '❌';
      if (actual !== exp) tuesdayAllMatch = false;
      console.log(`  Level ${index + 1}: Expected=${exp}, Actual=${actual} ${match}`);
    });
    
    if (tuesdayAllMatch) {
      console.log('\n🎉 Tuesday also matches perfectly!');
    }
    
    console.log('\n✅ Test complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the test
testFixedEndpoints();
