const express = require('express');
const router = express.Router();
const Timetable = require('../models/Timetable');
const Class = require('../models/Class');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Get timetable with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { classId, teacherId, dayOfWeek, floor, academicYear } = req.query;
    
    let query = { isActive: true };
    
    if (classId) query.classId = classId;
    if (teacherId) query.teacherId = teacherId;
    if (dayOfWeek) query.dayOfWeek = dayOfWeek;
    if (academicYear) query.academicYear = academicYear;
    
    let timetable;
    
    if (floor) {
      // Get timetable for specific floor
      timetable = await Timetable.getFloorTimetable(parseInt(floor), dayOfWeek);
    } else {
      // Regular query
      timetable = await Timetable.find(query)
        .populate('teacherId', 'fullName userName email')
        .populate('classId', 'name grade campus program floor')
        .populate('createdBy', 'fullName userName')
        .sort({ dayOfWeek: 1, startTime: 1 });
    }

    res.json({
      success: true,
      timetable,
      total: timetable.length
    });

  } catch (error) {
    console.error('Error fetching timetable:', error);
    res.status(500).json({ message: 'Error fetching timetable', error: error.message });
  }
});

// Get timetable for a specific class
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    const { dayOfWeek } = req.query;

    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    let timetable;
    if (dayOfWeek) {
      timetable = await Timetable.getClassTimetable(classId, dayOfWeek);
    } else {
      // Get full week timetable
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekTimetable = {};
      
      for (const day of days) {
        weekTimetable[day] = await Timetable.getClassTimetable(classId, day);
      }
      
      timetable = weekTimetable;
    }

    res.json({
      success: true,
      class: {
        id: classDoc._id,
        name: classDoc.name,
        grade: classDoc.grade,
        campus: classDoc.campus,
        program: classDoc.program,
        floor: classDoc.floor
      },
      timetable
    });

  } catch (error) {
    console.error('Error fetching class timetable:', error);
    res.status(500).json({ message: 'Error fetching class timetable', error: error.message });
  }
});

// Get timetable for a teacher
router.get('/teacher/:teacherId', authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { dayOfWeek } = req.query;

    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ message: 'Teacher not found' });
    }

    if (teacher.role !== 'Teacher') {
      return res.status(400).json({ message: 'User is not a teacher' });
    }

    let schedule;
    if (dayOfWeek) {
      schedule = await Timetable.getTeacherSchedule(teacherId, dayOfWeek);
    } else {
      // Get full week schedule
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekSchedule = {};
      
      for (const day of days) {
        weekSchedule[day] = await Timetable.getTeacherSchedule(teacherId, day);
      }
      
      schedule = weekSchedule;
    }

    res.json({
      success: true,
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        userName: teacher.userName,
        email: teacher.email
      },
      schedule
    });

  } catch (error) {
    console.error('Error fetching teacher schedule:', error);
    res.status(500).json({ message: 'Error fetching teacher schedule', error: error.message });
  }
});

// Get timetable for a floor
router.get('/floor/:floorNumber', authenticate, async (req, res) => {
  try {
    const { floorNumber } = req.params;
    const { dayOfWeek } = req.query;
    
    const floor = parseInt(floorNumber);
    if (floor < 1 || floor > 4) {
      return res.status(400).json({ message: 'Invalid floor number. Must be 1-4.' });
    }

    const floorInfo = {
      1: { name: '11th Boys Floor', campus: 'Boys', grade: '11th' },
      2: { name: '12th Boys Floor', campus: 'Boys', grade: '12th' },
      3: { name: '11th Girls Floor', campus: 'Girls', grade: '11th' },
      4: { name: '12th Girls Floor', campus: 'Girls', grade: '12th' }
    };

    let timetable;
    if (dayOfWeek) {
      timetable = await Timetable.getFloorTimetable(floor, dayOfWeek);
    } else {
      // Get full week timetable
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const weekTimetable = {};
      
      for (const day of days) {
        weekTimetable[day] = await Timetable.getFloorTimetable(floor, day);
      }
      
      timetable = weekTimetable;
    }

    res.json({
      success: true,
      floor: {
        number: floor,
        ...floorInfo[floor]
      },
      timetable
    });

  } catch (error) {
    console.error('Error fetching floor timetable:', error);
    res.status(500).json({ message: 'Error fetching floor timetable', error: error.message });
  }
});

