const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Class = require('../models/Class');
const { authenticate } = require('../middleware/auth');
const AttendanceService = require('../services/attendanceService');
const CacheService = require('../services/cacheService');

// Helper function to normalize status values
function normalizeStatus(status) {
  const statusMap = {
    'present': 'Present',
    'absent': 'Absent',
    'late': 'Late',
    'half leave': 'Half Leave',
    'full leave': 'Full Leave',
    // Also handle already normalized values
    'Present': 'Present',
    'Absent': 'Absent',
    'Late': 'Late',
    'Half Leave': 'Half Leave',
    'Full Leave': 'Full Leave'
  };
  
  return statusMap[status] || status;
}

// Mark attendance for a class (for teachers/admin)
router.post('/mark', authenticate, async (req, res) => {
  try {
    const { studentId, classId, date, status, markedBy } = req.body;

    // Validate required fields
    if (!studentId || !classId || !date || !status) {
      return res.status(400).json({ 
        success: false,
        message: 'Student ID, class ID, date, and status are required' 
      });
    }

    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ 
        success: false,
        message: 'Class not found' 
      });
    }

    // Validate student exists
    const student = await User.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(404).json({ 
        success: false,
        message: 'Student not found' 
      });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Normalize status value
    const normalizedStatus = normalizeStatus(status);

    // Update existing or create new attendance record
    const attendance = await Attendance.findOneAndUpdate(
      { studentId, date: attendanceDate },
      {
        classId,
        status: normalizedStatus,
        markedBy: markedBy || req.user._id,
        markedByRole: 'Floor Incharge'
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true
      }
    );

    // Clear cache after successful attendance marking
    AttendanceService.clearCache();

    res.json({
      success: true,
      message: `Student marked as ${normalizedStatus}`,
      data: attendance
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error marking attendance', 
      error: error.message 
    });
  }
});

// Mark attendance for multiple students (bulk)
router.post('/mark-bulk', authenticate, async (req, res) => {
  try {
    const { classId, date, attendanceData, subject } = req.body;
    const markedBy = req.user._id;

    // Validate class exists
    const classDoc = await Class.findById(classId).populate('classIncharge floorIncharge teachers.teacherId');
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Check if user can mark attendance for this class
    const authCheck = classDoc.canMarkAttendance(markedBy);
    if (!authCheck.canMark) {
      return res.status(403).json({ message: authCheck.reason });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    // Process attendance data array
    const attendancePromises = attendanceData.map(async (record) => {
      const { studentId, status, remarks } = record;

      try {
        // Normalize status value
        const normalizedStatus = normalizeStatus(status);

        // Update existing or create new attendance record
        const attendance = await Attendance.findOneAndUpdate(
          { studentId, date: attendanceDate },
          {
            classId,
            status: normalizedStatus,
            remarks: remarks || '',
            markedBy,
            markedByRole: authCheck.role,
            subject: authCheck.subject || subject || ''
          },
          { 
            upsert: true, 
            new: true,
            runValidators: true
          }
        );

        return attendance;
      } catch (error) {
        console.error(`Error marking attendance for student ${studentId}:`, error);
        return null;
      }
    });

    const results = await Promise.all(attendancePromises);
    const successful = results.filter(result => result !== null).length;

    // Clear cache after successful attendance marking
    if (successful > 0) {
      AttendanceService.clearCache();
      console.log(`Cleared attendance cache after marking ${successful} students`);
    }

    res.json({
      success: true,
      message: `Attendance marked for ${successful} students by ${authCheck.role}${authCheck.subject ? ` (${authCheck.subject})` : ''}`,
      total: attendanceData.length,
      successful,
      markedByRole: authCheck.role
    });

  } catch (error) {
    console.error('Error marking attendance:', error);
    res.status(500).json({ message: 'Error marking attendance', error: error.message });
  }
});

// Get attendance for a specific class and date
router.get('/class/:classId/:date', authenticate, async (req, res) => {
  try {
    const { classId, date } = req.params;

    // Get class info
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Get all active students in this class
    const students = await User.find({
      classId,
      prospectusStage: { $gte: 5 },
      isApproved: true,
      isActive: true
    }).select('fullName userName program').sort({ 'fullName.firstName': 1 });

    // Get attendance records for this date
    const attendanceRecords = await Attendance.getClassAttendance(classId, date);

    // Create attendance map for quick lookup
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.studentId._id.toString()] = record;
    });

    // Combine student list with attendance data
    const attendanceList = students.map(student => {
      const attendance = attendanceMap[student._id.toString()];
      return {
        studentId: student._id,
        fullName: student.fullName,
        userName: student.userName,
        program: student.program,
        status: attendance ? attendance.status : 'Absent',
        remarks: attendance ? attendance.remarks : '',
        marked: !!attendance
      };
    });

    res.json({
      success: true,
      class: {
        id: classDoc._id,
        name: classDoc.name,
        grade: classDoc.grade,
        campus: classDoc.campus,
        program: classDoc.program
      },
      date,
      attendance: attendanceList,
      summary: {
        total: attendanceList.length,
        present: attendanceList.filter(a => a.status === 'Present').length,
        absent: attendanceList.filter(a => a.status === 'Absent').length,
        late: attendanceList.filter(a => a.status === 'Late').length,
        halfLeave: attendanceList.filter(a => a.status === 'Half Leave').length,
        fullLeave: attendanceList.filter(a => a.status === 'Full Leave').length
      }
    });

  } catch (error) {
    console.error('Error getting class attendance:', error);
    res.status(500).json({ message: 'Error getting attendance', error: error.message });
  }
});

