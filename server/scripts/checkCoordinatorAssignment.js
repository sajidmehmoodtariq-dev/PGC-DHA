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

const checkCoordinatorAssignment = async () => {
  try {
    console.log('🔍 COORDINATOR VERIFICATION:');
    console.log('============================');
    
    const coordinators = await User.find({ role: 'Coordinator' })
      .select('userName email fullName coordinatorAssignment isActive');
    
    console.log(`Found ${coordinators.length} coordinators:`);
    
    coordinators.forEach((coord, index) => {
      console.log(`${index + 1}. Username: ${coord.userName}`);
      console.log(`   Email: ${coord.email}`);
      console.log(`   Active: ${coord.isActive}`);
      console.log(`   Full Name: ${coord.fullName?.firstName || ''} ${coord.fullName?.lastName || ''}`);
      console.log(`   Coordinator Assignment: ${JSON.stringify(coord.coordinatorAssignment)}`);
      console.log(`   Assignment Status: ${coord.coordinatorAssignment ? 'EXISTS' : 'MISSING'}`);
      
      if (coord.coordinatorAssignment) {
        console.log(`   Grade: ${coord.coordinatorAssignment.grade || 'NOT SET'}`);
        console.log(`   Campus: ${coord.coordinatorAssignment.campus || 'NOT SET'}`);
        
        // Test floor mapping
        const { grade, campus } = coord.coordinatorAssignment;
        let floor = null;
        if (campus === 'Boys' && grade === '11th') floor = 1;
        else if (campus === 'Boys' && grade === '12th') floor = 2;
        else if (campus === 'Girls' && grade === '11th') floor = 3;
        else if (campus === 'Girls' && grade === '12th') floor = 4;
        
        console.log(`   Calculated Floor: ${floor || 'NONE'}`);
        
        if (!floor && grade && campus) {
          console.log(`   ❌ Floor mapping failed for grade='${grade}' campus='${campus}'`);
        } else if (floor) {
          console.log(`   ✅ Floor mapping successful: Floor ${floor}`);
        }
      }
      console.log('');
    });
    
    if (coordinators.length === 0) {
      console.log('❌ No coordinators found in database');
    }
    
  } catch (error) {
    console.error('❌ Error checking coordinators:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkCoordinatorAssignment();
  
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

module.exports = { checkCoordinatorAssignment };
