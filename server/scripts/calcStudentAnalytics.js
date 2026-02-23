// Temporary helper: calculate analytics for a single student
// Usage: node calcStudentAnalytics.js <studentId>

require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');

// Ensure dependent models are registered
require('../models/TestResult');
require('../models/Test');
require('../models/User');
require('../models/Class');
const StudentAnalytics = require('../models/StudentAnalytics');

async function main() {
  const studentId = process.argv[2];
  if (!studentId) {
    console.error('Usage: node calcStudentAnalytics.js <studentId>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || process.env.DATABASE_URL;
  if (!mongoUri) {
    console.error('No MongoDB URI in env (MONGO_URI/MONGODB_URI/DATABASE_URL)');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  try {
    const analytics = await StudentAnalytics.calculateForStudent(studentId);
    console.log('Calculation result:', analytics && analytics._id ? `ok - analytics id ${analytics._id}` : 'no result');
  } catch (err) {
    console.error('Calculation failed:', err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

main();
