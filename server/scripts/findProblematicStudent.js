const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function findProblematicStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Find the student with prospectusStage but no levelHistory
    const student = await User.findOne({
      role: 'Student',
      status: { $ne: 3 },
      prospectusStage: { $exists: true, $ne: null },
      $or: [
        { levelHistory: { $exists: false } },
        { levelHistory: { $size: 0 } }
      ]
    });

    if (student) {
      console.log('=== PROBLEMATIC STUDENT FOUND ===');
      console.log('Name:', student.name || 'N/A');
      console.log('Email:', student.email || 'N/A');
      console.log('ID:', student._id);
      console.log('Role:', student.role);
      console.log('Status:', student.status);
      console.log('Prospectus Stage:', student.prospectusStage);
      console.log('Level History:', student.levelHistory);
      console.log('Created At:', student.createdAt);
      console.log('Updated At:', student.updatedAt);
      
      console.log('\n=== SOLUTION ===');
      console.log('This student needs a levelHistory entry to match their prospectusStage.');
      console.log('Options:');
      console.log('1. Initialize their levelHistory with their current prospectusStage');
      console.log('2. Remove/fix their prospectusStage if it\'s incorrect');
      console.log('3. Ensure levelHistory system is working properly for new updates');
    } else {
      console.log('No problematic student found - this is unexpected!');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

findProblematicStudent();
