#!/usr/bin/env node
/*
  Usage:
    node server/scripts/compareClassAnalytics.js <classId> [--gender=male|female] [--zone=green|blue|yellow|red]

  Notes:
    - Uses process.env.MONGO_URI from .env or environment.
    - Prints counts: users in class, studentAnalytics docs for those users, analytics with selected zone, and samples of missing analytics.
*/
const mongoose = require('mongoose');
require('dotenv').config();

async function main() {
  const args = process.argv.slice(2);
  if (!args[0]) {
    console.error('Usage: node server/scripts/compareClassAnalytics.js <classId> [--gender=male|female] [--zone=green|blue|yellow|red]');
    process.exit(2);
  }

  const classId = args[0];
  const genderArg = args.find(a => a.startsWith('--gender='));
  const zoneArg = args.find(a => a.startsWith('--zone='));
  const gender = genderArg ? genderArg.split('=')[1] : null;
  const zone = zoneArg ? zoneArg.split('=')[1] : null;

  const uri = "mongodb+srv://pgcdhaofficial:TJZxAPIpLBwzfs4e@pgcdha.qbzia76.mongodb.net/pgc";
  if (!uri) {
    console.error('MONGO_URI not set in environment. Please set it and re-run the script.');
    process.exit(2);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const User = require('../models/User');
  const StudentAnalytics = require('../models/StudentAnalytics');

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    console.error('Invalid classId provided:', classId);
    process.exit(2);
  }
  const classObjectId = new mongoose.Types.ObjectId(classId);
  const userFilter = { role: { $regex: /^student$/i }, classId: classObjectId };
  if (gender) {
    if (/^m/i.test(gender)) userFilter.gender = { $regex: /^m(ale)?$/i };
    else if (/^f/i.test(gender)) userFilter.gender = { $regex: /^f(emale)?$/i };
    else userFilter.gender = gender;
  }

  const users = await User.find(userFilter).select('_id fullName userName email').lean();
  const userIds = users.map(u => u._id);
  console.log(`Users matched for class ${classId}` + (gender ? ` (gender=${gender})` : '') + `: ${userIds.length}`);

  if (userIds.length === 0) {
    console.log('No users found. Exiting.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const analyticsCount = await StudentAnalytics.countDocuments({ studentId: { $in: userIds } });
  console.log(`StudentAnalytics documents for these users: ${analyticsCount}`);

  let analyticsZoneCount = 0;
  if (zone) {
    const q = {
      studentId: { $in: userIds },
      $or: [
        { 'overallAnalytics.overallZone': zone },
        { 'overallAnalytics.zone': zone },
        { overallZone: zone }
      ]
    };
    analyticsZoneCount = await StudentAnalytics.countDocuments(q);
    console.log(`StudentAnalytics with zone='${zone}': ${analyticsZoneCount}`);
  }

  // Find users missing analytics
  const analyticsDocs = await StudentAnalytics.find({ studentId: { $in: userIds } }).select('studentId').lean();
  const presentIds = new Set(analyticsDocs.map(a => String(a.studentId)));
  const missing = users.filter(u => !presentIds.has(String(u._id)));
  console.log(`Users missing StudentAnalytics: ${missing.length}`);

  if (missing.length > 0) {
    console.log('Sample missing IDs (up to 20):');
    missing.slice(0, 20).forEach(u => console.log(String(u._id), '-', (u.fullName && `${u.fullName.firstName || ''} ${u.fullName.lastName || ''}`) || u.userName || ''));
  }

  // If counts differ from your UI, print guidance
  if (analyticsCount !== userIds.length) {
    console.log('\nNote: The UI may be showing counts from precomputed StudentAnalytics or from an aggregated source.');
    console.log('If StudentAnalytics docs are missing for some users, the students endpoint may fall back to returning User records (which can cause count/list mismatches).');
    console.log('To fix: run per-student recalculation for missing IDs or run the bulk recalculation script.');
  }

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Script failed:', err && err.message ? err.message : err);
  process.exit(1);
});
