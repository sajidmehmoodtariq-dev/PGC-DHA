require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI);

async function analyzeEnquiryManagement() {
  console.log('=== ANALYZING ENQUIRY MANAGEMENT DATA ===\n');
  
  // Test exact IT enquiry management filter
  console.log('1. IT Enquiry Management Filter (excludeClassAssigned=true):');
  const enquiryFilter = {
    status: { $ne: 3 }, // Default: exclude deleted users
    classId: { $exists: false },
    prospectusStage: { $gte: 1, $lte: 5 }
  };
  
  const enquiryCount = await User.countDocuments(enquiryFilter);
  console.log('Enquiry count (should exclude deleted):', enquiryCount);
  
  // Test what happens if we remove the status filter
  console.log('\n2. Same filter BUT including deleted users:');
  const enquiryWithDeletedFilter = {
    // status: { $ne: 3 }, // REMOVED - includes deleted users
    classId: { $exists: false },
    prospectusStage: { $gte: 1, $lte: 5 }
  };
  
  const enquiryWithDeletedCount = await User.countDocuments(enquiryWithDeletedFilter);
  console.log('Enquiry count (includes deleted):', enquiryWithDeletedCount);
  console.log('Deleted enquiry users:', enquiryWithDeletedCount - enquiryCount);
  
  // Let's see if there are specific deleted users in enquiry stages
  console.log('\n3. Analyzing deleted enquiry users:');
  const deletedEnquiryUsers = await User.find({
    status: 3, // Deleted
    classId: { $exists: false },
    prospectusStage: { $gte: 1, $lte: 5 }
  }).select('fullName email prospectusStage status createdOn').limit(5);
  
  console.log('Sample deleted enquiry users:');
  deletedEnquiryUsers.forEach((user, index) => {
    console.log(`  ${index + 1}. ${user.fullName?.firstName} ${user.fullName?.lastName} - Level ${user.prospectusStage} - Status ${user.status}`);
  });
  
  // Check if there might be a query without the status filter
  console.log('\n4. Testing various filter combinations:');
  
  const filters = [
    {
      name: 'All students',
      filter: { role: 'Student' }
    },
    {
      name: 'Active students only',
      filter: { role: 'Student', status: { $ne: 3 } }
    },
    {
      name: 'Enquiry students (with status filter)',
      filter: { 
        role: 'Student',
        status: { $ne: 3 },
        classId: { $exists: false },
        prospectusStage: { $gte: 1, $lte: 5 }
      }
    },
    {
      name: 'Enquiry students (WITHOUT status filter) - PROBLEMATIC',
      filter: { 
        role: 'Student',
        classId: { $exists: false },
        prospectusStage: { $gte: 1, $lte: 5 }
      }
    }
  ];
  
  for (const { name, filter } of filters) {
    const count = await User.countDocuments(filter);
    console.log(`${name}: ${count} users`);
  }
  
  // Check if there might be an issue with a specific query
  console.log('\n5. RECOMMENDATION:');
  console.log('If IT enquiry management is showing deleted users, it might be:');
  console.log('- Using a query that bypasses the default status filter');
  console.log('- Using a different API endpoint');
  console.log('- Client-side caching showing old data');
  console.log('- Frontend making multiple requests with different parameters');
  
  process.exit(0);
}

analyzeEnquiryManagement().catch(console.error);