// Create new timetable entry
router.post('/', authenticate, async (req, res) => {
  try {
    const {
      title,
      classId,
      dayOfWeek,
      startTime,
      endTime,
      teacherId,
      subject,
      lectureType,
      academicYear
    } = req.body;

    // Validate required fields
    if (!classId || !dayOfWeek || !startTime || !endTime || !teacherId || !subject) {
      return res.status(400).json({
        message: 'Class, day, time slot, teacher, and subject are required'
      });
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

    // Create new timetable entry
    const timetableData = {
      title: title || `${subject} - ${classDoc.name}`,
      classId,
      dayOfWeek,
      startTime,
      endTime,
      teacherId,
      subject,
      lectureType: lectureType || 'Theory',
      academicYear: academicYear || undefined,
      createdBy: req.user._id
    };

    const newTimetable = new Timetable(timetableData);

    // Check for time conflicts
    const conflicts = await newTimetable.hasTimeConflict();
    if (conflicts.length > 0) {
      const conflictDetails = conflicts.map(c => ({
        type: c.teacherId && c.teacherId.toString() === teacherId ? 'teacher' : 'class',
        teacher: c.teacherId?.fullName?.firstName && c.teacherId?.fullName?.lastName 
          ? `${c.teacherId.fullName.firstName} ${c.teacherId.fullName.lastName}` 
          : 'Unknown Teacher',
        class: c.classId?.name || 'Unknown Class',
        time: `${c.startTime} - ${c.endTime}`
      }));

      return res.status(400).json({
        message: 'Time conflict detected',
        conflicts: conflictDetails
      });
    }

    await newTimetable.save();
    
    // Automatically add teacher to class teachers array if not already present
    const existingTeacher = classDoc.teachers.find(t => 
      t.teacherId.toString() === teacherId && 
      (!t.subject || t.subject.toLowerCase() === subject.toLowerCase())
    );
    
    if (!existingTeacher) {
      classDoc.teachers.push({
        teacherId: teacherId,
        subject: subject,
        isActive: true
      });
      await classDoc.save();
      console.log(`Added teacher ${teacher.fullName?.firstName} ${teacher.fullName?.lastName} to class ${classDoc.name} for subject ${subject}`);
    }
    
    await newTimetable.populate('teacherId classId createdBy');

    res.status(201).json({
      success: true,
      message: 'Timetable entry created successfully',
      timetable: newTimetable
    });

  } catch (error) {
    console.error('Error creating timetable:', error);
    res.status(500).json({ message: 'Error creating timetable', error: error.message });
  }
});

// Update timetable entry
router.put('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };
    
    // Add lastUpdatedBy
    updateData.lastUpdatedBy = req.user._id;

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable entry not found' });
    }

    // Update the document
    Object.assign(timetable, updateData);

    // Check for conflicts if time or participants changed
    if (updateData.startTime || updateData.endTime || updateData.teacherId || updateData.classId) {
      const conflicts = await timetable.hasTimeConflict();
      if (conflicts.length > 0) {
        const conflictDetails = conflicts.map(c => ({
          type: c.teacherId && c.teacherId.toString() === timetable.teacherId.toString() ? 'teacher' : 'class',
          teacher: c.teacherId?.fullName?.firstName && c.teacherId?.fullName?.lastName 
            ? `${c.teacherId.fullName.firstName} ${c.teacherId.fullName.lastName}` 
            : 'Unknown Teacher',
          class: c.classId?.name || 'Unknown Class',
          time: `${c.startTime} - ${c.endTime}`
        }));

        return res.status(400).json({
          message: 'Time conflict detected',
          conflicts: conflictDetails
        });
      }
    }

    await timetable.save();
    
    // If teacher or subject changed, update class teachers array
    if (updateData.teacherId || updateData.subject || updateData.classId) {
      const classDoc = await Class.findById(timetable.classId);
      if (classDoc) {
        // Add new teacher-subject combination if not exists
        const existingTeacher = classDoc.teachers.find(t => 
          t.teacherId.toString() === timetable.teacherId.toString() && 
          (!t.subject || t.subject.toLowerCase() === timetable.subject.toLowerCase())
        );
        
        if (!existingTeacher) {
          classDoc.teachers.push({
            teacherId: timetable.teacherId,
            subject: timetable.subject,
            isActive: true
          });
          await classDoc.save();
          console.log(`Added teacher to class ${classDoc.name} for subject ${timetable.subject} (via timetable update)`);
        }
      }
    }
    
    await timetable.populate('teacherId classId createdBy lastUpdatedBy');

    res.json({
      success: true,
      message: 'Timetable updated successfully',
      timetable
    });

  } catch (error) {
    console.error('Error updating timetable:', error);
    res.status(500).json({ message: 'Error updating timetable', error: error.message });
  }
});

