const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function replicateAPILogic() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    console.log('=== REPLICATING EXACT API LOGIC ===\n');

    // 1. Replicate users.js API logic (line 188 in server/routes/users.js)
    const filter = {
      status: { $ne: 3 },
      role: 'Student'
    };
    
    const totalDocs = await User.countDocuments(filter);
    console.log('1. Users API (Enquiry Management) Count:', totalDocs);
    console.log('   Filter:', JSON.stringify(filter, null, 2));

    // 2. Replicate principalEnquiries.js API logic (line 430)
    const enquiriesFilter = {
      role: 'Student',
      prospectusStage: { $gte: 1 }
    };
    
    const totalEnquiries = await User.countDocuments(enquiriesFilter);
    console.log('\n2. Principal Enquiries API (Dashboard) Count:', totalEnquiries);
    console.log('   Filter:', JSON.stringify(enquiriesFilter, null, 2));

    console.log('\n=== DIFFERENCE ANALYSIS ===');
    console.log('Difference:', totalDocs - totalEnquiries);

    // 3. Find the exact students causing the difference
    const studentsInUsersButNotInEnquiries = await User.find({
      role: 'Student',
      status: { $ne: 3 },
      $or: [
        { prospectusStage: { $lt: 1 } },
        { prospectusStage: null },
        { prospectusStage: { $exists: false } }
      ]
    }).select('name email prospectusStage status createdAt updatedAt');

    console.log('\n=== STUDENTS CAUSING DISCREPANCY ===');
    if (studentsInUsersButNotInEnquiries.length === 0) {
      console.log('No students found with prospectusStage < 1 or null');
    } else {
      studentsInUsersButNotInEnquiries.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   - prospectusStage: ${student.prospectusStage}`);
        console.log(`   - status: ${student.status}`);
        console.log(`   - created: ${student.createdAt}`);
        console.log(`   - updated: ${student.updatedAt}`);
        console.log('');
      });
    }

    // 4. Double-check with exact count queries
    console.log('=== VERIFICATION COUNTS ===');
    const level0Count = await User.countDocuments({ role: 'Student', status: { $ne: 3 }, prospectusStage: 0 });
    const levelNullCount = await User.countDocuments({ role: 'Student', status: { $ne: 3 }, prospectusStage: null });
    const levelUndefinedCount = await User.countDocuments({ role: 'Student', status: { $ne: 3 }, prospectusStage: { $exists: false } });
    
    console.log(`Students with prospectusStage = 0: ${level0Count}`);
    console.log(`Students with prospectusStage = null: ${levelNullCount}`);
    console.log(`Students with prospectusStage undefined: ${levelUndefinedCount}`);
    console.log(`Total problematic students: ${level0Count + levelNullCount + levelUndefinedCount}`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

replicateAPILogic();
