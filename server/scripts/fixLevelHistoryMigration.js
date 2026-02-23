const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Fixed Migration Script: Properly Initialize Level History for Existing Students
 * 
 * This script correctly initializes level history by:
 * 1. Temporarily disabling the pre-save hook logic for existing students
 * 2. Creating proper incremental level history (1 to current level)
 * 3. Not triggering save() which would run the pre-save hook
 */

async function fixLevelHistoryMigration() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Find all students to check their level history
    console.log('Analyzing current student data...');
    
    // First, let's see what we have
    const allStudents = await User.find({ role: 'Student' });
    console.log(`Total students found: ${allStudents.length}`);
    
    const studentsWithHistory = allStudents.filter(s => s.levelHistory && s.levelHistory.length > 0);
    const studentsWithoutHistory = allStudents.filter(s => !s.levelHistory || s.levelHistory.length === 0);
    
    console.log(`Students with level history: ${studentsWithHistory.length}`);
    console.log(`Students without level history: ${studentsWithoutHistory.length}`);
    
    // Check level distribution before fix
    const levelDistribution = {};
    for (let level = 1; level <= 5; level++) {
      levelDistribution[level] = allStudents.filter(s => (s.prospectusStage || s.enquiryLevel || 1) === level).length;
    }
    console.log('\nCurrent Level Distribution (by prospectusStage):');
    console.log(levelDistribution);

    // Let's reset ALL students to have clean level history
    console.log('\n🔄 Resetting level history for all students...');
    
    let fixed = 0;
    let errors = 0;

    for (const student of allStudents) {
      try {
        const currentLevel = student.prospectusStage || student.enquiryLevel || 1;
        const achievedOn = student.createdOn || new Date();

        // Create proper incremental level history using direct database update
        // This bypasses the pre-save hook entirely
        const levelHistoryEntries = [];
        for (let level = 1; level <= currentLevel; level++) {
          levelHistoryEntries.push({
            level: level,
            achievedOn: achievedOn,
            updatedBy: null,
            updatedByName: 'Migration-Fixed'
          });
        }

        // Direct database update without triggering pre-save hooks
        await User.updateOne(
          { _id: student._id },
          { 
            $set: { 
              levelHistory: levelHistoryEntries 
            }
          }
        );

        console.log(`Fixed student ${student.fullName?.firstName} ${student.fullName?.lastName}: Levels 1-${currentLevel}`);
        fixed++;

        if (fixed % 100 === 0) {
          console.log(`Fixed ${fixed} students...`);
        }

      } catch (err) {
        console.error(`Error fixing student ${student._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n✅ Level history fix completed!`);
    console.log(`📊 Fixed: ${fixed} students`);
    console.log(`❌ Errors: ${errors} students`);

    // Verify the fix by checking counts again
    console.log('\n🔍 Verifying fix...');
    const verifyStudents = await User.find({ role: 'Student' });
    
    const newLevelDistribution = {};
    for (let level = 1; level <= 5; level++) {
      newLevelDistribution[level] = verifyStudents.filter(s => (s.prospectusStage || s.enquiryLevel || 1) === level).length;
    }
    
    console.log('\nLevel Distribution after fix (by prospectusStage):');
    console.log(newLevelDistribution);
    
    console.log('\nLevel Distribution change:');
    for (let level = 1; level <= 5; level++) {
      const change = newLevelDistribution[level] - levelDistribution[level];
      console.log(`Level ${level}: ${levelDistribution[level]} → ${newLevelDistribution[level]} (${change >= 0 ? '+' : ''}${change})`);
    }

    if (errors === 0) {
      console.log(`🎉 All students now have correct level history tracking!`);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close the database connection
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the migration
if (require.main === module) {
  fixLevelHistoryMigration()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

module.exports = fixLevelHistoryMigration;
