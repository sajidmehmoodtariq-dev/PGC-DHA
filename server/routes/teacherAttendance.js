const express = require('express');
const router = express.Router();
const TeacherAttendance = require('../models/TeacherAttendance');
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');

// Mark teacher attendance for lectures (by Floor Coordinator)
router.post('/mark', authenticate, async (req, res) => {
  try {
    const { attendanceData, date, floor } = req.body;
    const markedBy = req.user._id;

    if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
      return res.status(400).json({ message: 'Attendance data is required' });
    }

    if (!floor) {
      return res.status(400).json({ message: 'Floor number is required' });
    }

    // Parse date correctly to avoid timezone issues
    let attendanceDate;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      attendanceDate = new Date();
      attendanceDate.setFullYear(year);
      attendanceDate.setMonth(month - 1); // month is 0-indexed
      attendanceDate.setDate(day);
      attendanceDate.setHours(0, 0, 0, 0);
    } else {
      attendanceDate = new Date();
      attendanceDate.setHours(0, 0, 0, 0);
    }

    const results = {
      success: [],
      errors: []
    };

    // Process each teacher attendance record
    for (const record of attendanceData) {
      try {
        const {
          teacherId,
          timetableId,
          classId,
          status,
          lateMinutes,
          lateType,
          remarks,
          subject,
          lectureType
        } = record;

        // Validate required fields
        if (!teacherId || !timetableId || !classId || !status) {
          results.errors.push({
            record,
            error: 'Teacher ID, timetable ID, class ID, and status are required'
          });
          continue;
        }

        // Validate timetable entry exists
        const timetableEntry = await Timetable.findById(timetableId);
        if (!timetableEntry) {
          results.errors.push({
            record,
            error: 'Timetable entry not found'
          });
          continue;
        }

        // Get class to determine floor
        const classDoc = await Class.findById(classId);
        if (!classDoc) {
          results.errors.push({
            record,
            error: 'Class not found'
          });
          continue;
        }

        // Prepare attendance data
        const attendanceRecord = {
          teacherId,
          timetableId,
          classId,
          date: attendanceDate,
          status,
          subject: subject || timetableEntry.subject,
          lectureType: lectureType || timetableEntry.lectureType,
          markedBy,
          floor: classDoc.floor,
          remarks: remarks || ''
        };

        // Handle late status
        if (status === 'Late') {
          if (!lateType) {
            results.errors.push({
              record,
              error: 'Late type is required when status is Late'
            });
            continue;
          }

          attendanceRecord.lateType = lateType;
          
          if (lateType === 'Custom') {
            if (!lateMinutes || lateMinutes < 1) {
              results.errors.push({
                record,
                error: 'Custom late minutes must be specified and greater than 0'
              });
              continue;
            }
            attendanceRecord.lateMinutes = lateMinutes;
          } else {
            // Auto-set minutes based on type
            const minutes = parseInt(lateType.split(' ')[0]);
            attendanceRecord.lateMinutes = minutes;
          }
        }

        // Update existing or create new record
        const attendance = await TeacherAttendance.findOneAndUpdate(
          { teacherId, timetableId, date: attendanceDate },
          attendanceRecord,
          { 
            upsert: true, 
            new: true,
            runValidators: true
          }
        );

        await attendance.populate('teacherId timetableId classId markedBy');
        results.success.push(attendance);

      } catch (error) {
        console.error(`Error processing teacher attendance:`, error);
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Teacher attendance processed: ${results.success.length} successful, ${results.errors.length} errors`,
      results: {
        successful: results.success.length,
        errors: results.errors.length,
        successfulRecords: results.success,
        errorRecords: results.errors
      }
    });

  } catch (error) {
    console.error('Error marking teacher attendance:', error);
    res.status(500).json({ message: 'Error marking teacher attendance', error: error.message });
  }
});

// Mark multiple teacher attendance records (bulk)
router.post('/mark-bulk', authenticate, async (req, res) => {
  try {
    const { attendanceRecords, date, markedBy } = req.body;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Attendance records array is required and cannot be empty' 
      });
    }

    // Parse date correctly to avoid timezone issues
    let attendanceDate;
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      attendanceDate = new Date();
      attendanceDate.setFullYear(year);
      attendanceDate.setMonth(month - 1); // month is 0-indexed
      attendanceDate.setDate(day);
      attendanceDate.setHours(0, 0, 0, 0);
    } else {
      attendanceDate = new Date();
      attendanceDate.setHours(0, 0, 0, 0);
    }

    const results = {
      success: [],
      errors: []
    };

    // Process each attendance record
    for (const record of attendanceRecords) {
      try {
        const {
          teacherId,
          timetableId,
          status,
          lateMinutes,
          lateType,
          coordinatorRemarks
        } = record;

        console.log('Processing record:', {
          teacherId: typeof teacherId,
          timetableId: typeof timetableId,
          timetableIdValue: timetableId,
          status
        });

        // Validate required fields
        if (!teacherId || !timetableId || !status) {
          results.errors.push({
            record,
            error: 'Teacher ID, timetable ID, and status are required'
          });
          continue;
        }

        // Validate timetable entry exists
        const timetableEntry = await Timetable.findById(timetableId);
        if (!timetableEntry) {
          results.errors.push({
            record,
            error: 'Timetable entry not found'
          });
          continue;
        }

        // Get class to determine floor
        const classDoc = await Class.findById(timetableEntry.classId);
        if (!classDoc) {
          results.errors.push({
            record,
            error: 'Class not found'
          });
          continue;
        }

        // Prepare attendance data
        const attendanceRecord = {
          teacherId,
          timetableId,
          classId: timetableEntry.classId,
          date: attendanceDate,
          status,
          subject: timetableEntry.subject,
          lectureType: timetableEntry.lectureType,
          markedBy: markedBy || req.user._id,
          floor: classDoc.floor,
          coordinatorRemarks: coordinatorRemarks || ''
        };

        // Handle late status with minutes
        if (status === 'Late') {
          if (lateMinutes && lateMinutes > 0) {
            attendanceRecord.lateMinutes = lateMinutes;
            attendanceRecord.lateType = lateType || (lateMinutes <= 10 ? `${lateMinutes} min` : 'Custom');
          } else {
            results.errors.push({
              record,
              error: 'Late minutes are required when status is Late'
            });
            continue;
          }
        }

        // Update existing or create new record
        const attendance = await TeacherAttendance.findOneAndUpdate(
          { teacherId, timetableId, date: attendanceDate },
          attendanceRecord,
          { 
            upsert: true, 
            new: true,
            runValidators: true
          }
        );

        results.success.push({
          id: attendance._id,
          teacherId: attendance.teacherId,
          status: attendance.status,
          lateMinutes: attendance.lateMinutes,
          subject: attendance.subject
        });

      } catch (error) {
        console.error(`Error processing attendance record:`, error);
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk attendance processed: ${results.success.length} successful, ${results.errors.length} errors`,
      data: {
        successful: results.success.length,
        errors: results.errors.length,
        successfulRecords: results.success,
        errorRecords: results.errors
      }
    });

  } catch (error) {
    console.error('Error processing bulk teacher attendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error processing bulk teacher attendance', 
      error: error.message 
    });
  }
});

