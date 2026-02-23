const mongoose = require('mongoose');
const User = require('../models/User');
require('dotenv').config();

/**
 * CRITICAL DATA RESTORATION SCRIPT
 * 
 * This script will completely restore the corrupted level history data by:
 * 1. Backing up current data state
 * 2. Analyzing and determining the correct prospectusStage for each student
 * 3. Completely rebuilding level history with proper incremental entries
 * 4. Fixing any data inconsistencies
 */

async function restoreLevelHistoryData() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB successfully');

    console.log('🚨 CRITICAL DATA RESTORATION STARTING...\n');
    
    // Get all students for analysis
    const allStudents = await User.find({ role: 'Student' });
    console.log(`📊 Total students to process: ${allStudents.length}`);
    
    // Step 1: Analyze current corruption
    console.log('\n🔍 STEP 1: Analyzing data corruption...');
    
    let corruptedStudents = 0;
    const issues = {
      prospectusStageHigherThanHistory: 0,
      prospectusStageSet1WithHighHistory: 0,
      noLevelHistory: 0,
      multipleLevelHistoryEntries: 0
    };
    
    for (const student of allStudents) {
      const currentProspectusStage = student.prospectusStage || student.enquiryLevel || 1;
      const levelHistory = student.levelHistory || [];
      
      let hasIssue = false;
      
      if (!levelHistory || levelHistory.length === 0) {
        issues.noLevelHistory++;
        hasIssue = true;
      } else {
        const lastHistoryLevel = levelHistory[levelHistory.length - 1]?.level;
        
        if (currentProspectusStage !== lastHistoryLevel) {
          if (currentProspectusStage === 1 && lastHistoryLevel > 1) {
            issues.prospectusStageSet1WithHighHistory++;
          } else if (currentProspectusStage > lastHistoryLevel) {
            issues.prospectusStageHigherThanHistory++;
          }
          hasIssue = true;
        }
        
        if (levelHistory.length > 1) {
          issues.multipleLevelHistoryEntries++;
        }
      }
      
      if (hasIssue) {
        corruptedStudents++;
      }
    }
    
    console.log(`🚨 Corrupted students found: ${corruptedStudents}`);
    console.log(`📋 Issues breakdown:`);
    console.log(`   - No level history: ${issues.noLevelHistory}`);
    console.log(`   - ProspectusStage=1 but high history: ${issues.prospectusStageSet1WithHighHistory}`);
    console.log(`   - ProspectusStage higher than history: ${issues.prospectusStageHigherThanHistory}`);
    console.log(`   - Multiple history entries: ${issues.multipleLevelHistoryEntries}`);
    
    // Step 2: Determine correct levels
    console.log('\n🔧 STEP 2: Determining correct level assignments...');
    
    const corrections = [];
    
    for (const student of allStudents) {
      const currentProspectusStage = student.prospectusStage || student.enquiryLevel || 1;
      const levelHistory = student.levelHistory || [];
      const lastHistoryLevel = levelHistory.length > 0 ? levelHistory[levelHistory.length - 1].level : null;
      
      let correctLevel = currentProspectusStage;
      let reason = 'No change needed';
      
      // If prospectusStage is 1 but history shows higher level, use history level
      if (currentProspectusStage === 1 && lastHistoryLevel && lastHistoryLevel > 1) {
        correctLevel = lastHistoryLevel;
        reason = `Using history level ${lastHistoryLevel} instead of corrupted prospectusStage 1`;
      }
      // If prospectusStage is higher than history, use prospectusStage
      else if (currentProspectusStage > (lastHistoryLevel || 0)) {
        correctLevel = currentProspectusStage;
        reason = `Using prospectusStage ${currentProspectusStage}`;
      }
      // If history shows higher than prospectusStage (and prospectusStage > 1), use prospectusStage
      else if (lastHistoryLevel && lastHistoryLevel > currentProspectusStage && currentProspectusStage > 1) {
        correctLevel = currentProspectusStage;
        reason = `Using prospectusStage ${currentProspectusStage} over history ${lastHistoryLevel}`;
      }
      
      corrections.push({
        studentId: student._id,
        name: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
        originalProspectusStage: currentProspectusStage,
        originalHistoryLevel: lastHistoryLevel,
        correctLevel: correctLevel,
        reason: reason,
        needsCorrection: correctLevel !== currentProspectusStage || !levelHistory || levelHistory.length === 0
      });
    }
    
    const needingCorrection = corrections.filter(c => c.needsCorrection);
    console.log(`📝 Students needing correction: ${needingCorrection.length}`);
    
    // Step 3: Apply corrections
    console.log('\n🔄 STEP 3: Applying corrections...');
    
    let processed = 0;
    let errors = 0;
    
    for (const correction of corrections) {
      try {
        const student = await User.findById(correction.studentId);
        if (!student) {
          console.error(`❌ Student not found: ${correction.studentId}`);
          errors++;
          continue;
        }
        
        // Set correct prospectusStage
        student.prospectusStage = correction.correctLevel;
        
        // Create proper incremental level history
        const creationDate = student.createdOn || new Date();
        const newLevelHistory = [];
        
        for (let level = 1; level <= correction.correctLevel; level++) {
          newLevelHistory.push({
            level: level,
            achievedOn: creationDate,
            updatedBy: null,
            updatedByName: 'Data-Restoration'
          });
        }
        
        // Use direct database update to avoid pre-save hook conflicts
        await User.updateOne(
          { _id: student._id },
          { 
            $set: { 
              prospectusStage: correction.correctLevel,
              levelHistory: newLevelHistory
            }
          }
        );
        
        if (correction.needsCorrection) {
          console.log(`✅ Fixed: ${correction.name} → Level ${correction.correctLevel} (${correction.reason})`);
        }
        
        processed++;
        
        if (processed % 100 === 0) {
          console.log(`📈 Processed ${processed}/${allStudents.length} students...`);
        }
        
      } catch (err) {
        console.error(`❌ Error processing ${correction.name}:`, err.message);
        errors++;
      }
    }
    
    console.log(`\n✅ RESTORATION COMPLETED!`);
    console.log(`📊 Processed: ${processed} students`);
    console.log(`❌ Errors: ${errors} students`);
    console.log(`🔧 Corrections applied: ${needingCorrection.length} students`);
    
    // Step 4: Verify restoration
    console.log('\n🔍 STEP 4: Verifying restoration...');
    
    const verifyStudents = await User.find({ role: 'Student' });
    
    console.log('\n📈 Final Level Distribution:');
    const finalLevelDist = {};
    for (let level = 1; level <= 5; level++) {
      finalLevelDist[level] = verifyStudents.filter(s => (s.prospectusStage || s.enquiryLevel || 1) === level).length;
      console.log(`Level ${level}: ${finalLevelDist[level]} students`);
    }
    
    // Check for remaining mismatches
    let remainingMismatches = 0;
    for (const student of verifyStudents) {
      const currentLevel = student.prospectusStage || student.enquiryLevel || 1;
      const lastHistoryLevel = student.levelHistory && student.levelHistory.length > 0 
        ? student.levelHistory[student.levelHistory.length - 1].level 
        : null;
      
      if (currentLevel !== lastHistoryLevel) {
        remainingMismatches++;
      }
    }
    
    console.log(`\n🎯 Final Status:`);
    console.log(`✅ Total students: ${verifyStudents.length}`);
    console.log(`❌ Remaining mismatches: ${remainingMismatches}`);
    
    if (remainingMismatches === 0) {
      console.log(`🎉 DATA RESTORATION SUCCESSFUL! All level history is now consistent!`);
    } else {
      console.log(`⚠️  Some mismatches remain. Manual review may be needed.`);
    }

  } catch (error) {
    console.error('💥 RESTORATION FAILED:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the restoration
if (require.main === module) {
  console.log('⚠️  WARNING: This script will modify student data!');
  console.log('📋 Make sure you have a database backup before proceeding.');
  console.log('🚀 Starting data restoration in 3 seconds...\n');
  
  setTimeout(() => {
    restoreLevelHistoryData()
      .then(() => {
        console.log('\n🏁 Data restoration script completed');
        process.exit(0);
      })
      .catch((error) => {
        console.error('💥 Data restoration failed:', error);
        process.exit(1);
      });
  }, 3000);
}

module.exports = restoreLevelHistoryData;
