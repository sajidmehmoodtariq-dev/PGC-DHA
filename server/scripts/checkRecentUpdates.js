const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function checkRecentUpdates() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Check for recently updated students
    const recentlyUpdated = await User.find({ 
      role: 'Student', 
      status: { $ne: 3 },
      updatedAt: { 
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    })
    .select('name email prospectusStage updatedAt createdAt')
    .sort({ updatedAt: -1 })
    .limit(10);

    console.log('=== STUDENTS UPDATED IN LAST 24 HOURS ===');
    if (recentlyUpdated.length === 0) {
      console.log('No students updated in the last 24 hours.');
    } else {
      recentlyUpdated.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   - prospectusStage: ${student.prospectusStage}`);
        console.log(`   - updated: ${student.updatedAt}`);
        console.log(`   - created: ${student.createdAt}`);
        console.log('');
      });
    }

    // Check for recently created students
    const recentlyCreated = await User.find({ 
      role: 'Student', 
      status: { $ne: 3 },
      createdAt: { 
        $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
      }
    })
    .select('name email prospectusStage createdAt')
    .sort({ createdAt: -1 })
    .limit(10);

    console.log('=== STUDENTS CREATED IN LAST 24 HOURS ===');
    if (recentlyCreated.length === 0) {
      console.log('No students created in the last 24 hours.');
    } else {
      recentlyCreated.forEach((student, index) => {
        console.log(`${index + 1}. ${student.name} (${student.email})`);
        console.log(`   - prospectusStage: ${student.prospectusStage}`);
        console.log(`   - created: ${student.createdAt}`);
        console.log('');
      });
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkRecentUpdates();
