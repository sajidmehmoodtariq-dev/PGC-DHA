require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/pgc-portal';
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const seedStudentAttendanceData = async () => {
  try {
    console.log('🌱 Starting Student Attendance Data Seeding...\n');

    // 1. Create a Coordinator user
    console.log('👤 Creating Coordinator user...');
    
    // Check if coordinator already exists
    let coordinator = await User.findOne({ userName: 'coordinator1' });
    
    if (!coordinator) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      
      coordinator = new User({
        userName: 'coordinator1',
        email: 'coordinator1@pgc.edu',
        password: hashedPassword,
        role: 'Coordinator',
        fullName: {
          firstName: 'John',
          lastName: 'Coordinator'
        },
        isActive: true,
        isApproved: true,
        prospectusStage: 5
      });
      
      await coordinator.save();
      console.log('✅ Coordinator created:', coordinator.userName);
    } else {
      console.log('✅ Coordinator already exists:', coordinator.userName);
    }

    // 2. Create Classes and assign coordinator as floor incharge
    console.log('\n🏫 Creating Classes...');
    
    const classesData = [
      {
        name: 'Computer Science A',
        campus: 'Boys',
        grade: '11th',
        program: 'ICS',
        floor: 1,
        maxStudents: 30,
        floorIncharge: coordinator._id
      },
      {
        name: 'Computer Science B',
        campus: 'Boys',
        grade: '11th',
        program: 'ICS',
        floor: 1,
        maxStudents: 30,
        floorIncharge: coordinator._id
      },
      {
        name: 'Pre Engineering A',
        campus: 'Boys',
        grade: '12th',
        program: 'Pre Engineering',
        floor: 2,
        maxStudents: 35,
        floorIncharge: coordinator._id
      },
      {
        name: 'Biology A',
        campus: 'Girls',
        grade: '11th',
        program: 'Pre Medical',
        floor: 3,
        maxStudents: 25,
        floorIncharge: coordinator._id
      }
    ];

    const createdClasses = [];
    
    for (const classData of classesData) {
      // Check if class already exists
      let existingClass = await Class.findOne({ 
        name: classData.name, 
        campus: classData.campus,
        grade: classData.grade,
        program: classData.program
      });
      
      if (!existingClass) {
        const newClass = new Class(classData);
        await newClass.save();
        createdClasses.push(newClass);
        console.log(`✅ Created class: ${newClass.name} (${newClass.grade} ${newClass.program} - Floor ${newClass.floor})`);
      } else {
        // Update existing class to have coordinator as floor incharge
        existingClass.floorIncharge = coordinator._id;
        await existingClass.save();
        createdClasses.push(existingClass);
        console.log(`✅ Updated existing class: ${existingClass.name} (Floor incharge assigned)`);
      }
    }

    // 3. Create Students for each class
    console.log('\n👥 Creating Students...');
    
    const studentNames = [
      { firstName: 'Ahmed', lastName: 'Ali' },
      { firstName: 'Muhammad', lastName: 'Hassan' },
      { firstName: 'Fatima', lastName: 'Khan' },
      { firstName: 'Ayesha', lastName: 'Ahmed' },
      { firstName: 'Omar', lastName: 'Sheikh' },
      { firstName: 'Zainab', lastName: 'Malik' },
      { firstName: 'Hassan', lastName: 'Raza' },
      { firstName: 'Mariam', lastName: 'Siddique' },
      { firstName: 'Ali', lastName: 'Akbar' },
      { firstName: 'Khadija', lastName: 'Noor' },
      { firstName: 'Usman', lastName: 'Tariq' },
      { firstName: 'Sana', lastName: 'Iqbal' },
      { firstName: 'Bilal', lastName: 'Ahmad' },
      { firstName: 'Hira', lastName: 'Saleem' },
      { firstName: 'Faisal', lastName: 'Mahmood' }
    ];

    let studentCounter = 1;
    
    for (const classItem of createdClasses) {
      const studentsPerClass = Math.min(10, classItem.maxStudents); // Create 10 students per class
      
      for (let i = 0; i < studentsPerClass; i++) {
        const studentName = studentNames[i % studentNames.length];
        const rollNumber = `${classItem.grade.replace('th', '')}-${classItem.program.substring(0, 3).toUpperCase()}-${String(studentCounter).padStart(3, '0')}`;
        
        // Check if student already exists
        const existingStudent = await User.findOne({ 
          userName: `student${studentCounter}`,
          role: 'Student'
        });
        
        if (!existingStudent) {
          const hashedPassword = await bcrypt.hash('student123', 10);
          
          const student = new User({
            userName: `student${studentCounter}`,
            email: `student${studentCounter}@pgc.edu`,
            password: hashedPassword,
            role: 'Student',
            fullName: {
              firstName: studentName.firstName,
              lastName: studentName.lastName
            },
            rollNumber: rollNumber,
            classId: classItem._id,
            program: classItem.program,
            gender: classItem.campus === 'Boys' ? 'Male' : 'Female',
            isActive: true,
            isApproved: true,
            prospectusStage: 5,
            enquiryLevel: 5
          });
          
          await student.save();
          console.log(`✅ Created student: ${student.fullName.firstName} ${student.fullName.lastName} (${rollNumber}) - ${classItem.name}`);
        } else {
          // Update existing student's class assignment
          existingStudent.classId = classItem._id;
          existingStudent.program = classItem.program;
          await existingStudent.save();
          console.log(`✅ Updated existing student: ${existingStudent.fullName.firstName} ${existingStudent.fullName.lastName} - ${classItem.name}`);
        }
        
        studentCounter++;
      }
      
      // Update class student count
      await classItem.updateStudentCount();
    }

    // 4. Create some sample attendance records for today and yesterday
    console.log('\n📋 Creating Sample Attendance Records...');
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dates = [today, yesterday];
    
    for (const date of dates) {
      for (const classItem of createdClasses) {
        // Get students for this class
        const students = await User.find({
          classId: classItem._id,
          role: 'Student',
          isActive: true
        });
        
        for (const student of students) {
          // Check if attendance already exists
          const existingAttendance = await Attendance.findOne({
            studentId: student._id,
            date: date
          });
          
          if (!existingAttendance) {
            // Randomly assign attendance status (80% present, 15% absent, 5% late)
            const random = Math.random();
            let status = 'Present';
            if (random > 0.95) status = 'Late';
            else if (random > 0.8) status = 'Absent';
            
            const attendance = new Attendance({
              studentId: student._id,
              classId: classItem._id,
              date: date,
              status: status,
              markedBy: coordinator._id,
              markedByRole: 'Floor Incharge'
            });
            
            await attendance.save();
          }
        }
        
        console.log(`✅ Created attendance records for ${classItem.name} - ${date.toDateString()}`);
      }
    }

    // 5. Display Summary
    console.log('\n📊 SEEDING SUMMARY:');
    console.log('==================');
    
    const totalClasses = await Class.countDocuments({ floorIncharge: coordinator._id, isActive: true });
    const totalStudents = await User.countDocuments({ role: 'Student', isActive: true });
    const totalAttendance = await Attendance.countDocuments({});
    
    console.log(`👤 Coordinator: ${coordinator.userName} (${coordinator.email})`);
    console.log(`🏫 Classes assigned: ${totalClasses}`);
    console.log(`👥 Total students: ${totalStudents}`);
    console.log(`📋 Attendance records: ${totalAttendance}`);
    
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('====================');
    console.log('Coordinator Login:');
    console.log('  Username: coordinator1');
    console.log('  Password: password123');
    console.log('  Role: Coordinator');
    
    console.log('\nStudent Login (example):');
    console.log('  Username: student1');
    console.log('  Password: student123');
    console.log('  Role: Student');
    
    console.log('\n✅ Student Attendance Data Seeding Completed Successfully!');
    console.log('\n🚀 You can now:');
    console.log('1. Login as coordinator1 to test the Student Attendance Management');
    console.log('2. Navigate to /coordinator/student-attendance');
    console.log('3. View and mark attendance for assigned classes');
    console.log('4. Export attendance reports to Excel');

  } catch (error) {
    console.error('❌ Error seeding student attendance data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await seedStudentAttendanceData();
  
  console.log('\n🏁 Seeding process completed. Closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Promise Rejection:', err);
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

module.exports = { seedStudentAttendanceData };