// Get student attendance history
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate, limit = 30 } = req.query;

    // Validate student exists
    const student = await User.findById(studentId).select('fullName userName classId program');
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Get attendance records
    let attendanceQuery = Attendance.getStudentAttendance(studentId, startDate, endDate);
    
    if (limit) {
      attendanceQuery = attendanceQuery.limit(parseInt(limit));
    }

    const attendanceRecords = await attendanceQuery;

    // Calculate summary statistics
    const summary = attendanceRecords.reduce((acc, record) => {
      acc.total++;
      if (record.status === 'Present') acc.present++;
      else if (record.status === 'Absent') acc.absent++;
      else if (record.status === 'Late') acc.late++;
      else if (record.status === 'Half Leave') acc.halfLeave++;
      else if (record.status === 'Full Leave') acc.fullLeave++;
      return acc;
    }, { total: 0, present: 0, absent: 0, late: 0, halfLeave: 0, fullLeave: 0 });

    summary.percentage = summary.total > 0 ? 
      Math.round(((summary.present + summary.late) / summary.total) * 100) : 0;

    res.json({
      success: true,
      student: {
        id: student._id,
        fullName: student.fullName,
        userName: student.userName,
        program: student.program
      },
      attendance: attendanceRecords,
      summary
    });

  } catch (error) {
    console.error('Error getting student attendance:', error);
    res.status(500).json({ message: 'Error getting student attendance', error: error.message });
  }
});

// Get attendance statistics for a class
router.get('/stats/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
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

    // Get attendance statistics
    const stats = await Attendance.aggregate([
      {
        $match: {
          classId: classDoc._id,
          ...dateFilter
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Format stats
    const formattedStats = {
      Present: 0,
      Absent: 0,
      Late: 0,
      'Half Leave': 0,
      'Full Leave': 0
    };

    stats.forEach(stat => {
      formattedStats[stat._id] = stat.count;
    });

    const total = formattedStats.Present + formattedStats.Absent + formattedStats.Late + formattedStats['Half Leave'] + formattedStats['Full Leave'];
    const percentage = total > 0 ? 
      Math.round(((formattedStats.Present + formattedStats.Late) / total) * 100) : 0;

    res.json({
      success: true,
      class: {
        id: classDoc._id,
        name: classDoc.name,
        grade: classDoc.grade,
        campus: classDoc.campus,
        program: classDoc.program
      },
      period: { startDate, endDate },
      stats: {
        ...formattedStats,
        total,
        percentage
      }
    });

  } catch (error) {
    console.error('Error getting attendance statistics:', error);
    res.status(500).json({ message: 'Error getting statistics', error: error.message });
  }
});

// Get attendance data for a class by date range
router.get('/class/:classId/range', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Start date and end date are required' 
      });
    }

    // Validate date format
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid date format' 
      });
    }

    // Find all attendance records for the class within the date range
    const attendanceRecords = await Attendance.find({
      classId: classId,
      date: {
        $gte: start.toISOString().split('T')[0],
        $lte: end.toISOString().split('T')[0]
      }
    }).populate('studentId', 'fullName email program')
      .populate('classId', 'className floor')
      .sort({ date: 1, 'studentId.fullName.firstName': 1 });

    res.json({
      success: true,
      data: attendanceRecords,
      summary: {
        totalRecords: attendanceRecords.length,
        dateRange: { startDate, endDate },
        classId
      }
    });

  } catch (error) {
    console.error('Error getting attendance range:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting attendance data', 
      error: error.message 
    });
  }
});

