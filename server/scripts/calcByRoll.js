// Calculate analytics for a student by roll number and print summary
// Usage: node calcByRoll.js <rollNumber>

require('dotenv').config();
const mongoose = require('mongoose');

// Ensure dependent models are registered
require('../models/TestResult');
require('../models/Test');
require('../models/User');
require('../models/Class');
const StudentAnalytics = require('../models/StudentAnalytics');
const User = require('../models/User');

async function main() {
  const roll = process.argv[2];
  if (!roll) {
    console.error('Usage: node calcByRoll.js <rollNumber>');
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
    const student = await User.findOne({ rollNumber: roll }).lean();
    if (!student) {
      console.error(`Student with roll ${roll} not found`);
      process.exit(2);
    }

    console.log(`Found student: ${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''} (${student._id})`);

    const analytics = await StudentAnalytics.calculateForStudent(student._id.toString());
    if (!analytics) {
      console.error('No analytics returned');
      process.exit(3);
    }

    // Print a concise summary
    console.log('--- Analytics Summary ---');
    console.log('Matriculation %:', analytics.overallAnalytics?.matriculationPercentage ?? 'N/A');
    console.log('Current Overall %:', analytics.overallAnalytics?.currentOverallPercentage ?? 'N/A');
    console.log('Overall Zone:', analytics.overallAnalytics?.overallZone ?? 'unassigned');
    console.log('Subjects:');
    (analytics.subjectAnalytics || []).forEach(sub => {
      console.log(` - ${sub.subjectName}: ${sub.currentPercentage ?? 'N/A'}% (${sub.zone || 'unassigned'})`);
    });

    console.log('Saved analytics id:', analytics._id);
    process.exit(0);
  } catch (err) {
    console.error('Calculation failed:', err);
    process.exit(10);
  } finally {
    try { await mongoose.disconnect(); } catch (e) {}
  }
}

main();
