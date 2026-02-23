const mongoose = require('mongoose');
require('dotenv').config();
const Class = require('../models/Class');
const User = require('../models/User');

async function createSampleClasses() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    // Get all students to see what classes we need
    const students = await User.find({ 
      role: 'Student', 
      enquiryLevel: 5 
    }).select('program gender admissionInfo');
    
    console.log('Students and their requirements:');
    const requirements = new Set();
    
    students.forEach(student => {
      const campus = student.gender?.toLowerCase() === 'female' ? 'Girls' : 'Boys';
      const grade = student.admissionInfo?.grade || '11th';
      let program = student.program || 'General';
      
      // Map student programs to class programs
      const programMapping = {
        'FA IT': 'FA',
        'ICS-PHY': 'ICS-PHY',  // Keep ICS-PHY as is - it's valid
        'Pre Engineering': 'Pre Engineering',
        'Pre Medical': 'Pre Medical',
        'ICOM': 'ICOM',
        'ICS': 'ICS',
        'General': 'FA'
      };
      
      program = programMapping[program] || 'FA';
      
      const requirement = `${grade}-${campus}-${program}`;
      requirements.add(requirement);
      
      console.log(`- ${student.fullName?.firstName || 'Unknown'} ${student.fullName?.lastName || 'Student'}: ${requirement}`);
    });
    
    console.log('\nUnique class requirements:', Array.from(requirements));
    
    // Create classes for each unique requirement
    const classesToCreate = [];
    
    for (const req of requirements) {
      const [grade, campus, program] = req.split('-');
      
      // Check if class already exists
      const existingClass = await Class.findOne({ grade, campus, program });
      if (existingClass) {
        console.log(`Class already exists: ${existingClass.name}`);
        continue;
      }
      
      const className = `${program} ${grade} ${campus}`;
      
      classesToCreate.push({
        name: className,
        campus,
        grade,
        program,
        floor: getFloor(campus, grade),
        capacity: 40,
        section: 'A',
        roomNumber: `R${Math.floor(Math.random() * 100) + 1}`,
        students: []
      });
    }
    
    if (classesToCreate.length > 0) {
      console.log(`\nCreating ${classesToCreate.length} new classes...`);
      const createdClasses = await Class.insertMany(classesToCreate);
      
      createdClasses.forEach(cls => {
        console.log(`✅ Created: ${cls.name}`);
      });
    } else {
      console.log('\nNo new classes needed.');
    }
    
    // Show final list of classes
    const allClasses = await Class.find().select('name grade campus program');
    console.log(`\nTotal classes available: ${allClasses.length}`);
    allClasses.forEach(cls => {
      console.log(`- ${cls.name} (${cls.grade}, ${cls.campus}, ${cls.program})`);
    });
    
    await mongoose.disconnect();
    console.log('\nDone! Now you can run the analytics initialization again.');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

function getFloor(campus, grade) {
  if (campus === 'Boys' && grade === '11th') return 1;
  if (campus === 'Boys' && grade === '12th') return 2;
  if (campus === 'Girls' && grade === '11th') return 3;
  if (campus === 'Girls' && grade === '12th') return 4;
  return 1;
}

createSampleClasses();
