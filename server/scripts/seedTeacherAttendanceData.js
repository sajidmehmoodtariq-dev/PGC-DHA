const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const TeacherAttendance = require('../models/TeacherAttendance');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');

const seedTeacherAttendanceData = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Get all teachers
    const teachers = await User.find({ role: 'Teacher' });
    console.log(`Found ${teachers.length} teachers`);

    if (teachers.length === 0) {
      console.log('No teachers found. Exiting...');
      await mongoose.disconnect();
      return;
    }

    // Get existing class
    const existingClass = await Class.findOne();
    if (!existingClass) {
      console.log('No classes found. Cannot create timetable without a class.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Using class: ${existingClass.name} (ID: ${existingClass._id})`);

    // Get current week date range
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // End of current week (Saturday)
    endOfWeek.setHours(23, 59, 59, 999);

    console.log(`Creating data for week: ${startOfWeek.toDateString()} to ${endOfWeek.toDateString()}`);

    // Clear existing data for this week
    await Timetable.deleteMany({
      date: { $gte: startOfWeek, $lte: endOfWeek }
    });
    await TeacherAttendance.deleteMany({
      date: { $gte: startOfWeek, $lte: endOfWeek }
    });

    console.log('Cleared existing weekly data');

    // Create timetable and attendance data for each teacher
    const timetableData = [];

    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      
      // Create 5 days of classes for each teacher (Monday-Friday)
      for (let dayOffset = 1; dayOffset <= 5; dayOffset++) {
        const classDate = new Date(startOfWeek);
        classDate.setDate(startOfWeek.getDate() + dayOffset);
        
        // Create 2 classes per day for each teacher
        for (let classIndex = 0; classIndex < 2; classIndex++) {
          const startHour = 9 + (classIndex * 2); // 9 AM, 11 AM, etc.
          const endHour = startHour + 1;
          
          const startTime = `${startHour.toString().padStart(2, '0')}:00`;
          const endTime = `${endHour.toString().padStart(2, '0')}:00`;

          // Get day name
          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayOfWeek = dayNames[classDate.getDay()];

          // Create timetable entry
          timetableData.push({
            title: `${teacher.fullName.firstName} ${teacher.fullName.lastName} - Subject ${i + 1}`,
            classId: existingClass._id,
            teacherId: teacher._id,
            subject: `Subject ${i + 1}`,
            dayOfWeek: dayOfWeek,
            date: new Date(classDate),
            startTime: startTime,
            endTime: endTime,
            room: `Room ${100 + i}`,
            description: `${teacher.fullName.firstName}'s class`,
            createdBy: teacher._id, // Required field
            academicYear: `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`
          });

          // Add some variety to attendance patterns will be handled after timetable creation
        }
      }
    }

    // Insert timetable data first
    console.log(`Inserting ${timetableData.length} timetable entries...`);
    const createdTimetables = await Timetable.insertMany(timetableData);
    console.log('✅ Timetable data inserted successfully');

    // Now create attendance data linked to timetables
    console.log('Creating attendance records...');
    const attendanceData = [];

    for (let i = 0; i < createdTimetables.length; i++) {
      const timetable = createdTimetables[i];
      
      // Add some variety to attendance patterns
      let status = 'On Time';
      let lateMinutes = undefined;
      let lateType = undefined;
      let notes = 'Regular attendance';

      const randomFactor = Math.random();
      
      if (randomFactor < 0.1) { // 10% chance of being late
        status = 'Late';
        const lateMins = [1, 2, 3, 4, 5, 10][Math.floor(Math.random() * 6)];
        lateMinutes = lateMins;
        lateType = `${lateMins} min`;
        notes = `Arrived ${lateMins} minutes late`;
      } else if (randomFactor < 0.15) { // 5% chance of being absent
        status = 'Absent';
        notes = 'Absent from class';
      }

      // Create attendance record
      attendanceData.push({
        teacherId: timetable.teacherId,
        timetableId: timetable._id,
        classId: timetable.classId,
        date: timetable.date,
        status: status,
        lateMinutes: lateMinutes,
        lateType: lateType,
        subject: timetable.subject,
        lectureType: 'Theory',
        remarks: notes,
        markedBy: timetable.createdBy, // Use the same person who created timetable
        floor: Math.floor(Math.random() * 4) + 1, // Random floor 1-4
        isManualEntry: false
      });
    }

    // Insert attendance data
    console.log(`Inserting ${attendanceData.length} attendance records...`);
    await TeacherAttendance.insertMany(attendanceData);
    console.log('✅ Attendance data inserted successfully');

    // Display summary
    console.log('\n=== SUMMARY ===');
    console.log(`Teachers: ${teachers.length}`);
    console.log(`Timetable entries: ${timetableData.length}`);
    console.log(`Attendance records: ${attendanceData.length}`);
    
    // Show attendance statistics
    const presentCount = attendanceData.filter(a => a.status === 'Present').length;
    const lateCount = attendanceData.filter(a => a.status === 'Late').length;
    const absentCount = attendanceData.filter(a => a.status === 'Absent').length;
    
    console.log(`\nAttendance Breakdown:`);
    console.log(`Present: ${presentCount} (${((presentCount/attendanceData.length)*100).toFixed(1)}%)`);
    console.log(`Late: ${lateCount} (${((lateCount/attendanceData.length)*100).toFixed(1)}%)`);
    console.log(`Absent: ${absentCount} (${((absentCount/attendanceData.length)*100).toFixed(1)}%)`);

    // Show late teachers
    const lateTeachers = attendanceData.filter(a => a.minutesLate > 10);
    console.log(`\nTeachers late >10 minutes: ${lateTeachers.length} instances`);

    console.log('\n🎯 Teacher attendance data has been seeded successfully!');
    console.log('You can now view the Teacher Profiles dashboard with real data.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding teacher attendance data:', error);
    process.exit(1);
  }
};

seedTeacherAttendanceData();
