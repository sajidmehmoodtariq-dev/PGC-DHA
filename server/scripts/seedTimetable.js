const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for Timetable Seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedTimetable = async () => {
  try {
    console.log('🚀 Starting timetable seeding...');

    // Get all teachers
    const teachers = await User.find({ role: 'Teacher' });
    console.log(`Found ${teachers.length} teachers`);

    if (teachers.length === 0) {
      console.log('❌ No teachers found. Creating a demo teacher...');
      
      // Create a demo teacher
      const demoTeacher = new User({
        userName: 'teacher_demo',
        email: 'teacher.demo@pgcdha.edu.pk',
        password: '$2a$10$rQZ9QmjlQX8vKGVwNQm8/.HqE8B8qYjQQm8vKGVwNQm8/.HqE8B8qY', // password: teacher123
        role: 'Teacher',
        fullName: {
          firstName: 'Ahmad',
          lastName: 'Khan'
        },
        phoneNumber: '+92-300-1234567',
        isActive: true,
        isApproved: true,
        createdOn: new Date()
      });
      
      await demoTeacher.save();
      teachers.push(demoTeacher);
      console.log('✅ Demo teacher created');
    }

    // Get all classes
    let classes = await Class.find({ isActive: true });
    console.log(`Found ${classes.length} classes`);

    if (classes.length === 0) {
      console.log('❌ No classes found. Creating demo classes...');
      
      // Create demo classes for all floors
      const demoClasses = [
        {
          name: '11-A Boys',
          grade: '11th',
          campus: 'Boys',
          program: 'ICS',
          floor: 1,
          capacity: 30,
          isActive: true
        },
        {
          name: '12-A Boys',
          grade: '12th',
          campus: 'Boys',
          program: 'ICS',
          floor: 2,
          capacity: 30,
          isActive: true
        },
        {
          name: '11-A Girls',
          grade: '11th',
          campus: 'Girls',
          program: 'ICS',
          floor: 3,
          capacity: 30,
          isActive: true
        },
        {
          name: '12-A Girls',
          grade: '12th',
          campus: 'Girls',
          program: 'ICS',
          floor: 4,
          capacity: 30,
          isActive: true
        }
      ];

      for (const classData of demoClasses) {
        const newClass = new Class(classData);
        await newClass.save();
        classes.push(newClass);
      }
      
      console.log('✅ Demo classes created');
    }

    // Clear existing timetable
    await Timetable.deleteMany({});
    console.log('🗑️ Cleared existing timetable');

    // Create comprehensive timetable for the week
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'English', 'Urdu'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
      { start: '08:00', end: '08:40' },
      { start: '08:40', end: '09:20' },
      { start: '09:20', end: '10:00' },
      { start: '10:20', end: '11:00' }, // 20 min break
      { start: '11:00', end: '11:40' },
      { start: '11:40', end: '12:20' },
      { start: '12:20', end: '13:00' },
      { start: '14:00', end: '14:40' }, // Lunch break
      { start: '14:40', end: '15:20' }
    ];

    const lectureTypes = ['Theory', 'Practical', 'Lab'];
    let timetableEntries = [];

    // Use the first teacher for all classes (since we might have only one)
    const mainTeacher = teachers[0];
    console.log(`Using teacher: ${mainTeacher.fullName.firstName} ${mainTeacher.fullName.lastName}`);

    // Create timetable for each class and day
    for (const classItem of classes) {
      for (const day of days) {
        // Create 4-6 lectures per day per class
        const lecturesPerDay = Math.floor(Math.random() * 3) + 4; // 4-6 lectures
        
        for (let i = 0; i < lecturesPerDay && i < timeSlots.length; i++) {
          const subject = subjects[Math.floor(Math.random() * subjects.length)];
          const lectureType = subject === 'Computer Science' ? 
            lectureTypes[Math.floor(Math.random() * lectureTypes.length)] : 'Theory';
          
          const timetableEntry = {
            title: `${subject} - ${classItem.name}`,
            academicYear: '2024-2025',
            classId: classItem._id,
            dayOfWeek: day,
            startTime: timeSlots[i].start,
            endTime: timeSlots[i].end,
            teacherId: mainTeacher._id,
            subject: subject,
            lectureType: lectureType,
            isActive: true,
            createdBy: mainTeacher._id,
            createdOn: new Date()
          };

          timetableEntries.push(timetableEntry);
        }
      }
    }

    // Insert all timetable entries
    await Timetable.insertMany(timetableEntries);
    console.log(`✅ Created ${timetableEntries.length} timetable entries`);

    // Summary
    console.log('\n📊 TIMETABLE SEEDING SUMMARY:');
    console.log(`👨‍🏫 Teachers: ${teachers.length}`);
    console.log(`🏫 Classes: ${classes.length}`);
    console.log(`📅 Timetable Entries: ${timetableEntries.length}`);
    console.log(`📚 Subjects: ${subjects.join(', ')}`);
    console.log(`📆 Days: ${days.join(', ')}`);

    // Show sample timetable for Monday
    console.log('\n📋 SAMPLE MONDAY TIMETABLE:');
    const mondayTimetable = await Timetable.find({ dayOfWeek: 'Monday' })
      .populate('teacherId', 'fullName')
      .populate('classId', 'name floor')
      .sort({ 'classId.floor': 1, startTime: 1 })
      .limit(10);

    mondayTimetable.forEach(entry => {
      console.log(`${entry.startTime}-${entry.endTime} | Floor ${entry.classId.floor} | ${entry.classId.name} | ${entry.subject} | ${entry.teacherId.fullName.firstName} ${entry.teacherId.fullName.lastName}`);
    });

    console.log('\n🎉 Timetable seeding completed successfully!');
    console.log('\n💡 You can now test the Teacher Attendance Management system');
    console.log('📝 The system will show scheduled lectures for each teacher by date');

  } catch (error) {
    console.error('❌ Error seeding timetable:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the seeding
connectDB().then(() => {
  seedTimetable();
});