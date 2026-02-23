const mongoose = require('mongoose');
require('dotenv').config();

const TeacherAttendance = require('../models/TeacherAttendance');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const Class = require('../models/Class');

async function createLateTeacherTestData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find some teachers
    const teachers = await User.find({ role: 'Teacher' }).limit(5);
    if (teachers.length === 0) {
      console.log('No teachers found in the system. Please create some teachers first.');
      return;
    }

    // Find some classes
    const classes = await Class.find({}).limit(5);
    if (classes.length === 0) {
      console.log('No classes found in the system. Please create some classes first.');
      return;
    }

    console.log(`Found ${teachers.length} teachers and ${classes.length} classes`);

    // Create test timetable entries for today
    const timetableEntries = [];
    const attendanceEntries = [];

    for (let i = 0; i < Math.min(teachers.length, 3); i++) {
      const teacher = teachers[i];
      const classDoc = classes[i % classes.length];
      
      // Create morning class (9:00 AM)
      const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
      const dayName = dayNames[today.getDay()];
      const academicYear = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;

      const morningTimetable = {
        title: `${classDoc.name} - ${teacher.fullName.firstName} (${dayName} 09:00)` ,
        teacherId: teacher._id,
        classId: classDoc._id,
        subject: ['Mathematics', 'Physics', 'Chemistry', 'Biology', 'English'][i % 5],
        startTime: '09:00',
        endTime: '10:00',
        dayOfWeek: dayName === 'Sunday' ? 'Monday' : dayName,
        academicYear,
        lectureType: 'Theory',
        createdBy: teacher._id,
        isActive: true
      };

      // Create afternoon class (2:00 PM)
      const afternoonTimetable = {
        title: `${classDoc.name} - ${teacher.fullName.firstName} (${dayName} 14:00)` ,
        teacherId: teacher._id,
        classId: classDoc._id,
        subject: ['Computer Science', 'Urdu', 'Islamiat', 'Pakistan Studies', 'Economics'][i % 5],
        startTime: '14:00',
        endTime: '15:00',
        dayOfWeek: dayName === 'Sunday' ? 'Monday' : dayName,
        academicYear,
        lectureType: 'Theory',
        createdBy: teacher._id,
        isActive: true
      };

      timetableEntries.push(morningTimetable, afternoonTimetable);
    }

    // Insert timetable entries
    const createdTimetables = await Timetable.insertMany(timetableEntries);
    console.log(`Created ${createdTimetables.length} timetable entries for today`);

    // Create late attendance records
    for (let i = 0; i < createdTimetables.length; i++) {
      const timetable = createdTimetables[i];
      const lateMinutes = [12, 15, 25, 35, 45][i % 5]; // Different late durations
      
      const attendanceRecord = {
        teacherId: timetable.teacherId,
        timetableId: timetable._id,
        classId: timetable.classId,
        date: today,
        status: 'Late',
        lateMinutes: lateMinutes,
        lateType: lateMinutes <= 10 ? `${lateMinutes} min` : 'Custom',
        subject: timetable.subject,
        lectureType: timetable.lectureType,
        remarks: `Teacher arrived ${lateMinutes} minutes late to class`,
        markedBy: timetable.createdBy,
        floor: Math.floor(Math.random() * 4) + 1, // Random floor 1-4
        isManualEntry: true
      };

      attendanceEntries.push(attendanceRecord);
    }

    // Insert attendance records
    const createdAttendance = await TeacherAttendance.insertMany(attendanceEntries);
    console.log(`Created ${createdAttendance.length} late teacher attendance records`);

    // Display summary
    console.log('\n=== LATE TEACHER TEST DATA SUMMARY ===');
    
    const lateTeachers = await TeacherAttendance.find({
      date: today,
      status: 'Late',
      lateMinutes: { $gte: 10 }
    }).populate('teacherId', 'fullName userName').populate('classId', 'name grade');

    console.log(`Teachers late by 10+ minutes today: ${lateTeachers.length}`);
    
    lateTeachers.forEach((record, index) => {
      const teacher = record.teacherId;
      const className = record.classId;
      console.log(`${index + 1}. ${teacher.fullName?.firstName} ${teacher.fullName?.lastName || ''} (${teacher.userName})`);
      console.log(`   Class: ${className.name} - ${className.grade}`);
      console.log(`   Subject: ${record.subject}`);
      console.log(`   Late by: ${record.lateMinutes} minutes`);
      console.log(`   Floor: ${record.floor}`);
      console.log('');
    });

    console.log('\n🎯 Late teacher test data created successfully!');
    console.log('You can now test the Principal Dashboard notifications.');
    console.log('The notifications should show teachers who are late by 10+ minutes.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error creating late teacher test data:', error);
    process.exit(1);
  }
}

// Run the script
createLateTeacherTestData();
