const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../models/Class');

async function checkClasses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    const classes = await Class.find().select('name grade campus program');
    console.log(`Available classes: ${classes.length}`);
    
    if (classes.length === 0) {
      console.log('No classes found in the database.');
      console.log('The analytics system requires classes to be created first.');
    } else {
      classes.forEach(cls => {
        console.log(`- ${cls.name} (${cls.grade}, ${cls.campus}, ${cls.program})`);
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkClasses();