// Get attendance overview for Principal (hierarchical stats) - Optimized with caching
router.get('/overview', authenticate, async (req, res) => {
  try {
    console.log('Overview request params:', req.query);
    
    const { startDate, endDate, campus, floor, program, classId, fresh } = req.query;
    
    // Get optimized overview data
    const data = await AttendanceService.getOptimizedOverview({
      startDate,
      endDate,
      campus,
      floor,
      program,
      classId,
      useCache: fresh !== 'true' // Allow bypassing cache with ?fresh=true
    });

    res.json({
      success: true,
      data
    });

  } catch (error) {
    console.error('Error getting attendance overview:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting attendance overview', 
      error: error.message 
    });
  }
});

// Get detailed attendance records for IT/Admin (student records)
router.get('/detailed', authenticate, async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      campus, 
      floor, 
      program, 
      classId,
      page = 1,
      limit = 50 
    } = req.query;
    
    // Default to today if no date range provided
    const today = new Date().toISOString().split('T')[0];
    const queryStartDate = startDate || today;
    const queryEndDate = endDate || today;

    // Build match criteria
    const matchCriteria = {
      date: {
        $gte: queryStartDate,
        $lte: queryEndDate
      }
    };

    // Build aggregation pipeline
    const pipeline = [
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'classes',
          localField: 'classId',
          foreignField: '_id',
          as: 'class'
        }
      },
      { $unwind: '$class' },
      {
        $match: {
          'student.role': 'Student',
          ...(campus && campus !== 'all' ? { 'class.campus': campus } : {}),
          ...(floor && floor !== 'all' ? { 'class.grade': floor === '1st' ? '11th' : '12th' } : {}),
          ...(program && program !== 'all' ? { 'class.program': program } : {}),
          ...(classId && classId !== 'all' ? { 'classId': new mongoose.Types.ObjectId(classId) } : {})
        }
      },
      {
        $project: {
          date: 1,
          status: 1,
          student: {
            _id: '$student._id',
            fullName: '$student.fullName',
            email: '$student.email',
            phoneNumber: '$student.phoneNumber',
            studentId: '$student.studentId'
          },
          className: '$class.className',
          campus: '$class.campus',
          floor: {
            $cond: {
              if: { $eq: ['$class.grade', '11th'] },
              then: '1st',
              else: '2nd'
            }
          },
          program: '$class.program'
        }
      },
      { $sort: { date: -1, 'student.fullName.firstName': 1 } }
    ];

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Attendance.aggregate(countPipeline);
    const totalRecords = countResult[0]?.total || 0;
    
    // Get paginated results
    const records = await Attendance.aggregate([
      ...pipeline,
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]);

    res.json({
      success: true,
      data: {
        studentRecords: records,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          recordsPerPage: parseInt(limit)
        },
        dateRange: { startDate: queryStartDate, endDate: queryEndDate }
      }
    });

  } catch (error) {
    console.error('Error getting detailed attendance:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting detailed attendance records', 
      error: error.message 
    });
  }
});

/**
 * @route   GET /api/attendance/student/:studentId
 * @desc    Get individual student attendance data
 * @access  Private
 */
router.get('/student/:studentId', async (req, res) => {
  try {
    const { studentId } = req.params;
    const { startDate, endDate } = req.query;

    // Validate student exists
    const User = require('../models/User');
    const student = await User.findById(studentId).select('fullName academicInfo');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build date filter
    let dateFilter = {};
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

    // Get student attendance records
    const attendanceRecords = await Attendance.find({
      studentId,
      ...dateFilter
    }).populate('classId', 'className grade campus program')
      .sort({ date: -1 });

    // Calculate statistics
    const stats = {
      total: attendanceRecords.length,
      present: attendanceRecords.filter(r => r.status === 'Present').length,
      absent: attendanceRecords.filter(r => r.status === 'Absent').length,
      late: attendanceRecords.filter(r => r.status === 'Late').length
    };

    stats.attendanceRate = stats.total > 0 ? 
      ((stats.present + stats.late) / stats.total * 100).toFixed(1) : 0;

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          fullName: student.fullName,
          academicInfo: student.academicInfo
        },
        records: attendanceRecords,
        statistics: stats,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Error getting student attendance:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting student attendance',
      error: error.message
    });
  }
});

