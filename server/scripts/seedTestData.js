const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Class = require('../models/Class');
const Timetable = require('../models/Timetable');

const seedTestData = async () => {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/pgc-dha');
    console.log('Connected to MongoDB successfully!');

    // Clear existing test data (optional - be careful in production)
    console.log('\n🧹 Cleaning existing test data...');
    await User.deleteMany({ 
      $or: [
        { userName: /^test_/ },
        { email: /test.*@test\.com$/ }
      ]
    });
    await Class.deleteMany({ name: /^Test/ });
    await Timetable.deleteMany({ subject: /^Test/ });

    // Hash password for all test users
    const hashedPassword = await bcrypt.hash('password123', 10);

    // Create test teachers
    console.log('\n👨‍🏫 Creating test teachers...');
    const teachers = [
      {
        userName: 'test_teacher_ahmad',
        email: 'ahmad.teacher@test.com',
        password: hashedPassword,
        fullName: { firstName: 'Ahmad', lastName: 'Khan' },
        role: 'Teacher',
        phoneNumber: '03001234567',
        address: 'Defence Phase 1, Lahore',
        status: 1
      },
      {
        userName: 'test_teacher_fatima',
        email: 'fatima.teacher@test.com',
        password: hashedPassword,
        fullName: { firstName: 'Fatima', lastName: 'Ali' },
        role: 'Teacher',
        phoneNumber: '03001234568',
        address: 'Gulberg, Lahore',
        status: 1
      },
      {
        userName: 'test_teacher_hassan',
        email: 'hassan.teacher@test.com',
        password: hashedPassword,
        fullName: { firstName: 'Hassan', lastName: 'Ahmed' },
        role: 'Teacher',
        phoneNumber: '03001234569',
        address: 'Model Town, Lahore',
        status: 1
      },
      {
        userName: 'test_teacher_sara',
        email: 'sara.teacher@test.com',
        password: hashedPassword,
        fullName: { firstName: 'Sara', lastName: 'Sheikh' },
        role: 'Teacher',
        phoneNumber: '03001234570',
        address: 'Johar Town, Lahore',
        status: 1
      }
    ];

    const createdTeachers = await User.insertMany(teachers);
    console.log(`✅ Created ${createdTeachers.length} test teachers`);

    // Create test coordinator
    console.log('\n👨‍💼 Creating test coordinator...');
    const coordinator = new User({
      userName: 'test_coordinator',
      email: 'coordinator@test.com',
      password: hashedPassword,
      fullName: { firstName: 'Muhammad', lastName: 'Coordinator' },
      role: 'Coordinator',
      coordinatorAssignment: {
        grade: '11th',
        campus: 'Boys'
      },
      phoneNumber: '03001234571',
      address: 'DHA Phase 2, Lahore',
      status: 1
    });
    await coordinator.save();
    console.log('✅ Created test coordinator');

    // Create test students
    console.log('\n🎓 Creating test students...');
    const students = [];
    const grades = ['11th', '12th'];
    const campuses = ['Boys', 'Girls'];
    const programs = ['Pre Medical', 'Pre Engineering', 'ICS-PHY', 'ICOM'];

    for (let i = 1; i <= 20; i++) {
      const grade = grades[Math.floor(Math.random() * grades.length)];
      const campus = campuses[Math.floor(Math.random() * campuses.length)];
      const program = programs[Math.floor(Math.random() * programs.length)];
      
      students.push({
        userName: `test_student_${i.toString().padStart(3, '0')}`,
        email: `student${i}@test.com`,
        password: hashedPassword,
        fullName: { 
          firstName: `Student${i}`, 
          lastName: campus === 'Boys' ? 'Ahmad' : 'Fatima' 
        },
        role: 'Student',
        grade,
        campus,
        program,
        phoneNumber: `0300123${(4571 + i).toString()}`,
        address: `Test Address ${i}, Lahore`,
        enquiryLevel: 3, // Number instead of string
        status: 1,
        familyInfo: {
          fatherName: `Father of Student${i}`,
          fatherOccupation: 'Business',
          emergencyContact: {
            name: `Emergency Contact ${i}`,
            relationship: 'Father',
            phone: `0300123${(4571 + i).toString()}`
          }
        }
      });
    }

    const createdStudents = await User.insertMany(students);
    console.log(`✅ Created ${createdStudents.length} test students`);

    // Create test classes
    console.log('\n🏫 Creating test classes...');
    const classes = [
      {
        name: 'Test Class 11th Pre-Medical Boys',
        grade: '11th',
        section: 'A',
        campus: 'Boys',
        program: 'Pre Medical',
        floor: 1,
        capacity: 30,
        currentStrength: 8,
        isActive: true
      },
      {
        name: 'Test Class 11th Pre-Engineering Boys',
        grade: '11th',
        section: 'B',
        campus: 'Boys',
        program: 'Pre Engineering',
        floor: 2,
        capacity: 30,
        currentStrength: 6,
        isActive: true
      },
      {
        name: 'Test Class 12th Computer Science Girls',
        grade: '12th',
        section: 'A',
        campus: 'Girls',
        program: 'ICS-PHY',
        floor: 3,
        capacity: 25,
        currentStrength: 6,
        isActive: true
      }
    ];

    const createdClasses = await Class.insertMany(classes);
    console.log(`✅ Created ${createdClasses.length} test classes`);

    // Assign students to classes
    console.log('\n📚 Assigning students to classes...');
    let studentIndex = 0;
    for (const classDoc of createdClasses) {
      const studentsToAssign = createdStudents.slice(studentIndex, studentIndex + classDoc.currentStrength);
      
      await User.updateMany(
        { _id: { $in: studentsToAssign.map(s => s._id) } },
        { 
          classId: classDoc._id,
          grade: classDoc.grade,
          campus: classDoc.campus,
          program: classDoc.program
        }
      );
      
      studentIndex += classDoc.currentStrength;
    }
    console.log('✅ Assigned students to classes');

    // Create test timetable entries
    console.log('\n⏰ Creating test timetable entries...');
    const subjects = {
      'Pre Medical': ['Biology', 'Chemistry', 'Physics', 'English', 'Urdu', 'Islamic Studies'],
      'Pre Engineering': ['Mathematics', 'Physics', 'Chemistry', 'English', 'Urdu', 'Computer Science'],
      'ICS-PHY': ['Computer Science', 'Mathematics', 'Physics', 'English', 'Urdu', 'Statistics'],
      'ICOM': ['Accounting', 'Economics', 'Business Studies', 'English', 'Urdu', 'Mathematics']
    };

    const timeSlots = [
      { start: '08:00', end: '08:45' },
      { start: '08:45', end: '09:30' },
      { start: '09:30', end: '10:15' },
      { start: '10:30', end: '11:15' }, // Break at 10:15-10:30
      { start: '11:15', end: '12:00' },
      { start: '12:00', end: '12:45' },
      { start: '01:00', end: '01:45' }, // Lunch break at 12:45-01:00
      { start: '01:45', end: '02:30' }
    ];

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timetableEntries = [];

    for (const classDoc of createdClasses) {
      const classSubjects = subjects[classDoc.program] || subjects['Pre Medical'];
      
      daysOfWeek.forEach((day, dayIndex) => {
        timeSlots.forEach((slot, slotIndex) => {
          // Don't schedule on all slots to make it realistic
          if (Math.random() > 0.7) return; // 30% chance to schedule
          
          const subject = classSubjects[slotIndex % classSubjects.length];
          const teacher = createdTeachers[Math.floor(Math.random() * createdTeachers.length)];
          
          timetableEntries.push({
            title: `${subject} - ${classDoc.name}`,
            classId: classDoc._id,
            teacherId: teacher._id,
            subject: subject,
            dayOfWeek: day,
            startTime: slot.start,
            endTime: slot.end,
            lectureType: Math.random() > 0.8 ? 'Practical' : 'Theory',
            isActive: true,
            createdBy: coordinator._id
          });
        });
      });
    }

    const createdTimetable = await Timetable.insertMany(timetableEntries);
    console.log(`✅ Created ${createdTimetable.length} timetable entries`);

    // Create test principal
    console.log('\n👨‍💼 Creating test principal...');
    const principal = new User({
      userName: 'test_principal',
      email: 'principal@test.com',
      password: hashedPassword,
      fullName: { firstName: 'Dr. Muhammad', lastName: 'Principal' },
      role: 'Principal',
      phoneNumber: '03001234572',
      address: 'DHA Phase 3, Lahore',
      status: 1
    });
    await principal.save();
    console.log('✅ Created test principal');

    // Summary
    console.log('\n🎉 Test data seeded successfully!');
    console.log('=====================================');
    console.log(`👨‍🏫 Teachers: ${createdTeachers.length}`);
    console.log(`🎓 Students: ${createdStudents.length}`);
    console.log(`🏫 Classes: ${createdClasses.length}`);
    console.log(`⏰ Timetable entries: ${createdTimetable.length}`);
    console.log(`👨‍💼 Coordinator: 1`);
    console.log(`👨‍💼 Principal: 1`);
    console.log('\n📋 Login Credentials:');
    console.log('===================');
    console.log('Teachers: test_teacher_ahmad, test_teacher_fatima, test_teacher_hassan, test_teacher_sara');
    console.log('Coordinator: test_coordinator');
    console.log('Principal: test_principal');
    console.log('Students: test_student_001 to test_student_020');
    console.log('Password for all: password123');
    console.log('\n🔧 Testing Instructions:');
    console.log('========================');
    console.log('1. Login as coordinator (test_coordinator) to mark teacher attendance');
    console.log('2. Login as teacher to mark student attendance');
    console.log('3. Login as principal (test_principal) to view attendance reports');
    console.log('4. Navigate to /coordinator/teacher-attendance for teacher attendance');
    console.log('5. Navigate to /attendance for student attendance');
    console.log('6. Navigate to /principal/attendance-reports for principal dashboard');

  } catch (error) {
    console.error('❌ Error seeding test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n📤 Disconnected from MongoDB');
    process.exit(0);
  }
};

// Run the seed script
if (require.main === module) {
  seedTestData();
}

module.exports = seedTestData;
