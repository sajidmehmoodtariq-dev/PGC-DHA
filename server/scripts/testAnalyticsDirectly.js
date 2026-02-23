require('dotenv').config();
const mongoose = require('mongoose');
const ZoneAnalyticsService = require('../services/zoneAnalyticsService');
const StudentAnalytics = require('../models/StudentAnalytics');
const ZoneStatistics = require('../models/ZoneStatistics');

async function testAnalyticsDirectly() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to database');
    
    console.log('\n🧪 Testing Zone Analytics Service directly...\n');
    
    // Test 1: Get zone statistics
    console.log('1. Testing Zone Statistics');
    const zoneStats = await ZoneStatistics.find({});
    console.log(`Found ${zoneStats.length} zone statistics records`);
    if (zoneStats.length > 0) {
      console.log('Sample zone statistics:', JSON.stringify(zoneStats[0], null, 2));
    }
    
    // Test 2: Get student analytics
    console.log('\n2. Testing Student Analytics');
    const studentAnalytics = await StudentAnalytics.find({}).populate('studentId', 'fullName email');
    console.log(`Found ${studentAnalytics.length} student analytics records`);
    
    studentAnalytics.forEach((analytics, index) => {
      if (index < 3) { // Show first 3
        console.log(`Student ${index + 1}: ${analytics.studentId?.fullName?.firstName || 'Unknown'}`);
        console.log(`  Current Zone: ${analytics.currentZone}`);
        console.log(`  Overall Percentage: ${analytics.overallPercentage}%`);
        console.log(`  Achievement Level: ${analytics.achievementLevel}`);
      }
    });
    
    // Test 3: Analytics service methods
    console.log('\n3. Testing Analytics Service Methods');
    
    try {
      const overview = await ZoneAnalyticsService.getCollegeOverview();
      console.log('College Overview:', JSON.stringify(overview, null, 2));
    } catch (error) {
      console.log('Overview error:', error.message);
    }
    
    try {
      const campusStats = await ZoneAnalyticsService.getCampusStatistics('Boys');
      console.log('Boys Campus Stats:', JSON.stringify(campusStats, null, 2));
    } catch (error) {
      console.log('Campus stats error:', error.message);
    }
    
    console.log('\n✅ Direct analytics testing completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testAnalyticsDirectly();
