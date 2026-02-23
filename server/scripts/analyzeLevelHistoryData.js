const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Data Analysis Script: Check Current Level History State
 * 
 * This script analyzes the current state of level history data
 * to understand what happened during the migration
 */

async function analyzeLevelHistoryData() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully');

    console.log('🔍 Analyzing current student data...\n');
    
    // Get all students
    const allStudents = await User.find({ role: 'Student' });
    console.log(`📊 Total students: ${allStudents.length}`);
    
    // Analyze level distribution by prospectusStage
    console.log('\n📈 Level Distribution (by prospectusStage):');
    const levelDist = {};
    for (let level = 1; level <= 5; level++) {
      levelDist[level] = allStudents.filter(s => (s.prospectusStage || s.enquiryLevel || 1) === level).length;
      console.log(`Level ${level}: ${levelDist[level]} students`);
    }
    
    // Analyze levelHistory status
    console.log('\n📋 Level History Status:');
    const withHistory = allStudents.filter(s => s.levelHistory && s.levelHistory.length > 0);
    const withoutHistory = allStudents.filter(s => !s.levelHistory || s.levelHistory.length === 0);
    
    console.log(`Students with level history: ${withHistory.length}`);
    console.log(`Students without level history: ${withoutHistory.length}`);
    
    // Analyze level history patterns
    if (withHistory.length > 0) {
      console.log('\n🔍 Level History Analysis:');
      
      // Group by level history length
      const historyLengths = {};
      withHistory.forEach(student => {
        const length = student.levelHistory.length;
        if (!historyLengths[length]) historyLengths[length] = 0;
        historyLengths[length]++;
      });
      
      console.log('Level history entry counts:');
      Object.keys(historyLengths).sort((a, b) => parseInt(a) - parseInt(b)).forEach(length => {
        console.log(`  ${length} entries: ${historyLengths[length]} students`);
      });
      
      // Check for mismatches between prospectusStage and levelHistory
      console.log('\n⚠️  Checking for mismatches:');
      let mismatches = 0;
      
      withHistory.forEach(student => {
        const currentLevel = student.prospectusStage || student.enquiryLevel || 1;
        const lastHistoryLevel = student.levelHistory[student.levelHistory.length - 1]?.level;
        
        if (currentLevel !== lastHistoryLevel) {
          console.log(`Mismatch: ${student.fullName?.firstName} ${student.fullName?.lastName} - prospectusStage: ${currentLevel}, last history: ${lastHistoryLevel}`);
          mismatches++;
        }
      });
      
      console.log(`Total mismatches found: ${mismatches}`);
      
      // Sample a few students with level history
      console.log('\n📝 Sample level history entries:');
      for (let i = 0; i < Math.min(5, withHistory.length); i++) {
        const student = withHistory[i];
        console.log(`\nStudent: ${student.fullName?.firstName} ${student.fullName?.lastName}`);
        console.log(`Current Level: ${student.prospectusStage || student.enquiryLevel || 1}`);
        console.log(`Level History:`);
        student.levelHistory.forEach((entry, index) => {
          console.log(`  ${index + 1}. Level ${entry.level} - ${entry.achievedOn.toISOString().split('T')[0]} (${entry.updatedByName})`);
        });
      }
    }
    
    // Check for level 2 students specifically
    console.log('\n🔍 Level 2 Analysis:');
    const level2Students = allStudents.filter(s => (s.prospectusStage || s.enquiryLevel || 1) === 2);
    console.log(`Level 2 students: ${level2Students.length}`);
    
    const level2WithHistory = level2Students.filter(s => s.levelHistory && s.levelHistory.length > 0);
    console.log(`Level 2 with history: ${level2WithHistory.length}`);
    
    if (level2WithHistory.length > 0) {
      console.log('Sample Level 2 students with history:');
      level2WithHistory.slice(0, 3).forEach(student => {
        console.log(`  ${student.fullName?.firstName} ${student.fullName?.lastName}: ${student.levelHistory.length} history entries`);
      });
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the analysis
if (require.main === module) {
  analyzeLevelHistoryData()
    .then(() => {
      console.log('\nAnalysis completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = analyzeLevelHistoryData;