// Delete timetable entry
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const timetable = await Timetable.findById(id);
    if (!timetable) {
      return res.status(404).json({ message: 'Timetable entry not found' });
    }

    // Soft delete - mark as inactive
    timetable.isActive = false;
    timetable.lastUpdatedBy = req.user._id;
    await timetable.save();
    
    // Check if teacher still has other active timetable entries for this class-subject combination
    const otherTimetableEntries = await Timetable.find({
      classId: timetable.classId,
      teacherId: timetable.teacherId,
      subject: timetable.subject,
      isActive: true,
      _id: { $ne: id } // Exclude the current entry
    });
    
    // If no other active entries, consider removing teacher from class teachers array
    if (otherTimetableEntries.length === 0) {
      const classDoc = await Class.findById(timetable.classId);
      if (classDoc) {
        // Mark teacher as inactive for this subject instead of removing completely
        const teacherIndex = classDoc.teachers.findIndex(t => 
          t.teacherId.toString() === timetable.teacherId.toString() && 
          (!t.subject || t.subject.toLowerCase() === timetable.subject.toLowerCase())
        );
        
        if (teacherIndex !== -1) {
          classDoc.teachers[teacherIndex].isActive = false;
          await classDoc.save();
          console.log(`Marked teacher as inactive in class ${classDoc.name} for subject ${timetable.subject} (no active timetable entries)`);
        }
      }
    }

    res.json({
      success: true,
      message: 'Timetable entry deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting timetable:', error);
    res.status(500).json({ message: 'Error deleting timetable', error: error.message });
  }
});

// Bulk delete timetable entries for a class
router.delete('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;

    // Validate class exists
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({ message: 'Class not found' });
    }

    // Find all timetable entries for this class
    const timetableEntries = await Timetable.find({ classId, isActive: true });
    
    if (timetableEntries.length === 0) {
      return res.status(404).json({ message: 'No active timetable entries found for this class' });
    }

    // Soft delete all entries for this class
    const result = await Timetable.updateMany(
      { classId, isActive: true },
      { 
        isActive: false, 
        lastUpdatedBy: req.user._id 
      }
    );

    console.log(`Soft deleted ${result.modifiedCount} timetable entries for class ${classDoc.name}`);

    res.json({
      success: true,
      message: `Successfully deleted ${result.modifiedCount} timetable entries for class ${classDoc.name}`,
      deletedCount: result.modifiedCount,
      className: classDoc.name
    });

  } catch (error) {
    console.error('Error bulk deleting class timetable:', error);
    res.status(500).json({ message: 'Error deleting class timetable', error: error.message });
  }
});

