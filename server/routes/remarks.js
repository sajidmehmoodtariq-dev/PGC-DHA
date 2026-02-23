const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Add remark for a student
router.post('/add-remark', authenticate, async (req, res) => {
  try {
    const { studentId, remark } = req.body;
    
    if (!studentId || !remark) {
      return res.status(400).json({
        success: false,
        message: 'Student ID and remark are required'
      });
    }

    // Find the student
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Add remark to student's record
    const remarkData = {
      remark,
      receptionistId: req.user._id,
      receptionistName: `${req.user.fullName?.firstName || ''} ${req.user.fullName?.lastName || ''}`.trim() || 'Receptionist',
      timestamp: new Date()
    };

    // Initialize remarks array if it doesn't exist
    if (!student.receptionistRemarks) {
      student.receptionistRemarks = [];
    }

    student.receptionistRemarks.push(remarkData);
    await student.save();

    res.json({
      success: true,
      message: 'Remark added successfully',
      data: remarkData
    });

  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while adding remark',
      error: error.message
    });
  }
});

// Get remarks for a student
router.get('/remarks/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    
    const student = await User.findById(studentId).select('receptionistRemarks fullName email');
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      data: {
        student: {
          name: student.fullName?.firstName + ' ' + student.fullName?.lastName,
          email: student.email
        },
        remarks: student.receptionistRemarks || []
      }
    });

  } catch (error) {
    console.error('Error fetching remarks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching remarks'
    });
  }
});

// Get all students with remark status
router.get('/students-with-remarks', authenticate, async (req, res) => {
  try {
    const students = await User.find({ role: 'Student' })
      .select('fullName email phoneNumbers receptionistRemarks prospectusStage isApproved')
      .lean();

    const studentsWithRemarkStatus = students.map(student => ({
      ...student,
      hasRemarks: !!(student.receptionistRemarks && student.receptionistRemarks.length > 0),
      lastRemarkDate: student.receptionistRemarks && student.receptionistRemarks.length > 0 
        ? student.receptionistRemarks[student.receptionistRemarks.length - 1].timestamp 
        : null
    }));

    res.json({
      success: true,
      data: {
        students: studentsWithRemarkStatus,
        count: studentsWithRemarkStatus.length
      }
    });

  } catch (error) {
    console.error('Error fetching students with remarks:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
});

module.exports = router;
