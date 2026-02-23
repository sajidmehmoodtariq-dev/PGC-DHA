// Bulk recalculation script with progress and error reporting
// Usage: node calcAllWithProgress.js [academicYear]

require('dotenv').config();
const mongoose = require('mongoose');

// Ensure models are registered
require('../models/TestResult');
require('../models/Test');
require('../models/User');
require('../models/Class');
const StudentAnalytics = require('../models/StudentAnalytics');
const User = require('../models/User');

async function main() {
  const academicYear = process.argv[2] || '2024-2025';
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('No MongoDB URI in env (MONGO_URI/MONGODB_URI/DATABASE_URL)');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    // Find all admitted students
    const students = await User.find({ role: 'Student', enquiryLevel: 5 }).select('_id rollNumber fullName').lean();
    console.log(`Found ${students.length} admitted students. Starting recalculation for academic year ${academicYear}...`);

    const results = {
      total: students.length,
      processed: 0,
      success: 0,
      failed: 0,
      failures: []
    };

    for (let i = 0; i < students.length; i++) {
      const s = students[i];
      try {
        process.stdout.write(`Processing ${i+1}/${students.length} - ${s.rollNumber} ... `);
        const analytics = await StudentAnalytics.calculateForStudent(s._id.toString(), academicYear);
        results.processed++;
        results.success++;
        console.log('OK');
      } catch (err) {
        results.processed++;
        results.failed++;
        console.log('FAILED');
        results.failures.push({ studentId: s._id.toString(), rollNumber: s.rollNumber, error: (err && err.message) ? err.message : String(err) });
      }
      // small delay to avoid overwhelming the DB
      await new Promise(res => setTimeout(res, 50));
      if ((i+1) % 100 === 0) {
        console.log(`Progress: ${i+1}/${students.length} processed. Success: ${results.success}, Failed: ${results.failed}`);
      }
    }

    console.log('--- Recalculation complete ---');
    console.log(`Total: ${results.total}`);
    console.log(`Processed: ${results.processed}`);
    console.log(`Success: ${results.success}`);
    console.log(`Failed: ${results.failed}`);
    if (results.failures.length > 0) {
      console.log('Failures (first 20):', results.failures.slice(0,20));
    }

    // Optionally, write failures to a file
    const fs = require('fs');
    try {
      fs.writeFileSync('./server/scripts/recalc_failures.json', JSON.stringify(results.failures, null, 2));
      console.log('Wrote failures to server/scripts/recalc_failures.json');
    } catch (e) {
      console.warn('Failed to write failures file:', e.message || e);
    }

    process.exit(0);
  } catch (err) {
    console.error('Bulk recalculation failed:', err);
    process.exit(2);
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
