const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');

const addTodayTimetable = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgc-dha');
    console.log('Connected to MongoDB successfully!');

    // Get today's date and day of week
    const today = new Date();
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    const todayString = today.toISOString().split('T')[0];
    
    console.log(`\n📅 Adding timetable for ${dayOfWeek} (${todayString})`);

    // Get test teachers
    const teachers = await User.find({ userName: /^test_teacher_/ });
    if (teachers.length === 0) {
      console.log('❌ No test teachers found. Please run the seed script first.');
      return;
    }

    // Get test classes
    const classes = await Class.find({ name: /^Test/ });
    if (classes.length === 0) {
      console.log('❌ No test classes found. Please run the seed script first.');
      return;
    }

    // Get coordinator
    const coordinator = await User.findOne({ userName: 'test_coordinator' });
    if (!coordinator) {
      console.log('❌ No test coordinator found. Please run the seed script first.');
      return;
    }

    // Check if timetable already exists for today
    const existingEntries = await Timetable.find({
      dayOfWeek,
      teacherId: { $in: teachers.map(t => t._id) }
    });

    if (existingEntries.length > 0) {
      console.log(`✅ Timetable already exists for ${dayOfWeek} (${existingEntries.length} entries)`);
      console.log('Existing entries:', existingEntries.map(e => `${e.subject} at ${e.startTime}`));
      return;
    }

    // Create timetable entries for today
    const subjects = {
      'Pre Medical': ['Biology', 'Chemistry', 'Physics', 'English', 'Urdu', 'Islamic Studies'],
      'Pre Engineering': ['Mathematics', 'Physics', 'Chemistry', 'English', 'Urdu', 'Computer Science'],
      'ICS-PHY': ['Computer Science', 'Mathematics', 'Physics', 'English', 'Urdu', 'Statistics']
    };

    const timeSlots = [
      { start: '08:00', end: '08:45' },
      { start: '08:45', end: '09:30' },
      { start: '09:30', end: '10:15' },
      { start: '10:30', end: '11:15' },
      { start: '11:15', end: '12:00' },
      { start: '12:00', end: '12:45' }
    ];

    const timetableEntries = [];

    for (const classDoc of classes) {
      const classSubjects = subjects[classDoc.program] || subjects['Pre Medical'];
      
      // Create 3-4 lectures per class for today
      const numLectures = Math.floor(Math.random() * 2) + 3; // 3-4 lectures
      
      for (let i = 0; i < numLectures && i < timeSlots.length; i++) {
        const slot = timeSlots[i];
        const subject = classSubjects[i % classSubjects.length];
        const teacher = teachers[Math.floor(Math.random() * teachers.length)];
        
        timetableEntries.push({
          title: `${subject} - ${classDoc.name}`,
          classId: classDoc._id,
          teacherId: teacher._id,
          subject: subject,
          dayOfWeek: dayOfWeek,
          startTime: slot.start,
          endTime: slot.end,
          lectureType: Math.random() > 0.8 ? 'Practical' : 'Theory',
          isActive: true,
          createdBy: coordinator._id
        });
      }
    }

    if (timetableEntries.length > 0) {
      const createdEntries = await Timetable.insertMany(timetableEntries);
      console.log(`✅ Created ${createdEntries.length} timetable entries for ${dayOfWeek}`);
      
      // Display the created entries
      console.log('\n📋 Created Lectures:');
      console.log('===================');
      for (const entry of createdEntries) {
        const teacher = teachers.find(t => t._id.toString() === entry.teacherId.toString());
        const classDoc = classes.find(c => c._id.toString() === entry.classId.toString());
        console.log(`${entry.startTime}-${entry.endTime}: ${entry.subject} | ${teacher.fullName.firstName} ${teacher.fullName.lastName} | ${classDoc.name}`);
      }
    } else {
      console.log('❌ No timetable entries were created');
    }

    console.log('\n🎉 Today\'s timetable added successfully!');
    console.log('\n🔧 Now you can test teacher attendance for today\'s date');

  } catch (error) {
    console.error('❌ Error adding today\'s timetable:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the script
if (require.main === module) {
  addTodayTimetable();
}

module.exports = addTodayTimetable;
