require('dotenv').config();
const mongoose = require('mongoose');
const Timetable = require('../models/Timetable');

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

const cleanupTimetable = async () => {
  try {
    console.log('🧹 CLEANING UP TIMETABLE DATA:');
    console.log('==============================');
    
    // Find entries with missing classId
    const badEntries = await Timetable.find({ 
      $or: [
        { classId: null },
        { classId: { $exists: false } }
      ]
    });
    
    console.log(`Found ${badEntries.length} entries with missing classId:`);
    
    badEntries.forEach((entry, index) => {
      console.log(`${index + 1}. ID: ${entry._id}`);
      console.log(`   Day: ${entry.dayOfWeek}`);
      console.log(`   Time: ${entry.startTime}-${entry.endTime}`);
      console.log(`   Subject: ${entry.subject}`);
      console.log(`   Teacher: ${entry.teacherId}`);
      console.log('');
    });
    
    if (badEntries.length > 0) {
      // Delete entries with missing classId
      const deleteResult = await Timetable.deleteMany({ 
        $or: [
          { classId: null },
          { classId: { $exists: false } }
        ]
      });
      
      console.log(`✅ Deleted ${deleteResult.deletedCount} bad timetable entries`);
    } else {
      console.log('✅ No bad entries found - timetable is clean');
    }
    
    // Show remaining valid entries
    const validEntries = await Timetable.find({ isActive: true })
      .populate('classId', 'name')
      .countDocuments();
    
    console.log(`📊 Remaining valid timetable entries: ${validEntries}`);
    
  } catch (error) {
    console.error('❌ Error cleaning up timetable:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await cleanupTimetable();
  
  console.log('\n🏁 Cleanup completed. Closing connection...');
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

module.exports = { cleanupTimetable };
