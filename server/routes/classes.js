const express = require('express');
const router = express.Router();
const Class = require('../models/Class');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Get all classes with teacher information
router.get('/', authenticate, async (req, res) => {
  try {
    const { floor, campus, grade, program, floorIncharge } = req.query;
    
    // Build filter - only add defined values
    const filter = { isActive: true };
    if (floor && floor !== 'undefined') filter.floor = parseInt(floor);
    if (campus && campus !== 'undefined') filter.campus = campus;
    if (grade && grade !== 'undefined') filter.grade = grade;
    if (program && program !== 'undefined') filter.program = program;
    if (floorIncharge && floorIncharge !== 'undefined') filter.floorIncharge = floorIncharge;

    const classes = await Class.find(filter)
      .populate('classIncharge', 'fullName userName email')
      .populate('floorIncharge', 'fullName userName email')
      .populate('teachers.teacherId', 'fullName userName email')
      .sort({ floor: 1, grade: 1, program: 1, name: 1 });

    // Update student count for each class and format floor display
    for (const classDoc of classes) {
      await classDoc.updateStudentCount();
    }

    // Transform classes to include frontend-expected floor format
    const transformedClasses = classes.map(cls => {
      const classObj = cls.toObject();
      return {
        ...classObj,
        className: cls.fullName, // Use the full descriptive name
        // Keep the original floor number (1-4) as per the actual floor mapping
        floor: cls.floor
      };
    });

    res.json({
      success: true,
      classes: transformedClasses,
      data: transformedClasses // Also include 'data' field for compatibility
    });

  } catch (error) {
    console.error('Error fetching classes:', error);
    res.status(500).json({ message: 'Error fetching classes', error: error.message });
  }
});

// Get classes by floor (for floor coordinators)
router.get('/floor/:floorNumber', authenticate, async (req, res) => {
  try {
    const { floorNumber } = req.params;
    const floor = parseInt(floorNumber);

    if (floor < 1 || floor > 4) {
      return res.status(400).json({ message: 'Invalid floor number. Must be 1-4.' });
    }

    const classes = await Class.findByFloor(floor)
      .populate('classIncharge', 'fullName userName email')
      .populate('floorIncharge', 'fullName userName email')
      .populate('teachers.teacherId', 'fullName userName email')
      .sort({ program: 1, name: 1 });

    const floorInfo = {
      1: { name: '11th Boys Floor', campus: 'Boys', grade: '11th' },
      2: { name: '12th Boys Floor', campus: 'Boys', grade: '12th' },
      3: { name: '11th Girls Floor', campus: 'Girls', grade: '11th' },
      4: { name: '12th Girls Floor', campus: 'Girls', grade: '12th' }
    };

    res.json({
      success: true,
      floor: {
        number: floor,
        ...floorInfo[floor]
      },
      classes,
      totalClasses: classes.length
    });

  } catch (error) {
    console.error('Error fetching floor classes:', error);
    res.status(500).json({ message: 'Error fetching floor classes', error: error.message });
  }
});

// Create new class
router.post('/', authenticate, async (req, res) => {
  try {
    // Check if user has permission to create classes
    if (!['InstituteAdmin', 'IT'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Only Institute Admin and IT can create classes.' 
      });
    }

    const { name, campus, grade, program, maxStudents, classIncharge, floorIncharge } = req.body;

    // Validate required fields
    if (!name || !campus || !grade || !program) {
      return res.status(400).json({ 
        message: 'Name, campus, grade, and program are required' 
      });
    }

    // Check if class name already exists for same campus/grade/program
    const existingClass = await Class.findOne({
      name: name.trim(),
      campus,
      grade,
      program,
      isActive: true
    });

    if (existingClass) {
      return res.status(400).json({
        message: 'A class with this name already exists for the same campus, grade, and program'
      });
    }

    const classData = {
      name: name.trim(),
      campus,
      grade,
      program,
      maxStudents: maxStudents || 50
    };

    if (classIncharge) classData.classIncharge = classIncharge;
    if (floorIncharge) classData.floorIncharge = floorIncharge;

    const newClass = new Class(classData);
    await newClass.save();

    // Populate teacher references before sending response
    await newClass.populate('classIncharge floorIncharge');

    res.status(201).json({
      success: true,
      message: 'Class created successfully',
      class: newClass
    });

  } catch (error) {
    console.error('Error creating class:', error);
    res.status(500).json({ message: 'Error creating class', error: error.message });
  }
});