// Get teacher attendance for a specific date and floor
router.get('/floor/:floor/:date', authenticate, async (req, res) => {
  try {
    const { floor, date } = req.params;
    
    const floorNumber = parseInt(floor);
    if (floorNumber < 1 || floorNumber > 4) {
      return res.status(400).json({ message: 'Invalid floor number. Must be 1-4.' });
    }

    // Get timetable for the floor and date
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const queryDate = new Date();
    queryDate.setFullYear(year);
    queryDate.setMonth(month - 1); // month is 0-indexed
    queryDate.setDate(day);
    queryDate.setHours(0, 0, 0, 0);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][queryDate.getDay()];
    
    // Get all scheduled lectures for this floor and day
    const scheduledLectures = await Timetable.getFloorTimetable(floorNumber, dayOfWeek);
    
    // Get existing attendance records
    const attendanceRecords = await TeacherAttendance.getFloorAttendanceByDate(floorNumber, date);
    
    // Create attendance map for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      const key = `${record.teacherId._id}_${record.timetableId._id}`;
      attendanceMap[key] = record;
    });

    // Combine scheduled lectures with attendance data
    const lectureAttendance = scheduledLectures.map(lecture => {
      const key = `${lecture.teacher._id}_${lecture._id}`;
      const attendance = attendanceMap[key];
      
      return {
        timetableId: lecture._id,
        subject: lecture.subject,
        startTime: lecture.startTime,
        endTime: lecture.endTime,
        lectureType: lecture.lectureType,
        teacher: {
          id: lecture.teacher._id,
          fullName: lecture.teacher.fullName,
          userName: lecture.teacher.userName
        },
        class: {
          name: lecture.class.name,
          grade: lecture.class.grade,
          campus: lecture.class.campus,
          program: lecture.class.program
        },
        attendance: attendance ? {
          status: attendance.status,
          lateMinutes: attendance.lateMinutes,
          lateType: attendance.lateType,
          remarks: attendance.remarks,
          markedBy: attendance.markedBy,
          createdOn: attendance.createdOn
        } : null,
        isMarked: !!attendance
      };
    });

    const floorInfo = {
      1: { name: '11th Boys Floor', campus: 'Boys', grade: '11th' },
      2: { name: '12th Boys Floor', campus: 'Boys', grade: '12th' },
      3: { name: '11th Girls Floor', campus: 'Girls', grade: '11th' },
      4: { name: '12th Girls Floor', campus: 'Girls', grade: '12th' }
    };

    res.json({
      success: true,
      floor: {
        number: floorNumber,
        ...floorInfo[floorNumber]
      },
      date,
      dayOfWeek,
      lectures: lectureAttendance,
      summary: {
        total: lectureAttendance.length,
        marked: lectureAttendance.filter(l => l.isMarked).length,
        onTime: lectureAttendance.filter(l => l.attendance?.status === 'On Time').length,
        late: lectureAttendance.filter(l => l.attendance?.status === 'Late').length,
        absent: lectureAttendance.filter(l => l.attendance?.status === 'Absent').length,
        cancelled: lectureAttendance.filter(l => l.attendance?.status === 'Cancelled').length
      }
    });

  } catch (error) {
    console.error('Error getting floor teacher attendance:', error);
    res.status(500).json({ message: 'Error getting floor teacher attendance', error: error.message });
  }
});

