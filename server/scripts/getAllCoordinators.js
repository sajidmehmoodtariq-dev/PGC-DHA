require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = "mongodb+srv://sajidmehmood:3V4PyBh3h4SFnw%40@cluster0.yhma3.mongodb.net/pgc";
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

const getAllCoordinators = async () => {
  try {
    console.log('👥 ALL COORDINATOR USERS:');
    console.log('==========================');
    
    // Try different variations of coordinator role (case sensitivity)
    const coordinatorVariations = ['coordinator', 'Coordinator', 'COORDINATOR'];
    let coordinators = [];
    
    for (const roleVariation of coordinatorVariations) {
      const found = await User.find({ role: roleVariation })
        .select('name email role coordinatorAssignment')
        .sort({ name: 1 });
      
      if (found.length > 0) {
        console.log(`Found ${found.length} users with role "${roleVariation}"`);
        coordinators = found;
        break;
      }
    }
    
    if (coordinators.length === 0) {
      console.log('❌ No coordinator users found with any role variation');
      
      // Show all users for debugging
      const allUsers = await User.find({})
        .select('name email role')
        .limit(10);
      
      console.log('\n📋 Sample users in database:');
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name || 'NO NAME'} (${user.email}) - Role: "${user.role}"`);
      });
      return;
    }
    
    console.log(`Found ${coordinators.length} coordinator users:\n`);
    
    coordinators.forEach((coordinator, index) => {
      console.log(`${index + 1}. ${coordinator.name}`);
      console.log(`   📧 Email: ${coordinator.email}`);
      console.log(`   🆔 ID: ${coordinator._id}`);
      console.log(`   👤 Role: ${coordinator.role}`);
      
      if (coordinator.coordinatorAssignment) {
        const grade = coordinator.coordinatorAssignment.grade || 'NOT SET';
        const campus = coordinator.coordinatorAssignment.campus || 'NOT SET';
        
        console.log(`   📍 Assignment: Grade=${grade}, Campus=${campus}`);
        
        // Calculate floor if both grade and campus are set
        if (grade !== 'NOT SET' && campus !== 'NOT SET') {
          let floor = null;
          if (campus === 'Boys' && grade === '11th') floor = 1;
          else if (campus === 'Boys' && grade === '12th') floor = 2;
          else if (campus === 'Girls' && grade === '11th') floor = 3;
          else if (campus === 'Girls' && grade === '12th') floor = 4;
          
          if (floor) {
            console.log(`   🏗️ Floor: ${floor}`);
          } else {
            console.log(`   ⚠️ Floor: Cannot calculate (invalid combination)`);
          }
        } else {
          console.log(`   🏗️ Floor: Not assigned (incomplete data)`);
        }
      } else {
        console.log(`   📍 Assignment: null (no assignment object)`);
        console.log(`   🏗️ Floor: Not assigned`);
      }
      
      console.log('');
    });
    
    console.log('📋 ASSIGNMENT STATUS SUMMARY:');
    console.log('==============================');
    
    const assigned = coordinators.filter(c => 
      c.coordinatorAssignment && 
      c.coordinatorAssignment.grade && 
      c.coordinatorAssignment.campus
    );
    
    const unassigned = coordinators.filter(c => 
      !c.coordinatorAssignment || 
      !c.coordinatorAssignment.grade || 
      !c.coordinatorAssignment.campus
    );
    
    console.log(`✅ Fully assigned: ${assigned.length}`);
    console.log(`❌ Unassigned/Incomplete: ${unassigned.length}`);
    
    if (assigned.length > 0) {
      console.log('\n✅ Assigned coordinators:');
      assigned.forEach(c => {
        const floor = getFloorNumber(c.coordinatorAssignment.grade, c.coordinatorAssignment.campus);
        console.log(`   • ${c.name} → ${c.coordinatorAssignment.grade} ${c.coordinatorAssignment.campus} (Floor ${floor})`);
      });
    }
    
    if (unassigned.length > 0) {
      console.log('\n❌ Unassigned coordinators:');
      unassigned.forEach(c => {
        console.log(`   • ${c.name} (${c.email}) - ID: ${c._id}`);
      });
      
      console.log('\n🔧 To fix an unassigned coordinator, run:');
      console.log('node fixCoordinatorAssignment.js <userId> <grade> <campus>');
      console.log('\nExample for first unassigned coordinator:');
      if (unassigned[0]) {
        console.log(`node fixCoordinatorAssignment.js ${unassigned[0]._id} "11th" "Boys"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error getting coordinators:', error);
  }
};

const getFloorNumber = (grade, campus) => {
  if (campus === 'Boys' && grade === '11th') return 1;
  if (campus === 'Boys' && grade === '12th') return 2;
  if (campus === 'Girls' && grade === '11th') return 3;
  if (campus === 'Girls' && grade === '12th') return 4;
  return 'Unknown';
};

// Main execution
const main = async () => {
  await connectDB();
  await getAllCoordinators();
  
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

module.exports = { getAllCoordinators };
