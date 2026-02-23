const mongoose = require('mongoose');
const Class = require('../models/Class');
require('dotenv').config();

async function checkExistingClasses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const classes = await Class.find().limit(5);
    console.log('Available classes:', classes.length);
    
    if (classes.length > 0) {
      console.log('Sample classes:');
      classes.forEach((cls, index) => {
        console.log(`${index + 1}. ${cls.name} (ID: ${cls._id})`);
      });
    } else {
      console.log('No classes found in database');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkExistingClasses();