// Get teacher attendance history
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { startDate, endDate, limit = 50 } = req.query;

    // Validate teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (teacher.role !== 'Teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }

    // Build date filter
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        dateFilter.date.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.date.$lte = end;
      }
    }

    // Get attendance records
    const attendanceRecords = await TeacherAttendance.find({
      teacherId,
      ...dateFilter
    })
    .populate('timetableId', 'subject startTime endTime dayOfWeek')
    .populate('classId', 'name grade campus program')
    .populate('markedBy', 'fullName userName')
    .sort({ date: -1, 'timetableId.startTime': 1 })
    .limit(parseInt(limit));

    // Get statistics
    const stats = await TeacherAttendance.getTeacherStats(teacherId, startDate, endDate);
    
    // Format statistics
    const formattedStats = {
      'On Time': 0,
      'Late': 0,
      'Absent': 0,
      'Cancelled': 0,
      totalLateMinutes: 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
      if (stat._id === 'Late') {
        formattedStats.totalLateMinutes = stat.totalLateMinutes;
      }
    });

    const total = Object.values(formattedStats).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0) - formattedStats.totalLateMinutes;
    const punctualityPercentage = total > 0 ? 
      Math.round(((formattedStats['On Time']) / total) * 100) : 0;

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        userName: teacher.userName,
        email: teacher.email
      },
      attendance: attendanceRecords,
      statistics: {
        ...formattedStats,
        total,
        punctualityPercentage,
        averageLateMinutes: formattedStats['Late'] > 0 ? 
          Math.round(formattedStats.totalLateMinutes / formattedStats['Late']) : 0
      }
    });

  } catch (error) {
    console.error('Error getting teacher attendance:', error);
    res.status(500).json({ message: 'Error getting teacher attendance', error: error.message });
  }
});

