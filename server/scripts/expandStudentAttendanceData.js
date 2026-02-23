require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Class = require('../models/Class');
const Attendance = require('../models/Attendance');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    console.log('🔗 Connecting to MongoDB...');
    
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in environment variables');
    }
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const expandStudentAttendanceData = async () => {
  try {
    console.log('🚀 Expanding Student Attendance Data Coverage...\n');

    // 1. Find the coordinator
    const coordinator = await User.findOne({ role: 'Coordinator', isActive: true });
    if (!coordinator) {
      console.log('❌ No active coordinator found');
      return;
    }
    console.log(`👤 Using Coordinator: ${coordinator.userName} (${coordinator._id})`);

    // 2. Find all students without class assignments
    console.log('\n🔍 Finding unassigned students...');
    const unassignedStudents = await User.find({
      role: 'Student',
      isActive: true,
      $or: [
        { classId: { $exists: false } },
        { classId: null }
      ]
    }).select('userName fullName email program gender');

    console.log(`📊 Found ${unassignedStudents.length} unassigned students`);

    // 3. Find all active classes
    const allClasses = await Class.find({ isActive: true });
    console.log(`📊 Found ${allClasses.length} active classes`);

    // 4. Assign students to classes based on program and gender
    console.log('\n👥 Assigning students to classes...');
    let assignedCount = 0;

    for (const student of unassignedStudents) {
      // Determine campus based on gender
      const campus = student.gender === 'Male' ? 'Boys' : 'Girls';
      
      // Find a suitable class for this student
      let suitableClass = null;
      
      // First try to find exact program match
      if (student.program) {
        suitableClass = allClasses.find(cls => 
          cls.program === student.program && 
          cls.campus === campus
        );
      }
      
      // If no exact match, try to find any class for the same campus
      if (!suitableClass) {
        suitableClass = allClasses.find(cls => cls.campus === campus);
      }
      
      // If still no match, use any available class
      if (!suitableClass) {
        suitableClass = allClasses[0];
      }
      
      if (suitableClass) {
        // Assign student to class
        student.classId = suitableClass._id;
        if (!student.program) {
          student.program = suitableClass.program;
        }
        await student.save();
        
        assignedCount++;
        const studentName = student.fullName?.firstName && student.fullName?.lastName 
          ? `${student.fullName.firstName} ${student.fullName.lastName}`
          : student.userName;
        
        console.log(`✅ Assigned ${studentName} to ${suitableClass.name} (${suitableClass.program})`);
      }
    }

    console.log(`\n📊 Assigned ${assignedCount} students to classes`);

    // 5. Update student counts for all classes
    console.log('\n🔄 Updating class student counts...');
    for (const cls of allClasses) {
      await cls.updateStudentCount();
    }

    // 6. Find classes with students and assign coordinator
    console.log('\n🏫 Assigning coordinator to classes with students...');
    const classesWithStudents = [];
    let coordinatorAssignments = 0;

    for (const cls of allClasses) {
      const studentCount = await User.countDocuments({
        classId: cls._id,
        role: 'Student',
        isActive: true
      });

      if (studentCount > 0) {
        classesWithStudents.push({ class: cls, studentCount });
        
        // Assign coordinator as floor incharge if not already assigned
        if (!cls.floorIncharge) {
          cls.floorIncharge = coordinator._id;
          await cls.save();
          coordinatorAssignments++;
          console.log(`✅ Assigned coordinator to ${cls.name} (${studentCount} students)`);
        } else {
          console.log(`ℹ️  ${cls.name} already has floor incharge (${studentCount} students)`);
        }
      }
    }

    // 7. Create sample attendance for recent dates
    console.log('\n📋 Creating sample attendance records...');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const dates = [today, yesterday, twoDaysAgo];
    let attendanceRecordsCreated = 0;

    for (const date of dates) {
      for (const { class: cls, studentCount } of classesWithStudents) {
        const students = await User.find({
          classId: cls._id,
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
            // Create realistic attendance pattern
            // 85% present, 10% absent, 5% late
            const random = Math.random();
            let status = 'Present';
            if (random > 0.95) status = 'Late';
            else if (random > 0.85) status = 'Absent';

            const attendance = new Attendance({
              studentId: student._id,
              classId: cls._id,
              date: date,
              status: status,
              markedBy: coordinator._id,
              markedByRole: 'Floor Incharge'
            });

            await attendance.save();
            attendanceRecordsCreated++;
          }
        }
      }
    }

    console.log(`✅ Created ${attendanceRecordsCreated} attendance records`);

    // 8. Final summary
    console.log('\n📊 FINAL SUMMARY:');
    console.log('==================');
    
    const totalStudents = await User.countDocuments({ role: 'Student', isActive: true });
    const studentsWithClasses = await User.countDocuments({ 
      role: 'Student', 
      isActive: true, 
      classId: { $exists: true, $ne: null }
    });
    const totalAttendance = await Attendance.countDocuments();
    
    console.log(`👤 Coordinator: ${coordinator.userName}`);
    console.log(`🏫 Total Classes: ${allClasses.length}`);
    console.log(`📚 Classes with Students: ${classesWithStudents.length}`);
    console.log(`👥 Total Students: ${totalStudents}`);
    console.log(`🎯 Students Assigned to Classes: ${studentsWithClasses}`);
    console.log(`📋 Total Attendance Records: ${totalAttendance}`);
    console.log(`🔧 New Coordinator Assignments: ${coordinatorAssignments}`);

    console.log('\n🎯 CLASSES WITH STUDENTS:');
    console.log('=========================');
    for (const { class: cls, studentCount } of classesWithStudents) {
      console.log(`📚 ${cls.name} (${cls.grade} ${cls.program} - ${cls.campus}): ${studentCount} students`);
    }

    console.log('\n✅ Student Attendance System is now ready with expanded coverage!');
    console.log('\n🚀 LOGIN AND TEST:');
    console.log('==================');
    console.log(`Username: ${coordinator.userName}`);
    console.log('Navigate to: /coordinator/student-attendance');
    console.log(`You should now see ${classesWithStudents.length} classes with students!`);

  } catch (error) {
    console.error('❌ Error expanding student attendance data:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await expandStudentAttendanceData();
  
  console.log('\n🏁 Expansion completed. Closing connection...');
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

module.exports = { expandStudentAttendanceData };