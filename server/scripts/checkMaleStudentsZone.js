#!/usr/bin/env node
/*
  Diagnostic: check male students for matric data, class test data and resolved zone
  Usage: node server/scripts/checkMaleStudentsZone.js
  Notes: Uses process.env.MONGO_URI from the project's .env. Run from repo root.
*/
const mongoose = require('mongoose');

async function main() {
  const uri = "mongodb+srv://pgcdhaofficial:TJZxAPIpLBwzfs4e@pgcdha.qbzia76.mongodb.net/pgc";
  if (!uri) {
    console.error('MONGO_URI not set in environment. Please set it and re-run the script.');
    process.exit(2);
  }

  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const User = require('../models/User');
  const TestResult = require('../models/TestResult');
  const StudentAnalytics = require('../models/StudentAnalytics');

  // Find students with gender indicating male. Role and gender values in the DB vary, so be tolerant.
  const maleFilter = {
    role: { $regex: /^student$/i },
    // only students with an assigned class
    classId: { $exists: true, $ne: null },
    $or: [
      { gender: { $regex: /^m(ale)?$/i } },
      { gender: { $in: ['M', 'm'] } }
    ]
  };

  const totalMales = await User.countDocuments(maleFilter);
  console.log(`Total male students: ${totalMales}`);

  // If we found zero, provide a small diagnostic of what role/gender values exist in the DB
  if (totalMales === 0) {
    try {
      console.log('\nNo male students found with the current filters — dumping top role/gender pairs (up to 30) to help diagnose):');
      const pairs = await User.aggregate([
        { $match: { role: { $exists: true } } },
        { $group: { _id: { role: '$role', gender: '$gender' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 30 }
      ]);
      console.table ? console.table(pairs) : console.log(JSON.stringify(pairs, null, 2));
    } catch (err) {
      console.error('Failed to produce role/gender diagnostic:', err && err.message ? err.message : err);
    }
  }

  // We'll iterate in batches to avoid memory spikes
  const batchSize = 500;
  let processed = 0;
  let withMatric = 0;
  let withTest = 0;
  let withZone = 0;
  const samples = [];

  const cursor = User.find(maleFilter).select('_id userName email fullName fatherName academicRecords classId admissionInfo rollNumber').lean().cursor();

  for (let user = await cursor.next(); user != null; user = await cursor.next()) {
    processed++;
    let hasMatric = false;
    let matricPercent = null;

    try {
      const ar = user.academicRecords;
      if (ar && ar.matriculation) {
        const m = ar.matriculation;
        if (typeof m.percentage === 'number' && !Number.isNaN(m.percentage)) {
          hasMatric = true;
          matricPercent = m.percentage;
        } else if (Array.isArray(m.subjects) && m.subjects.length) {
          // try to compute from subjects if totals available
          let got = 0, total = 0;
          for (const s of m.subjects) {
            if (typeof s.marksObtained === 'number' && typeof s.totalMarks === 'number') {
              got += Number(s.marksObtained);
              total += Number(s.totalMarks);
            }
          }
          if (total > 0) {
            hasMatric = true;
            matricPercent = Math.round((got / total) * 10000) / 100; // 2 decimals
          }
        }
      }
    } catch (err) {
      // ignore per-student parse errors
    }

    if (hasMatric) withMatric++;

    // Check for any TestResult (non-absent)
    const hasAnyTest = await TestResult.exists({ studentId: user._id, isAbsent: false });
    if (hasAnyTest) withTest++;

    // Try to read StudentAnalytics
    let analytics = await StudentAnalytics.findOne({ studentId: user._id }).lean();
    if (!analytics) {
      // attempt to calculate (may update DB)
      try {
        await StudentAnalytics.calculateForStudent(String(user._id));
        analytics = await StudentAnalytics.findOne({ studentId: user._id }).lean();
      } catch (err) {
        // ignore errors here; we'll report missing analytics
      }
    }

    let zone = null;
    if (analytics) {
      // handle new and legacy shapes
      if (analytics.overallAnalytics && analytics.overallAnalytics.overallZone) zone = analytics.overallAnalytics.overallZone;
      else if (analytics.overallAnalytics && analytics.overallAnalytics.zone) zone = analytics.overallAnalytics.zone;
      else if (analytics.overallZone) zone = analytics.overallZone;
    }
    if (zone) withZone++;

    // collect small sample of interesting rows
    if (samples.length < 20 && (hasMatric || hasAnyTest || zone)) {
      samples.push({ id: String(user._id), name: user.fullName || user.userName || '', classId: user.classId || null, hasMatric, matricPercent, hasTest: !!hasAnyTest, zone: zone || null });
    }

    if (processed % batchSize === 0) {
      console.log(`Processed ${processed} / approx ${totalMales} males...`);
    }
  }

  console.log('\n---- Summary ----');
  console.log(`Processed male students: ${processed}`);
  console.log(`Have matric data: ${withMatric}`);
  console.log(`Have at least one TestResult (not absent): ${withTest}`);
  console.log(`Have resolved analytics zone: ${withZone}`);
  console.log(`Samples (up to 20):`);
  console.table ? console.table(samples) : console.log(JSON.stringify(samples, null, 2));

  await mongoose.disconnect();
  process.exit(0);
}

main().catch(err => {
  console.error('Diagnostic script failed:', err && err.message ? err.message : err);
  process.exit(1);
});
