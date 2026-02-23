require('dotenv').config('./../.env');
const mongoose = require('mongoose');
const Class = require('../models/Class');

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

const checkClassData = async () => {
  try {
    console.log('🏫 CLASS VERIFICATION:');
    console.log('======================');
    
    const classes = await Class.find({ isActive: true })
      .select('name grade campus program floor')
      .sort({ floor: 1, grade: 1, campus: 1 });
    
    console.log(`Found ${classes.length} active classes:`);
    
    if (classes.length === 0) {
      console.log('❌ No active classes found in database');
      return;
    }
    
    // Group by floor
    const classesbyFloor = {};
    classes.forEach(cls => {
      if (!classesbyFloor[cls.floor]) {
        classesbyFloor[cls.floor] = [];
      }
      classesbyFloor[cls.floor].push(cls);
    });
    
    Object.keys(classesbyFloor).sort().forEach(floor => {
      console.log(`\n🏗️ Floor ${floor}:`);
      classesbyFloor[floor].forEach((cls, index) => {
        console.log(`   ${index + 1}. ${cls.name}`);
        console.log(`      Grade: ${cls.grade}`);
        console.log(`      Campus: ${cls.campus}`);
        console.log(`      Program: ${cls.program}`);
        console.log('');
      });
    });
    
    // Check for coordinator assignment requirements
    console.log('📋 COORDINATOR ASSIGNMENT REQUIREMENTS:');
    console.log('=======================================');
    console.log('Floor 1: 11th Boys');
    console.log('Floor 2: 12th Boys');
    console.log('Floor 3: 11th Girls');
    console.log('Floor 4: 12th Girls');
    console.log('');
    
    // Available combinations
    const combinations = new Set();
    classes.forEach(cls => {
      combinations.add(`${cls.grade}-${cls.campus}`);
    });
    
    console.log('Available Grade-Campus combinations:');
    Array.from(combinations).sort().forEach(combo => {
      const [grade, campus] = combo.split('-');
      let floor = null;
      if (campus === 'Boys' && grade === '11th') floor = 1;
      else if (campus === 'Boys' && grade === '12th') floor = 2;
      else if (campus === 'Girls' && grade === '11th') floor = 3;
      else if (campus === 'Girls' && grade === '12th') floor = 4;
      
      console.log(`   ${grade} ${campus} → Floor ${floor || 'UNKNOWN'}`);
    });
    
  } catch (error) {
    console.error('❌ Error checking classes:', error);
  }
};

// Main execution
const main = async () => {
  await connectDB();
  await checkClassData();
  
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

module.exports = { checkClassData };
