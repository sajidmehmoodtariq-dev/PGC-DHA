const mongoose = require('mongoose');
require('dotenv').config();

// Import services
const ClassAssignmentService = require('../services/classAssignmentService');
const ZoneAnalyticsService = require('../services/zoneAnalyticsService');
const AnalyticsPrerequisiteChecker = require('../services/analyticsPrerequisiteChecker');

// Connect to database
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected for script execution');
  } catch (error) {
    console.error('Database connection error:', error);
    process.exit(1);
  }
};

/**
 * Initialize the Zone-Based Analytics System
 * This script will:
 * 1. Assign classes to unassigned students
 * 2. Calculate analytics for all students
 * 3. Generate zone statistics
 */
async function initializeAnalyticsSystem() {
  try {
    console.log('🚀 Starting Zone-Based Analytics System Initialization...\n');

    // Step 1: Get data quality report
    console.log('📊 Generating data quality report...');
    const qualityReport = await AnalyticsPrerequisiteChecker.getDataQualityReport();
    console.log('Data Quality Report:');
    console.log(`- Total Students: ${qualityReport.totalStudents}`);
    console.log(`- Ready for Analytics: ${qualityReport.readyForAnalytics}`);
    console.log(`- Need Manual Fix: ${qualityReport.needsManualFix}`);
    console.log(`- Can Auto-Fix: ${qualityReport.canAutoFix}`);
    console.log(`- Data Quality Score: ${qualityReport.dataQualityScore}%\n`);

    // Step 2: Assign classes to unassigned students
    if (qualityReport.issues.noClassAssignment > 0) {
      console.log('🏫 Assigning classes to unassigned students...');
      const assignmentResults = await ClassAssignmentService.assignAllUnassignedStudents();
      console.log('Class Assignment Results:');
      console.log(`- Assigned: ${assignmentResults.assigned}`);
      console.log(`- Already Assigned: ${assignmentResults.alreadyAssigned}`);
      console.log(`- Failed: ${assignmentResults.failed}`);
      
      if (assignmentResults.errors.length > 0) {
        console.log('- Errors:', assignmentResults.errors.slice(0, 5)); // Show first 5 errors
      }
      console.log('');
    } else {
      console.log('✅ All students already have class assignments\n');
    }

    // Step 3: Calculate analytics for all students
    console.log('🔢 Calculating analytics for all students...');
    const analyticsResults = await ZoneAnalyticsService.calculateAllStudentAnalytics();
    console.log('Analytics Calculation Results:');
    console.log(`- Successful: ${analyticsResults.successful}`);
    console.log(`- Failed: ${analyticsResults.failed}`);
    
    if (analyticsResults.errors.length > 0) {
      console.log('- Sample Errors:', analyticsResults.errors.slice(0, 3)); // Show first 3 errors
    }
    console.log('');

    // Step 4: Generate zone statistics
    console.log('📈 Generating zone statistics...');
    const statisticsResults = await ZoneAnalyticsService.generateAllStatistics();
    console.log('Zone Statistics Generated:');
    console.log(`- Overall Statistics: ✅`);
    console.log(`- Subject-wise Statistics: ✅`);
    console.log('');

    // Step 5: Final data quality check
    console.log('🔍 Final data quality check...');
    const finalReport = await AnalyticsPrerequisiteChecker.getDataQualityReport();
    console.log('Final Data Quality Report:');
    console.log(`- Data Quality Score: ${finalReport.dataQualityScore}%`);
    console.log(`- Students Ready for Analytics: ${finalReport.readyForAnalytics}/${finalReport.totalStudents}`);
    console.log('');

    console.log('✅ Zone-Based Analytics System Initialization Complete!');
    console.log('');
    console.log('🎯 Next Steps:');
    console.log('1. Start the development server');
    console.log('2. Access analytics at /api/analytics/overview');
    console.log('3. Check individual student analytics');
    console.log('4. Export performance matrices');

  } catch (error) {
    console.error('❌ Error during initialization:', error);
    throw error;
  }
}

/**
 * Get current system status
 */
async function getSystemStatus() {
  try {
    console.log('📊 Zone-Based Analytics System Status\n');

    // Class assignment statistics
    const assignmentStats = await ClassAssignmentService.getAssignmentStatistics();
    console.log('Class Assignment Status:');
    console.log(`- Total Students: ${assignmentStats.total}`);
    console.log(`- Assigned: ${assignmentStats.assigned}`);
    console.log(`- Unassigned: ${assignmentStats.unassigned}`);
    console.log(`- Assignment Rate: ${assignmentStats.assignmentRate}%\n`);

    // Data quality report
    const qualityReport = await AnalyticsPrerequisiteChecker.getDataQualityReport();
    console.log('Data Quality Status:');
    console.log(`- Data Quality Score: ${qualityReport.dataQualityScore}%`);
    console.log(`- Ready for Analytics: ${qualityReport.readyForAnalytics}`);
    console.log(`- Need Manual Fix: ${qualityReport.needsManualFix}`);
    console.log(`- Can Auto-Fix: ${qualityReport.canAutoFix}\n`);

    // Analytics coverage
    const StudentAnalytics = require('../models/StudentAnalytics');
    const analyticsCount = await StudentAnalytics.countDocuments();
    console.log('Analytics Coverage:');
    console.log(`- Students with Analytics: ${analyticsCount}`);
    console.log(`- Analytics Coverage: ${((analyticsCount / assignmentStats.total) * 100).toFixed(2)}%\n`);

  } catch (error) {
    console.error('❌ Error getting system status:', error);
    throw error;
  }
}

/**
 * Recalculate analytics for all students
 */
async function recalculateAllAnalytics() {
  try {
    console.log('🔄 Recalculating analytics for all students...\n');
    
    const results = await ZoneAnalyticsService.calculateAllStudentAnalytics();
    console.log('Recalculation Results:');
    console.log(`- Successful: ${results.successful}`);
    console.log(`- Failed: ${results.failed}`);
    
    if (results.errors.length > 0) {
      console.log('- Errors:', results.errors.slice(0, 5));
    }

    console.log('\n🔄 Refreshing zone statistics...');
    await ZoneAnalyticsService.generateAllStatistics();
    console.log('✅ Zone statistics refreshed');

  } catch (error) {
    console.error('❌ Error recalculating analytics:', error);
    throw error;
  }
}

// Main execution
async function main() {
  await connectDB();
  
  const command = process.argv[2];
  
  try {
    switch (command) {
      case 'init':
        await initializeAnalyticsSystem();
        break;
      case 'status':
        await getSystemStatus();
        break;
      case 'recalculate':
        await recalculateAllAnalytics();
        break;
      default:
        console.log('Available commands:');
        console.log('- init: Initialize the analytics system');
        console.log('- status: Get current system status');
        console.log('- recalculate: Recalculate all analytics');
        console.log('');
        console.log('Usage: node scripts/initializeAnalytics.js <command>');
    }
  } catch (error) {
    console.error('Script execution failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the script if called directly
if (require.main === module) {
  main();
}

module.exports = {
  initializeAnalyticsSystem,
  getSystemStatus,
  recalculateAllAnalytics
};
