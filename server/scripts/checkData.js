const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const TeacherAttendance = require('../models/TeacherAttendance');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Data Check');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const checkData = async () => {
  try {
    console.log('🔍 Checking database data...\n');

    // Check Users
    const totalUsers = await User.countDocuments();
    const teachers = await User.find({ role: 'Teacher' }).select('userName fullName email');
    const coordinators = await User.find({ role: 'Coordinator' }).select('userName fullName email');
    
    console.log('👥 USERS:');
    console.log(`  Total Users: ${totalUsers}`);
    console.log(`  Teachers: ${teachers.length}`);
    console.log(`  Coordinators: ${coordinators.length}`);
    
    if (teachers.length > 0) {
      console.log('  📋 Teacher Details:');
      teachers.forEach(teacher => {
        console.log(`    - ${teacher.fullName?.firstName || 'N/A'} ${teacher.fullName?.lastName || 'N/A'} (${teacher.userName}) - ${teacher.email}`);
      });
    }

    // Check Classes
    const totalClasses = await Class.countDocuments();
    const activeClasses = await Class.find({ isActive: true }).select('name grade campus floor');
    
    console.log('\n🏫 CLASSES:');
    console.log(`  Total Classes: ${totalClasses}`);
    console.log(`  Active Classes: ${activeClasses.length}`);
    
    if (activeClasses.length > 0) {
      console.log('  📋 Class Details:');
      const floorGroups = {};
      activeClasses.forEach(cls => {
        if (!floorGroups[cls.floor]) floorGroups[cls.floor] = [];
        floorGroups[cls.floor].push(cls);
      });
      
      Object.keys(floorGroups).sort().forEach(floor => {
        console.log(`    Floor ${floor}:`);
        floorGroups[floor].forEach(cls => {
          console.log(`      - ${cls.name} (${cls.grade} ${cls.campus})`);
        });
      });
    }

    // Check Timetable
    const totalTimetable = await Timetable.countDocuments();
    const activeTimetable = await Timetable.countDocuments({ isActive: true });
    
    console.log('\n📅 TIMETABLE:');
    console.log(`  Total Entries: ${totalTimetable}`);
    console.log(`  Active Entries: ${activeTimetable}`);
    
    if (activeTimetable > 0) {
      // Get today's timetable
      const today = new Date();
      const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
      
      const todayTimetable = await Timetable.find({ 
        dayOfWeek: currentDay, 
        isActive: true 
      })
      .populate('teacherId', 'fullName')
      .populate('classId', 'name floor')
      .sort({ 'classId.floor': 1, startTime: 1 });
      
      console.log(`  Today (${currentDay}): ${todayTimetable.length} lectures`);
      
      if (todayTimetable.length > 0) {
        console.log('  📋 Today\'s Schedule Sample (first 5):');
        todayTimetable.slice(0, 5).forEach(entry => {
          console.log(`    ${entry.startTime}-${entry.endTime} | Floor ${entry.classId.floor} | ${entry.classId.name} | ${entry.subject} | ${entry.teacherId?.fullName?.firstName || 'N/A'} ${entry.teacherId?.fullName?.lastName || 'N/A'}`);
        });
      }
    }

    // Check Teacher Attendance
    const totalAttendance = await TeacherAttendance.countDocuments();
    const todayAttendance = await TeacherAttendance.countDocuments({
      date: {
        $gte: new Date(new Date().setHours(0, 0, 0, 0)),
        $lt: new Date(new Date().setHours(23, 59, 59, 999))
      }
    });
    
    console.log('\n📊 TEACHER ATTENDANCE:');
    console.log(`  Total Records: ${totalAttendance}`);
    console.log(`  Today's Records: ${todayAttendance}`);

    // Summary and recommendations
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (teachers.length === 0) {
      console.log('  ❌ No teachers found. Run: npm run seed');
    }
    
    if (activeClasses.length === 0) {
      console.log('  ❌ No classes found. Run: npm run seed');
    }
    
    if (activeTimetable === 0) {
      console.log('  ❌ No timetable found. Run: npm run seed:current-week');
    } else {
      console.log('  ✅ Timetable exists. You can test attendance management!');
    }
    
    console.log('\n📝 TESTING STEPS:');
    console.log('  1. Ensure server is running: npm start');
    console.log('  2. Login as Coordinator');
    console.log('  3. Go to Teacher Attendance Management');
    console.log('  4. Select today\'s date');
    console.log('  5. Expand teachers to see their lectures');
    console.log('  6. Mark attendance for lectures');

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📤 Database connection closed');
  }
};

// Run the check
connectDB().then(() => {
  checkData();
});