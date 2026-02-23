const express = require('express');
const router = express.Router();
const User = require('../models/User');
const TeacherAttendance = require('../models/TeacherAttendance');
const Test = require('../models/Test');
const Timetable = require('../models/Timetable');
const TestResult = require('../models/TestResult');
const StudentAnalytics = require('../models/StudentAnalytics');
const { authenticate } = require('../middleware/auth');

// Get all teachers with basic stats
router.get('/teachers-overview', authenticate, async (req, res) => {
  try {
    const range = (req.query.range || 'week').toLowerCase();

    const getRangeDates = (range) => {
      const now = new Date();
      let startOfRange = null;
      let endOfRange = null;

      if (range === 'week') {
        startOfRange = new Date(now);
        startOfRange.setDate(now.getDate() - now.getDay());
        startOfRange.setHours(0, 0, 0, 0);
        endOfRange = new Date(startOfRange);
        endOfRange.setDate(startOfRange.getDate() + 6);
        endOfRange.setHours(23, 59, 59, 999);
      } else if (range === 'month') {
        startOfRange = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endOfRange = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (range === 'year') {
        startOfRange = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        endOfRange = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      }
      return { startOfRange, endOfRange };
    };

    const { startOfRange, endOfRange } = getRangeDates(range);
    const teachers = await User.find(
      { role: 'Teacher', status: 1 },
      { 
        _id: 1,
        fullName: 1,
        email: 1,
        employeeId: 1,
        phoneNumber: 1
      }
    );

    const hasRange = !!startOfRange && !!endOfRange;

    const teachersWithStats = await Promise.all(teachers.map(async (teacher) => {
      // Get weekly timetable count (total lectures assigned)
      const weeklyLectures = await Timetable.countDocuments({
        teacherId: teacher._id,
        ...(hasRange ? { date: { $gte: startOfRange, $lte: endOfRange } } : {})
      });

      // Get attended lectures this week
      const attendedLectures = await TeacherAttendance.countDocuments({
        teacherId: teacher._id,
        ...(hasRange ? { date: { $gte: startOfRange, $lte: endOfRange } } : {}),
        status: 'On Time'
      });

      // Get late attendance count (more than 10 minutes late)
      const lateCount = await TeacherAttendance.countDocuments({
        teacherId: teacher._id,
        ...(hasRange ? { date: { $gte: startOfRange, $lte: endOfRange } } : {}),
        $or: [
          { lateMinutes: { $gt: 10 } },
          { status: 'Late' }
        ]
      });

      // Get total tests created by this teacher
      const totalTests = await Test.countDocuments({
        createdBy: teacher._id
      });

      return {
        ...teacher.toObject(),
        weeklyStats: {
          attendedLectures,
          totalLectures: weeklyLectures,
          lateCount,
          totalTests
        }
      };
    }));

    res.json(teachersWithStats);
  } catch (error) {
    console.error('Error fetching teachers overview:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get detailed teacher profile
router.get('/teacher-profile/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;

    // Get teacher basic info
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    // Get current week date range
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Get attendance details
    const attendanceRecords = await TeacherAttendance.find({
      teacherId: teacherId,
      date: { $gte: startOfWeek, $lte: endOfWeek }
    }).sort({ date: 1 });

    // Get timetable for the week
    const weeklyTimetable = await Timetable.find({
      teacherId: teacherId,
      date: { $gte: startOfWeek, $lte: endOfWeek }
    }).populate('classId', 'name').sort({ date: 1, startTime: 1 });

    // Calculate late instances
    const lateInstances = attendanceRecords.filter(record => 
      (record.lateMinutes && record.lateMinutes > 10) || record.status === 'Late'
    );

    // Get tests created by this teacher with class details
    const tests = await Test.find({
      createdBy: teacherId
    }).populate('classId', 'name').sort({ createdAt: -1 });

    // Build per-class and overall zone summaries with safe zero defaults
    const classSummaries = {};
    for (const t of tests) {
      const clsId = t.classId?._id?.toString() || 'unknown';
      if (!classSummaries[clsId]) {
        classSummaries[clsId] = { classId: clsId, className: t.classId?.name || 'Unknown Class', totalStudents: 0, zones: { green: 0, average: 0, red: 0 } };
      }
      // Get results for this test to compute zone counts
      const results = await TestResult.find({ testId: t._id }).lean();
      results.forEach(r => {
        classSummaries[clsId].totalStudents += 1;
        const pct = typeof r.percentage === 'number' ? r.percentage : 0;
        if (pct >= 70) classSummaries[clsId].zones.green += 1;
        else if (pct >= 40) classSummaries[clsId].zones.average += 1;
        else classSummaries[clsId].zones.red += 1;
      });
    }
    const overallSummary = Object.values(classSummaries).reduce((acc, cls) => {
      acc.totalStudents += cls.totalStudents;
      acc.zones.green += cls.zones.green;
      acc.zones.average += cls.zones.average;
      acc.zones.red += cls.zones.red;
      return acc;
    }, { totalStudents: 0, zones: { green: 0, average: 0, red: 0 } });

    res.json({
      teacher: {
        _id: teacher._id,
        fullName: teacher.fullName,
        email: teacher.email,
        employeeId: teacher.employeeId,
        phoneNumber: teacher.phoneNumber
      },
      weeklyStats: {
        attendedLectures: attendanceRecords.filter(r => r.status === 'On Time' || r.status === 'Present').length,
        totalLectures: weeklyTimetable.length,
        lateCount: lateInstances.length,
        totalTests: tests.length
      },
      attendanceRecords,
      weeklyTimetable,
      lateInstances,
      tests,
      summaries: {
        perClass: classSummaries,
        overall: overallSummary
      }
    });
  } catch (error) {
    console.error('Error fetching teacher profile:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get test analytics for a specific test
router.get('/test-analytics/:testId', authenticate, async (req, res) => {
  try {
    const { testId } = req.params;

    // Get test details
    const test = await Test.findById(testId)
      .populate('classId', 'name')
      .populate('createdBy', 'fullName');

    if (!test) {
      return res.status(404).json({ message: 'Test not found' });
    }

    // Get all test results for this test
    const testResults = await TestResult.find({ testId: testId })
      .populate('studentId', 'fullName rollNumber');

    // Get student analytics for zone classification
    const studentIds = testResults.map(result => result.studentId._id);
    const studentAnalytics = await StudentAnalytics.find({
      studentId: { $in: studentIds }
    });

    // Create a map of student analytics for quick lookup
    const analyticsMap = {};
    studentAnalytics.forEach(analytics => {
      analyticsMap[analytics.studentId.toString()] = analytics;
    });

    // Classify students by performance zones
    const zones = {
      excellent: [], // 90-100%
      good: [],      // 70-89%
      average: [],   // 50-69%
      poor: [],      // 30-49%
      failing: []    // 0-29%
    };

    const detailedResults = testResults.map(result => {
      const percentage = (result.obtainedMarks / test.totalMarks) * 100;
      const studentAnalytic = analyticsMap[result.studentId._id.toString()];
      
      // Determine zone
      let zone = 'failing';
      if (percentage >= 90) zone = 'excellent';
      else if (percentage >= 70) zone = 'good';
      else if (percentage >= 50) zone = 'average';
      else if (percentage >= 30) zone = 'poor';

      const studentData = {
        ...result.toObject(),
        percentage,
        zone,
        studentAnalytics: studentAnalytic || null
      };

      zones[zone].push(studentData);
      return studentData;
    });

    // Calculate zone statistics
    const zoneStats = Object.keys(zones).map(zone => ({
      zone,
      count: zones[zone].length,
      percentage: testResults.length > 0 ? ((zones[zone].length / testResults.length) * 100).toFixed(1) : 0
    }));

    // Calculate performance trend (compare with previous tests)
    const previousTests = await Test.find({
      classId: test.classId,
      createdAt: { $lt: test.createdAt }
    }).sort({ createdAt: -1 }).limit(5);

    const trendData = await Promise.all(
      previousTests.map(async (prevTest) => {
        const prevResults = await TestResult.find({ testId: prevTest._id });
        const avgScore = prevResults.length > 0 
          ? prevResults.reduce((sum, r) => sum + r.obtainedMarks, 0) / prevResults.length
          : 0;
        const avgPercentage = prevTest.totalMarks > 0 ? (avgScore / prevTest.totalMarks) * 100 : 0;
        
        return {
          testId: prevTest._id,
          testName: prevTest.title,
          date: prevTest.createdAt,
          averagePercentage: avgPercentage.toFixed(1)
        };
      })
    );

    // Add current test to trend
    const currentAvg = testResults.length > 0 
      ? testResults.reduce((sum, r) => sum + r.obtainedMarks, 0) / testResults.length
      : 0;
    const currentAvgPercentage = test.totalMarks > 0 ? (currentAvg / test.totalMarks) * 100 : 0;
    
    trendData.unshift({
      testId: test._id,
      testName: test.title,
      date: test.createdAt,
      averagePercentage: currentAvgPercentage.toFixed(1)
    });

    res.json({
      test,
      testResults: detailedResults,
      zones,
      zoneStats,
      trendData: trendData.reverse(), // Show chronological order
      summary: {
        totalStudents: testResults.length,
        averageScore: currentAvg.toFixed(1),
        averagePercentage: currentAvgPercentage.toFixed(1),
        passRate: testResults.length > 0 
          ? ((testResults.filter(r => (r.obtainedMarks/test.totalMarks)*100 >= 50).length / testResults.length) * 100).toFixed(1)
          : 0
      }
    });
  } catch (error) {
    console.error('Error fetching test analytics:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
