require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const TestResult = require('./models/TestResult');
const Test = require('./models/Test');
const Class = require('./models/Class');
const StudentAnalytics = require('./models/StudentAnalytics');

async function calculateAnalyticsForAllStudents() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('🔗 Connected to MongoDB');

    // Find all students (Level 5 means admitted students)
    const students = await User.find({
      role: 'Student',
      $or: [
        { prospectusStage: 5 },
        { enquiryLevel: 5 }
      ]
    }).select('_id fullName rollNumber');

    console.log(`👥 Found ${students.length} admitted students`);
    
    let successful = 0;
    let failed = 0;
    const errors = [];

    // Process students in batches to avoid overwhelming the database
    const batchSize = 10;
    for (let i = 0; i < students.length; i += batchSize) {
      const batch = students.slice(i, i + batchSize);
      
      await Promise.all(batch.map(async (student) => {
        try {
          console.log(`🔄 Calculating analytics for: ${student.fullName?.firstName} ${student.fullName?.lastName} (${student.rollNumber || 'No Roll'})`);
          
          // Use the improved calculateForStudent method
          await StudentAnalytics.calculateForStudent(student._id, '2024-2025');
          successful++;
          
        } catch (error) {
          failed++;
          errors.push({
            studentId: student._id,
            studentName: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
            rollNumber: student.rollNumber,
            error: error.message
          });
          console.error(`❌ Error for ${student.fullName?.firstName} ${student.fullName?.lastName}: ${error.message}`);
        }
      }));

      // Log progress
      console.log(`✅ Processed ${Math.min(i + batchSize, students.length)}/${students.length} students`);
    }

    console.log('\n🎉 Analytics calculation completed for all students!');
    console.log(`✅ Successful: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (errors.length > 0) {
      console.log('\n❌ Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.studentName} (${error.rollNumber}): ${error.error}`);
      });
    }

    // Sample a few students to verify the results
    console.log('\n🔍 Sampling results from a few students:');
    const sampleStudents = students.slice(0, 3);
    
    for (const student of sampleStudents) {
      try {
        const analytics = await StudentAnalytics.findOne({ 
          studentId: student._id,
          academicYear: '2024-2025' 
        });
        
        if (analytics) {
          console.log(`\n📊 ${student.fullName?.firstName} ${student.fullName?.lastName}:`);
          console.log(`   Matriculation: ${analytics.overallAnalytics?.matriculationPercentage || 0}%`);
          console.log(`   Current Overall: ${analytics.overallAnalytics?.currentOverallPercentage || 0}%`);
          console.log(`   Zone: ${analytics.overallAnalytics?.overallZone || 'unassigned'}`);
        }
      } catch (error) {
        console.log(`   Error getting sample data: ${error.message}`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

calculateAnalyticsForAllStudents();