// Update class details (name, maxStudents, etc.)
router.put('/:classId', authenticate, async (req, res) => {
  try {
    // Check if user has permission to update classes
    if (!['InstituteAdmin', 'IT'].includes(req.user.role)) {
      return res.status(403).json({ 
        message: 'Access denied. Only Institute Admin and IT can update classes.' 
      });
    }

    const { classId } = req.params;
    const { name, maxStudents, program, classIncharge, floorIncharge } = req.body;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // If updating name, check for duplicates
    if (name && name.trim() !== classDoc.name) {
      const existingClass = await Class.findOne({
        name: name.trim(),
        campus: classDoc.campus,
        grade: classDoc.grade,
        program: program || classDoc.program,
        isActive: true,
        _id: { $ne: classId }
      });

      if (existingClass) {
        return res.status(400).json({
          message: 'A class with this name already exists for the same campus, grade, and program'
        });
      }
    }

    // Update allowed fields
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (maxStudents !== undefined) updateData.maxStudents = maxStudents;
    if (program !== undefined) updateData.program = program;
    if (classIncharge !== undefined) updateData.classIncharge = classIncharge || null;
    if (floorIncharge !== undefined) updateData.floorIncharge = floorIncharge || null;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid update data provided' });
    }

    Object.assign(classDoc, updateData);
    await classDoc.save();
    await classDoc.populate('classIncharge floorIncharge teachers.teacherId');

    res.json({
      success: true,
      message: 'Class updated successfully',
      class: classDoc
    });

  } catch (error) {
    console.error('Error updating class:', error);
    res.status(500).json({ message: 'Error updating class', error: error.message });
  }
});

// Add teacher to class
router.post('/:classId/teachers', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { teacherId, subject } = req.body;

    if (!teacherId) {
      return res.status(400).json({ message: 'Teacher ID is required' });
    }

    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Validate teacher exists and is a teacher
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (teacher.role !== 'Teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }

    // Add teacher to class
    const result = classDoc.addTeacher(teacherId, subject);
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    await classDoc.save();
    await classDoc.populate('teachers.teacherId', 'fullName userName email');

    res.json({
      success: true,
      message: result.message,
      class: classDoc
    });

  } catch (error) {
    console.error('Error adding teacher to class:', error);
    res.status(500).json({ message: 'Error adding teacher to class', error: error.message });
  }
});

// Remove teacher from class
router.delete('/:classId/teachers/:teacherId', authenticate, async (req, res) => {
  try {
    const { classId, teacherId } = req.params;

    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Remove teacher from class
    const result = classDoc.removeTeacher(teacherId);
    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    await classDoc.save();
    await classDoc.populate('teachers.teacherId', 'fullName userName email');

    res.json({
      success: true,
      message: result.message,
      class: classDoc
    });

  } catch (error) {
    console.error('Error removing teacher from class:', error);
    res.status(500).json({ message: 'Error removing teacher from class', error: error.message });
  }
});

