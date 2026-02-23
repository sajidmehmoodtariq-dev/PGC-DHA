require('dotenv').config();
const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = "mongodb+srv://sajidmehmood:3V4PyBh3h4SFnw%40@cluster0.yhma3.mongodb.net/pgc";
    console.log('🔗 Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
};

const checkTimetableData = async () => {
  try {
    console.log('📅 TIMETABLE DATA VERIFICATION:');
    console.log('===============================');
    
    // Get all timetable entries
    const timetables = await Timetable.find({ isActive: true })
      .populate('classId', 'name grade campus floor')
      .populate('teacherId', 'fullName userName')
      .sort({ dayOfWeek: 1, startTime: 1 });
    
    console.log(`Found ${timetables.length} active timetable entries:`);
    
    if (timetables.length === 0) {
      console.log('❌ No timetable entries found');
      return;
    }
    
    // Group by day of week
    const byDay = {};
    timetables.forEach(entry => {
      const day = entry.dayOfWeek || 'NO_DAY';
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(entry);
    });
    
    Object.keys(byDay).sort().forEach(day => {
      console.log(`\n📅 ${day}:`);
      byDay[day].forEach((entry, index) => {
        const teacher = entry.teacherId 
          ? `${entry.teacherId.fullName?.firstName || ''} ${entry.teacherId.fullName?.lastName || ''}`.trim() || entry.teacherId.userName
          : 'No Teacher';
        const className = entry.classId?.name || 'No Class';
        
        console.log(`   ${index + 1}. ${entry.startTime}-${entry.endTime} | ${className} | ${entry.subject} | ${teacher}`);
        
        // Additional info for debugging
        if (entry.weekDate) {
          console.log(`      Week Date: ${entry.weekDate.toISOString().split('T')[0]}`);
        }
        if (entry.classId) {
          console.log(`      Class: ${entry.classId.grade} ${entry.classId.campus} - Floor ${entry.classId.floor}`);
        }
      });
    });
    
    // Check for missing fields
    console.log('\n🔍 DATA VALIDATION:');
    console.log('===================');
    
    const missingDay = timetables.filter(t => !t.dayOfWeek);
    const missingClass = timetables.filter(t => !t.classId);
    const missingTeacher = timetables.filter(t => !t.teacherId);
    const missingTime = timetables.filter(t => !t.startTime || !t.endTime);
    
    if (missingDay.length > 0) {
      console.log(`❌ ${missingDay.length} entries missing dayOfWeek`);
    }
    if (missingClass.length > 0) {
      console.log(`❌ ${missingClass.length} entries missing classId`);
    }
    if (missingTeacher.length > 0) {
      console.log(`❌ ${missingTeacher.length} entries missing teacherId`);
    }
    if (missingTime.length > 0) {
      console.log(`❌ ${missingTime.length} entries missing time information`);
    }
    
    if (missingDay.length === 0 && missingClass.length === 0 && missingTeacher.length === 0 && missingTime.length === 0) {
      console.log('✅ All timetable entries have required fields');
    }
    
    // Check what the Principal/Coordinator dashboards would see
    console.log('\n🔍 DASHBOARD VIEW TEST:');
    console.log('=======================');
    
    const today = new Date();
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const todayName = dayNames[today.getDay()];
    
    console.log(`Today is: ${todayName} (${today.toISOString().split('T')[0]})`);
    
    // Test floor timetable for each floor
    for (let floor = 1; floor <= 4; floor++) {
      const floorEntries = timetables.filter(t => 
        t.classId && 
        t.classId.floor === floor && 
        t.dayOfWeek === todayName
      );
      
      console.log(`Floor ${floor} (${todayName}): ${floorEntries.length} entries`);
      if (floorEntries.length > 0) {
        floorEntries.forEach(entry => {
          console.log(`   - ${entry.startTime}-${entry.endTime}: ${entry.classId.name} | ${entry.subject}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking timetable:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkTimetableData();
  
  console.log('\n🏁 Check completed. Closing connection...');
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

module.exports = { checkTimetableData };
