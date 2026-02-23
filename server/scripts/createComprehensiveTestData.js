const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
const TeacherAttendance = require('../models/TeacherAttendance');
const Test = require('../models/Test');

async function createComprehensiveTestData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Clear existing test data
    console.log('\n🧹 Cleaning existing test data...');
    await TeacherAttendance.deleteMany({});
    await Timetable.deleteMany({});
    await Test.deleteMany({ title: /Test/ }); // Only delete test entries
    
    // Get today's date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // 1. Create Sample Teachers (if they don't exist)
    console.log('\n👨‍🏫 Creating sample teachers...');
    
    const teachersData = [
      {
        userName: 'ahmed.hassan',
        email: 'ahmed.hassan@pgc.edu.pk',
        password: '$2b$12$LQv3c1yqBwEHxE9OdgyThOP9NXjLZpEFbdS9O/2f.Fa6gKt0qYzx6', // password123
        role: 'Teacher',
        fullName: { firstName: 'Ahmed', lastName: 'Hassan' },
        employeeId: 'TCH001',
        contactInfo: { phone: '03001234567', address: 'Lahore' },
        isActive: true
      },
      {
        userName: 'fatima.khan',
        email: 'fatima.khan@pgc.edu.pk',
        password: '$2b$12$LQv3c1yqBwEHxE9OdgyThOP9NXjLZpEFbdS9O/2f.Fa6gKt0qYzx6',
        role: 'Teacher',
        fullName: { firstName: 'Fatima', lastName: 'Khan' },
        employeeId: 'TCH002',
        contactInfo: { phone: '03001234568', address: 'Lahore' },
        isActive: true
      },
      {
        userName: 'muhammad.ali',
        email: 'muhammad.ali@pgc.edu.pk',
        password: '$2b$12$LQv3c1yqBwEHxE9OdgyThOP9NXjLZpEFbdS9O/2f.Fa6gKt0qYzx6',
        role: 'Teacher',
        fullName: { firstName: 'Muhammad', lastName: 'Ali' },
        employeeId: 'TCH003',
        contactInfo: { phone: '03001234569', address: 'Lahore' },
        isActive: true
      },
      {
        userName: 'sarah.malik',
        email: 'sarah.malik@pgc.edu.pk',
        password: '$2b$12$LQv3c1yqBwEHxE9OdgyThOP9NXjLZpEFbdS9O/2f.Fa6gKt0qYzx6',
        role: 'Teacher',
        fullName: { firstName: 'Sarah', lastName: 'Malik' },
        employeeId: 'TCH004',
        contactInfo: { phone: '03001234570', address: 'Lahore' },
        isActive: true
      },
      {
        userName: 'hassan.raza',
        email: 'hassan.raza@pgc.edu.pk',
        password: '$2b$12$LQv3c1yqBwEHxE9OdgyThOP9NXjLZpEFbdS9O/2f.Fa6gKt0qYzx6',
        role: 'Teacher',
        fullName: { firstName: 'Hassan', lastName: 'Raza' },
        employeeId: 'TCH005',
        contactInfo: { phone: '03001234571', address: 'Lahore' },
        isActive: true
      }
    ];

    // Create teachers (upsert to avoid duplicates)
    const teachers = [];
    for (const teacherData of teachersData) {
      let teacher = await User.findOne({ userName: teacherData.userName });
      if (!teacher) {
        teacher = await User.create(teacherData);
        console.log(`✅ Created teacher: ${teacher.fullName.firstName} ${teacher.fullName.lastName}`);
      } else {
        console.log(`⏭️  Teacher already exists: ${teacher.fullName.firstName} ${teacher.fullName.lastName}`);
      }
      teachers.push(teacher);
    }

    // 2. Create Sample Classes (if they don't exist)
    console.log('\n🏫 Creating sample classes...');
    
    const classesData = [
      {
        name: 'FSc Pre-Medical',
        grade: '11th',
        section: 'A',
        campus: 'DHA Campus',
        program: 'FSc',
        floor: 1,
        capacity: 30,
        isActive: true
      },
      {
        name: 'FSc Pre-Engineering',
        grade: '11th',
        section: 'B',
        campus: 'DHA Campus',
        program: 'FSc',
        floor: 2,
        capacity: 30,
        isActive: true
      },
      {
        name: 'ICS Computer Science',
        grade: '12th',
        section: 'A',
        campus: 'DHA Campus',
        program: 'ICS',
        floor: 2,
        capacity: 25,
        isActive: true
      },
      {
        name: 'FA Humanities',
        grade: '11th',
        section: 'C',
        campus: 'DHA Campus',
        program: 'FA',
        floor: 3,
        capacity: 28,
        isActive: true
      },
      {
        name: 'Commerce',
        grade: '12th',
        section: 'B',
        campus: 'DHA Campus',
        program: 'Commerce',
        floor: 3,
        capacity: 32,
        isActive: true
      }
    ];

    const classes = [];
    for (const classData of classesData) {
      let classDoc = await Class.findOne({ 
        name: classData.name, 
        grade: classData.grade, 
        section: classData.section 
      });
      if (!classDoc) {
        classDoc = await Class.create(classData);
        console.log(`✅ Created class: ${classDoc.name} - ${classDoc.grade}${classDoc.section}`);
      } else {
        console.log(`⏭️  Class already exists: ${classDoc.name} - ${classDoc.grade}${classDoc.section}`);
      }
      classes.push(classDoc);
    }

    // 3. Create Today's Timetable Entries
    console.log('\n📅 Creating today\'s timetable entries...');
    
    const subjects = [
      'Mathematics', 'Physics', 'Chemistry', 'Biology', 'English',
      'Computer Science', 'Urdu', 'Islamiat', 'Pakistan Studies', 'Economics'
    ];

    const timeSlots = [
      { start: '08:00', end: '09:00' },
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:30', end: '12:30' }, // After break
      { start: '12:30', end: '13:30' },
      { start: '14:00', end: '15:00' }, // After lunch
      { start: '15:00', end: '16:00' }
    ];

    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    
    const timetableEntries = [];
    
    // Create multiple classes for each teacher today
    for (let i = 0; i < teachers.length; i++) {
      const teacher = teachers[i];
      
      // Each teacher gets 2-3 classes today
      const classCount = Math.floor(Math.random() * 2) + 2; // 2-3 classes
      
      for (let j = 0; j < classCount; j++) {
        const classDoc = classes[j % classes.length];
        const timeSlot = timeSlots[(i * classCount + j) % timeSlots.length];
        const subject = subjects[(i * classCount + j) % subjects.length];
        
        const timetableEntry = {
          teacherId: teacher._id,
          classId: classDoc._id,
          subject: subject,
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          dayOfWeek: dayOfWeek,
          date: today,
          lectureType: Math.random() > 0.7 ? 'Practical' : 'Theory',
          createdBy: teacher._id,
          isActive: true
        };

        timetableEntries.push(timetableEntry);
      }
    }

    const createdTimetables = await Timetable.insertMany(timetableEntries);
    console.log(`✅ Created ${createdTimetables.length} timetable entries for today`);

    // 4. Create Late Teacher Attendance Records (for testing notifications)
    console.log('\n⏰ Creating late teacher attendance records...');
    
    const lateAttendanceRecords = [];
    
    // Make some teachers late with different severity levels
    for (let i = 0; i < Math.min(createdTimetables.length, 8); i++) {
      const timetable = createdTimetables[i];
      
      // Create different late scenarios
      let lateMinutes, status, remarks;
      
      if (i < 3) {
        // Critical late (40+ minutes)
        lateMinutes = 40 + Math.floor(Math.random() * 20); // 40-59 minutes
        status = 'Late';
        remarks = `Teacher arrived ${lateMinutes} minutes late - traffic jam`;
      } else if (i < 5) {
        // High late (20-39 minutes)
        lateMinutes = 20 + Math.floor(Math.random() * 19); // 20-38 minutes
        status = 'Late';
        remarks = `Teacher arrived ${lateMinutes} minutes late - personal emergency`;
      } else {
        // Medium late (10-19 minutes)
        lateMinutes = 10 + Math.floor(Math.random() * 9); // 10-18 minutes
        status = 'Late';
        remarks = `Teacher arrived ${lateMinutes} minutes late - delayed transport`;
      }

      const attendanceRecord = {
        teacherId: timetable.teacherId,
        timetableId: timetable._id,
        classId: timetable.classId,
        date: today,
        status: status,
        lateMinutes: lateMinutes,
        lateType: lateMinutes <= 10 ? `${lateMinutes} min` : 'Custom',
        subject: timetable.subject,
        lectureType: timetable.lectureType,
        remarks: remarks,
        markedBy: timetable.createdBy,
        floor: Math.floor(Math.random() * 4) + 1, // Random floor 1-4
        isManualEntry: true,
        createdOn: new Date(today.getTime() + (i * 10 * 60 * 1000)) // Stagger the times
      };

      lateAttendanceRecords.push(attendanceRecord);
    }

    const createdAttendance = await TeacherAttendance.insertMany(lateAttendanceRecords);
    console.log(`✅ Created ${createdAttendance.length} late teacher attendance records`);

    // 5. Create Some Late Test Submissions (for marksheet notifications)
    console.log('\n📝 Creating late test submission scenarios...');
    
    const lateTests = [];
    
    for (let i = 0; i < 3; i++) {
      const teacher = teachers[i % teachers.length];
      const classDoc = classes[i % classes.length];
      
      // Create tests with deadlines that have passed
      const hoursLate = [2, 5, 12][i]; // Different levels of lateness
      const deadline = new Date(today.getTime() - (hoursLate * 60 * 60 * 1000)); // Hours ago
      
      const test = {
        title: `Test ${i + 1} - ${subjects[i]} Quiz`,
        subject: subjects[i],
        testDate: new Date(today.getTime() - (24 * 60 * 60 * 1000)), // Yesterday
        marksEntryDeadline: deadline,
        totalMarks: 100,
        assignedTeacher: teacher._id,
        classId: classDoc._id,
        isActive: true,
        createdBy: teacher._id
      };

      lateTests.push(test);
    }

    const createdTests = await Test.insertMany(lateTests);
    console.log(`✅ Created ${createdTests.length} late test submission scenarios`);

    // 6. Display Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST DATA SUMMARY');
    console.log('='.repeat(50));
    
    console.log(`\n👨‍🏫 Teachers: ${teachers.length}`);
    teachers.forEach((teacher, index) => {
      console.log(`   ${index + 1}. ${teacher.fullName.firstName} ${teacher.fullName.lastName} (${teacher.userName})`);
    });

    console.log(`\n🏫 Classes: ${classes.length}`);
    classes.forEach((classDoc, index) => {
      console.log(`   ${index + 1}. ${classDoc.name} - ${classDoc.grade}${classDoc.section} (Floor ${classDoc.floor})`);
    });

    console.log(`\n📅 Today's Timetable Entries: ${createdTimetables.length}`);
    
    console.log(`\n⏰ Late Teacher Notifications: ${createdAttendance.length}`);
    const criticalLate = createdAttendance.filter(r => r.lateMinutes >= 40);
    const highLate = createdAttendance.filter(r => r.lateMinutes >= 20 && r.lateMinutes < 40);
    const mediumLate = createdAttendance.filter(r => r.lateMinutes >= 10 && r.lateMinutes < 20);
    
    console.log(`   🔴 Critical (40+ min): ${criticalLate.length}`);
    console.log(`   🟠 High (20-39 min): ${highLate.length}`);
    console.log(`   🟡 Medium (10-19 min): ${mediumLate.length}`);

    console.log(`\n📝 Late Test Submissions: ${createdTests.length}`);

    console.log('\n' + '='.repeat(50));
    console.log('🎯 TESTING INSTRUCTIONS');
    console.log('='.repeat(50));
    console.log('1. Start the development servers:');
    console.log('   Backend: cd server && npm run dev');
    console.log('   Frontend: cd client && npm run dev');
    console.log('');
    console.log('2. Login as Principal user');
    console.log('');
    console.log('3. Go to Principal Dashboard');
    console.log('');
    console.log('4. You should see:');
    console.log(`   - ${createdAttendance.length} Late Teacher Alerts`);
    console.log(`   - ${createdTests.length} Late Marksheet Alerts`);
    console.log('');
    console.log('5. Test the action buttons:');
    console.log('   - Take Action on notifications');
    console.log('   - Try different action types');
    console.log('   - Check dismissal functionality');
    console.log('');
    console.log('🚀 Ready to test the notification system!');

    await mongoose.disconnect();
    console.log('\n✅ Database connection closed');

  } catch (error) {
    console.error('❌ Error creating test data:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  createComprehensiveTestData();
}

module.exports = createComprehensiveTestData;