// Get monthly teacher attendance report
router.get('/report/monthly/:year/:month', authenticate, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { floor } = req.query;

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ message: 'Invalid month. Must be 1-12.' });
    }

    const floorNum = floor ? parseInt(floor) : null;
    if (floorNum && (floorNum < 1 || floorNum > 4)) {
      return res.status(400).json({ message: 'Invalid floor number. Must be 1-4.' });
    }

    const report = await TeacherAttendance.getMonthlyReport(yearNum, monthNum, floorNum);

    // Process the report data
    const processedReport = report.map(teacher => {
      const stats = {
        'On Time': 0,
        'Late': 0,
        'Absent': 0,
        'Cancelled': 0,
        totalLateMinutes: 0
      };

      teacher.stats.forEach(stat => {
        stats[stat.status] = stat.count;
        if (stat.status === 'Late') {
          stats.totalLateMinutes = stat.totalLateMinutes;
        }
      });

      const punctualityPercentage = teacher.totalLectures > 0 ? 
        Math.round((stats['On Time'] / teacher.totalLectures) * 100) : 0;

      return {
        teacherId: teacher._id.teacherId,
        teacherName: teacher._id.teacherName,
        totalLectures: teacher.totalLectures,
        stats,
        punctualityPercentage,
        averageLateMinutes: stats['Late'] > 0 ? 
          Math.round(stats.totalLateMinutes / stats['Late']) : 0
      };
    });

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Compute late buckets and status breakdown across the month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);
    const matchQuery = { date: { $gte: startDate, $lte: endDate } };
    if (floorNum) matchQuery.floor = floorNum;

    const [bucketSummary] = await TeacherAttendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalLectures: { $sum: 1 },
          onTime: { $sum: { $cond: [{ $eq: ['$status', 'On Time'] }, 1, 0] } },
          late5to10: { $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Late'] }, { $gte: ['$lateMinutes', 5] }, { $lte: ['$lateMinutes', 10] } ] }, 1, 0] } },
          lateOver10: { $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Late'] }, { $gt: ['$lateMinutes', 10] } ] }, 1, 0] } },
          absent: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }
        }
      }
    ]);

    // Per-teacher late buckets for listing breakdowns
    const teacherBuckets = await TeacherAttendance.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: '$teacherId',
          onTime: { $sum: { $cond: [{ $eq: ['$status', 'On Time'] }, 1, 0] } },
          late5to10: { $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Late'] }, { $gte: ['$lateMinutes', 5] }, { $lte: ['$lateMinutes', 10] } ] }, 1, 0] } },
          lateOver10: { $sum: { $cond: [{ $and: [ { $eq: ['$status', 'Late'] }, { $gt: ['$lateMinutes', 10] } ] }, 1, 0] } },
          notAttended: { $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ['$status', 'Cancelled'] }, 1, 0] } }
        }
      }
    ]);

    const teacherIdToBuckets = new Map();
    teacherBuckets.forEach(b => {
      teacherIdToBuckets.set(b._id.toString(), {
        onTime: b.onTime || 0,
        late5to10: b.late5to10 || 0,
        lateOver10: b.lateOver10 || 0,
        notAttended: b.notAttended || 0,
        cancelled: b.cancelled || 0
      });
    });

    // Attach breakdown to each teacher in processed report
    processedReport.forEach(t => {
      const buckets = teacherIdToBuckets.get(String(t.teacherId)) || {
        onTime: 0, late5to10: 0, lateOver10: 0, notAttended: 0, cancelled: 0
      };
      t.breakdown = buckets;
    });

    const summaryBase = {
      totalTeachers: processedReport.length,
      totalLectures: processedReport.reduce((sum, t) => sum + t.totalLectures, 0),
      overallPunctuality: processedReport.length > 0 ? 
        Math.round(processedReport.reduce((sum, t) => sum + t.punctualityPercentage, 0) / processedReport.length) : 0
    };

    const breakdown = bucketSummary ? {
      onTime: bucketSummary.onTime || 0,
      late5to10: bucketSummary.late5to10 || 0,
      lateOver10: bucketSummary.lateOver10 || 0,
      notAttended: bucketSummary.absent || 0,
      cancelled: bucketSummary.cancelled || 0
    } : {
      onTime: 0, late5to10: 0, lateOver10: 0, notAttended: 0, cancelled: 0
    };

    res.json({
      success: true,
      report: {
        year: yearNum,
        month: monthNum,
        monthName: monthNames[monthNum - 1],
        floor: floorNum,
        teachers: processedReport,
        summary: {
          ...summaryBase,
          breakdown
        }
      }
    });

  } catch (error) {
    console.error('Error getting monthly report:', error);
    res.status(500).json({ message: 'Error getting monthly report', error: error.message });
  }
});

