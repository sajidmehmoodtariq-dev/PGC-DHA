const mongoose = require('mongoose');
require('dotenv').config();

async function checkDuplicateCounting() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    const StudentAnalytics = require('./models/StudentAnalytics');
    
    // Check overall red zone students
    const overallRedZoneCount = await StudentAnalytics.countDocuments({
      academicYear: '2024-2025',
      'overallAnalytics.overallZone': 'red'
    });
    console.log('Total red zone students (overall):', overallRedZoneCount);
    
    // Check subject-level red zones (this might show duplicates)
    const subjectRedZones = await StudentAnalytics.aggregate([
      { $match: { academicYear: '2024-2025' } },
      { $unwind: '$subjectAnalytics' },
      { $match: { 'subjectAnalytics.zone': 'red' } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    console.log('Total subject-level red zones:', subjectRedZones[0]?.count || 0);
    
    // Check unique students with at least one red zone subject
    const uniqueStudentsWithRedSubject = await StudentAnalytics.aggregate([
      { $match: { academicYear: '2024-2025' } },
      { $unwind: '$subjectAnalytics' },
      { $match: { 'subjectAnalytics.zone': 'red' } },
      { $group: { _id: '$studentId' } },
      { $count: 'uniqueStudents' }
    ]);
    console.log('Unique students with red zone subjects:', uniqueStudentsWithRedSubject[0]?.uniqueStudents || 0);
    
    // Sample red zone students to see their data
    const sampleRedZoneStudents = await StudentAnalytics.find({
      academicYear: '2024-2025',
      'overallAnalytics.overallZone': 'red'
    }).limit(3).select('studentId overallAnalytics.overallZone subjectAnalytics.subjectName subjectAnalytics.zone');
    
    console.log('\nSample red zone students:');
    sampleRedZoneStudents.forEach((student, i) => {
      console.log(`Student ${i + 1}:`);
      console.log(`  StudentID: ${student.studentId}`);
      console.log(`  Overall Zone: ${student.overallAnalytics.overallZone}`);
      console.log(`  Subject Zones:`, 
        student.subjectAnalytics.map(s => `${s.subjectName}: ${s.zone}`).join(', ')
      );
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

checkDuplicateCounting();