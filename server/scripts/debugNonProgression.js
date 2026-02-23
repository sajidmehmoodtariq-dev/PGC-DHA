const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');

async function debugNonProgression() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Check total students
    const totalStudents = await User.countDocuments({ role: 'Student' });
    console.log('Total students:', totalStudents);

    // Check students with levelHistory
    const studentsWithHistory = await User.countDocuments({
      role: 'Student',
      levelHistory: { $exists: true, $not: { $size: 0 } }
    });
    console.log('Students with levelHistory:', studentsWithHistory);

    // Check students at level 5
    const level5Students = await User.countDocuments({
      role: 'Student',
      prospectusStage: 5
    });
    console.log('Students at Level 5:', level5Students);

    // Check students at level 4 with history
    const level4WithHistory = await User.find({
      role: 'Student',
      prospectusStage: 4,
      levelHistory: { $exists: true, $not: { $size: 0 } }
    }).select('fullName prospectusStage levelHistory').limit(3);
    
    console.log('Sample Level 4 students with history:');
    level4WithHistory.forEach(student => {
      console.log(`- ${student.fullName?.firstName} ${student.fullName?.lastName}`);
      console.log(`  Current Level: ${student.prospectusStage}`);
      console.log(`  Level History:`, student.levelHistory);
    });

    // Test the non-progression logic for different scenarios
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
    
    // Test 1: Level 5 students who achieved it before 1 month ago
    const level5NonProgressed = await User.find({
      role: 'Student',
      prospectusStage: 5,
      levelHistory: {
        $elemMatch: {
          level: 5,
          achievedOn: { $lte: oneMonthAgo }
        }
      }
    }).select('fullName prospectusStage levelHistory').limit(5);

    console.log(`\nLevel 5 students who achieved it before ${oneMonthAgo.toISOString()}:`);
    console.log('Count:', level5NonProgressed.length);

    // Test 2: Level 4 students who achieved level 4 before 1 month ago (didn't progress to level 5)
    const level4NonProgressed = await User.find({
      role: 'Student',
      prospectusStage: 4,
      levelHistory: {
        $elemMatch: {
          level: 4,
          achievedOn: { $lte: oneMonthAgo }
        }
      }
    }).select('fullName prospectusStage levelHistory').limit(5);

    console.log(`\nLevel 4 students who achieved it before ${oneMonthAgo.toISOString()} (didn't progress to Level 5):`);
    console.log('Count:', level4NonProgressed.length);
    level4NonProgressed.forEach(student => {
      console.log(`- ${student.fullName?.firstName} ${student.fullName?.lastName}`);
      const level4Achievement = student.levelHistory.find(h => h.level === 4);
      console.log(`  Achieved Level 4 on: ${level4Achievement?.achievedOn}`);
    });

    // Test 3: Try with older date (3 months ago)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const olderLevel4NonProgressed = await User.find({
      role: 'Student',
      prospectusStage: 4,
      levelHistory: {
        $elemMatch: {
          level: 4,
          achievedOn: { $lte: threeMonthsAgo }
        }
      }
    }).select('fullName prospectusStage levelHistory').limit(5);

    console.log(`\nLevel 4 students who achieved it before ${threeMonthsAgo.toISOString()} (3 months ago):`);
    console.log('Count:', olderLevel4NonProgressed.length);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

debugNonProgression();