const mongoose = require('mongoose');
require('dotenv').config();

const testAchievementLogic = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🚀 Testing Achievement-Based Logic');
    
    const User = mongoose.model('User', require('../models/User').schema);
    
    // Test Monday Aug 4, 2025
    const mondayStart = new Date('2025-08-04T00:00:00.000Z');
    const mondayEnd = new Date('2025-08-04T23:59:59.999Z');
    const expectedMonday = [30, 28, 18, 9, 6];
    
    console.log('\n📅 Testing Monday Aug 4, 2025');
    console.log('Expected:', expectedMonday);
    
    const mondayResults = [];
    
    // Test each level
    for (let level = 1; level <= 5; level++) {
      // Find users who achieved this level on Monday
      const count = await User.countDocuments({
        levelHistory: {
          $elemMatch: {
            level: level,
            achievedOn: { $gte: mondayStart, $lte: mondayEnd }
          }
        }
      });
      
      mondayResults.push(count);
      console.log(`Level ${level}: ${count} achievements`);
    }
    
    console.log('\nResults:', mondayResults);
    console.log('Expected:', expectedMonday);
    
    const mondayMatch = JSON.stringify(mondayResults) === JSON.stringify(expectedMonday);
    console.log('Match:', mondayMatch ? '✅' : '❌');
    
    // Test Tuesday
    const tuesdayStart = new Date('2025-08-05T00:00:00.000Z');
    const tuesdayEnd = new Date('2025-08-05T23:59:59.999Z');
    const expectedTuesday = [27, 26, 8, 7, 4];
    
    console.log('\n📅 Testing Tuesday Aug 5, 2025');
    
    const tuesdayResults = [];
    for (let level = 1; level <= 5; level++) {
      const count = await User.countDocuments({
        levelHistory: {
          $elemMatch: {
            level: level,
            achievedOn: { $gte: tuesdayStart, $lte: tuesdayEnd }
          }
        }
      });
      
      tuesdayResults.push(count);
      console.log(`Level ${level}: ${count} achievements`);
    }
    
    console.log('\nResults:', tuesdayResults);
    console.log('Expected:', expectedTuesday);
    
    const tuesdayMatch = JSON.stringify(tuesdayResults) === JSON.stringify(expectedTuesday);
    console.log('Match:', tuesdayMatch ? '✅' : '❌');
    
    if (mondayMatch && tuesdayMatch) {
      console.log('\n🎉 PERFECT! Achievement-based logic works!');
    } else {
      console.log('\n❌ Achievement-based logic does not match expected results');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
  }
};

testAchievementLogic();
