require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

async function testAfterFixes() {
  console.log('=== TESTING AFTER ALL FIXES ===\n');
  
  // Check if the status: 3 issue in student creation is resolved
  console.log('1. Checking user status distribution:');
  const statusDistribution = await User.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  console.log('User status distribution:');
  statusDistribution.forEach(item => {
    const statusName = item._id === 1 ? 'Active' : item._id === 2 ? 'Paused' : item._id === 3 ? 'Deleted' : 'Unknown';
    console.log(`  Status ${item._id} (${statusName}): ${item.count} users`);
  });
  
  // Check students specifically
  const studentStatusDistribution = await User.aggregate([
    { $match: { role: 'Student' } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  console.log('\nStudent status distribution:');
  studentStatusDistribution.forEach(item => {
    const statusName = item._id === 1 ? 'Active' : item._id === 2 ? 'Paused' : item._id === 3 ? 'Deleted' : 'Unknown';
    console.log(`  Status ${item._id} (${statusName}): ${item.count} students`);
  });
  
  // Test IT enquiry management query (should exclude deleted)
  console.log('\n2. Testing IT enquiry management queries:');
  
  const itEnquiryCount = await User.countDocuments({
    role: 'Student',
    status: { $ne: 3 }, // Exclude deleted
    classId: { $exists: false },
    prospectusStage: { $gte: 1, $lte: 5 }
  });
  
  console.log('IT enquiry count (excludes deleted):', itEnquiryCount);
  
  // Test what the count would be if including deleted
  const itEnquiryWithDeletedCount = await User.countDocuments({
    role: 'Student',
    // status: { $ne: 3 }, // REMOVED - includes deleted
    classId: { $exists: false },
    prospectusStage: { $gte: 1, $lte: 5 }
  });
  
  console.log('IT enquiry count (includes deleted):', itEnquiryWithDeletedCount);
  console.log('Deleted enquiry users excluded:', itEnquiryWithDeletedCount - itEnquiryCount);
  
  // Test Principal vs IT consistency
  console.log('\n3. Testing Principal vs IT consistency:');
  
  const principalTotal = await User.countDocuments({
    role: 'Student',
    prospectusStage: { $gte: 1, $lte: 5 },
    status: { $ne: 3 } // Exclude deleted users
  });
  
  const itTotal = await User.countDocuments({
    role: 'Student',
    status: { $ne: 3 } // Exclude deleted users
  });
  
  console.log('Principal total (levels 1-5, excluding deleted):', principalTotal);
  console.log('IT total (all students, excluding deleted):', itTotal);
  console.log('Students outside levels 1-5:', itTotal - principalTotal);
  
  console.log('\n4. SUMMARY:');
  if (itEnquiryWithDeletedCount - itEnquiryCount === 0) {
    console.log('✅ SUCCESS: No deleted users found in enquiry management scope');
  } else {
    console.log(`❗ ${itEnquiryWithDeletedCount - itEnquiryCount} deleted users still in enquiry scope`);
  }
  
  if (principalTotal === itTotal || Math.abs(principalTotal - itTotal) <= 5) {
    console.log('✅ SUCCESS: Principal and IT totals are consistent');
  } else {
    console.log('❗ Principal and IT totals still differ significantly');
  }
  
  process.exit(0);
}

testAfterFixes().catch(console.error);