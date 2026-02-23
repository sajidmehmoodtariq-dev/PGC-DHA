const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const TeacherAttendance = require('../models/TeacherAttendance');
const Attendance = require('../models/Attendance');

const cleanTestData = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgc-dha');
    console.log('Connected to MongoDB successfully!');

    console.log('\n🧹 Cleaning test data...');

    // Delete test users (teachers, students, coordinator, principal)
    const deletedUsers = await User.deleteMany({ 
      $or: [
        { userName: /^test_/ },
        { email: /test.*@test\.com$/ }
      ]
    });
    console.log(`✅ Deleted ${deletedUsers.deletedCount} test users`);

    // Delete test classes
    const deletedClasses = await Class.deleteMany({ name: /^Test/ });
    console.log(`✅ Deleted ${deletedClasses.deletedCount} test classes`);

    // Delete test timetable entries
    const deletedTimetable = await Timetable.deleteMany({ subject: /^Test/ });
    console.log(`✅ Deleted ${deletedTimetable.deletedCount} test timetable entries`);

    // Delete test attendance records
    const deletedTeacherAttendance = await TeacherAttendance.deleteMany({
      $or: [
        { coordinatorRemarks: /test/i },
        { 'teacherId': { $in: await User.find({ userName: /^test_/ }).distinct('_id') } }
      ]
    });
    console.log(`✅ Deleted ${deletedTeacherAttendance.deletedCount} test teacher attendance records`);

    const deletedStudentAttendance = await Attendance.deleteMany({
      'student': { $in: await User.find({ userName: /^test_/ }).distinct('_id') }
    });
    console.log(`✅ Deleted ${deletedStudentAttendance.deletedCount} test student attendance records`);

    console.log('\n🎉 Test data cleaned successfully!');

  } catch (error) {
    console.error('❌ Error cleaning test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the cleanup script
if (require.main === module) {
  cleanTestData();
}

module.exports = cleanTestData;