// Get student attendance summary
router.get('/student/:studentId/summary', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    console.log('Fetching attendance summary for student:', studentId);
    
    // Get all attendance records for this student using the correct field name
    const attendanceRecords = await Attendance.find({
      studentId: studentId
    }).lean();
    
    console.log(`Found ${attendanceRecords.length} attendance records for student ${studentId}`);
    
    let totalDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let halfLeaveDays = 0;
    let fullLeaveDays = 0;
    
    attendanceRecords.forEach(record => {
      totalDays++;
      // Check for different possible status values (case-insensitive)
      const status = record.status?.toLowerCase();
      if (status === 'present') {
        presentDays++;
      } else if (status === 'absent') {
        absentDays++;
      } else if (status === 'half leave') {
        halfLeaveDays++;
      } else if (status === 'full leave') {
        fullLeaveDays++;
      }
      // Note: Any other status (like 'late', 'excused', etc.) will be counted as neither present nor absent
    });
    
    // Calculate absent days as total minus present and leaves (in case some records don't have explicit 'absent' status)
    const calculatedAbsentDays = totalDays - presentDays - halfLeaveDays - fullLeaveDays;
    
    // Use the calculated absent days for consistency
    const finalAbsentDays = calculatedAbsentDays;
    
    const attendancePercentage = totalDays > 0 ? (presentDays / totalDays) * 100 : 0;
    
    const summary = {
      totalDays,
      presentDays,
      absentDays: finalAbsentDays,
      halfLeaveDays,
      fullLeaveDays,
      attendancePercentage
    };
    
    console.log('Attendance summary:', summary);
    
    res.json({
      success: true,
      data: summary,
      message: 'Attendance summary fetched successfully'
    });
  } catch (error) {
    console.error('Error fetching student attendance summary:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Monthly attendance statistics for Principal
router.get('/monthly-stats/:year', authenticate, async (req, res) => {
  try {
    const { year } = req.params;
    
    // Check if user is Principal
    if (req.user.role !== 'Principal' && req.user.role !== 'InstituteAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principal privileges required.'
      });
    }

    const yearNum = parseInt(year);
    if (isNaN(yearNum) || yearNum < 2020 || yearNum > 2030) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year provided'
      });
    }

    console.log(`Fetching monthly stats for year: ${yearNum}`);
    
    // First, let's get a sample of attendance records to debug
    const sampleRecords = await Attendance.find({}).limit(5).select('date status');
    console.log('Sample attendance records:', sampleRecords);

    // Create date range for the year - using proper date handling for DateTime fields
    const startDate = new Date(yearNum, 0, 1, 0, 0, 0, 0); // January 1st, 00:00:00
    const endDate = new Date(yearNum + 1, 0, 1, 0, 0, 0, 0); // January 1st of next year, 00:00:00

    console.log('Date range:', { startDate, endDate });

    // Get total count first to verify data exists
    const totalCount = await Attendance.countDocuments({
      date: {
        $gte: startDate,
        $lt: endDate  // Use $lt instead of $lte for the end date
      }
    });

    console.log(`Total attendance records found for ${yearNum}: ${totalCount}`);

    if (totalCount === 0) {
      // Let's check what years we actually have data for
      const allYears = await Attendance.aggregate([
        {
          $group: {
            _id: { $year: '$date' },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      console.log('Available years with data:', allYears);
      
      return res.json({
        success: true,
        data: [],
        debug: {
          message: `No attendance records found for ${yearNum}`,
          availableYears: allYears,
          totalRecordsInDb: await Attendance.countDocuments({})
        }
      });
    }

    // Get monthly statistics
    const monthlyStats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lt: endDate  // Use $lt instead of $lte
          }
        }
      },
      {
        $addFields: {
          month: { $month: '$date' },
          year: { $year: '$date' }
        }
      },
      {
        $group: {
          _id: '$month',
          presentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] }
          },
          halfLeaveCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Half Leave'] }, 1, 0] }
          },
          fullLeaveCount: {
            $sum: { $cond: [{ $eq: ['$status', 'Full Leave'] }, 1, 0] }
          },
          totalRecords: { $sum: 1 },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      },
      {
        $addFields: {
          month: '$_id',
          totalStudents: { $size: '$uniqueStudents' }
        }
      },
      {
        $project: {
          _id: 0,
          month: 1,
          presentCount: 1,
          absentCount: 1,
          lateCount: 1,
          halfLeaveCount: 1,
          fullLeaveCount: 1,
          totalRecords: 1,
          totalStudents: 1
        }
      },
      {
        $sort: { month: 1 }
      }
    ]);

    console.log(`Monthly stats result:`, monthlyStats);

    res.json({
      success: true,
      data: monthlyStats,
      debug: {
        year: yearNum,
        totalRecordsFound: totalCount,
        dateRange: { startDate, endDate }
      }
    });

  } catch (error) {
    console.error('Error getting monthly attendance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting monthly attendance statistics',
      error: error.message
    });
  }
});

