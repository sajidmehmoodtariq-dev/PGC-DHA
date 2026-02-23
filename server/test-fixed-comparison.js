require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

async function testFixedComparison() {
  console.log('=== TESTING FIXED PRINCIPAL vs IT QUERIES ===\n');
  
  // Count deleted users first
  const deletedUsers = await User.countDocuments({ 
    role: 'Student', 
    status: 3 
  });
  console.log('Deleted users (status = 3):', deletedUsers);
  
  // IT Route Logic (UNCHANGED)
  console.log('\n=== IT ROUTE LOGIC (UNCHANGED) ===');
  const itStudents = await User.countDocuments({
    role: 'Student',
    status: { $ne: 3 } // Excludes deleted users
  });
  console.log('IT students (role=Student, status != 3):', itStudents);
  
  // Principal Route Logic (FIXED)
  console.log('\n=== PRINCIPAL ROUTE LOGIC (FIXED) ===');
  
  // Fixed Principal stats query
  const principalStatsTotal = await User.countDocuments({
    role: 'Student',
    prospectusStage: { $gte: 1, $lte: 5 },
    status: { $ne: 3 } // NOW EXCLUDES deleted users
  });
  console.log('Principal stats total (levels 1-5, excluding deleted):', principalStatsTotal);
  
  // Fixed Principal level breakdown (exact counts)
  console.log('\nPrincipal Level Breakdown (exact, excluding deleted):');
  const principalLevelBreakdown = {};
  for (let level = 1; level <= 5; level++) {
    const levelQuery = {
      role: 'Student',
      prospectusStage: level, // Exact level
      status: { $ne: 3 } // Exclude deleted users
    };
    principalLevelBreakdown[level] = await User.countDocuments(levelQuery);
    console.log(`  Level ${level}: ${principalLevelBreakdown[level]}`);
  }
  
  // Fixed Principal level progression (cumulative counts)
  console.log('\nPrincipal Level Progression (cumulative, excluding deleted):');
  const principalLevelProgression = {};
  for (let i = 1; i <= 5; i++) {
    const currentLevelCount = await User.countDocuments({
      role: 'Student',
      prospectusStage: { $gte: i }, // CUMULATIVE
      status: { $ne: 3 } // Exclude deleted users
    });
    principalLevelProgression[i] = currentLevelCount;
    console.log(`  Level ${i}+: ${currentLevelCount}`);
  }
  
  console.log('\n=== ANALYSIS AFTER FIX ===');
  console.log(`IT showing: ${itStudents}`);
  console.log(`Principal total: ${principalStatsTotal}`);
  console.log(`Principal Level 1 exact: ${principalLevelBreakdown[1]}`);
  console.log(`Principal Level 1+ cumulative: ${principalLevelProgression[1]}`);
  console.log(`Deleted users excluded: ${deletedUsers}`);
  
  const difference = Math.abs(itStudents - principalStatsTotal);
  console.log(`\nDifference between IT and Principal: ${difference}`);
  
  if (difference === 0) {
    console.log('✅ SUCCESS: IT and Principal now show the same total!');
  } else {
    console.log('❌ Still some difference. Need further investigation.');
    
    // Let's check what could cause the remaining difference
    console.log('\n=== INVESTIGATING REMAINING DIFFERENCE ===');
    
    // Check if IT has additional filters beyond status != 3
    const allStudents = await User.countDocuments({ role: 'Student' });
    const activeStudents = await User.countDocuments({ role: 'Student', status: { $ne: 3 } });
    const principalEligible = await User.countDocuments({ 
      role: 'Student', 
      prospectusStage: { $gte: 1, $lte: 5 },
      status: { $ne: 3 }
    });
    
    console.log(`All students: ${allStudents}`);
    console.log(`Active students (status != 3): ${activeStudents}`);
    console.log(`Principal eligible (levels 1-5, active): ${principalEligible}`);
    console.log(`Students outside level 1-5: ${activeStudents - principalEligible}`);
  }
  
  process.exit(0);
}

testFixedComparison().catch(console.error);