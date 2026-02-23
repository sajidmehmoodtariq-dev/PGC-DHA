require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

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

const fixCoordinatorAssignment = async (userId, grade, campus) => {
  try {
    console.log('🔧 FIXING COORDINATOR ASSIGNMENT:');
    console.log('==================================');
    console.log(`User ID: ${userId}`);
    console.log(`Setting Grade: ${grade}`);
    console.log(`Setting Campus: ${campus}`);
    console.log('');
    
    // Validate inputs
    const validGrades = ['11th', '12th'];
    const validCampuses = ['Boys', 'Girls'];
    
    if (!validGrades.includes(grade)) {
      console.error(`❌ Invalid grade: ${grade}. Must be one of: ${validGrades.join(', ')}`);
      return false;
    }
    
    if (!validCampuses.includes(campus)) {
      console.error(`❌ Invalid campus: ${campus}. Must be one of: ${validCampuses.join(', ')}`);
      return false;
    }
    
    // Calculate floor based on grade and campus
    let floor;
    if (campus === 'Boys' && grade === '11th') floor = 1;
    else if (campus === 'Boys' && grade === '12th') floor = 2;
    else if (campus === 'Girls' && grade === '11th') floor = 3;
    else if (campus === 'Girls' && grade === '12th') floor = 4;
    else {
      console.error(`❌ Invalid combination: ${grade} ${campus}`);
      return false;
    }
    
    console.log(`📍 Calculated Floor: ${floor}`);
    console.log('');
    
    // Find the user first
    const user = await User.findById(userId);
    if (!user) {
      console.error(`❌ User not found with ID: ${userId}`);
      return false;
    }
    
    console.log(`👤 Found user: ${user.name} (${user.email})`);
    console.log(`   Current role: ${user.role}`);
    
    if (user.coordinatorAssignment) {
      console.log(`   Current assignment: Grade=${user.coordinatorAssignment.grade || 'NOT SET'}, Campus=${user.coordinatorAssignment.campus || 'NOT SET'}`);
    } else {
      console.log('   Current assignment: null');
    }
    
    // Update the coordinator assignment
    const updateResult = await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          'coordinatorAssignment.grade': grade,
          'coordinatorAssignment.campus': campus
        }
      },
      { 
        new: true,
        runValidators: true 
      }
    );
    
    if (!updateResult) {
      console.error('❌ Failed to update user');
      return false;
    }
    
    console.log('✅ Coordinator assignment updated successfully!');
    console.log(`   New assignment: Grade=${updateResult.coordinatorAssignment.grade}, Campus=${updateResult.coordinatorAssignment.campus}`);
    console.log(`   Assigned to Floor: ${floor}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Error fixing coordinator assignment:', error);
    return false;
  }
};

// Usage function
const showUsage = () => {
  console.log('📖 USAGE:');
  console.log('=========');
  console.log('node fixCoordinatorAssignment.js <userId> <grade> <campus>');
  console.log('');
  console.log('Parameters:');
  console.log('  userId  - MongoDB ObjectId of the coordinator user');
  console.log('  grade   - "11th" or "12th"');
  console.log('  campus  - "Boys" or "Girls"');
  console.log('');
  console.log('Examples:');
  console.log('  node fixCoordinatorAssignment.js 507f1f77bcf86cd799439011 "11th" "Boys"');
  console.log('  node fixCoordinatorAssignment.js 507f1f77bcf86cd799439011 "12th" "Girls"');
  console.log('');
  console.log('Floor assignments:');
  console.log('  11th Boys  → Floor 1');
  console.log('  12th Boys  → Floor 2');
  console.log('  11th Girls → Floor 3');
  console.log('  12th Girls → Floor 4');
};

// Main execution
const main = async () => {
  const args = process.argv.slice(2);
  
  if (args.length !== 3) {
    showUsage();
    process.exit(1);
  }
  
  const [userId, grade, campus] = args;
  
  await connectDB();
  const success = await fixCoordinatorAssignment(userId, grade, campus);
  
  console.log('\n🏁 Fix completed. Closing connection...');
  await mongoose.connection.close();
  process.exit(success ? 0 : 1);
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

module.exports = { fixCoordinatorAssignment };
