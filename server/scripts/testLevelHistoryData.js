const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgcdha');
    console.log('✅ MongoDB Connected for Level History Analysis');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test Level History Data Analysis
const testLevelHistoryData = async () => {
  try {
    console.log('\n📊 LEVEL HISTORY DATA ANALYSIS - CORRECTED LOGIC');
    console.log('='.repeat(60));
    
    // Get User model to access levelHistory
    const User = mongoose.model('User', require('../models/User').schema);
    
    // Test for Monday (August 4, 2025)
    const mondayDate = new Date('2025-08-04');
    const mondayStart = new Date(mondayDate);
    mondayStart.setHours(0, 0, 0, 0);
    const mondayEnd = new Date(mondayDate);
    mondayEnd.setHours(23, 59, 59, 999);
    
    console.log(`\n🗓️  MONDAY (August 4, 2025) ANALYSIS:`);
    console.log(`Date range: ${mondayStart.toISOString()} to ${mondayEnd.toISOString()}`);
    
    // CORRECTED APPROACH: Use elemMatch to properly query array of objects
    console.log('\n🔧 METHOD 1: Using $elemMatch (CORRECT APPROACH)');
    for (let level = 0; level <= 4; level++) {
      const count = await User.countDocuments({
        levelHistory: {
          $elemMatch: {
            level: level,
            achievedOn: { $gte: mondayStart, $lte: mondayEnd }
          }
        }
      });
      console.log(`Level ${level}: ${count} achievements`);
      
      // Get sample timestamps
      if (count > 0) {
        const sampleUsers = await User.find({
          levelHistory: {
            $elemMatch: {
              level: level,
              achievedOn: { $gte: mondayStart, $lte: mondayEnd }
            }
          }
        }).select('levelHistory').limit(3);
        
        console.log(`  Sample timestamps:`);
        sampleUsers.forEach((user, index) => {
          const levelEntry = user.levelHistory.find(lh => lh.level === level && 
            lh.achievedOn >= mondayStart && lh.achievedOn <= mondayEnd);
          if (levelEntry) {
            console.log(`    ${index + 1}. ${levelEntry.achievedOn.toISOString()}`);
          }
        });
      }
    }
    
    // Test for Tuesday (August 5, 2025)
    const tuesdayDate = new Date('2025-08-05');
    const tuesdayStart = new Date(tuesdayDate);
    tuesdayStart.setHours(0, 0, 0, 0);
    const tuesdayEnd = new Date(tuesdayDate);
    tuesdayEnd.setHours(23, 59, 59, 999);
    
    console.log(`\n🗓️  TUESDAY (August 5, 2025) ANALYSIS:`);
    console.log(`Date range: ${tuesdayStart.toISOString()} to ${tuesdayEnd.toISOString()}`);
    
    // CORRECTED APPROACH for Tuesday
    console.log('\n🔧 METHOD 1: Using $elemMatch (CORRECT APPROACH)');
    for (let level = 0; level <= 4; level++) {
      const count = await User.countDocuments({
        levelHistory: {
          $elemMatch: {
            level: level,
            achievedOn: { $gte: tuesdayStart, $lte: tuesdayEnd }
          }
        }
      });
      console.log(`Level ${level}: ${count} achievements`);
      
      // Get sample timestamps
      if (count > 0) {
        const sampleUsers = await User.find({
          levelHistory: {
            $elemMatch: {
              level: level,
              achievedOn: { $gte: tuesdayStart, $lte: tuesdayEnd }
            }
          }
        }).select('levelHistory').limit(3);
        
        console.log(`  Sample timestamps:`);
        sampleUsers.forEach((user, index) => {
          const levelEntry = user.levelHistory.find(lh => lh.level === level && 
            lh.achievedOn >= tuesdayStart && lh.achievedOn <= tuesdayEnd);
          if (levelEntry) {
            console.log(`    ${index + 1}. ${levelEntry.achievedOn.toISOString()}`);
          }
        });
      }
    }
    
    // Expected results based on your shared data
    console.log(`\n📋 EXPECTED RESULTS (from your shared data):`);
    console.log(`Monday Expected: L0=30, L1=28, L2=18, L3=9, L4=6`);
    console.log(`Tuesday Expected: L0=27, L1=26, L2=8, L3=7, L4=4`);
    
    // METHOD 2: Advanced Aggregate Query for Both Days
    console.log(`\n� METHOD 2: Using Advanced Aggregation Pipeline`);
    
    const aggregateResults = await User.aggregate([
      {
        $unwind: "$levelHistory"
      },
      {
        $match: {
          $or: [
            {
              "levelHistory.achievedOn": { $gte: mondayStart, $lte: mondayEnd }
            },
            {
              "levelHistory.achievedOn": { $gte: tuesdayStart, $lte: tuesdayEnd }
            }
          ]
        }
      },
      {
        $project: {
          level: "$levelHistory.level",
          achievedOn: "$levelHistory.achievedOn",
          day: {
            $cond: [
              {
                $and: [
                  { $gte: ["$levelHistory.achievedOn", mondayStart] },
                  { $lte: ["$levelHistory.achievedOn", mondayEnd] }
                ]
              },
              "Monday",
              "Tuesday"
            ]
          }
        }
      },
      {
        $group: {
          _id: {
            day: "$day",
            level: "$level"
          },
          count: { $sum: 1 },
          timestamps: { $push: "$achievedOn" }
        }
      },
      {
        $sort: {
          "_id.day": 1,
          "_id.level": 1
        }
      }
    ]);
    
    console.log('\nAggregate Results:');
    let currentDay = '';
    aggregateResults.forEach(result => {
      if (result._id.day !== currentDay) {
        currentDay = result._id.day;
        console.log(`\n${currentDay}:`);
      }
      console.log(`  Level ${result._id.level}: ${result.count} achievements`);
      // Show first 3 timestamps as samples
      if (result.timestamps.length > 0) {
        console.log(`    Sample times: ${result.timestamps.slice(0, 3).map(t => new Date(t).toISOString()).join(', ')}`);
      }
    });
    
    // METHOD 3: Direct Date Filtering with Timezone Consideration
    console.log(`\n🔧 METHOD 3: Timezone-Aware Query (PKT to UTC conversion)`);
    
    // Convert PKT dates to UTC properly
    const mondayStartPKT = new Date('2025-08-04T00:00:00+05:00');
    const mondayEndPKT = new Date('2025-08-04T23:59:59+05:00');
    const tuesdayStartPKT = new Date('2025-08-05T00:00:00+05:00');
    const tuesdayEndPKT = new Date('2025-08-05T23:59:59+05:00');
    
    console.log(`Monday PKT Range: ${mondayStartPKT.toISOString()} to ${mondayEndPKT.toISOString()}`);
    console.log(`Tuesday PKT Range: ${tuesdayStartPKT.toISOString()} to ${tuesdayEndPKT.toISOString()}`);
    
    for (let level = 0; level <= 4; level++) {
      // Monday with PKT timezone
      const mondayCountPKT = await User.countDocuments({
        levelHistory: {
          $elemMatch: {
            level: level,
            achievedOn: { $gte: mondayStartPKT, $lte: mondayEndPKT }
          }
        }
      });
      
      // Tuesday with PKT timezone
      const tuesdayCountPKT = await User.countDocuments({
        levelHistory: {
          $elemMatch: {
            level: level,
            achievedOn: { $gte: tuesdayStartPKT, $lte: tuesdayEndPKT }
          }
        }
      });
      
      console.log(`Level ${level}: Monday=${mondayCountPKT}, Tuesday=${tuesdayCountPKT}`);
    }
    
    // METHOD 4: Raw Data Extraction (exactly matching your spreadsheet format)
    console.log(`\n🔧 METHOD 4: Raw Data Extraction (Spreadsheet Format)`);
    
    const rawDataMon = await User.find({
      levelHistory: {
        $elemMatch: {
          achievedOn: { $gte: mondayStartPKT, $lte: mondayEndPKT }
        }
      }
    }).select('levelHistory');
    
    const rawDataTue = await User.find({
      levelHistory: {
        $elemMatch: {
          achievedOn: { $gte: tuesdayStartPKT, $lte: tuesdayEndPKT }
        }
      }
    }).select('levelHistory');
    
    // Process Monday data
    const mondayLevelCounts = [0, 0, 0, 0, 0];
    rawDataMon.forEach(user => {
      user.levelHistory.forEach(lh => {
        if (lh.achievedOn >= mondayStartPKT && lh.achievedOn <= mondayEndPKT) {
          if (lh.level >= 0 && lh.level <= 4) {
            mondayLevelCounts[lh.level]++;
          }
        }
      });
    });
    
    // Process Tuesday data
    const tuesdayLevelCounts = [0, 0, 0, 0, 0];
    rawDataTue.forEach(user => {
      user.levelHistory.forEach(lh => {
        if (lh.achievedOn >= tuesdayStartPKT && lh.achievedOn <= tuesdayEndPKT) {
          if (lh.level >= 0 && lh.level <= 4) {
            tuesdayLevelCounts[lh.level]++;
          }
        }
      });
    });
    
    console.log('\nRaw Data Processing Results:');
    console.log(`Monday: L0=${mondayLevelCounts[0]}, L1=${mondayLevelCounts[1]}, L2=${mondayLevelCounts[2]}, L3=${mondayLevelCounts[3]}, L4=${mondayLevelCounts[4]}`);
    console.log(`Tuesday: L0=${tuesdayLevelCounts[0]}, L1=${tuesdayLevelCounts[1]}, L2=${tuesdayLevelCounts[2]}, L3=${tuesdayLevelCounts[3]}, L4=${tuesdayLevelCounts[4]}`);
    
    // FINAL COMPARISON
    console.log(`\n🎯 FINAL COMPARISON:`);
    console.log('Expected vs Actual Results:');
    console.log('Monday:');
    const mondayExpected = [30, 28, 18, 9, 6];
    const tuesdayExpected = [27, 26, 8, 7, 4];
    
    for (let i = 0; i <= 4; i++) {
      const match = mondayLevelCounts[i] === mondayExpected[i] ? '✅' : '❌';
      console.log(`  L${i}: Expected=${mondayExpected[i]}, Actual=${mondayLevelCounts[i]} ${match}`);
    }
    
    console.log('Tuesday:');
    for (let i = 0; i <= 4; i++) {
      const match = tuesdayLevelCounts[i] === tuesdayExpected[i] ? '✅' : '❌';
      console.log(`  L${i}: Expected=${tuesdayExpected[i]}, Actual=${tuesdayLevelCounts[i]} ${match}`);
    }
    
    // Check if levelHistory array structure is correct
    console.log(`\n🔍 CHECKING LEVEL HISTORY STRUCTURE:`);
    const sampleUser = await User.findOne({ 'levelHistory.0': { $exists: true } })
      .select('levelHistory');
    
    if (sampleUser) {
      console.log('Sample user levelHistory structure:');
      console.log(JSON.stringify(sampleUser.levelHistory, null, 2));
    }
    
    // Check timezone issues
    console.log(`\n🌍 TIMEZONE CHECK:`);
    console.log(`Server timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);
    console.log(`Current date: ${new Date().toISOString()}`);
    
    console.log('\n✅ Analysis complete. No data was modified.');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
  }
};

// Main execution
const runTest = async () => {
  await connectDB();
  await testLevelHistoryData();
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
