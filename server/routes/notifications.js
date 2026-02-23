const express = require('express');
const router = express.Router();
const Test = require('../models/Test');
const TestResult = require('../models/TestResult');
const TeacherAttendance = require('../models/TeacherAttendance');
const Timetable = require('../models/Timetable');
const User = require('../models/User');
const Class = require('../models/Class');
const StudentAnalytics = require('../models/StudentAnalytics');
const { authenticate } = require('../middleware/auth');

// In-memory store for dismissed notifications (in production, use Redis or database)
const dismissedNotifications = new Map();

/**
 * Get late teacher notifications for principal dashboard
 * Shows teachers who are:
 * 1. Marked as late in today's classes
 * 2. Late by 10+ minutes
 * 3. Currently in active lectures
 */
router.get('/late-teacher-notifications', authenticate, async (req, res) => {
  try {
    // Only allow Principal to access this endpoint
    if (req.user.role !== 'Principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals can view these notifications.'
      });
    }

    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find today's teacher attendance records where teachers are late by 10+ minutes
    // and no notification action has been taken yet
    const lateTeacherRecords = await TeacherAttendance.find({
      date: { $gte: today, $lte: endOfDay },
      status: 'Late',
      lateMinutes: { $gte: 10 }, // 10+ minutes late
      notificationActionTaken: { $ne: true } // Only show notifications that haven't been acted upon
    })
    .populate('teacherId', 'fullName userName email')
    .populate('classId', 'name grade section campus')
    .populate('timetableId', 'subject startTime endTime dayOfWeek')
    .lean();

    // Process notifications with additional context
    const notifications = await Promise.all(lateTeacherRecords.map(async (record) => {
      const teacher = record.teacherId;
      const classInfo = record.classId;
      const timetable = record.timetableId;

      // Calculate how much time has passed since the class started
      const classStartTime = new Date(today);
      const [startHour, startMinute] = timetable.startTime.split(':');
      classStartTime.setHours(parseInt(startHour), parseInt(startMinute), 0, 0);
      
      const currentTime = now;
      const timeSinceStart = Math.floor((currentTime - classStartTime) / (60 * 1000)); // minutes
      
      // Determine severity based on late minutes
      let severity = 'medium';
      if (record.lateMinutes >= 40) {
        severity = 'critical';
      } else if (record.lateMinutes >= 20) {
        severity = 'high';
      }

      // Format late duration text
      let lateDurationText;
      if (record.lateMinutes >= 60) {
        const hours = Math.floor(record.lateMinutes / 60);
        const remainingMinutes = record.lateMinutes % 60;
        lateDurationText = `${hours}h ${remainingMinutes}m late`;
      } else {
        lateDurationText = `${record.lateMinutes}m late`;
      }

      return {
        id: record._id,
        teacherId: teacher._id,
        teacherName: `${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim(),
        teacherEmail: teacher.email,
        teacherUserName: teacher.userName,
        className: `${classInfo.name} - ${classInfo.grade}${classInfo.section ? ` ${classInfo.section}` : ''}`,
        subject: record.subject || timetable.subject,
        classStartTime: timetable.startTime,
        classEndTime: timetable.endTime,
        lateMinutes: record.lateMinutes,
        lateDurationText,
        timeSinceClassStart: timeSinceStart,
        remarks: record.remarks,
        markedAt: record.createdOn,
        floor: record.floor,
        severity,
        classId: classInfo._id,
        timetableId: timetable._id
      };
    }));

    // Sort by late minutes (most late first)
    notifications.sort((a, b) => b.lateMinutes - a.lateMinutes);

    res.json({
      success: true,
      data: {
        notifications,
        totalCount: notifications.length,
        lastChecked: now,
        todayDate: today.toISOString().split('T')[0]
      }
    });

  } catch (error) {
    console.error('Error fetching late teacher notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching teacher notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Take action on a late teacher notification
 * Actions: remind_teacher, contact_coordinator, escalate, mark_resolved
 */
router.post('/late-teacher-notifications/:attendanceId/action', authenticate, async (req, res) => {
  try {
    // Only allow Principal to take action
    if (req.user.role !== 'Principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals can take action on notifications.'
      });
    }

    const { attendanceId } = req.params;
    const { action, notes } = req.body;

    const validActions = ['contact_coordinator', 'escalate', 'mark_resolved'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Valid actions are: ' + validActions.join(', ')
      });
    }

    // Find the attendance record
    const attendanceRecord = await TeacherAttendance.findById(attendanceId)
      .populate('teacherId', 'fullName userName email')
      .populate('classId', 'name grade section')
      .populate('timetableId', 'subject startTime endTime');

    if (!attendanceRecord) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    let actionResult = {};

    switch (action) {
      case 'contact_coordinator':
        // Contact the floor coordinator
        actionResult = {
          action: 'contact_coordinator',
          message: `Floor coordinator contacted for Floor ${attendanceRecord.floor}`,
          floor: attendanceRecord.floor,
          timestamp: new Date()
        };
        break;

      case 'escalate':
        // Escalate to higher authorities
        actionResult = {
          action: 'escalate',
          message: 'Issue escalated to administration',
          escalatedTo: 'Administration',
          timestamp: new Date()
        };
        break;

      case 'mark_resolved':
        // Mark as resolved (maybe teacher arrived or class was cancelled)
        actionResult = {
          action: 'mark_resolved',
          message: 'Notification marked as resolved',
          resolvedBy: req.user.fullName?.firstName || req.user.userName,
          timestamp: new Date()
        };
        break;
    }

    // Add notes if provided
    if (notes && notes.trim()) {
      actionResult.notes = notes.trim();
    }

    // Mark the attendance record as acted upon to prevent it from appearing in future notifications
    await TeacherAttendance.findByIdAndUpdate(attendanceId, {
      notificationActionTaken: true,
      notificationAction: action,
      notificationActionTimestamp: new Date(),
      notificationActionBy: req.user._id,
      notificationActionNotes: notes?.trim() || null
    });

    res.json({
      success: true,
      data: {
        attendanceId,
        teacherName: `${attendanceRecord.teacherId?.fullName?.firstName || ''} ${attendanceRecord.teacherId?.fullName?.lastName || ''}`.trim(),
        className: `${attendanceRecord.classId?.name} - ${attendanceRecord.classId?.grade}${attendanceRecord.classId?.section ? ` ${attendanceRecord.classId?.section}` : ''}`,
        subject: attendanceRecord.subject,
        actionTaken: actionResult,
        processedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error processing teacher notification action:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get late mark sheet notifications for principal dashboard
 * Shows tests where:
 * 1. marksEntryDeadline has passed
 * 2. Teacher is 10+ minutes late
 * 3. Persist until an action is taken (even if marks are later uploaded)
 */
router.get('/late-marksheet-notifications', authenticate, async (req, res) => {
  try {
    // Only allow Principal to access this endpoint
    if (req.user.role !== 'Principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals can view these notifications.'
      });
    }

    const now = new Date();
    const tenMinutesAgo = new Date(now.getTime() - (10 * 60 * 1000)); // 10 minutes ago

    // Find tests where marks entry deadline has passed by at least 10 minutes
    // and no marks have been uploaded and no action has been taken
    const lateTests = await Test.find({
      isActive: true,
      marksEntryDeadline: {
        $exists: true,
        $ne: null,
        $lt: tenMinutesAgo // Deadline passed 10+ minutes ago
      },
      notificationActionTaken: { $ne: true } // Only show if no action has been taken
    })
    .populate('classId', 'name grade section')
    .populate('assignedTeacher', 'name email')
    .lean();

    // Build notifications regardless of whether marks were uploaded later
    const notificationsPromises = lateTests.map(async (test) => {
      // Check if any marks have been uploaded for this test (for context only)
      const marksCount = await TestResult.countDocuments({ testId: test._id });
      const marksUploaded = marksCount > 0;

      // Calculate how late the teacher is
      const lateDurationMs = now.getTime() - test.marksEntryDeadline.getTime();
      const lateDurationMinutes = Math.floor(lateDurationMs / (60 * 1000));
      const lateDurationHours = Math.floor(lateDurationMinutes / 60);
      const remainingMinutes = lateDurationMinutes % 60;

      let lateDurationText;
      if (lateDurationHours > 0) {
        lateDurationText = `${lateDurationHours}h ${remainingMinutes}m late`;
      } else {
        lateDurationText = `${lateDurationMinutes}m late`;
      }

      return {
        id: test._id,
        testTitle: test.title,
        subject: test.subject,
        testDate: test.testDate,
        marksEntryDeadline: test.marksEntryDeadline,
        class: test.classId,
        teacher: test.assignedTeacher,
        lateDurationMinutes,
        lateDurationText,
        severity: lateDurationHours >= 24 ? 'critical' : lateDurationHours >= 2 ? 'high' : 'medium',
        marksUploaded
      };
    });

    const notifications = await Promise.all(notificationsPromises);

    // Sort by how late they are (most late first)
    notifications.sort((a, b) => b.lateDurationMinutes - a.lateDurationMinutes);

    res.json({
      success: true,
      data: {
        notifications,
        totalCount: notifications.length,
        lastChecked: now
      }
    });

  } catch (error) {
    console.error('Error fetching late marksheet notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching notifications',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Take action on a late mark sheet notification
 * Actions: remind_teacher, escalate, mark_resolved, extend_deadline
 */
router.post('/late-marksheet-notifications/:testId/action', authenticate, async (req, res) => {
  try {
    // Only allow Principal to take action
    if (req.user.role !== 'Principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals can take action on notifications.'
      });
    }

    const { testId } = req.params;
    const { action, newDeadline, notes } = req.body;

    const validActions = ['mark_resolved', 'extend_deadline'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Valid actions are: ' + validActions.join(', ')
      });
    }

    // Find the test
    const test = await Test.findById(testId)
      .populate('assignedTeacher', 'name email')
      .populate('classId', 'name grade section');

    if (!test) {
      return res.status(404).json({
        success: false,
        message: 'Test not found'
      });
    }

    let actionResult = {};

    switch (action) {
      case 'mark_resolved':
        // Mark as resolved (maybe teacher uploaded marks manually)
        test.notificationActionTaken = true;
        test.lastNotificationActionDate = new Date();
        await test.save();
        
        actionResult = {
          action: 'mark_resolved',
          message: 'Notification marked as resolved',
          resolvedBy: req.user.name,
          timestamp: new Date()
        };
        break;

      case 'extend_deadline':
        if (!newDeadline) {
          return res.status(400).json({
            success: false,
            message: 'New deadline is required for extend_deadline action'
          });
        }
        
        // Store original deadline if not already stored
        if (!test.originalMarksEntryDeadline) {
          test.originalMarksEntryDeadline = test.marksEntryDeadline;
        }
        
        // Update the marks entry deadline and reset notification flag
        test.marksEntryDeadline = new Date(newDeadline);
        test.notificationActionTaken = false; // Reset so notification can show again if needed
        test.lastNotificationActionDate = new Date();
        await test.save();
        
        actionResult = {
          action: 'extend_deadline',
          message: `Deadline extended to ${new Date(newDeadline).toLocaleString()}`,
          oldDeadline: test.originalMarksEntryDeadline || test.marksEntryDeadline,
          newDeadline: new Date(newDeadline),
          timestamp: new Date()
        };
        break;
    }

    // In a real implementation, you might want to log these actions in a separate collection
    // For now, we'll just return the action result

    res.json({
      success: true,
      data: {
        testId,
        test: {
          title: test.title,
          subject: test.subject,
          class: test.classId,
          teacher: test.assignedTeacher
        },
        actionTaken: actionResult,
        notes
      }
    });

  } catch (error) {
    console.error('Error taking action on notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Dismiss a notification (remove from principal's view)
 */
router.post('/late-marksheet-notifications/:testId/dismiss', authenticate, async (req, res) => {
  try {
    // Only allow Principal to dismiss notifications
    if (req.user.role !== 'Principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals can dismiss notifications.'
      });
    }

    const { testId } = req.params;
    const { reason } = req.body;

    // Ephemeral dismiss: do NOT mark action taken; client will hide per session
    res.json({
      success: true,
      data: {
        testId,
        dismissed: true,
        dismissedBy: req.user.name,
        dismissedAt: new Date(),
        reason: reason || 'No reason provided'
      }
    });

  } catch (error) {
    console.error('Error dismissing notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error dismissing notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get red zone students notification for principal dashboard
 * Shows students who are in the red zone based on their analytics
 */
router.get('/red-zone-students', authenticate, async (req, res) => {
  try {
    // Only allow Principal to access this endpoint
    if (req.user.role !== 'Principal') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals can view these notifications.'
      });
    }

    // Get all students with analytics data that have red zone performance
    const redZoneStudents = await StudentAnalytics.find({
      'overallAnalytics.overallZone': 'red'
    })
    .populate({
      path: 'studentId',
      select: 'fullName rollNumber classId',
      populate: {
        path: 'classId',
        select: 'name grade section campus'
      }
    })
    .lean();

    // Filter out any students without valid student data
    const validRedZoneStudents = redZoneStudents.filter(analytics => 
      analytics.studentId && 
      analytics.studentId.fullName
    );

    // Group by class for better organization
    const groupedByClass = validRedZoneStudents.reduce((acc, analytics) => {
      const student = analytics.studentId;
      const classInfo = student.classId;
      
      if (!classInfo) return acc;
      
      const classKey = classInfo._id.toString();
      if (!acc[classKey]) {
        acc[classKey] = {
          classInfo: {
            _id: classInfo._id,
            name: classInfo.name,
            grade: classInfo.grade,
            section: classInfo.section,
            campus: classInfo.campus
          },
          students: []
        };
      }

      acc[classKey].students.push({
        studentId: student._id,
        name: `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
        rollNumber: student.rollNumber,
        overallPercentage: analytics.overallAnalytics?.currentOverallPercentage || 0,
        zone: analytics.overallAnalytics?.overallZone || 'red'
      });

      return acc;
    }, {});

    // Convert to array and sort by class name
    const classGroups = Object.values(groupedByClass).sort((a, b) => 
      a.classInfo.name.localeCompare(b.classInfo.name)
    );

    // Sort students within each class by percentage (lowest first)
    classGroups.forEach(group => {
      group.students.sort((a, b) => a.overallPercentage - b.overallPercentage);
    });

    const totalRedZoneStudents = validRedZoneStudents.length;

    res.json({
      success: true,
      data: {
        totalCount: totalRedZoneStudents,
        classGroups,
        students: validRedZoneStudents.map(analytics => ({
          studentId: analytics.studentId._id,
          name: `${analytics.studentId.fullName?.firstName || ''} ${analytics.studentId.fullName?.lastName || ''}`.trim(),
          rollNumber: analytics.studentId.rollNumber,
          className: analytics.studentId.classId?.name || 'No Class',
          overallPercentage: analytics.overallAnalytics?.currentOverallPercentage || 0,
          zone: analytics.overallAnalytics?.overallZone || 'red'
        })),
        lastChecked: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching red zone students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching red zone students',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Get red zone students count notification for principal dashboard
 * Shows current number of students in red zone across all campuses
 */
router.get('/red-zone-students-notification', authenticate, async (req, res) => {
  try {
    // Only allow Principal and authorized roles to access this endpoint
    if (!['Principal', 'InstituteAdmin', 'IT'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and admins can view these notifications.'
      });
    }

    // Check if notification is dismissed for this user
    const dismissKey = `red-zone-${req.user._id}`;
    const dismissedUntil = dismissedNotifications.get(dismissKey);
    
    // Clean up expired dismissals
    if (dismissedUntil && dismissedUntil < new Date()) {
      dismissedNotifications.delete(dismissKey);
    } else if (dismissedUntil) {
      return res.json({
        success: true,
        data: {
          notification: null,
          stats: null,
          lastChecked: new Date(),
          dismissed: true,
          dismissedUntil: dismissedUntil
        }
      });
    }

    // Get current red zone students count from StudentAnalytics
    const redZoneStats = await StudentAnalytics.aggregate([
      {
        $match: {
          zone: 'red',
          isActive: true
        }
      },
      {
        $group: {
          _id: null,
          totalRedZoneStudents: { $sum: 1 },
          campusBreakdown: {
            $push: {
              campus: '$campus',
              grade: '$grade',
              studentId: '$studentId'
            }
          }
        }
      }
    ]);

    // Get campus-wise breakdown
    const campusBreakdown = await StudentAnalytics.aggregate([
      {
        $match: {
          zone: 'red',
          isActive: true
        }
      },
      {
        $group: {
          _id: '$campus',
          count: { $sum: 1 },
          students: {
            $push: {
              studentId: '$studentId',
              grade: '$grade',
              lastUpdated: '$lastUpdated'
            }
          }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    // Get grade-wise breakdown
    const gradeBreakdown = await StudentAnalytics.aggregate([
      {
        $match: {
          zone: 'red',
          isActive: true
        }
      },
      {
        $group: {
          _id: {
            campus: '$campus',
            grade: '$grade'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: '$_id.grade',
          totalCount: { $sum: '$count' },
          campuses: {
            $push: {
              campus: '$_id.campus',
              count: '$count'
            }
          }
        }
      },
      {
        $sort: { totalCount: -1 }
      }
    ]);

    // HARDCODED FOR TESTING: Set to 32 red zone students
    const totalRedZoneStudents = 32;

    // Determine severity based on count
    let severity = 'low';
    if (totalRedZoneStudents >= 50) {
      severity = 'critical';
    } else if (totalRedZoneStudents >= 20) {
      severity = 'high';
    } else if (totalRedZoneStudents >= 10) {
      severity = 'medium';
    }

    // Create notification object
    const notification = {
      id: 'red-zone-students',
      type: 'red_zone_alert',
      title: 'Red Zone Students Alert',
      message: `${totalRedZoneStudents} students are currently in the Red Zone`,
      count: totalRedZoneStudents,
      severity,
      actionRequired: totalRedZoneStudents > 0,
      campusBreakdown: campusBreakdown.map(campus => ({
        campus: campus._id,
        count: campus.count,
        studentCount: campus.students.length
      })),
      gradeBreakdown: gradeBreakdown.map(grade => ({
        grade: grade._id,
        totalCount: grade.totalCount,
        campuses: grade.campuses
      })),
      lastUpdated: new Date(),
      actionUrl: '/admin/student-examination-report?zone=red'
    };

    res.json({
      success: true,
      data: {
        notification,
        stats: {
          totalRedZoneStudents,
          campusBreakdown,
          gradeBreakdown,
          severity
        },
        lastChecked: new Date()
      }
    });

  } catch (error) {
    console.error('Error fetching red zone students notification:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching red zone notification',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * Take action on red zone students notification
 * Actions: view_report, create_intervention, mark_reviewed
 */
router.post('/red-zone-students-notification/action', authenticate, async (req, res) => {
  try {
    // Only allow Principal and authorized roles to take action
    if (!['Principal', 'InstituteAdmin', 'IT'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only principals and admins can take action on notifications.'
      });
    }

    const { action, notes, targetCampus, targetGrade } = req.body;

    const validActions = ['view_report', 'create_intervention', 'mark_reviewed', 'dismiss'];
    if (!validActions.includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid action. Valid actions are: ' + validActions.join(', ')
      });
    }

    let actionResult = {};

    switch (action) {
      case 'view_report':
        // Redirect to student examination report with red zone filter
        actionResult = {
          action: 'view_report',
          message: 'Redirecting to Student Examination Report',
          redirectUrl: '/principal/student-examination-report',
          timestamp: new Date()
        };
        break;

      case 'dismiss':
        // Dismiss the notification temporarily (for 1 hour)
        const dismissKey = `red-zone-${req.user._id}`;
        const dismissUntil = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
        dismissedNotifications.set(dismissKey, dismissUntil);
        
        actionResult = {
          action: 'dismiss',
          message: 'Notification dismissed for 1 hour',
          timestamp: new Date(),
          dismissedBy: req.user._id,
          dismissedUntil: dismissUntil
        };
        break;

      case 'create_intervention':
        // Create intervention plan for red zone students
        actionResult = {
          action: 'create_intervention',
          message: 'Intervention plan creation initiated',
          targetCampus: targetCampus || 'All',
          targetGrade: targetGrade || 'All',
          timestamp: new Date()
        };
        break;

      case 'mark_reviewed':
        // Mark as reviewed (principal has acknowledged the red zone students)
        actionResult = {
          action: 'mark_reviewed',
          message: 'Red zone students notification marked as reviewed',
          reviewedBy: req.user.fullName?.firstName || req.user.userName || req.user.name,
          timestamp: new Date()
        };
        break;
    }

    // Add notes if provided
    if (notes && notes.trim()) {
      actionResult.notes = notes.trim();
    }

    res.json({
      success: true,
      data: {
        actionTaken: actionResult,
        processedAt: new Date(),
        processedBy: req.user.fullName?.firstName || req.user.userName || req.user.name
      }
    });

  } catch (error) {
    console.error('Error processing red zone notification action:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing action',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
