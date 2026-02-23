require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

async function compareItVsPrincipal() {
  console.log('=== COMPARING IT vs PRINCIPAL QUERIES ===\n');
  
  // IT Route Logic (from users.js)
  console.log('=== IT ROUTE LOGIC ===');
  const itFilter = {
    status: { $ne: 3 } // Exclude deleted users
  };
  
  const itTotal = await User.countDocuments(itFilter);
  console.log('IT total (status != 3):', itTotal);
  
  // IT with role=Student filter  
  const itStudentsFilter = {
    role: 'Student',
    status: { $ne: 3 }
  };
  const itStudents = await User.countDocuments(itStudentsFilter);
  console.log('IT students (role=Student, status != 3):', itStudents);
  
  // Principal Route Logic (from principalEnquiries.js)
  console.log('\n=== PRINCIPAL ROUTE LOGIC ===');
  
  // Principal overview - levelBreakdown (exact counts)
  console.log('Principal Overview - Level Breakdown (exact):');
  const principalLevelBreakdown = {};
  for (let level = 1; level <= 5; level++) {
    const levelQuery = {
      role: 'Student',
      prospectusStage: level // Exact level
    };
    principalLevelBreakdown[level] = await User.countDocuments(levelQuery);
    console.log(`  Level ${level}: ${principalLevelBreakdown[level]}`);
  }
  
  // Principal overview - levelProgression (cumulative counts - THIS IS THE PROBLEM!)
  console.log('\nPrincipal Overview - Level Progression (cumulative):');
  const principalLevelProgression = {};
  for (let i = 1; i <= 5; i++) {
    const currentLevelCount = await User.countDocuments({
      role: 'Student',
      prospectusStage: { $gte: i } // CUMULATIVE
    });
    principalLevelProgression[i] = currentLevelCount;
    console.log(`  Level ${i}+: ${currentLevelCount}`);
  }
  
  // Principal stats route
  console.log('\nPrincipal Stats - Total (levels 1-5):');
  const principalStatsTotal = await User.countDocuments({
    role: 'Student',
    prospectusStage: { $gte: 1, $lte: 5 }
  });
  console.log(`  Total: ${principalStatsTotal}`);
  
  console.log('\n=== ANALYSIS ===');
  console.log(`IT showing: ${itStudents} (or ${itTotal} if including all users)`);
  console.log(`Principal Level 1 exact: ${principalLevelBreakdown[1]}`);
  console.log(`Principal Level 1+ cumulative: ${principalLevelProgression[1]} <-- THIS IS LIKELY THE 1380!`);
  console.log(`Principal total: ${principalStatsTotal}`);
  
  console.log('\n=== RECOMMENDATION ===');
  console.log('The frontend is likely displaying the levelProgression (cumulative) data instead of levelBreakdown (exact) data.');
  console.log('To fix this, the Principal route should either:');
  console.log('1. Change levelProgression to use exact counts, OR');
  console.log('2. The frontend should display levelBreakdown instead of levelProgression');
  
  process.exit(0);
}

compareItVsPrincipal().catch(console.error);