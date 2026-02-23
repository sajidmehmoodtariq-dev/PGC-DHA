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
    console.log('MongoDB Connected for Timetable API Test');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

const testTimetableAPI = async () => {
  try {
    console.log('🧪 Testing Timetable API Logic...\n');

    // Get the first teacher
    const teacher = await User.findOne({ role: 'Teacher' });
    if (!teacher) {
      console.log('❌ No teacher found');
      return;
    }

    console.log(`👨‍🏫 Testing with teacher: ${teacher.fullName?.firstName} ${teacher.fullName?.lastName} (${teacher._id})`);

    // Test with today's date
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][today.getDay()];
    
    console.log(`📅 Testing with date: ${todayString} (${dayOfWeek})`);

    // Simulate the API logic
    const lectures = await Timetable.find({
      teacherId: teacher._id,
      dayOfWeek,
      isActive: true
    })
    .populate('classId', 'name grade campus program floor')
    .sort({ startTime: 1 });

    console.log(`📚 Found ${lectures.length} lectures for ${dayOfWeek}`);

    if (lectures.length > 0) {
      console.log('\n📋 Lecture Details:');
      lectures.forEach((lecture, index) => {
        console.log(`  ${index + 1}. ${lecture.startTime}-${lecture.endTime} | ${lecture.subject} | ${lecture.classId.name} (Floor ${lecture.classId.floor})`);
      });

      // Simulate the API response structure
      const apiResponse = {
        success: true,
        data: lectures,
        teacher: {
          id: teacher._id,
          fullName: teacher.fullName,
          userName: teacher.userName,
          email: teacher.email
        },
        date: todayString,
        dayOfWeek
      };

      console.log('\n🔍 API Response Structure:');
      console.log('- success:', apiResponse.success);
      console.log('- data (lectures array):', Array.isArray(apiResponse.data), `(${apiResponse.data.length} items)`);
      console.log('- teacher:', !!apiResponse.teacher);
      console.log('- date:', apiResponse.date);
      console.log('- dayOfWeek:', apiResponse.dayOfWeek);

      console.log('\n✅ The API should return lectures in response.data.data');
      console.log('📝 Frontend should access: response.data.data (which is the lectures array)');

    } else {
      console.log(`\n⚠️  No lectures found for ${dayOfWeek}`);
      console.log('💡 Try running: npm run seed:current-week');
    }

  } catch (error) {
    console.error('❌ Error testing timetable API:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n📤 Database connection closed');
  }
};

// Run the test
connectDB().then(() => {
  testTimetableAPI();
});