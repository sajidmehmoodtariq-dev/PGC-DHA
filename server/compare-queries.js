const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Connected to MongoDB');
  
  // Test the EXACT Principal filter from the code
  const principalQueryExact = {
    role: 'Student',
    prospectusStage: { $gte: 1, $lte: 5 } // From principal-stats route
  };
  
  const principalCountExact = await User.countDocuments(principalQueryExact);
  console.log('Principal query EXACT (prospectusStage 1-5):', principalCountExact);
  
  // Test level breakdown
  for (let level = 1; level <= 5; level++) {
    const levelQuery = {
      role: 'Student',
      prospectusStage: level,
      status: { $ne: 3 }
    };
    const levelCount = await User.countDocuments(levelQuery);
    console.log(`Level ${level} students (active):`, levelCount);
  }
  
  // Test the IT filter - what might they be using
  const itQueryExact = {
    role: 'Student',
    status: { $ne: 3 }  // Exclude deleted students
  };
  
  const itCountExact = await User.countDocuments(itQueryExact);
  console.log('IT query (all active students):', itCountExact);
  
  // Check if IT is applying additional filters
  const itQueryWithLevelFilter = {
    role: 'Student',
    status: { $ne: 3 },
    prospectusStage: { $gte: 1, $lte: 5 }  // Same as Principal
  };
  
  const itCountWithLevel = await User.countDocuments(itQueryWithLevelFilter);
  console.log('IT query with level filter (1-5):', itCountWithLevel);
  
  // Check breakdown by exact prospectusStage values
  console.log('\n--- Prospectus Stage Breakdown ---');
  const stageStats = await User.aggregate([
    { $match: { role: 'Student', status: { $ne: 3 } } },
    {
      $group: {
        _id: '$prospectusStage',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  stageStats.forEach(stat => {
    console.log(`Prospectus Stage ${stat._id}: ${stat.count} students`);
  });
  
  // Sum of levels 1-5 for comparison
  const levels1to5Total = stageStats
    .filter(stat => stat._id >= 1 && stat._id <= 5)
    .reduce((sum, stat) => sum + stat.count, 0);
  console.log(`\nTotal levels 1-5: ${levels1to5Total}`);
  
  process.exit(0);
}).catch(console.error);