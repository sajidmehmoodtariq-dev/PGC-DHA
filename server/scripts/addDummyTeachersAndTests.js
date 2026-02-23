const mongoose = require('mongoose');
const User = require('../models/User');
const Test = require('../models/Test');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function addDummyTeachersAndTests() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Hash password once
    const hashedPassword = await bcrypt.hash('password123', 12);

    // First, let's create some dummy teachers with proper schema
    const teachers = [
      {
        userName: 'ahmed.hassan',
        fullName: {
          firstName: 'Ahmed',
          lastName: 'Hassan'
        },
        email: 'ahmed.hassan@pgc.edu.pk',
        password: hashedPassword,
        role: 'Teacher',
        status: 1,
        employeeId: 'TCH001',
        phoneNumber: '+92-300-1234567',
        prospectusStage: 1
      },
      {
        userName: 'fatima.khan',
        fullName: {
          firstName: 'Fatima',
          lastName: 'Khan'
        },
        email: 'fatima.khan@pgc.edu.pk',
        password: hashedPassword,
        role: 'Teacher',
        status: 1,
        employeeId: 'TCH002',
        phoneNumber: '+92-300-2345678',
        prospectusStage: 1
      },
      {
        userName: 'muhammad.ali',
        fullName: {
          firstName: 'Muhammad',
          lastName: 'Ali'
        },
        email: 'muhammad.ali@pgc.edu.pk',
        password: hashedPassword,
        role: 'Teacher',
        status: 1,
        employeeId: 'TCH003',
        phoneNumber: '+92-300-3456789',
        prospectusStage: 1
      },
      {
        userName: 'aisha.malik',
        fullName: {
          firstName: 'Aisha',
          lastName: 'Malik'
        },
        email: 'aisha.malik@pgc.edu.pk',
        password: hashedPassword,
        role: 'Teacher',
        status: 1,
        employeeId: 'TCH004',
        phoneNumber: '+92-300-4567890',
        prospectusStage: 1
      },
      {
        userName: 'omar.siddique',
        fullName: {
          firstName: 'Omar',
          lastName: 'Siddique'
        },
        email: 'omar.siddique@pgc.edu.pk',
        password: hashedPassword,
        role: 'Teacher',
        status: 1,
        employeeId: 'TCH005',
        phoneNumber: '+92-300-5678901',
        prospectusStage: 1
      }
    ];

    console.log('Creating dummy teachers...');
    
    // Check if teachers already exist
    const existingTeachers = await User.find({ 
      email: { $in: teachers.map(t => t.email) },
      role: 'Teacher'
    });

    if (existingTeachers.length > 0) {
      console.log(`Found ${existingTeachers.length} existing teachers. Skipping teacher creation.`);
    } else {
      const createdTeachers = await User.insertMany(teachers);
      console.log(`✅ Created ${createdTeachers.length} dummy teachers`);
    }

    // Get all teacher IDs for creating tests
    const allTeachers = await User.find({ role: 'Teacher' });
    console.log(`Found ${allTeachers.length} total teachers in database`);

    // Get existing class for test assignment
    const existingClass = await require('../models/Class').findOne();
    if (!existingClass) {
      console.log('No classes found in database. Cannot create tests without a class.');
      await mongoose.disconnect();
      return;
    }
    console.log(`Using class: ${existingClass.name} (ID: ${existingClass._id})`);

    // Create some dummy tests with past deadlines (for late alert testing)
    const now = new Date();
    const tests = [];

    // Create tests with deadlines that have passed (for late alert)
    for (let i = 0; i < allTeachers.length && i < 3; i++) {
      const teacher = allTeachers[i];
      
      // Test 1: Deadline was yesterday (very late)
      const yesterdayDeadline = new Date(now);
      yesterdayDeadline.setDate(now.getDate() - 1);
      yesterdayDeadline.setHours(23, 59, 59, 999);

      tests.push({
        title: `Mathematics Mid-Term Test - ${teacher.fullName.firstName} ${teacher.fullName.lastName}`,
        description: 'Mid-term examination for mathematics course',
        subject: 'Mathematics',
        testType: 'Mid Term', // Valid enum value
        classId: existingClass._id, // Required field
        class: 'Grade 9',
        totalMarks: 100,
        duration: 120, // 2 hours
        testDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        marksEntryDeadline: yesterdayDeadline,
        createdBy: teacher._id,
        assignedTeacher: teacher._id,
        status: 'active'
      });

      // Test 2: Deadline was 2 hours ago (recently late)
      const twoHoursAgoDeadline = new Date(now);
      twoHoursAgoDeadline.setHours(now.getHours() - 2);

      if (i < 2) {
        tests.push({
          title: `English Quiz - ${teacher.fullName.firstName} ${teacher.fullName.lastName}`,
          description: 'Weekly English comprehension quiz',
          subject: 'English',
          testType: 'Quiz', // Required field
          classId: existingClass._id, // Required field
          class: 'Grade 10',
          totalMarks: 50,
          duration: 60, // 1 hour
          testDate: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          marksEntryDeadline: twoHoursAgoDeadline,
          createdBy: teacher._id,
          assignedTeacher: teacher._id,
          status: 'active'
        });
      }

      // Test 3: Deadline is in 1 hour (not late yet)
      const futureDeadline = new Date(now);
      futureDeadline.setHours(now.getHours() + 1);

      if (i === 0) {
        tests.push({
          title: `Physics Lab Test - ${teacher.fullName.firstName} ${teacher.fullName.lastName}`,
          description: 'Laboratory practical examination',
          subject: 'Physics',
          testType: 'Class Test', // Valid enum value
          classId: existingClass._id, // Required field
          class: 'Grade 11',
          totalMarks: 75,
          duration: 90,
          testDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          marksEntryDeadline: futureDeadline,
          createdBy: teacher._id,
          assignedTeacher: teacher._id,
          status: 'active'
        });
      }
    }

    console.log('\nCreating dummy tests...');
    
    // Check if tests already exist
    const existingTests = await Test.find({ 
      title: { $in: tests.map(t => t.title) }
    });

    if (existingTests.length > 0) {
      console.log(`Found ${existingTests.length} existing tests. Removing them first...`);
      await Test.deleteMany({ 
        title: { $in: tests.map(t => t.title) }
      });
    }

    const createdTests = await Test.insertMany(tests);
    console.log(`✅ Created ${createdTests.length} dummy tests`);

    // Show summary of what was created
    console.log('\n=== SUMMARY ===');
    console.log('Teachers in database:', allTeachers.length);
    console.log('Tests created:', createdTests.length);
    
    console.log('\n=== TESTS WITH LATE DEADLINES ===');
    const lateTests = createdTests.filter(test => test.marksEntryDeadline < now);
    lateTests.forEach((test, index) => {
      const teacher = allTeachers.find(t => t._id.toString() === test.assignedTeacher.toString());
      const hoursLate = Math.floor((now - test.marksEntryDeadline) / (1000 * 60 * 60));
      console.log(`${index + 1}. ${test.title}`);
      console.log(`   Teacher: ${teacher?.fullName?.firstName} ${teacher?.fullName?.lastName || 'Unknown'}`);
      console.log(`   Deadline: ${test.marksEntryDeadline.toLocaleString()}`);
      console.log(`   Hours Late: ${hoursLate}`);
      console.log('');
    });

    console.log('\n🎯 Now you can test the late attendance alert system!');
    console.log('The Principal Dashboard should show notifications for teachers who are late.');

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

addDummyTeachersAndTests();
