require('dotenv').config();
const mongoose = require('mongoose');
const Class = require('./models/Class');
const User = require('./models/User');

async function checkClassData() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Check how many classes exist
    const totalClasses = await Class.countDocuments();
    console.log(`📚 Total classes in database: ${totalClasses}`);

    if (totalClasses === 0) {
      console.log('❌ No classes found in database!');
    } else {
      // Get all classes
      const classes = await Class.find({}).select('name grade campus program isActive');
      
      console.log('\n📋 Available classes:');
      classes.forEach((cls, index) => {
        console.log(`${index + 1}. ${cls.name || 'Unnamed'} - Grade: ${cls.grade} - Campus: ${cls.campus} - Program: ${cls.program} - Active: ${cls.isActive}`);
      });
    }

    // Check how many students have class assignments
    const studentsWithClasses = await User.countDocuments({ 
      role: 'Student',
      classId: { $exists: true, $ne: null }
    });
    
    const studentsWithoutClasses = await User.countDocuments({
      role: 'Student', 
      classId: { $exists: false }
    });

    console.log(`\n👥 Students with class assignments: ${studentsWithClasses}`);
    console.log(`👥 Students without class assignments: ${studentsWithoutClasses}`);

    // Sample some students to see their class assignment status
    const sampleStudents = await User.find({ 
      role: 'Student' 
    }).populate('classId', 'name grade campus program')
      .select('fullName rollNumber classId')
      .limit(5);
    
    console.log('\n🔍 Sample student class assignments:');
    sampleStudents.forEach((student, index) => {
      const className = student.classId?.name || 'No Class Assigned';
      console.log(`${index + 1}. ${student.fullName?.firstName} ${student.fullName?.lastName} (${student.rollNumber}) - Class: ${className}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

checkClassData();