// Day-wise attendance report for a specific month
router.get('/day-wise-report/:year/:month', authenticate, async (req, res) => {
  try {
    const { year, month } = req.params;
    
    // Check if user is Principal
    if (req.user.role !== 'Principal' && req.user.role !== 'InstituteAdmin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Principal privileges required.'
      });
    }

    const yearNum = parseInt(year);
    const monthNum = parseInt(month);
    
    if (isNaN(yearNum) || isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: 'Invalid year or month provided'
      });
    }

    // Get the start and end dates for the month
    const startDate = new Date(yearNum, monthNum - 1, 1, 0, 0, 0, 0); // First day of month
    const endDate = new Date(yearNum, monthNum, 1, 0, 0, 0, 0); // First day of next month

    // Get day-wise statistics
    const dayWiseStats = await Attendance.aggregate([
      {
        $match: {
          date: {
            $gte: startDate,
            $lt: endDate  // Use $lt instead of $lte
          }
        }
      },
      {
        $addFields: {
          dateOnly: {
            $dateFromString: {
              dateString: {
                $dateToString: {
                  format: "%Y-%m-%d",
                  date: "$date"
                }
              }
            }
          }
        }
      },
      {
        $group: {
          _id: '$dateOnly',
          present: {
            $sum: { $cond: [{ $eq: ['$status', 'Present'] }, 1, 0] }
          },
          absent: {
            $sum: { $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0] }
          },
          late: {
            $sum: { $cond: [{ $eq: ['$status', 'Late'] }, 1, 0] }
          },
          halfLeave: {
            $sum: { $cond: [{ $eq: ['$status', 'Half Leave'] }, 1, 0] }
          },
          fullLeave: {
            $sum: { $cond: [{ $eq: ['$status', 'Full Leave'] }, 1, 0] }
          },
          totalRecords: { $sum: 1 },
          uniqueStudents: { $addToSet: '$studentId' }
        }
      },
      {
        $addFields: {
          date: '$_id',
          totalStudents: { $size: '$uniqueStudents' }
        }
      },
      {
        $project: {
          _id: 0,
          date: 1,
          present: 1,
          absent: 1,
          late: 1,
          halfLeave: 1,
          fullLeave: 1,
          totalRecords: 1,
          totalStudents: 1
        }
      },
      {
        $sort: { date: 1 }
      }
    ]);

    res.json({
      success: true,
      data: {
        month: monthNum,
        year: yearNum,
        dayWiseData: dayWiseStats
      }
    });

  } catch (error) {
    console.error('Error getting day-wise attendance report:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting day-wise attendance report',
      error: error.message
    });
  }
});

// Debug endpoint to check attendance data
router.get('/debug/check-data', authenticate, async (req, res) => {
  try {
    // Get total count
    const totalCount = await Attendance.countDocuments({});
    
    // Get sample records
    const sampleRecords = await Attendance.find({}).limit(10).select('date status studentId');
    
    // Get unique years
    const uniqueYears = await Attendance.aggregate([
      {
        $group: {
          _id: { $year: '$date' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Get records for 2025 specifically
    const records2025 = await Attendance.find({
      date: {
        $gte: new Date(2025, 0, 1, 0, 0, 0, 0),
        $lt: new Date(2026, 0, 1, 0, 0, 0, 0)
      }
    }).limit(5);
    
    res.json({
      success: true,
      debug: {
        totalRecords: totalCount,
        sampleRecords,
        uniqueYears,
        records2025Count: records2025.length,
        records2025Sample: records2025
      }
    });
    
  } catch (error) {
    console.error('Debug check error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
