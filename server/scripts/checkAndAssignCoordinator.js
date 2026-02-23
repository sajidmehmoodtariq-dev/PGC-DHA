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
    console.log('📍 URI:', mongoUri ? 'Found' : 'Not found in environment variables');
    
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

const checkAndAssignCoordinator = async () => {
  try {
    console.log('🔍 Checking Existing Database Data...\n');

    // 1. Check existing coordinators
    console.log('👤 COORDINATORS:');
    console.log('================');
    const coordinators = await User.find({ role: 'Coordinator' }).select('userName email fullName isActive');
    
    if (coordinators.length === 0) {
      console.log('❌ No coordinators found in database');
      return;
    }
    
    coordinators.forEach((coord, index) => {
      console.log(`${index + 1}. ${coord.userName} (${coord.email}) - ${coord.fullName?.firstName || ''} ${coord.fullName?.lastName || ''} - Active: ${coord.isActive}`);
    });
    
    // Use the first active coordinator
    const activeCoordinator = coordinators.find(c => c.isActive) || coordinators[0];
    console.log(`\n✅ Selected Coordinator: ${activeCoordinator.userName} (${activeCoordinator._id})`);

    // 2. Check existing classes
    console.log('\n🏫 CLASSES:');
    console.log('===========');
    const classes = await Class.find({ isActive: true })
      .populate('floorIncharge', 'userName email')
      .populate('classIncharge', 'userName email');
    
    if (classes.length === 0) {
      console.log('❌ No active classes found in database');
      return;
    }
    
    console.log(`Found ${classes.length} active classes:`);
    classes.forEach((cls, index) => {
      console.log(`${index + 1}. ${cls.name} (${cls.grade} ${cls.program} - ${cls.campus}) - Floor ${cls.floor}`);
      console.log(`   Floor Incharge: ${cls.floorIncharge?.userName || 'Not assigned'}`);
      console.log(`   Class Incharge: ${cls.classIncharge?.userName || 'Not assigned'}`);
    });

    // 3. Check students in each class
    console.log('\n👥 STUDENTS BY CLASS:');
    console.log('====================');
    let totalStudents = 0;
    const classesWithStudents = [];
    
    for (const cls of classes) {
      const students = await User.find({
        classId: cls._id,
        role: 'Student',
        isActive: true
      }).select('userName fullName rollNumber');
      
      console.log(`\n📚 ${cls.name} (${cls.grade} ${cls.program}):`);
      console.log(`   Students: ${students.length}`);
      
      if (students.length > 0) {
        classesWithStudents.push(cls);
        totalStudents += students.length;
        
        // Show first 5 students as example
        const sampleStudents = students.slice(0, 5);
        sampleStudents.forEach((student, index) => {
          const name = student.fullName?.firstName && student.fullName?.lastName 
            ? `${student.fullName.firstName} ${student.fullName.lastName}`
            : student.userName;
          console.log(`   ${index + 1}. ${name} (${student.rollNumber || 'No roll number'})`);
        });
        
        if (students.length > 5) {
          console.log(`   ... and ${students.length - 5} more students`);
        }
      }
    }
    
    console.log(`\n📊 Total Students: ${totalStudents}`);
    console.log(`📊 Classes with Students: ${classesWithStudents.length}`);

    // 4. Assign coordinator to classes with students
    if (classesWithStudents.length > 0) {
      console.log('\n🔧 ASSIGNING COORDINATOR TO CLASSES:');
      console.log('====================================');
      
      let assignedCount = 0;
      
      for (const cls of classesWithStudents) {
        // Only assign if no floor incharge is set
        if (!cls.floorIncharge) {
          cls.floorIncharge = activeCoordinator._id;
          await cls.save();
          assignedCount++;
          console.log(`✅ Assigned ${activeCoordinator.userName} as floor incharge for ${cls.name}`);
        } else {
          console.log(`ℹ️  ${cls.name} already has floor incharge: ${cls.floorIncharge.userName}`);
        }
      }
      
      console.log(`\n✅ Assigned coordinator to ${assignedCount} classes`);
    }

    // 5. Check existing attendance records
    console.log('\n📋 ATTENDANCE RECORDS:');
    console.log('======================');
    const attendanceCount = await Attendance.countDocuments();
    console.log(`Total attendance records: ${attendanceCount}`);
    
    if (attendanceCount > 0) {
      // Get recent attendance
      const recentAttendance = await Attendance.find()
        .populate('studentId', 'userName fullName')
        .populate('classId', 'name')
        .sort({ createdOn: -1 })
        .limit(5);
      
      console.log('\nRecent attendance records:');
      recentAttendance.forEach((att, index) => {
        const studentName = att.studentId?.fullName?.firstName && att.studentId?.fullName?.lastName
          ? `${att.studentId.fullName.firstName} ${att.studentId.fullName.lastName}`
          : att.studentId?.userName || 'Unknown';
        
        console.log(`${index + 1}. ${studentName} - ${att.classId?.name || 'Unknown Class'} - ${att.status} (${att.date.toDateString()})`);
      });
    }

    // 6. Summary and next steps
    console.log('\n📋 SUMMARY:');
    console.log('===========');
    console.log(`👤 Active Coordinator: ${activeCoordinator.userName}`);
    console.log(`🏫 Total Classes: ${classes.length}`);
    console.log(`📚 Classes with Students: ${classesWithStudents.length}`);
    console.log(`👥 Total Students: ${totalStudents}`);
    console.log(`📋 Attendance Records: ${attendanceCount}`);
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('==============');
    console.log('1. Login with coordinator credentials');
    console.log('2. Navigate to /coordinator/student-attendance');
    console.log('3. You should see the classes with students');
    
    if (classesWithStudents.length > 0) {
      console.log('\n✅ Your database is ready for testing Student Attendance Management!');
    } else {
      console.log('\n⚠️  No classes with students found. You may need to assign students to classes first.');
    }

  } catch (error) {
    console.error('❌ Error checking database:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkAndAssignCoordinator();
  
  console.log('\n🏁 Database check completed. Closing connection...');
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

module.exports = { checkAndAssignCoordinator };