// Bulk create timetable (for importing)
router.post('/bulk', authenticate, async (req, res) => {
  try {
    const { timetableEntries } = req.body;

    if (!Array.isArray(timetableEntries) || timetableEntries.length === 0) {
      return res.status(400).json({ message: 'Timetable entries array is required' });
    }

    const results = {
      success: [],
      errors: [],
      conflicts: []
    };

    for (let i = 0; i < timetableEntries.length; i++) {
      try {
        const entry = { ...timetableEntries[i], createdBy: req.user._id };
        const timetable = new Timetable(entry);

        // Check for conflicts
        const conflicts = await timetable.hasTimeConflict();
        if (conflicts.length > 0) {
          results.conflicts.push({
            index: i,
            entry,
            conflicts: conflicts.map(c => ({
              teacher: c.teacherId?.fullName?.firstName && c.teacherId?.fullName?.lastName 
                ? `${c.teacherId.fullName.firstName} ${c.teacherId.fullName.lastName}` 
                : 'Unknown Teacher',
              class: c.classId?.name || 'Unknown Class',
              time: `${c.startTime} - ${c.endTime}`
            }))
          });
          continue;
        }

        await timetable.save();
        
        // Add teacher to class teachers array
        const classDoc = await Class.findById(timetable.classId);
        if (classDoc) {
          const existingTeacher = classDoc.teachers.find(t => 
            t.teacherId.toString() === timetable.teacherId.toString() && 
            (!t.subject || t.subject.toLowerCase() === timetable.subject.toLowerCase())
          );
          
          if (!existingTeacher) {
            classDoc.teachers.push({
              teacherId: timetable.teacherId,
              subject: timetable.subject,
              isActive: true
            });
            await classDoc.save();
          }
        }
        
        await timetable.populate('teacherId classId');
        results.success.push(timetable);

      } catch (error) {
        results.errors.push({
          index: i,
          entry: timetableEntries[i],
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Processed ${timetableEntries.length} entries`,
      results: {
        successful: results.success.length,
        errors: results.errors.length,
        conflicts: results.conflicts.length
      },
      details: results
    });

  } catch (error) {
    console.error('Error bulk creating timetable:', error);
    res.status(500).json({ message: 'Error bulk creating timetable', error: error.message });
  }
});

// Get timetable for specific floors and date
router.get('/floors/:floors/date/:date', authenticate, async (req, res) => {
  try {
    const { floors, date } = req.params;
    const floorNumbers = floors.split(',').map(f => parseInt(f));
    
    // Get classes for these floors
    const classes = await Class.find({
      floor: { $in: floorNumbers },
      isActive: true
    });
    
    const classIds = classes.map(cls => cls._id);
    
    // Get timetable entries for the date and classes
    // Parse date correctly to avoid timezone issues
    const [year, month, day] = date.split('-').map(Number);
    const startDate = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endDate = new Date(year, month - 1, day, 23, 59, 59, 999);
    
    const timetable = await Timetable.find({
      classId: { $in: classIds },
      weekDate: {
        $gte: startDate,
        $lte: endDate
      },
      isActive: true
    })
    .populate('teacherId', 'fullName userName email')
    .populate('classId', 'name grade campus program floor')
    .sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      success: true,
      data: timetable
    });

  } catch (error) {
    console.error('Error fetching floors timetable:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching floors timetable', 
      error: error.message 
    });
  }
});

// Get timetable for specific floors and week
router.get('/floors/:floors/week/:weekDate', authenticate, async (req, res) => {
  try {
    const { floors, weekDate } = req.params;
    const floorNumbers = floors.split(',').map(f => parseInt(f));
    
    // Get classes for these floors
    const classes = await Class.find({
      floor: { $in: floorNumbers },
      isActive: true
    });
    
    const classIds = classes.map(cls => cls._id);
    
    // Calculate week range
    const startDate = new Date(weekDate);
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    // Get timetable entries for the week and classes
    const timetable = await Timetable.find({
      classId: { $in: classIds },
      weekDate: {
        $gte: startDate,
        $lte: endDate
      },
      isActive: true
    })
    .populate('teacherId', 'fullName userName email')
    .populate('classId', 'name grade campus program floor')
    .sort({ dayOfWeek: 1, startTime: 1 });

    res.json({
      success: true,
      data: timetable
    });

  } catch (error) {
    console.error('Error fetching floors week timetable:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching floors week timetable', 
      error: error.message 
    });
  }
});

// Get teacher's lectures for a specific date
router.get('/teacher/:teacherId/date/:date', authenticate, async (req, res) => {
  try {
    const { teacherId, date } = req.params;

    // Validate teacher exists
    const teacher = await User.findById(teacherId);
    if (!teacher) {
      return res.status(404).json({ 
        success: false,
        message: 'Teacher not found' 
      });
    }

    if (teacher.role !== 'Teacher') {
      return res.status(400).json({ 
        success: false,
        message: 'User is not a teacher' 
      });
    }

    // Get day of week from date
    const queryDate = new Date(date);
    const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][queryDate.getDay()];

    // Get teacher's timetable for that day
    const lectures = await Timetable.find({
      teacherId,
      dayOfWeek,
      isActive: true
    })
    .populate('classId', 'name grade campus program floor')
    .sort({ startTime: 1 });

    res.json({
      success: true,
      data: lectures,
      teacher: {
        id: teacher._id,
        fullName: teacher.fullName,
        userName: teacher.userName,
        email: teacher.email
      },
      date,
      dayOfWeek
    });

  } catch (error) {
    console.error('Error fetching teacher lectures by date:', error);
    res.status(500).json({ 
      success: false,
      message: 'Error fetching teacher lectures', 
      error: error.message 
    });
  }
});

// Utility endpoint to sync class teachers array with timetable data
router.post('/sync-class-teachers', authenticate, async (req, res) => {
  try {
    // Only allow IT/Admin to run this sync
    if (!['IT', 'InstituteAdmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied. Only IT/Admin can sync class teachers.' });
    }
    
    let updated = 0;
    let errors = [];
    
    // Get all active timetable entries
    const timetableEntries = await Timetable.find({ isActive: true })
      .populate('classId teacherId');
    
    // Group by class
    const classTimetables = {};
    timetableEntries.forEach(entry => {
      const classId = entry.classId._id.toString();
      if (!classTimetables[classId]) {
        classTimetables[classId] = {
          classDoc: entry.classId,
          teachers: new Map()
        };
      }
      
      const teacherSubjectKey = `${entry.teacherId._id}_${entry.subject}`;
      classTimetables[classId].teachers.set(teacherSubjectKey, {
        teacherId: entry.teacherId._id,
        subject: entry.subject,
        isActive: true
      });
    });
    
    // Update each class
    for (const classId in classTimetables) {
      try {
        const { classDoc, teachers } = classTimetables[classId];
        
        // Reset teachers array and rebuild from timetable
        classDoc.teachers = Array.from(teachers.values());
        await classDoc.save();
        updated++;
        
      } catch (error) {
        errors.push({
          classId,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Synced class teachers from timetable data`,
      updated,
      errors: errors.length,
      details: errors
    });
    
  } catch (error) {
    console.error('Error syncing class teachers:', error);
    res.status(500).json({ message: 'Error syncing class teachers', error: error.message });
  }
});

module.exports = router;
