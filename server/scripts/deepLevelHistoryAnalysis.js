const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgcdha');
    console.log('✅ MongoDB Connected for Deep Level History Analysis');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Deep Analysis - Testing Every Possible Scenario
const deepLevelHistoryAnalysis = async () => {
  try {
    console.log('\n🔬 DEEP LEVEL HISTORY ANALYSIS - TESTING ALL POSSIBILITIES');
    console.log('='.repeat(80));
    
    const User = mongoose.model('User', require('../models/User').schema);
    
    // Define all possible date ranges and approaches
    const dates = {
      monday: {
        utc: {
          start: new Date('2025-08-04T00:00:00.000Z'),
          end: new Date('2025-08-04T23:59:59.999Z')
        },
        pkt: {
          start: new Date('2025-08-04T00:00:00+05:00'),
          end: new Date('2025-08-04T23:59:59+05:00')
        },
        local: {
          start: new Date('2025-08-04'),
          end: (() => { const d = new Date('2025-08-04'); d.setHours(23,59,59,999); return d; })()
        }
      },
      tuesday: {
        utc: {
          start: new Date('2025-08-05T00:00:00.000Z'),
          end: new Date('2025-08-05T23:59:59.999Z')
        },
        pkt: {
          start: new Date('2025-08-05T00:00:00+05:00'),
          end: new Date('2025-08-05T23:59:59+05:00')
        },
        local: {
          start: new Date('2025-08-05'),
          end: (() => { const d = new Date('2025-08-05'); d.setHours(23,59,59,999); return d; })()
        }
      }
    };
    
    // Expected results from spreadsheet
    const expected = {
      monday: [30, 28, 18, 9, 6],
      tuesday: [27, 26, 8, 7, 4]
    };
    
    console.log('\n📅 TESTING ALL DATE RANGE COMBINATIONS');
    console.log('-'.repeat(50));
    
    // Test all timezone combinations
    for (const [dayName, dayRanges] of Object.entries(dates)) {
      console.log(`\n🗓️ ${dayName.toUpperCase()} ANALYSIS:`);
      
      for (const [tzName, range] of Object.entries(dayRanges)) {
        console.log(`\n⏰ ${tzName.toUpperCase()} Timezone (${range.start.toISOString()} to ${range.end.toISOString()}):`);
        
        // Method 1: Direct level matching (0-4)
        const results1 = [];
        for (let level = 0; level <= 4; level++) {
          const count = await User.countDocuments({
            levelHistory: {
              $elemMatch: {
                level: level,
                achievedOn: { $gte: range.start, $lte: range.end }
              }
            }
          });
          results1.push(count);
        }
        console.log(`  Direct L0-4: [${results1.join(', ')}]`);
        
        // Method 2: Level matching (1-5)
        const results2 = [];
        for (let level = 1; level <= 5; level++) {
          const count = await User.countDocuments({
            levelHistory: {
              $elemMatch: {
                level: level,
                achievedOn: { $gte: range.start, $lte: range.end }
              }
            }
          });
          results2.push(count);
        }
        console.log(`  Direct L1-5: [${results2.join(', ')}]`);
        
        // Method 3: Level matching (2-6)
        const results3 = [];
        for (let level = 2; level <= 6; level++) {
          const count = await User.countDocuments({
            levelHistory: {
              $elemMatch: {
                level: level,
                achievedOn: { $gte: range.start, $lte: range.end }
              }
            }
          });
          results3.push(count);
        }
        console.log(`  Direct L2-6: [${results3.join(', ')}]`);
        
        // Check matches with expected
        const expectedArray = expected[dayName];
        const match1 = JSON.stringify(results1) === JSON.stringify(expectedArray);
        const match2 = JSON.stringify(results2) === JSON.stringify(expectedArray);
        const match3 = JSON.stringify(results3) === JSON.stringify(expectedArray);
        
        if (match1) console.log(`  🎯 PERFECT MATCH L0-4: ${match1}`);
        if (match2) console.log(`  🎯 PERFECT MATCH L1-5: ${match2}`);
        if (match3) console.log(`  🎯 PERFECT MATCH L2-6: ${match3}`);
      }
    }
    
    console.log('\n🧪 HYPOTHESIS TESTING SECTION');
    console.log('-'.repeat(50));
    
    // Hypothesis 1: Array index confusion
    console.log('\n🔬 HYPOTHESIS 1: Array Index vs Level Value Confusion');
    
    const sampleUsers = await User.find({
      'levelHistory.0': { $exists: true }
    }).select('levelHistory').limit(10);
    
    console.log('\nSample levelHistory structures:');
    sampleUsers.slice(0, 3).forEach((user, index) => {
      console.log(`User ${index + 1}:`, JSON.stringify(user.levelHistory.slice(0, 3), null, 2));
    });
    
    // Hypothesis 2: Aggregate with array indexing
    console.log('\n🔬 HYPOTHESIS 2: Aggregate with Array Position Indexing');
    
    for (const [dayName, dayRanges] of Object.entries(dates)) {
      console.log(`\n${dayName.toUpperCase()} - Testing Array Position Logic:`);
      
      const range = dayRanges.pkt; // Use PKT as primary test
      
      // Test if your spreadsheet query logic works
      const arrayIndexResults = [];
      for (let arrayIndex = 0; arrayIndex <= 4; arrayIndex++) {
        const query = {};
        query[`levelHistory.${arrayIndex}.achievedOn`] = {
          $gte: range.start,
          $lte: range.end
        };
        
        try {
          const count = await User.countDocuments(query);
          arrayIndexResults.push(count);
          console.log(`  Array[${arrayIndex}]: ${count}`);
        } catch (error) {
          arrayIndexResults.push(0);
          console.log(`  Array[${arrayIndex}]: ERROR - ${error.message}`);
        }
      }
      
      const expectedArray = expected[dayName];
      const match = JSON.stringify(arrayIndexResults) === JSON.stringify(expectedArray);
      if (match) {
        console.log(`  🎯 ARRAY INDEX MATCH FOUND! ${match}`);
      }
    }
    
    // Hypothesis 3: Complex aggregation matching your app logic
    console.log('\n🔬 HYPOTHESIS 3: Complex Aggregation Analysis');
    
    const complexAggregation = await User.aggregate([
      {
        $project: {
          levelHistory: 1,
          // Test different array element access patterns
          level0: { $arrayElemAt: ['$levelHistory.achievedOn', 0] },
          level1: { $arrayElemAt: ['$levelHistory.achievedOn', 1] },
          level2: { $arrayElemAt: ['$levelHistory.achievedOn', 2] },
          level3: { $arrayElemAt: ['$levelHistory.achievedOn', 3] },
          level4: { $arrayElemAt: ['$levelHistory.achievedOn', 4] },
          
          // Test different level property access
          levelProp0: { $arrayElemAt: ['$levelHistory.level', 0] },
          levelProp1: { $arrayElemAt: ['$levelHistory.level', 1] },
          levelProp2: { $arrayElemAt: ['$levelHistory.level', 2] },
          
          // Count array length
          arrayLength: { $size: { $ifNull: ['$levelHistory', []] } }
        }
      },
      { $limit: 5 }
    ]);
    
    console.log('\nComplex aggregation sample:');
    complexAggregation.forEach((doc, index) => {
      console.log(`\nDocument ${index + 1}:`);
      console.log(`  Array Length: ${doc.arrayLength}`);
      console.log(`  Level Props: [${doc.levelProp0}, ${doc.levelProp1}, ${doc.levelProp2}]`);
      console.log(`  Date Elements: [${doc.level0}, ${doc.level1}]`);
    });
    
    // Hypothesis 4: Date range edge cases
    console.log('\n🔬 HYPOTHESIS 4: Date Range Edge Cases');
    
    const edgeRanges = {
      'Monday Extended': {
        start: new Date('2025-08-03T19:00:00.000Z'), // Sunday 7PM UTC = Monday 12AM PKT
        end: new Date('2025-08-04T18:59:59.999Z')   // Monday 6:59PM UTC = Monday 11:59PM PKT
      },
      'Tuesday Extended': {
        start: new Date('2025-08-04T19:00:00.000Z'), // Monday 7PM UTC = Tuesday 12AM PKT
        end: new Date('2025-08-05T18:59:59.999Z')   // Tuesday 6:59PM UTC = Tuesday 11:59PM PKT
      }
    };
    
    for (const [rangeName, range] of Object.entries(edgeRanges)) {
      console.log(`\n${rangeName} (${range.start.toISOString()} to ${range.end.toISOString()}):`);
      
      const edgeResults = [];
      for (let level = 1; level <= 5; level++) {
        const count = await User.countDocuments({
          levelHistory: {
            $elemMatch: {
              level: level,
              achievedOn: { $gte: range.start, $lte: range.end }
            }
          }
        });
        edgeResults.push(count);
      }
      console.log(`  Results L1-5: [${edgeResults.join(', ')}]`);
      
      const dayName = rangeName.toLowerCase().includes('monday') ? 'monday' : 'tuesday';
      const expectedArray = expected[dayName];
      const match = JSON.stringify(edgeResults) === JSON.stringify(expectedArray);
      if (match) {
        console.log(`  🎯 EDGE CASE MATCH FOUND! ${match}`);
      }
    }
    
    // Hypothesis 5: Find the exact timestamp patterns
    console.log('\n🔬 HYPOTHESIS 5: Exact Timestamp Pattern Analysis');
    
    // Get all level history data for both days
    const allMondayData = await User.find({
      levelHistory: {
        $elemMatch: {
          achievedOn: { 
            $gte: new Date('2025-08-03T19:00:00.000Z'),
            $lte: new Date('2025-08-04T18:59:59.999Z')
          }
        }
      }
    }).select('levelHistory');
    
    const allTuesdayData = await User.find({
      levelHistory: {
        $elemMatch: {
          achievedOn: { 
            $gte: new Date('2025-08-04T19:00:00.000Z'),
            $lte: new Date('2025-08-05T18:59:59.999Z')
          }
        }
      }
    }).select('levelHistory');
    
    // Extract and analyze all timestamps
    const mondayTimestamps = [];
    const tuesdayTimestamps = [];
    
    allMondayData.forEach(user => {
      user.levelHistory.forEach(lh => {
        if (lh.achievedOn >= new Date('2025-08-03T19:00:00.000Z') && 
            lh.achievedOn <= new Date('2025-08-04T18:59:59.999Z')) {
          mondayTimestamps.push({
            level: lh.level,
            achievedOn: lh.achievedOn,
            userId: user._id
          });
        }
      });
    });
    
    allTuesdayData.forEach(user => {
      user.levelHistory.forEach(lh => {
        if (lh.achievedOn >= new Date('2025-08-04T19:00:00.000Z') && 
            lh.achievedOn <= new Date('2025-08-05T18:59:59.999Z')) {
          tuesdayTimestamps.push({
            level: lh.level,
            achievedOn: lh.achievedOn,
            userId: user._id
          });
        }
      });
    });
    
    console.log(`\nTotal Monday records found: ${mondayTimestamps.length}`);
    console.log(`Total Tuesday records found: ${tuesdayTimestamps.length}`);
    
    // Group by level and show counts
    const mondayByLevel = {};
    const tuesdayByLevel = {};
    
    mondayTimestamps.forEach(item => {
      mondayByLevel[item.level] = (mondayByLevel[item.level] || 0) + 1;
    });
    
    tuesdayTimestamps.forEach(item => {
      tuesdayByLevel[item.level] = (tuesdayByLevel[item.level] || 0) + 1;
    });
    
    console.log('\nMonday level distribution:', mondayByLevel);
    console.log('Tuesday level distribution:', tuesdayByLevel);
    
    // Show sample timestamps that match expected patterns
    console.log('\n📊 SEARCHING FOR PATTERN MATCHES...');
    
    // Try to find patterns that match expected results
    const expectedMon = [30, 28, 18, 9, 6];
    const expectedTue = [27, 26, 8, 7, 4];
    
    // Check various level mapping strategies
    const strategies = [
      { name: 'Levels 1-5', map: [1,2,3,4,5] },
      { name: 'Levels 0-4', map: [0,1,2,3,4] },
      { name: 'Levels 2-6', map: [2,3,4,5,6] },
      { name: 'Reverse 5-1', map: [5,4,3,2,1] },
      { name: 'Custom Mix', map: [1,2,4,3,5] }
    ];
    
    strategies.forEach(strategy => {
      console.log(`\n🎯 Testing Strategy: ${strategy.name}`);
      
      const mondayResults = strategy.map.map(level => mondayByLevel[level] || 0);
      const tuesdayResults = strategy.map.map(level => tuesdayByLevel[level] || 0);
      
      console.log(`  Monday: [${mondayResults.join(', ')}] vs Expected: [${expectedMon.join(', ')}]`);
      console.log(`  Tuesday: [${tuesdayResults.join(', ')}] vs Expected: [${expectedTue.join(', ')}]`);
      
      const mondayMatch = JSON.stringify(mondayResults) === JSON.stringify(expectedMon);
      const tuesdayMatch = JSON.stringify(tuesdayResults) === JSON.stringify(expectedTue);
      
      if (mondayMatch) console.log(`  🎯 MONDAY MATCH FOUND!`);
      if (tuesdayMatch) console.log(`  🎯 TUESDAY MATCH FOUND!`);
      if (mondayMatch && tuesdayMatch) console.log(`  🏆 PERFECT STRATEGY MATCH!`);
    });
    
    // Hypothesis 6: Show actual timestamps from spreadsheet perspective
    console.log('\n🔬 HYPOTHESIS 6: Spreadsheet Timestamp Verification');
    
    // Show exactly what timestamps exist that could match your spreadsheet data
    console.log('\nActual timestamps for comparison with your spreadsheet:');
    
    ['Monday', 'Tuesday'].forEach((day, dayIndex) => {
      const timestamps = dayIndex === 0 ? mondayTimestamps : tuesdayTimestamps;
      console.log(`\n${day} timestamps by level:`);
      
      [1,2,3,4,5].forEach(level => {
        const levelTimestamps = timestamps
          .filter(t => t.level === level)
          .map(t => t.achievedOn.toISOString())
          .sort();
        
        console.log(`  Level ${level} (${levelTimestamps.length} records):`);
        levelTimestamps.slice(0, 5).forEach((ts, i) => {
          console.log(`    ${i+1}. ${ts}`);
        });
        if (levelTimestamps.length > 5) {
          console.log(`    ... and ${levelTimestamps.length - 5} more`);
        }
      });
    });
    
    console.log('\n✅ Deep analysis complete. No data was modified.');
    
  } catch (error) {
    console.error('❌ Error during deep analysis:', error);
    console.error(error.stack);
  }
};

// Main execution
const runDeepAnalysis = async () => {
  await connectDB();
  await deepLevelHistoryAnalysis();
  await mongoose.connection.close();
  console.log('\n💾 Database connection closed.');
  process.exit(0);
};

// Handle uncaught exceptions
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  process.exit(1);
});

// Run the deep analysis
runDeepAnalysis();