// Get daily teacher attendance report
router.get('/report/daily/:date', authenticate, async (req, res) => {
  try {
    const { date } = req.params;
    const { floor } = req.query;

    // Parse date correctly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const queryDate = new Date();
    queryDate.setFullYear(year);
    queryDate.setMonth(month - 1); // month is 0-indexed
    queryDate.setDate(day);
    queryDate.setHours(0, 0, 0, 0);

    let attendanceRecords;
    if (floor) {
      const floorNum = parseInt(floor);
      if (floorNum < 1 || floorNum > 4) {
        return res.status(400).json({ message: 'Invalid floor number. Must be 1-4.' });
      }
      attendanceRecords = await TeacherAttendance.getFloorAttendanceByDate(floorNum, date);
    } else {
      // Get all floors
      attendanceRecords = await TeacherAttendance.find({ date: queryDate })
        .populate('teacherId', 'fullName userName email')
        .populate('timetableId', 'subject startTime endTime dayOfWeek')
        .populate('classId', 'name grade campus program floor')
        .populate('markedBy', 'fullName userName')
        .sort({ floor: 1, 'timetableId.startTime': 1 });
    }

    // Group by floor
    const floorGroups = {};
    attendanceRecords.forEach(record => {
      const floorNum = record.floor;
      if (!floorGroups[floorNum]) {
        floorGroups[floorNum] = [];
      }
      floorGroups[floorNum].push(record);
    });

    // Calculate summary for each floor
    const floorSummaries = {};
    Object.keys(floorGroups).forEach(floorNum => {
      const records = floorGroups[floorNum];
      floorSummaries[floorNum] = {
        total: records.length,
        onTime: records.filter(r => r.status === 'On Time').length,
        late: records.filter(r => r.status === 'Late').length,
        absent: records.filter(r => r.status === 'Absent').length,
        cancelled: records.filter(r => r.status === 'Cancelled').length,
        totalLateMinutes: records
          .filter(r => r.status === 'Late')
          .reduce((sum, r) => sum + (r.lateMinutes || 0), 0)
      };
    });

    const overallSummary = {
      total: attendanceRecords.length,
      onTime: attendanceRecords.filter(r => r.status === 'On Time').length,
      late: attendanceRecords.filter(r => r.status === 'Late').length,
      absent: attendanceRecords.filter(r => r.status === 'Absent').length,
      cancelled: attendanceRecords.filter(r => r.status === 'Cancelled').length,
      totalLateMinutes: attendanceRecords
        .filter(r => r.status === 'Late')
        .reduce((sum, r) => sum + (r.lateMinutes || 0), 0)
    };

    res.json({
      success: true,
      date,
      dayOfWeek: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][queryDate.getDay()],
      attendanceByFloor: floorGroups,
      floorSummaries,
      overallSummary,
      punctualityPercentage: overallSummary.total > 0 ? 
        Math.round((overallSummary.onTime / overallSummary.total) * 100) : 0
    });

  } catch (error) {
    console.error('Error getting daily report:', error);
    res.status(500).json({ message: 'Error getting daily report', error: error.message });
  }
});

// Get teacher punctuality statistics
router.get('/stats/punctuality/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { days = 30 } = req.query;

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    const stats = await TeacherAttendance.getPunctualityStats(teacherId, parseInt(days));

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        userName: teacher.userName
      },
      period: `Last ${days} days`,
      statistics: stats[0] || {
        total: 0,
        onTime: 0,
        late: 0,
        absent: 0,
        punctualityPercentage: 0,
        avgLateMinutes: 0
      }
    });

  } catch (error) {
    console.error('Error getting punctuality stats:', error);
    res.status(500).json({ message: 'Error getting punctuality stats', error: error.message });
  }
});

