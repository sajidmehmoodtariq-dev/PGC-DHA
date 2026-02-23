const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../models/Class');

async function createICSPhyClasses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    const classesToCreate = [
      {
        name: 'ICS-PHY 11th Girls',
        campus: 'Girls',
        grade: '11th',
        program: 'ICS-PHY',
        academicYear: '2024-2025'
      },
      {
        name: 'ICS-PHY 11th Boys', 
        campus: 'Boys',
        grade: '11th',
        program: 'ICS-PHY',
        academicYear: '2024-2025'
      }
    ];
    
    for (const classData of classesToCreate) {
      const existingClass = await Class.findOne({
        campus: classData.campus,
        grade: classData.grade,
        program: classData.program
      });
      
      if (existingClass) {
        console.log(`Class already exists: ${existingClass.name}`);
      } else {
        const newClass = new Class(classData);
        await newClass.save();
        console.log(`✅ Created: ${newClass.name}`);
      }
    }
    
    // List all classes
    const allClasses = await Class.find({});
    console.log(`\nTotal classes available: ${allClasses.length}`);
    allClasses.forEach(c => {
      console.log(`- ${c.name} (${c.grade}, ${c.campus}, ${c.program})`);
    });
    
    console.log('\nDone! ICS-PHY classes created.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

createICSPhyClasses();