// Delete an entire class
router.delete('/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    // Find the class first to check if it exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ 
        success: false, 
        message: 'Class not found' 
      });
    }

    // Check if class has any students assigned
    const studentsInClass = await User.countDocuments({ 
      classId: classId, 
      role: 'Student' 
    });

    if (studentsInClass > 0) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot delete class. ${studentsInClass} students are currently assigned to this class. Please unassign students first.` 
      });
    }

    // Delete the class
    await Class.findByIdAndDelete(classId);

    res.json({
      success: true,
      message: 'Class deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting class:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting class', 
      error: error.message 
    });
  }
});

// Update class incharge or floor incharge
router.put('/:classId/incharge', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { classIncharge, floorIncharge } = req.body;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    const updateData = {};
    if (classIncharge !== undefined) updateData.classIncharge = classIncharge;
    if (floorIncharge !== undefined) updateData.floorIncharge = floorIncharge;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No incharge data provided' });
    }

    Object.assign(classDoc, updateData);
    await classDoc.save();
    await classDoc.populate('classIncharge floorIncharge teachers.teacherId');

    res.json({
      success: true,
      message: 'Class incharge updated successfully',
      class: classDoc
    });

  } catch (error) {
    console.error('Error updating class incharge:', error);
    res.status(500).json({ message: 'Error updating class incharge', error: error.message });
  }
});

// Get classes where user can mark attendance
router.get('/attendance-access/:userId', authenticate, async (req, res) => {
  try {
    const { userId } = req.params;

    // Find classes where user is classIncharge, floorIncharge, or assigned teacher
    const classes = await Class.find({
      isActive: true,
      $or: [
        { classIncharge: userId },
        { floorIncharge: userId },
        { 'teachers.teacherId': userId, 'teachers.isActive': true }
      ]
    })
    .populate('classIncharge', 'fullName userName')
    .populate('floorIncharge', 'fullName userName')
    .populate('teachers.teacherId', 'fullName userName')
    .sort({ floor: 1, name: 1 });

    // Add role information for each class
    const classesWithRoles = classes.map(classDoc => {
      const authCheck = classDoc.canMarkAttendance(userId);
      return {
        ...classDoc.toObject(),
        userRole: authCheck.role,
        canMarkAttendance: authCheck.canMark,
        subject: authCheck.subject
      };
    });

    res.json({
      success: true,
      classes: classesWithRoles,
      totalClasses: classesWithRoles.length
    });

  } catch (error) {
    console.error('Error fetching attendance access:', error);
    res.status(500).json({ message: 'Error fetching attendance access', error: error.message });
  }
});

// Get classes where teacher has access (for student attendance)
router.get('/teacher-access/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find classes where user is classIncharge or assigned teacher
    const classes = await Class.find({
      $or: [
        { classIncharge: teacherId },
        { 'teachers.teacherId': teacherId }
      ],
      isActive: true
    })
    .populate('classIncharge', 'fullName userName')
    .populate('teachers.teacherId', 'fullName userName')
    .populate('floorIncharge', 'fullName userName');
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error fetching teacher access:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching teacher access', 
      error: error.message 
    });
  }
});

// Get floors where teacher is floor incharge
router.get('/floor-incharge/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    
    // Find floors where user is floorIncharge
    const classes = await Class.find({
      floorIncharge: teacherId,
      isActive: true
    });
    
    // Get unique floors
    const floors = [...new Set(classes.map(cls => cls.floor))];
    
    res.json({
      success: true,
      data: {
        floors,
        classes: classes.length
      }
    });
  } catch (error) {
    console.error('Error fetching floor incharge status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching floor incharge status', 
      error: error.message 
    });
  }
});

// Get floors for coordinator
router.get('/coordinator-floors/:coordinatorId', authenticate, async (req, res) => {
  try {
    const { coordinatorId } = req.params;
    
    // Find floors where user is floorIncharge
    const classes = await Class.find({
      floorIncharge: coordinatorId,
      isActive: true
    });
    
    // Get unique floors
    const floors = [...new Set(classes.map(cls => cls.floor))].sort();
    
    res.json({
      success: true,
      data: {
        floors,
        totalClasses: classes.length
      }
    });
  } catch (error) {
    console.error('Error fetching coordinator floors:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching coordinator floors', 
      error: error.message 
    });
  }
});

// Get classes by floors
router.get('/floors/:floors', authenticate, async (req, res) => {
  try {
    const { floors } = req.params;
    const floorNumbers = floors.split(',').map(f => parseInt(f));
    
    const classes = await Class.find({
      floor: { $in: floorNumbers },
      isActive: true
    })
    .populate('classIncharge', 'fullName userName')
    .populate('teachers.teacherId', 'fullName userName')
    .populate('floorIncharge', 'fullName userName');
    
    res.json({
      success: true,
      data: classes
    });
  } catch (error) {
    console.error('Error fetching classes by floors:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching classes by floors', 
      error: error.message 
    });
  }
});

// Get students for a specific class
router.get('/:classId/students', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ 
        success: false,
        message: 'Class not found' 
      });
    }
    
    // Get students for this class
    const students = await User.find({
      classId: classId,
      role: 'Student',
      isActive: true,
      $or: [
        { prospectusStage: 5 },
        { enquiryLevel: 5 }
      ]
    })
    .select('fullName userName rollNumber email program gender')
    .sort({ 'fullName.firstName': 1, 'fullName.lastName': 1 });
    
    res.json({
      success: true,
      data: {
        class: {
          id: classDoc._id,
          name: classDoc.name,
          grade: classDoc.grade,
          campus: classDoc.campus,
          program: classDoc.program,
          floor: classDoc.floor
        },
        students,
        totalStudents: students.length
      }
    });
  } catch (error) {
    console.error('Error fetching class students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching class students', 
      error: error.message 
    });
  }
});

module.exports = router;