// Mark teacher attendance by Coordinator
router.post('/coordinator/mark', authenticate, async (req, res) => {
  try {
    const { attendanceRecords } = req.body;
    const markedBy = req.user._id;

    if (!Array.isArray(attendanceRecords) || attendanceRecords.length === 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Attendance records are required' 
      });
    }

    // Verify user is a coordinator
    if (req.user.role !== 'Coordinator') {
      return res.status(403).json({ 
        success: false,
        message: 'Only coordinators can use this endpoint' 
      });
    }

    const results = {
      success: [],
      errors: []
    };

    // Process each attendance record
    for (const record of attendanceRecords) {
      try {
        const {
          teacherId,
          timetableId,
          status,
          coordinatorRemarks,
          date
        } = record;

        // Validate required fields
        if (!teacherId || !timetableId || !status || !date) {
          results.errors.push({
            record,
            error: 'Teacher ID, timetable ID, status, and date are required'
          });
          continue;
        }

        // Validate teacher exists
        const teacher = await User.findById(teacherId);
        if (!teacher || teacher.role !== 'Teacher') {
          results.errors.push({
            record,
            error: 'Invalid teacher ID'
          });
          continue;
        }

        // Validate timetable entry
        const timetableEntry = await Timetable.findById(timetableId)
          .populate('classId', 'name grade campus program floor');
        if (!timetableEntry) {
          results.errors.push({
            record,
            error: 'Timetable entry not found'
          });
          continue;
        }

        const attendanceDate = new Date(date);
        attendanceDate.setHours(0, 0, 0, 0);

        // Check if attendance already exists
        const existingAttendance = await TeacherAttendance.findOne({
          teacherId,
          timetableId,
          date: attendanceDate
        });

        const attendanceData = {
          teacherId,
          timetableId,
          classId: timetableEntry.classId._id,
          date: attendanceDate,
          status,
          subject: timetableEntry.subject,
          lectureType: timetableEntry.lectureType || 'Theory',
          coordinatorRemarks: coordinatorRemarks || '',
          markedBy,
          floor: timetableEntry.classId.floor
        };

        let savedRecord;
        if (existingAttendance) {
          // Update existing record
          Object.assign(existingAttendance, attendanceData);
          savedRecord = await existingAttendance.save();
        } else {
          // Create new record
          savedRecord = new TeacherAttendance(attendanceData);
          await savedRecord.save();
        }

        results.success.push({
          teacherId,
          timetableId,
          status,
          record: savedRecord._id
        });

      } catch (error) {
        results.errors.push({
          record,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${results.success.length} records successfully, ${results.errors.length} errors`,
      results
    });

  } catch (error) {
    console.error('Error marking coordinator attendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking attendance', 
      error: error.message 
    });
  }
});

// Get teacher attendance for a specific date (for coordinator view)
router.get('/date/:date', authenticate, async (req, res) => {
  try {
    console.log('GET /date/:date route hit with date:', req.params.date);
    const { date } = req.params;
    
    // Parse date correctly to avoid timezone issues
    // Input should be in YYYY-MM-DD format
    console.log('TIMEZONE FIX ACTIVE - Parsing date manually:', date);
    const [year, month, day] = date.split('-').map(Number);
    // Create a date that represents the start of the day in local time
    const queryDate = new Date();
    queryDate.setFullYear(year);
    queryDate.setMonth(month - 1); // month is 0-indexed
    queryDate.setDate(day);
    queryDate.setHours(0, 0, 0, 0);
    console.log('TIMEZONE FIX - Parsed date components:', { year, month, day });
    console.log('TIMEZONE FIX - Final queryDate:', queryDate);
    
    console.log('Querying attendance for date:', queryDate);
    
    const attendance = await TeacherAttendance.find({
      date: queryDate
    })
    .populate('teacherId', 'name email role')
    .populate('timetableId')
    .populate('classId', 'name grade section floor')
    .sort({ createdAt: -1 });

    console.log('Found attendance records:', attendance.length);

    res.json({
      success: true,
      data: attendance
    });

  } catch (error) {
    console.error('Error fetching teacher attendance by date:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching attendance data', 
      error: error.message 
    });
  }
});

module.exports = router;
