const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * Migration script to fix levelHistory data for students
 * This ensures all students have proper incremental levelHistory tracking
 */
async function migrateLevelHistoryData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB successfully');

    console.log('\n=== Level History Migration Script ===');
    console.log('This script will fix any students who have incomplete levelHistory data');

    // Find all students
    const students = await User.find({
      role: 'Student',
      status: { $ne: 3 } // Exclude deleted students
    }).select('_id fullName prospectusStage enquiryLevel levelHistory createdOn');

    console.log(`\nFound ${students.length} students to check`);

    let fixedCount = 0;
    let alreadyCorrectCount = 0;
    let issuesFound = 0;

    for (const student of students) {
      const currentLevel = student.prospectusStage || student.enquiryLevel || 1;
      const existingHistory = student.levelHistory || [];
      
      console.log(`\nChecking: ${student.fullName?.firstName} ${student.fullName?.lastName} (Level ${currentLevel})`);
      
      // Check if levelHistory is missing or incomplete
      const expectedLevels = [];
      for (let level = 1; level <= currentLevel; level++) {
        expectedLevels.push(level);
      }
      
      const existingLevels = existingHistory.map(h => h.level).sort();
      const missingLevels = expectedLevels.filter(level => !existingLevels.includes(level));
      
      if (missingLevels.length > 0) {
        console.log(`  ❌ Missing levels: ${missingLevels.join(', ')}`);
        console.log(`  📅 Using creation date: ${student.createdOn}`);
        
        // Fix the levelHistory
        const newHistory = [];
        
        // Keep existing entries that are valid
        existingHistory.forEach(entry => {
          if (entry.level >= 1 && entry.level <= currentLevel) {
            newHistory.push(entry);
          }
        });
        
        // Add missing levels with creation date
        missingLevels.forEach(level => {
          newHistory.push({
            level: level,
            achievedOn: student.createdOn || new Date(),
            updatedByName: 'Migration Script',
            isDecrement: false
          });
        });
        
        // Sort by level
        newHistory.sort((a, b) => a.level - b.level);
        
        // Update the student
        await User.updateOne(
          { _id: student._id },
          { 
            $set: { 
              levelHistory: newHistory,
              enquiryLevel: currentLevel,
              prospectusStage: currentLevel
            }
          }
        );
        
        console.log(`  ✅ Fixed levelHistory for ${newHistory.length} levels`);
        fixedCount++;
        
      } else if (existingLevels.length === expectedLevels.length && 
                 existingLevels.every((level, index) => level === expectedLevels[index])) {
        console.log(`  ✅ Already correct`);
        alreadyCorrectCount++;
        
      } else {
        console.log(`  ⚠️  Has unexpected levels: ${existingLevels.join(', ')} (expected: ${expectedLevels.join(', ')})`);
        
        // Fix by rebuilding the entire levelHistory
        const newHistory = [];
        for (let level = 1; level <= currentLevel; level++) {
          const existingEntry = existingHistory.find(h => h.level === level);
          if (existingEntry) {
            newHistory.push(existingEntry);
          } else {
            newHistory.push({
              level: level,
              achievedOn: student.createdOn || new Date(),
              updatedByName: 'Migration Script',
              isDecrement: false
            });
          }
        }
        
        await User.updateOne(
          { _id: student._id },
          { 
            $set: { 
              levelHistory: newHistory,
              enquiryLevel: currentLevel,
              prospectusStage: currentLevel
            }
          }
        );
        
        console.log(`  ✅ Rebuilt levelHistory completely`);
        fixedCount++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total students checked: ${students.length}`);
    console.log(`Students fixed: ${fixedCount}`);
    console.log(`Students already correct: ${alreadyCorrectCount}`);
    console.log(`Issues found: ${issuesFound}`);

    // Verify the fix by running a quick check
    console.log('\n=== Verification ===');
    const studentsAfterFix = await User.find({
      role: 'Student',
      status: { $ne: 3 },
      levelHistory: { $exists: true, $ne: [] }
    }).select('_id prospectusStage levelHistory');

    console.log(`Students with levelHistory after migration: ${studentsAfterFix.length}`);

    // Check for any remaining issues
    let remainingIssues = 0;
    for (const student of studentsAfterFix) {
      const currentLevel = student.prospectusStage || 1;
      const historyLevels = student.levelHistory.map(h => h.level).sort();
      const expectedLevels = Array.from({length: currentLevel}, (_, i) => i + 1);
      
      if (historyLevels.length !== expectedLevels.length || 
          !historyLevels.every((level, index) => level === expectedLevels[index])) {
        remainingIssues++;
      }
    }

    if (remainingIssues === 0) {
      console.log('✅ All students now have correct levelHistory data');
    } else {
      console.log(`⚠️  ${remainingIssues} students still have issues (manual review needed)`);
    }

    // Run a sample query to test the new aggregation
    console.log('\n=== Testing Aggregation ===');
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    const todayAchievements = await User.aggregate([
      {
        $match: {
          role: 'Student',
          levelHistory: { $exists: true, $ne: [] }
        }
      },
      { $unwind: '$levelHistory' },
      {
        $match: {
          'levelHistory.achievedOn': {
            $gte: todayStart,
            $lte: todayEnd
          }
        }
      },
      {
        $group: {
          _id: '$levelHistory.level',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    console.log('Today\'s level achievements:');
    todayAchievements.forEach(achievement => {
      console.log(`Level ${achievement._id}: ${achievement.count} achievements`);
    });

    if (todayAchievements.length === 0) {
      console.log('No level achievements found for today (this is normal if no new progressions happened today)');
    }

    await mongoose.disconnect();
    console.log('\nMigration completed successfully!');

  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

migrateLevelHistoryData();