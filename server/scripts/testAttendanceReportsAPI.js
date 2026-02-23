const mongoose = require('mongoose');
const Class = require('../models/Class');
const User = require('../models/User');
require('dotenv').config();

async function testAttendanceReportsAPI() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Test classes endpoint
    console.log('\n=== Testing Classes Endpoint ===');
    const classes = await Class.find({ isActive: true })
      .populate('classIncharge', 'fullName userName email')
      .populate('floorIncharge', 'fullName userName email')
      .populate('teachers.teacherId', 'fullName userName email')
      .sort({ floor: 1, grade: 1, program: 1, name: 1 });

    console.log(`Found ${classes.length} classes`);
    if (classes.length > 0) {
      console.log('Sample class:', {
        id: classes[0]._id,
        name: classes[0].name,
        floor: classes[0].floor,
        campus: classes[0].campus,
        grade: classes[0].grade
      });
    }

    // Test teachers endpoint
    console.log('\n=== Testing Teachers Endpoint ===');
    const teachers = await User.find({ role: 'Teacher' })
      .select('fullName userName email role')
      .sort({ 'fullName.firstName': 1 });

    console.log(`Found ${teachers.length} teachers`);
    if (teachers.length > 0) {
      console.log('Sample teacher:', {
        id: teachers[0]._id,
        name: `${teachers[0].fullName?.firstName || ''} ${teachers[0].fullName?.lastName || ''}`.trim(),
        email: teachers[0].email
      });
    }

    console.log('\n=== API Test Complete ===');
    
  } catch (error) {
    console.error('Error testing API:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

testAttendanceReportsAPI();