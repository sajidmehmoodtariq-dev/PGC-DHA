require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

async function debugPrincipalQuery() {
  console.log('=== DEBUGGING PRINCIPAL QUERY LOGIC ===');
  
  // Principal overview route logic - Level breakdown (exact level only)
  const levelBreakdown = {};
  for (let level = 1; level <= 5; level++) {
    const levelQuery = {
      role: 'Student',
      prospectusStage: level, // Exact level, not cumulative
      // No date filtering for debugging
    };
    levelBreakdown[level] = await User.countDocuments(levelQuery);
    console.log(`Level ${level} (exact): ${levelBreakdown[level]} students`);
  }
  
  // But wait! Let me check what the Principal stats route does differently
  // Let's examine the principal-stats route logic
  
  console.log('\n=== PRINCIPAL STATS ROUTE LOGIC ===');
  
  // From the code: levelProgression calculation
  for (let i = 1; i <= 5; i++) {
    // Build base query for level calculations
    let levelQuery = {
      role: 'Student',
      prospectusStage: i // Exact level only
    };
    
    // Get count for current level (exact level only)
    const currentLevelCount = await User.countDocuments(levelQuery);
    console.log(`Principal stats - Level ${i} (exact): ${currentLevelCount} students`);
  }
  
  // Now let's check what the frontend might be displaying differently
  console.log('\n=== POSSIBLE FRONTEND CALCULATION ===');
  
  // Check if the frontend is summing up levels incorrectly
  // The complaint was "Level 1: 1380" but we only have 237 Level 1 students
  // Maybe it's showing cumulative (Level 1+ students)?
  
  for (let i = 1; i <= 5; i++) {
    let cumulativeQuery = {
      role: 'Student',
      prospectusStage: { $gte: i } // Cumulative - all students at this level or higher
    };
    
    const cumulativeCount = await User.countDocuments(cumulativeQuery);
    console.log(`Cumulative Level ${i}+ students: ${cumulativeCount}`);
  }
  
  // Check what the Principal route returns for bottom cards
  console.log('\n=== CHECKING PRINCIPAL QUERY WITH FILTERS ===');
  
  // Replicate the exact query from principal-stats route
  let query = {
    role: 'Student',
    prospectusStage: { $gte: 1, $lte: 5 } // Only levels 1-5
  };
  
  const totalStudents = await User.countDocuments(query);
  console.log('Principal stats total (levels 1-5):', totalStudents);
  
  // Check if there's a minLevel filter that would change this
  // If minLevel = 1, it would change to: prospectusStage: 1
  const minLevel1Query = {
    role: 'Student',
    prospectusStage: 1 // Exact level 1 only when minLevel=1 is applied
  };
  
  const level1Exact = await User.countDocuments(minLevel1Query);
  console.log('When minLevel=1 filter applied (exact Level 1):', level1Exact);
  
  // But the issue might be in level progression calculation
  console.log('\n=== LEVEL PROGRESSION CALCULATION ===');
  
  // This is what the Principal route does for level progression
  for (let i = 1; i <= 5; i++) {
    let levelQuery = {
      role: 'Student',
      prospectusStage: { $gte: i } // This is CUMULATIVE!
    };
    
    const currentLevelCount = await User.countDocuments(levelQuery);
    console.log(`Level progression ${i} (cumulative): ${currentLevelCount} students`);
    
    // This might be what's showing as "Level 1: 1380" in the frontend!
  }
  
  process.exit(0);
}

debugPrincipalQuery().catch(console.error);