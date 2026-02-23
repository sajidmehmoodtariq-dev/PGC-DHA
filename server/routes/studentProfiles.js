const express = require('express');
const User = require('../models/User');
const Class = require('../models/Class');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/student-profiles/optimized
 * @desc    Get all students with class assignments - optimized for StudentProfile page
 * @access  Private
 */
router.get('/optimized', async (req, res) => {
  try {
    const { page = 1, limit = 1000 } = req.query;
    
    console.log('Loading students with class assignments for StudentProfile...');
    
    // Build query for students with class assignments
    const studentQuery = {
      role: 'Student',
      classId: { $exists: true } // Only students with class assignments
    };
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get total count
    const totalStudents = await User.countDocuments(studentQuery);
    const totalPages = Math.ceil(totalStudents / parseInt(limit));
    
    console.log(`Found ${totalStudents} students with class assignments`);
    
    // Get students with populated class information
    const students = await User.find(studentQuery)
      .populate('classId', 'name grade campus program')
      .select('fullName email phoneNumber rollNumber campus program admissionInfo classId gender personalInfo')
      .sort({ 'fullName.firstName': 1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();
    
    console.log(`Returning ${students.length} students for page ${page}`);
    
    res.json({
      success: true,
      data: {
        students: students,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalStudents,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });
    
  } catch (error) {
    console.error('Error in student-profiles/optimized:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load student profiles',
      error: error.message
    });
  }
});

module.exports = router;
