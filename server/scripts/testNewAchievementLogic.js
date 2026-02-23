const mongoose = require('mongoose');
require('dotenv').config();

// Test the new achievement-based logic
const testNewAchievementLogic = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🚀 Testing NEW Achievement-Based Logic');
    console.log('='.repeat(70));
    
    const User = mongoose.model('User', require('../models/User').schema);
    
    console.log('\n📋 NEW LOGIC EXPLANATION:');
    console.log('- Count users who achieved a NEW level on a specific date');
    console.log('- If someone goes from Level 1 → Level 2 on Monday, count them in Monday Level 2');
    console.log('- If someone goes from Level 2 → Level 3 on Tuesday, count them in Tuesday Level 3');
    console.log('- No duplicates: each user counted only once per level per day');
    
    // Test dates
    const testDates = {
      monday: {
        start: new Date('2025-08-04T00:00:00.000Z'),
        end: new Date('2025-08-04T23:59:59.999Z'),
        expected: [30, 28, 18, 9, 6]
      },
      tuesday: {
        start: new Date('2025-08-05T00:00:00.000Z'),
        end: new Date('2025-08-05T23:59:59.999Z'),
        expected: [27, 26, 8, 7, 4]
      }
    };
    
    for (const [dayName, dateInfo] of Object.entries(testDates)) {
      console.log(`\n🧪 Testing ${dayName.toUpperCase()} (${dateInfo.start.toDateString()})`);
      console.log('='.repeat(50));
      
      const results = [];
      
      // For each level (1-5), count users who achieved that level for the first time on this date
      for (let level = 1; level <= 5; level++) {
        console.log(`\n🔍 Analyzing Level ${level} achievements on ${dayName}...`);
        
        // Find users who have this level in their levelHistory with achievedOn in date range
        const usersWithLevelOnDate = await User.find({
          levelHistory: {
            $elemMatch: {
              level: level,
              achievedOn: { $gte: dateInfo.start, $lte: dateInfo.end }
            }
          }
        }).select('levelHistory fullName');
        
        console.log(`  📊 Users with Level ${level} achieved on ${dayName}: ${usersWithLevelOnDate.length}`);
        
        // Now eliminate duplicates - only count each user once per level
        const uniqueUsers = new Set();
        let validAchievements = 0;
        
        usersWithLevelOnDate.forEach(user => {
          // Check if this user achieved this level on this specific date
          const levelAchievements = user.levelHistory.filter(lh => 
            lh.level === level && 
            lh.achievedOn >= dateInfo.start && 
            lh.achievedOn <= dateInfo.end
          );
          
          if (levelAchievements.length > 0) {
            // Only count this user once for this level on this date
            if (!uniqueUsers.has(user._id.toString())) {
              uniqueUsers.add(user._id.toString());
              validAchievements++;
            }
          }
        });
        
        console.log(`  ✅ Unique users who achieved Level ${level} on ${dayName}: ${validAchievements}`);
        results.push(validAchievements);
        
        // Show sample users for verification
        if (validAchievements > 0 && validAchievements <= 5) {
          console.log(`  👥 Sample users:`);
          let sampleCount = 0;
          for (const user of usersWithLevelOnDate) {
            if (sampleCount >= 3) break;
            const achievements = user.levelHistory.filter(lh => 
              lh.level === level && 
              lh.achievedOn >= dateInfo.start && 
              lh.achievedOn <= dateInfo.end
            );
            if (achievements.length > 0) {
              console.log(`    - ${user.fullName?.firstName} ${user.fullName?.lastName}: ${achievements[0].achievedOn.toISOString()}`);
              sampleCount++;
            }
          }
        }
      }
      
      console.log(`\n📊 ${dayName.toUpperCase()} RESULTS WITH NEW LOGIC:`);
      console.log('Level | New Logic | Expected | Match');
      console.log('------|-----------|----------|------');
      
      let allMatch = true;
      results.forEach((actual, index) => {
        const expected = dateInfo.expected[index];
        const match = actual === expected ? '✅' : '❌';
        if (actual !== expected) allMatch = false;
        console.log(`  L${index + 1}  |    ${actual.toString().padStart(3)}    |    ${expected.toString().padStart(3)}   | ${match}`);
      });
      
      console.log('\n' + '='.repeat(50));
      if (allMatch) {
        console.log(`🎉 ${dayName.toUpperCase()} PERFECT MATCH with new achievement logic!`);
      } else {
        console.log(`❌ ${dayName.toUpperCase()} does not match with new achievement logic`);
      }
    }
    
    console.log('\n🔬 TESTING ALTERNATIVE ACHIEVEMENT LOGIC...');
    console.log('='.repeat(70));
    
    // Alternative: Count level progression events (not just exact date matches)
    for (const [dayName, dateInfo] of Object.entries(testDates)) {
      console.log(`\n🧪 Alternative Logic for ${dayName.toUpperCase()}:`);
      
      const altResults = [];
      
      for (let level = 1; level <= 5; level++) {
        // Find all users who achieved this level (regardless of date)
        const usersWithLevel = await User.find({
          levelHistory: {
            $elemMatch: { level: level }
          }
        }).select('levelHistory createdOn');
        
        // Count how many of these users were created on the target date
        let countOnDate = 0;
        usersWithLevel.forEach(user => {
          if (user.createdOn >= dateInfo.start && user.createdOn <= dateInfo.end) {
            countOnDate++;
          }
        });
        
        altResults.push(countOnDate);
      }
      
      console.log(`📊 Alternative Results: [${altResults.join(', ')}]`);
      console.log(`🎯 Expected Results:    [${dateInfo.expected.join(', ')}]`);
      
      const altMatch = JSON.stringify(altResults) === JSON.stringify(dateInfo.expected);
      console.log(`🔍 Alternative Match: ${altMatch ? '✅' : '❌'}`);
    }
    
    console.log('\n✅ Achievement logic testing complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error(error.stack);
  } finally {
    await mongoose.connection.close();
  }
};

// Run the test
testNewAchievementLogic();
