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
    console.log('MongoDB Connected for Current Week Timetable Seeding');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const seedCurrentWeekTimetable = async () => {
  try {
    console.log('🚀 Starting current week timetable seeding...');

    // Get current date info
    const today = new Date();
    const currentDay = today.toLocaleDateString('en-US', { weekday: 'long' });
    console.log(`Today is: ${currentDay} (${today.toDateString()})`);

    // Get all teachers
    const teachers = await User.find({ role: 'Teacher' });
    console.log(`Found ${teachers.length} teachers`);

    if (teachers.length === 0) {
      console.log('❌ No teachers found. Please run the main seed script first.');
      return;
    }

    // Get all classes
    const classes = await Class.find({ isActive: true });
    console.log(`Found ${classes.length} classes`);

    if (classes.length === 0) {
      console.log('❌ No classes found. Please run the main seed script first.');
      return;
    }

    // Clear existing timetable
    await Timetable.deleteMany({});
    console.log('🗑️ Cleared existing timetable');

    // Create timetable for current week with focus on today
    const subjects = ['Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'English', 'Urdu'];
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    
    // Today's schedule (more detailed)
    const todayTimeSlots = [
      { start: '08:00', end: '08:40' },
      { start: '08:40', end: '09:20' },
      { start: '09:20', end: '10:00' },
      { start: '10:20', end: '11:00' },
      { start: '11:00', end: '11:40' },
      { start: '11:40', end: '12:20' },
      { start: '12:20', end: '13:00' },
      { start: '14:00', end: '14:40' },
      { start: '14:40', end: '15:20' }
    ];

    // Other days schedule (lighter)
    const regularTimeSlots = [
      { start: '08:00', end: '08:40' },
      { start: '08:40', end: '09:20' },
      { start: '10:20', end: '11:00' },
      { start: '11:00', end: '11:40' },
      { start: '14:00', end: '14:40' }
    ];

    const lectureTypes = ['Theory', 'Practical', 'Lab'];
    let timetableEntries = [];

    // Use the first teacher for all classes
    const mainTeacher = teachers[0];
    console.log(`Using teacher: ${mainTeacher.fullName.firstName} ${mainTeacher.fullName.lastName}`);

    // Create timetable for each class and day
    for (const classItem of classes) {
      for (const day of days) {
        // Use detailed schedule for today, lighter for other days
        const timeSlots = day === currentDay ? todayTimeSlots : regularTimeSlots;
        
        for (let i = 0; i < timeSlots.length; i++) {
          const subject = subjects[i % subjects.length]; // Rotate through subjects
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

    // Show today's detailed schedule
    console.log(`\n📋 TODAY'S SCHEDULE (${currentDay}):`);
    const todayTimetable = await Timetable.find({ dayOfWeek: currentDay })
      .populate('teacherId', 'fullName')
      .populate('classId', 'name floor')
      .sort({ 'classId.floor': 1, startTime: 1 });

    console.log(`\n🏫 FLOOR-WISE SCHEDULE FOR ${currentDay.toUpperCase()}:`);
    
    for (let floor = 1; floor <= 4; floor++) {
      const floorLectures = todayTimetable.filter(entry => entry.classId.floor === floor);
      if (floorLectures.length > 0) {
        console.log(`\n📍 FLOOR ${floor}:`);
        floorLectures.forEach(entry => {
          console.log(`  ${entry.startTime}-${entry.endTime} | ${entry.classId.name} | ${entry.subject} (${entry.lectureType}) | ${entry.teacherId.fullName.firstName} ${entry.teacherId.fullName.lastName}`);
        });
      }
    }

    // Summary
    console.log('\n📊 CURRENT WEEK TIMETABLE SUMMARY:');
    console.log(`👨‍🏫 Teachers: ${teachers.length}`);
    console.log(`🏫 Classes: ${classes.length}`);
    console.log(`📅 Total Entries: ${timetableEntries.length}`);
    console.log(`📅 Today's Entries: ${todayTimetable.length}`);
    console.log(`📚 Subjects: ${subjects.join(', ')}`);

    console.log('\n🎉 Current week timetable seeding completed!');
    console.log('\n💡 TESTING INSTRUCTIONS:');
    console.log('1. Start the server: npm start');
    console.log('2. Go to Coordinator Dashboard');
    console.log('3. Open Teacher Attendance Management');
    console.log(`4. Select today's date (${today.toISOString().split('T')[0]})`);
    console.log('5. You should see teachers with their scheduled lectures');
    console.log('6. Click on a teacher to expand and see their lectures');
    console.log('7. Mark attendance for each lecture');

  } catch (error) {
    console.error('❌ Error seeding current week timetable:', error);
  } finally {
    await mongoose.connection.close();
    console.log('📤 Database connection closed');
  }
};

// Run the seeding
connectDB().then(() => {
  seedCurrentWeekTimetable();
});