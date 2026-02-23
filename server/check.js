require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI).then(async () => {
  console.log('🔍 COORDINATOR VERIFICATION:');
  console.log('============================');
  
  const coordinators = await User.find({ role: 'Coordinator' })
    .select('userName email fullName coordinatorAssignment isActive');

  console.log(`Found ${coordinators.length} coordinators:`);

  coordinators.forEach((coord, index) => {
    console.log(`${index + 1}. Username: ${coord.userName}`);
    console.log(`   Email: ${coord.email}`);
    console.log(`   Active: ${coord.isActive}`);
    console.log(`   Coordinator Assignment: ${JSON.stringify(coord.coordinatorAssignment)}`);
    console.log(`   Assignment Status: ${coord.coordinatorAssignment ? 'EXISTS' : 'MISSING'}`);
    if (coord.coordinatorAssignment) {
      console.log(`   Grade: ${coord.coordinatorAssignment.grade || 'NOT SET'}`);
      console.log(`   Campus: ${coord.coordinatorAssignment.campus || 'NOT SET'}`);
    }
    console.log('');
  });
  
  process.exit(0);
}).catch(console.error);