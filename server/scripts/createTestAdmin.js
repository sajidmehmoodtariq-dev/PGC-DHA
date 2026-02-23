require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function createTestAdmin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    // Check if test admin already exists
    const existingAdmin = await User.findOne({ email: 'test.admin@pgc.edu.pk' });
    if (existingAdmin) {
      console.log('Test admin already exists');
      console.log(`Email: ${existingAdmin.email}`);
      console.log(`Role: ${existingAdmin.role}`);
      process.exit(0);
    }
    
    // Create new test admin
    const hashedPassword = await bcrypt.hash('testadmin123', 12);
    
    const testAdmin = new User({
      fullName: {
        firstName: 'Test',
        lastName: 'Admin'
      },
      userName: 'testadmin',
      email: 'test.admin@pgc.edu.pk',
      password: hashedPassword,
      role: 'IT',
      gender: 'Male',
      isActive: true,
      emailVerified: true
    });
    
    await testAdmin.save();
    console.log('✅ Test admin created successfully');
    console.log(`Email: ${testAdmin.email}`);
    console.log(`Password: testadmin123`);
    console.log(`Role: ${testAdmin.role}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createTestAdmin();
