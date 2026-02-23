require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function findAdminUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    const adminUsers = await User.find({ 
      role: { $in: ['Principal', 'IT', 'InstituteAdmin'] } 
    });
    
    console.log('\nAdmin users found:');
    adminUsers.forEach(user => {
      console.log(`- ${user.fullName?.firstName || user.email} (${user.role})`);
      console.log(`  Email: ${user.email}`);
      console.log(`  ID: ${user._id}`);
    });
    
    console.log(`\nTotal admin users: ${adminUsers.length}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findAdminUsers();
