const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

async function fixProblematicStudent() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    const studentId = '68906f8332dc397d9a06542a';
    
    // Find the student
    const student = await User.findById(studentId);
    
    if (!student) {
      console.log('Student not found!');
      return;
    }

    console.log('=== BEFORE FIX ===');
    console.log('Name:', student.name || 'N/A');
    console.log('Email:', student.email || 'N/A');
    console.log('Prospectus Stage:', student.prospectusStage);
    console.log('Level History:', student.levelHistory);

    // Option 1: Initialize levelHistory with current prospectusStage
    if (student.prospectusStage && student.prospectusStage >= 1) {
      const levelHistory = [];
      
      // Create history entries for levels 1 through current prospectusStage
      for (let level = 1; level <= student.prospectusStage; level++) {
        levelHistory.push({
          level: level,
          achievedOn: student.createdAt || new Date(), // Use creation date or current date
          updatedBy: null // System initialization
        });
      }

      // Update the student
      const updatedStudent = await User.findByIdAndUpdate(
        studentId,
        { 
          levelHistory: levelHistory,
          updatedAt: new Date()
        },
        { new: true }
      );

      console.log('\n=== AFTER FIX ===');
      console.log('Name:', updatedStudent.name || 'N/A');
      console.log('Email:', updatedStudent.email || 'N/A');
      console.log('Prospectus Stage:', updatedStudent.prospectusStage);
      console.log('Level History:', updatedStudent.levelHistory);
      
      console.log('\n✅ SUCCESS: Student levelHistory initialized!');
      console.log('The count discrepancy should now be resolved.');
      
    } else {
      console.log('\n❌ Student has invalid prospectusStage:', student.prospectusStage);
      console.log('Consider removing this student or fixing their prospectusStage first.');
    }

    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixProblematicStudent();
