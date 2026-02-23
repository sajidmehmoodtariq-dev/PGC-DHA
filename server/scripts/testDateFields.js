const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgcdha');
    console.log('✅ MongoDB Connected for Date Field Analysis');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Test ALL possible date fields in levelHistory
const testAllDateFields = async () => {
  try {
    console.log('\n🔬 TESTING ALL DATE FIELDS - achievedOn vs updatedOn vs createdOn');
    console.log('='.repeat(80));
    
    const User = mongoose.model('User', require('../models/User').schema);
    
    // Define date ranges
    const dates = {
      monday: {
        pkt: {
          start: new Date('2025-08-03T19:00:00.000Z'), // Monday 12AM PKT
          end: new Date('2025-08-04T18:59:59.999Z')    // Monday 11:59PM PKT
        }
      },
      tuesday: {
        pkt: {
          start: new Date('2025-08-04T19:00:00.000Z'), // Tuesday 12AM PKT
          end: new Date('2025-08-05T18:59:59.999Z')    // Tuesday 11:59PM PKT
        }
      }
    };
    
    // Expected results from spreadsheet
    const expected = {
      monday: [30, 28, 18, 9, 6],
      tuesday: [27, 26, 8, 7, 4]
    };
    
    // First, let's see what date fields are actually available
    console.log('\n🔍 CHECKING AVAILABLE DATE FIELDS IN LEVEL HISTORY');
    const sampleUser = await User.findOne({ 'levelHistory.0': { $exists: true } })
      .select('levelHistory');
    
    if (sampleUser && sampleUser.levelHistory.length > 0) {
      console.log('Sample levelHistory entry fields:');
      console.log(JSON.stringify(sampleUser.levelHistory[0], null, 2));
      
      // Check all possible date field names
      const levelHistoryEntry = sampleUser.levelHistory[0];
      const dateFields = Object.keys(levelHistoryEntry).filter(key => 
        levelHistoryEntry[key] instanceof Date || 
        (typeof levelHistoryEntry[key] === 'string' && levelHistoryEntry[key].includes('T'))
      );
      console.log('\nDetected date fields:', dateFields);
    }
    
    // Test different date fields
    const dateFieldsToTest = ['achievedOn', 'updatedOn', 'createdOn', '_id'];
    
    for (const dateField of dateFieldsToTest) {
      console.log(`\n🗓️ TESTING WITH ${dateField.toUpperCase()} FIELD`);
      console.log('-'.repeat(50));
      
      for (const [dayName, dayRanges] of Object.entries(dates)) {
        const range = dayRanges.pkt;
        console.log(`\n${dayName.toUpperCase()} (${range.start.toISOString()} to ${range.end.toISOString()}):`);
        
        const results = [];
        
        for (let level = 1; level <= 5; level++) {
          let count = 0;
          
          try {
            if (dateField === '_id') {
              // Special handling for ObjectId timestamp extraction
              count = await User.countDocuments({
                levelHistory: {
                  $elemMatch: {
                    level: level,
                    _id: {
                      $gte: mongoose.Types.ObjectId.createFromTime(Math.floor(range.start.getTime() / 1000)),
                      $lte: mongoose.Types.ObjectId.createFromTime(Math.floor(range.end.getTime() / 1000))
                    }
                  }
                }
              });
            } else {
              // Regular date field query
              const query = {
                levelHistory: {
                  $elemMatch: {
                    level: level
                  }
                }
              };
              query.levelHistory.$elemMatch[dateField] = { $gte: range.start, $lte: range.end };
              
              count = await User.countDocuments(query);
            }
          } catch (error) {
            console.log(`    Error testing ${dateField} for level ${level}: ${error.message}`);
            count = 0;
          }
          
          results.push(count);
        }
        
        console.log(`  Levels 1-5: [${results.join(', ')}]`);
        
        // Check if this matches expected (levels 1-5 should map to expected 0-4)
        const expectedArray = expected[dayName];
        const match = JSON.stringify(results) === JSON.stringify(expectedArray);
        if (match) {
          console.log(`  🎯 PERFECT MATCH FOUND WITH ${dateField}! ${match}`);
        }
        
        // Also try mapping to levels 0-4 for completeness
        const resultsL0to4 = [];
        for (let level = 0; level <= 4; level++) {
          let count = 0;
          
          try {
            if (dateField === '_id') {
              count = await User.countDocuments({
                levelHistory: {
                  $elemMatch: {
                    level: level,
                    _id: {
                      $gte: mongoose.Types.ObjectId.createFromTime(Math.floor(range.start.getTime() / 1000)),
                      $lte: mongoose.Types.ObjectId.createFromTime(Math.floor(range.end.getTime() / 1000))
                    }
                  }
                }
              });
            } else {
              const query = {
                levelHistory: {
                  $elemMatch: {
                    level: level
                  }
                }
              };
              query.levelHistory.$elemMatch[dateField] = { $gte: range.start, $lte: range.end };
              
              count = await User.countDocuments(query);
            }
          } catch (error) {
            count = 0;
          }
          
          resultsL0to4.push(count);
        }
        
        console.log(`  Levels 0-4: [${resultsL0to4.join(', ')}]`);
        const matchL0to4 = JSON.stringify(resultsL0to4) === JSON.stringify(expectedArray);
        if (matchL0to4) {
          console.log(`  🎯 PERFECT MATCH FOUND WITH ${dateField} (L0-4)! ${matchL0to4}`);
        }
      }
    }
    
    // Test user's main document createdOn/updatedOn fields
    console.log(`\n🔬 TESTING USER DOCUMENT DATE FIELDS`);
    console.log('-'.repeat(50));
    
    const userDateFields = ['createdOn', 'updatedOn', '_id'];
    
    for (const dateField of userDateFields) {
      console.log(`\n🗓️ TESTING USER ${dateField.toUpperCase()} FIELD`);
      
      for (const [dayName, dayRanges] of Object.entries(dates)) {
        const range = dayRanges.pkt;
        console.log(`\n${dayName.toUpperCase()} (${range.start.toISOString()} to ${range.end.toISOString()}):`);
        
        let totalUsersInRange = 0;
        
        try {
          if (dateField === '_id') {
            totalUsersInRange = await User.countDocuments({
              _id: {
                $gte: mongoose.Types.ObjectId.createFromTime(Math.floor(range.start.getTime() / 1000)),
                $lte: mongoose.Types.ObjectId.createFromTime(Math.floor(range.end.getTime() / 1000))
              }
            });
          } else {
            const query = {};
            query[dateField] = { $gte: range.start, $lte: range.end };
            totalUsersInRange = await User.countDocuments(query);
          }
        } catch (error) {
          console.log(`    Error: ${error.message}`);
          totalUsersInRange = 0;
        }
        
        console.log(`  Total users with ${dateField} in range: ${totalUsersInRange}`);
      }
    }
    
    // Test combinations of user date fields + level history
    console.log(`\n🔬 TESTING COMBINED USER + LEVEL HISTORY CONDITIONS`);
    console.log('-'.repeat(50));
    
    for (const [dayName, dayRanges] of Object.entries(dates)) {
      const range = dayRanges.pkt;
      console.log(`\n${dayName.toUpperCase()} - Combined Conditions:`);
      
      // Test: Users created in date range AND have specific levels
      for (let level = 1; level <= 5; level++) {
        try {
          const count = await User.countDocuments({
            $and: [
              {
                $or: [
                  { createdOn: { $gte: range.start, $lte: range.end } },
                  { updatedOn: { $gte: range.start, $lte: range.end } }
                ]
              },
              {
                levelHistory: {
                  $elemMatch: { level: level }
                }
              }
            ]
          });
          console.log(`  Level ${level} + User date range: ${count}`);
        } catch (error) {
          console.log(`  Level ${level} + User date range: ERROR`);
        }
      }
    }
    
    // DEEP DIVE: Raw data extraction to see what's really happening
    console.log(`\n🔬 DEEP DIVE: RAW DATA EXTRACTION`);
    console.log('-'.repeat(50));
    
    // Get all users with level history and show their date fields
    const usersWithLevelHistory = await User.find({
      levelHistory: { $exists: true, $ne: [] }
    }).select('levelHistory createdOn updatedOn').limit(10);
    
    console.log('\nSample users with level history:');
    usersWithLevelHistory.forEach((user, index) => {
      console.log(`\nUser ${index + 1}:`);
      console.log(`  User createdOn: ${user.createdOn}`);
      console.log(`  User updatedOn: ${user.updatedOn}`);
      console.log(`  Level history count: ${user.levelHistory.length}`);
      
      if (user.levelHistory.length > 0) {
        user.levelHistory.slice(0, 3).forEach((lh, lhIndex) => {
          console.log(`  LH[${lhIndex}] - Level: ${lh.level}, achievedOn: ${lh.achievedOn}, updatedByName: ${lh.updatedByName}`);
        });
      }
    });
    
    // Check for any data that matches the exact timestamps from your spreadsheet
    console.log(`\n🔬 CHECKING FOR EXACT TIMESTAMP MATCHES`);
    console.log('-'.repeat(50));
    
    // Your spreadsheet shows these specific timestamps - let's find them
    const spreadsheetTimestamps = [
      '2025-08-05T03:33:29.733Z',
      '2025-08-05T04:49:08.840Z',
      '2025-08-05T05:09:06.457Z',
      '2025-08-05T06:38:53.276Z',
      '2025-08-05T07:40:35.104Z'
    ];
    
    for (const timestamp of spreadsheetTimestamps) {
      const exactTime = new Date(timestamp);
      
      console.log(`\nLooking for exact timestamp: ${timestamp}`);
      
      const matchingUsers = await User.find({
        levelHistory: {
          $elemMatch: {
            achievedOn: exactTime
          }
        }
      }).select('levelHistory');
      
      console.log(`  Found ${matchingUsers.length} users with this exact timestamp`);
      
      matchingUsers.forEach((user, index) => {
        const matchingEntries = user.levelHistory.filter(lh => 
          lh.achievedOn && lh.achievedOn.getTime() === exactTime.getTime()
        );
        console.log(`    User ${index + 1}: ${matchingEntries.length} matching entries, levels: [${matchingEntries.map(e => e.level).join(', ')}]`);
      });
    }
    
    console.log('\n✅ Date field analysis complete. No data was modified.');
    
  } catch (error) {
    console.error('❌ Error during analysis:', error);
    console.error(error.stack);
  }
};

// Main execution
const runDateFieldTest = async () => {
  await connectDB();
  await testAllDateFields();
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
runDateFieldTest();
