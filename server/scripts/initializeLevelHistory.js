const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Migration Script: Initialize Level History for Existing Students
 * 
 * This script adds levelHistory to existing students who don't have it.
 * For existing students, it creates a single level history entry with:
 * - level: current prospectusStage
 * - achievedOn: createdOn date (assuming they achieved their current level on creation)
 * - updatedBy: null (system migration)
 * - updatedByName: 'Migration'
 */

async function initializeLevelHistory() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully');

    // Find all students without levelHistory
    const studentsWithoutHistory = await User.find({
      role: 'Student',
      $or: [
        { levelHistory: { $exists: false } },
        { levelHistory: { $size: 0 } },
        { levelHistory: null }
      ]
    });

    console.log(`Found ${studentsWithoutHistory.length} students without level history`);

    if (studentsWithoutHistory.length === 0) {
      console.log('All students already have level history. Migration not needed.');
      return;
    }

    let updated = 0;
    let errors = 0;

    for (const student of studentsWithoutHistory) {
      try {
        const currentLevel = student.prospectusStage || student.enquiryLevel || 1;
        const achievedOn = student.createdOn || new Date();

        // Initialize level history with SINGLE entry for current level only
        // The pre-save hook will handle incremental creation if needed
        student.levelHistory = [{
          level: currentLevel,
          achievedOn: achievedOn,
          updatedBy: null,
          updatedByName: 'Migration'
        }];

        console.log(`Migrating student ${student.fullName?.firstName} ${student.fullName?.lastName}: Added level ${currentLevel} only`);

        // Save the student (this will trigger the pre-save hook)
        await student.save();
        updated++;

        if (updated % 100 === 0) {
          console.log(`Processed ${updated} students...`);
        }

      } catch (err) {
        console.error(`Error updating student ${student._id}:`, err.message);
        errors++;
      }
    }

    console.log(`\n✅ Migration completed!`);
    console.log(`📊 Updated: ${updated} students`);
    console.log(`❌ Errors: ${errors} students`);

    if (errors === 0) {
      console.log(`🎉 All students now have level history tracking!`);
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
  initializeLevelHistory()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

module.exports = initializeLevelHistory;
