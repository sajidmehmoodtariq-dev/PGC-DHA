const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Class = require('../models/Class');
const { authenticate } = require('../middleware/auth');
const crypto = require('crypto');

// Middleware: Only allow IT users
function requireIT(req, res, next) {
  if (req.user && req.user.role === 'IT') return next();
  return res.status(403).json({ success: false, message: 'Only IT users can perform this action.' });
}

// Get students/enquiries with optional pagination and filters (authenticated users)
router.get('/', authenticate, async (req, res) => {
  try {
    const {
      dateFilter,
      startDate,
      endDate,
      nonProgression,
      progressionLevel,
      includeAssigned,
      assignmentFilter,
      populateClass,
      // New optional server-side filters & pagination
      search,
      gender,
      exactLevel,
      minLevel,
      page,
      limit,
      sortBy,
      sortOrder,
      classId
    } = req.query;
    
    // Build query for students
    let query = { 
      role: 'Student',
      status: { $ne: 3 } // Exclude deleted users
    };
    
    // Handle specific class filtering
    if (classId) {
      query.classId = classId;
    }
    
    // Handle class assignment filtering
    if (assignmentFilter === 'assigned') {
      // Show only students WITH class assignments
      query.classId = { $exists: true };
    } else if (assignmentFilter === 'unassigned') {
      // Show only students WITHOUT class assignments
      query.classId = { $exists: false };
    }
    // If assignmentFilter is not specified or is 'all', show all students regardless of assignment
    
    // Legacy support: if includeAssigned=true but no assignmentFilter, show all students
    // This allows the Student Assignment component to get all Level 5 students
    
    // Apply date filter
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        // Handle custom date range
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999); // Include the entire end date
        
        query.createdOn = { 
          $gte: customStartDate,
          $lte: customEndDate
        };
      } else {
        // Handle predefined date filters
        const now = new Date();
        let filterStartDate, filterEndDate;

        switch (dateFilter) {
          case 'today':
            // Use same calculation as comprehensive-data for consistency  
            filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            filterEndDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            break;
          case 'week':
            filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            filterEndDate = new Date();
            break;
          case 'month':
            filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            filterEndDate = new Date();
            break;
          case 'year':
            filterStartDate = new Date(now.getFullYear(), 0, 1);
            filterEndDate = new Date();
            break;
          default:
            filterStartDate = null;
            filterEndDate = null;
        }

        if (filterStartDate) {
          if (dateFilter === 'today') {
            // For today, use exact range like comprehensive-data
            query.createdOn = { 
              $gte: filterStartDate,
              $lt: filterEndDate 
            };
          } else {
            // For other ranges, use >= start date
            query.createdOn = { $gte: filterStartDate };
          }
        }
      }
    }
    
    // Handle non-progression filter
    if (nonProgression === 'true' && progressionLevel) {
      const level = parseInt(progressionLevel);
      
      // For non-progression filtering, we need to find students who:
      // 1. Are currently at (level - 1) 
      // 2. And should have progressed to level but didn't
      
      if (level > 1 && level <= 5) {
        // Students who didn't progress from (level-1) to level
        query.prospectusStage = level - 1;
        
        // Additional logic could be added here to check time-based progression
        // For now, we assume students at level-1 who have been there for a certain time
        // didn't progress to the target level
      }
    }
    
    // Apply level filters when not in non-progression mode
    if (nonProgression !== 'true') {
      if (exactLevel) {
        const lvl = parseInt(exactLevel);
        if (!isNaN(lvl)) {
          query.prospectusStage = lvl;
        }
      } else if (minLevel) {
        const lvl = parseInt(minLevel);
        if (!isNaN(lvl)) {
          // Cumulative filter: level >= minLevel
          query.prospectusStage = { ...(query.prospectusStage || {}), $gte: lvl };
        }
      }
    }
    
    // Gender filter
    if (gender) {
      query.gender = gender;
    }
    
    // Text search across name/email/session/cnic
    if (search && search.trim()) {
      const term = search.trim();
      const regex = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      // Combine with any existing $or by creating a new $and array
      const nameEmailOr = [
        { 'fullName.firstName': regex },
        { 'fullName.lastName': regex },
        { email: regex },
        { session: regex },
        { course: regex },
        { cnic: regex }
      ];
      if (query.$or) {
        query.$and = query.$and || [];
        query.$and.push({ $or: query.$or });
        delete query.$or;
      }
      query.$or = nameEmailOr;
    }
    
    // Sorting
    const sortField = sortBy || 'createdOn';
    const sortDir = (sortOrder || 'desc').toLowerCase() === 'asc' ? 1 : -1;
    const sortSpec = { [sortField]: sortDir };

    // Base query builder
    let studentsQuery = User.find(query).select('-password').sort(sortSpec);
    
    // Populate class information if requested
    if (populateClass === 'true') {
      studentsQuery = studentsQuery.populate('classId', 'name grade program campus');
    }

    // Pagination (optional, only if page/limit provided)
    let students;
    if (page !== undefined || limit !== undefined) {
      const pageNum = Math.max(parseInt(page || '1', 10), 1);
      const pageSize = Math.min(Math.max(parseInt(limit || '25', 10), 1), 200);

      const totalDocs = await User.countDocuments(query);
      const totalPages = Math.max(Math.ceil(totalDocs / pageSize), 1);
      const skip = (pageNum - 1) * pageSize;

      students = await studentsQuery.skip(skip).limit(pageSize);

      // Log potential duplicates for debugging (same as below)
      const nameGroups = {};
      students.forEach(student => {
        const fullName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim();
        if (!nameGroups[fullName]) {
          nameGroups[fullName] = [];
        }
        nameGroups[fullName].push({
          id: student._id,
          level: student.prospectusStage || 1,
          email: student.email
        });
      });
      const duplicates = Object.entries(nameGroups).filter(([name, records]) => records.length > 1);
      if (duplicates.length > 0) {
        console.log('Potential duplicate students found (paged):');
        duplicates.forEach(([name, records]) => {
          console.log(`  ${name}:`, records);
        });
      }

      return res.json({
        success: true,
        data: students,
        pagination: {
          page: pageNum,
          limit: pageSize,
          totalDocs,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1
        }
      });
    }

    // Non-paginated (legacy behavior)
    students = await studentsQuery;
    
    // Log potential duplicates for debugging
    const nameGroups = {};
    students.forEach(student => {
      const fullName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim();
      if (!nameGroups[fullName]) {
        nameGroups[fullName] = [];
      }
      nameGroups[fullName].push({
        id: student._id,
        level: student.prospectusStage || 1,
        email: student.email
      });
    });
    
    // Check for potential duplicates
    const duplicates = Object.entries(nameGroups).filter(([name, records]) => records.length > 1);
    if (duplicates.length > 0) {
      console.log('Potential duplicate students found:');
      duplicates.forEach(([name, records]) => {
        console.log(`  ${name}:`, records);
      });
    }
    
  res.json({ success: true, data: students });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Register a new student (IT only, auto-generate username/password)
router.post('/register', authenticate, requireIT, async (req, res) => {
  try {
    const { fullName, email, phoneNumber, gender, dob, cnic, ...rest } = req.body;
    // Generate username: firstName + random 4 digits
    const base = (fullName?.firstName || 'student').toLowerCase().replace(/\s+/g, '');
    const username = base + Math.floor(1000 + Math.random() * 9000);
    // Generate random password
    const password = crypto.randomBytes(6).toString('base64');
    // Create student
    const student = await User.create({
      userName: username,
      password,
      email: email || username + '@pgc.edu.pk', // fallback if no email
      fullName: {
        firstName: fullName?.firstName || '',
        lastName: fullName?.lastName || ''
      },
      phoneNumber,
      gender,
      dob,
      cnic,
      role: 'Student',
      prospectusStage: 1,
      status: 1, // Active by default (1=Active, 2=Paused, 3=Deleted)
      isActive: false,
      isApproved: false,
      isPassedOut: false,
      ...rest
    });
    // Return student info (no password)
    const studentObj = student.toObject();
    delete studentObj.password;
    console.log('Student registered successfully:', studentObj.userName, studentObj.cnic);
    res.status(201).json({ success: true, message: 'Student registered successfully', student: studentObj });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
});

// Update student progression (IT only)
router.patch('/:id/progress', authenticate, requireIT, async (req, res) => {
  try {
    const { prospectusStage, status, isPassedOut, decrementReason } = req.body;
    const update = {};
    if (prospectusStage !== undefined) update.prospectusStage = prospectusStage;
    if (status !== undefined) update.status = status;
    if (isPassedOut !== undefined) update.isPassedOut = isPassedOut;
    
    // Find the student first to set updatedBy info for level tracking
    const student = await User.findById(req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });
    
    // Set the updatedBy information for level history tracking
    if (prospectusStage !== undefined) {
      student._updatedBy = req.user._id;
      student._updatedByName = `${req.user.fullName?.firstName || ''} ${req.user.fullName?.lastName || ''}`.trim() || req.user.userName;
      
      // If level is being decreased, set the reason
      if (prospectusStage < student.prospectusStage && decrementReason) {
        student._decrementReason = decrementReason;
      }
    }
    
    // Apply updates
    Object.assign(student, update);
    await student.save();
    
    // Remove sensitive fields
    const studentResponse = student.toObject();
    delete studentResponse.password;
    
    res.json({ success: true, student: studentResponse });
  } catch (err) {
    console.error('Error updating student progress:', err);
    res.status(400).json({ success: false, message: err.message });
  }
});

// Get students with their remarks (authenticated users)
router.get('/remarks', authenticate, async (req, res) => {
  try {
    const students = await User.find({ 
      role: 'Student',
      receptionistRemarks: { $exists: true }
    }).select('-password');
    
    res.json(students);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update enquiry level with compulsory notes (authenticated users)
router.put('/:id/level', authenticate, async (req, res) => {
  try {
    const { level, notes } = req.body;
    
    // Validate required fields
    if (level === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Level is required'
      });
    }
    
    if (!notes || !notes.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Notes are required when changing enquiry level'
      });
    }

    // Find the student/enquiry first
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student/Enquiry not found'
      });
    }

    // Store the current level before updating
    const currentLevel = student.prospectusStage || student.enquiryLevel || 1;
    console.log(`Updating level for student ID: ${req.params.id} from level ${currentLevel} to level ${level}`);
    console.log(`Found student: ${student.fullName?.firstName} ${student.fullName?.lastName}, current level: ${currentLevel}, new level: ${level}`);
    
    // If student doesn't have level fields set, initialize them
    if ((student.prospectusStage === undefined || student.prospectusStage === null) && 
        (student.enquiryLevel === undefined || student.enquiryLevel === null)) {
      student.prospectusStage = 1;
      student.enquiryLevel = 1;
      console.log(`Initialized both level fields to 1 for student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);
    }
    
    // If trying to set the same level, return success instead of error
    if (level === currentLevel) {
      return res.json({
        success: true,
        message: `Student is already at level ${level}`,
        data: {
          level: currentLevel,
          unchanged: true
        }
      });
    }
    
    // Update both level fields for consistency
    student.prospectusStage = level;
    student.enquiryLevel = level;
    student.updatedOn = new Date();

    // Handle backward movement from level 5 (admitted)
    if (currentLevel === 5 && level < 5) {
      // Remove admission status when moving back from level 5
      student.isApproved = false;
      student.isProcessed = false;
      // Clear admission info since they're no longer admitted
      if (student.admissionInfo) {
        student.admissionInfo.grade = undefined;
        student.admissionInfo.className = undefined;
      }
      console.log(`Student ${student.fullName?.firstName} ${student.fullName?.lastName} moved back from admission level - removing admission status`);
    }

    // Update progression date fields based on level
    const currentDate = new Date();
    switch (level) {
      case 2: // Prospectus Purchased
        if (!student.prospectusPurchasedOn) {
          student.prospectusPurchasedOn = currentDate;
        }
        break;
      case 3: // Prospectus Returned (Application Submitted)
        if (!student.prospectusReturnedOn) {
          student.prospectusReturnedOn = currentDate;
        }
        break;
      case 4: // Admission Fee Submitted
        if (!student.afSubmittedOn) {
          student.afSubmittedOn = currentDate;
        }
        break;
      case 5: // 1st Installment Submitted (Full Admission - OFFICIAL ADMISSION)
        if (!student.installmentSubmittedOn) {
          student.installmentSubmittedOn = currentDate;
        }
        if (!student.isProcessed) {
          student.isProcessed = true;
          student.processedYear = new Date().getFullYear().toString();
        }
        // Mark as officially admitted when reaching level 5
        // This enables access to student dashboard
        if (!student.isApproved) {
          student.isApproved = true;
          console.log(`Student ${student.fullName?.firstName} ${student.fullName?.lastName} has been officially admitted (level 5)`);
        }
        
        // Ensure admissionInfo.grade is set when promoting to level 5
        if (!student.admissionInfo) {
          student.admissionInfo = {};
        }
        if (!student.admissionInfo.grade) {
          // Default to 11th grade if not specified - this can be updated later
          student.admissionInfo.grade = '11th';
          console.log(`Set default grade '11th' for admitted student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);
        }
        break;
    }

    console.log(`About to save student with level: ${student.prospectusStage}`);
    await student.save();
    
    // Create correspondence record for level change
    try {
      const Correspondence = require('../models/Correspondence');
      
      // Determine correspondence type based on new level
      const correspondenceType = level <= 4 ? 'enquiry' : 'student';
      
      const levelChangeCorrespondence = new Correspondence({
        studentId: student._id,
        type: correspondenceType,
        subject: `Level Changed from ${currentLevel} to ${level}`,
        message: `Student level updated from Level ${currentLevel} to Level ${level}. Notes: ${notes}`,
        studentLevel: level,
        staffMember: {
          id: req.user._id,
          name: `${req.user.fullName?.firstName || ''} ${req.user.fullName?.lastName || ''}`.trim() || 'Staff Member'
        },
        timestamp: new Date()
      });
      
      await levelChangeCorrespondence.save();
      console.log(`Created correspondence record for level change: ${currentLevel} -> ${level}`);
    } catch (correspondenceError) {
      console.error('Error creating correspondence record for level change:', correspondenceError);
      // Don't fail the main operation if correspondence creation fails
    }
    
    // Verify the save worked
    const savedStudent = await User.findById(req.params.id);
    console.log(`After save - student level in DB: ${savedStudent.prospectusStage}`);

    console.log(`Successfully updated student ${student.fullName?.firstName} ${student.fullName?.lastName} to level ${level}`);

    res.json({
      success: true,
      message: 'Enquiry level updated successfully',
      data: {
        student: savedStudent.toObject()
      }
    });

  } catch (error) {
    console.error('Error updating enquiry level:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating enquiry level',
      error: error.message
    });
  }
});

// Update student admission information (for level 5 students)
router.patch('/:id/admission-info', authenticate, async (req, res) => {
  try {
    const { grade, className, program } = req.body;
    
    // Find the student
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is at level 5 (admitted)
    if (student.enquiryLevel !== 5 && student.prospectusStage !== 5) {
      return res.status(400).json({
        success: false,
        message: 'Student must be at admission level (Level 5) to update admission information'
      });
    }

    // Initialize admissionInfo if it doesn't exist
    if (!student.admissionInfo) {
      student.admissionInfo = {};
    }

    // Update admission information
    if (grade) {
      if (!['11th', '12th'].includes(grade)) {
        return res.status(400).json({
          success: false,
          message: 'Grade must be either "11th" or "12th"'
        });
      }
      student.admissionInfo.grade = grade;
    }

    if (className) {
      student.admissionInfo.className = className;
    }

    if (program) {
      student.admissionInfo.program = program;
    }

    student.updatedOn = new Date();
    await student.save();

    console.log(`Updated admission info for student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);

    res.json({
      success: true,
      message: 'Student admission information updated successfully',
      data: {
        admissionInfo: student.admissionInfo
      }
    });

  } catch (error) {
    console.error('Error updating student admission info:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating admission information',
      error: error.message
    });
  }
});

// Update student academic records (for academic performance tracking)
router.patch('/:id/academic-records', authenticate, async (req, res) => {
  try {
    const { academicRecords } = req.body;
    
    console.log('Updating academic records for student ID:', req.params.id);
    console.log('Academic records data received:', JSON.stringify(academicRecords, null, 2));
    
    // Find the student
    const student = await User.findById(req.params.id);
    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    console.log(`Student found: ${student.fullName?.firstName} ${student.fullName?.lastName}, Level: ${student.enquiryLevel || student.prospectusStage}`);

    // Clean and validate academic records structure
    if (academicRecords) {
      // Clean and validate matriculation records
      if (academicRecords.matriculation) {
        const { totalMarks, obtainedMarks, percentage, passingYear, board, subjects } = academicRecords.matriculation;
        
        // Clean up empty/undefined fields
        if (passingYear === '' || passingYear === null || passingYear === undefined) {
          delete academicRecords.matriculation.passingYear;
        }
        if (board === '' || board === null || board === undefined) {
          delete academicRecords.matriculation.board;
        }
        
        if (totalMarks && obtainedMarks) {
          const calculatedPercentage = (parseFloat(obtainedMarks) / parseFloat(totalMarks)) * 100;
          academicRecords.matriculation.percentage = calculatedPercentage.toFixed(2);
        }
        
        if (passingYear && (passingYear < 1990 || passingYear > new Date().getFullYear())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid passing year'
          });
        }
        
        // Validate subjects if provided
        if (subjects && Array.isArray(subjects)) {
          for (const subject of subjects) {
            if (subject.obtainedMarks > subject.totalMarks) {
              return res.status(400).json({
                success: false,
                message: `Obtained marks cannot exceed total marks for subject: ${subject.name}`
              });
            }
          }
        }
      }
      
      // Clean and validate previous grade records
      if (academicRecords.previousGrade) {
        const { totalMarks, obtainedMarks, grade, academicYear } = academicRecords.previousGrade;
        
        // Remove empty fields to avoid validation errors
        if (grade === '' || grade === null || grade === undefined) {
          delete academicRecords.previousGrade.grade;
        }
        if (academicYear === '' || academicYear === null || academicYear === undefined) {
          delete academicRecords.previousGrade.academicYear;
        }
        
        if (totalMarks && obtainedMarks) {
          const calculatedPercentage = (parseFloat(obtainedMarks) / parseFloat(totalMarks)) * 100;
          academicRecords.previousGrade.percentage = calculatedPercentage.toFixed(2);
        }
        
        // Validate subjects array
        if (academicRecords.previousGrade.subjects && Array.isArray(academicRecords.previousGrade.subjects)) {
          // Filter out invalid subjects
          academicRecords.previousGrade.subjects = academicRecords.previousGrade.subjects.filter(subject => 
            subject.name && subject.totalMarks && subject.obtainedMarks && subject.term
          );
          
          // If no valid subjects, remove the subjects array
          if (academicRecords.previousGrade.subjects.length === 0) {
            delete academicRecords.previousGrade.subjects;
          }
        }
      }
      
      // Remove previousGrade if it's empty or has no meaningful data
      if (academicRecords.previousGrade && Object.keys(academicRecords.previousGrade).length === 0) {
        delete academicRecords.previousGrade;
      }
    }

    // Update academic records using direct property assignment to avoid spread issues
    if (!student.academicRecords) {
      student.academicRecords = {};
    }
    
    // Update matriculation if provided
    if (academicRecords.matriculation && typeof academicRecords.matriculation === 'object') {
      if (!student.academicRecords.matriculation) {
        student.academicRecords.matriculation = {};
      }
      Object.assign(student.academicRecords.matriculation, academicRecords.matriculation);
    }
    
    // Update previousGrade only if provided
    if (academicRecords.previousGrade && typeof academicRecords.previousGrade === 'object') {
      if (!student.academicRecords.previousGrade) {
        student.academicRecords.previousGrade = {};
      }
      Object.assign(student.academicRecords.previousGrade, academicRecords.previousGrade);
    }
    
    // Set the updated timestamp
    student.academicRecords.lastUpdatedOn = new Date();
    
    // Mark the field as modified for Mongoose
    student.markModified('academicRecords');
    student.updatedOn = new Date();
    
    console.log('Final academic records to save:', JSON.stringify(student.academicRecords, null, 2));
    
    await student.save();

    console.log(`Updated academic records for student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);

    res.json({
      success: true,
      message: 'Academic records updated successfully',
      data: {
        academicRecords: student.academicRecords
      }
    });

  } catch (error) {
    console.error('Error updating academic records:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Server error while updating academic records';
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      errorMessage = `Validation error: ${validationErrors.join(', ')}`;
    } else if (error.name === 'CastError') {
      errorMessage = `Invalid data format: ${error.message}`;
    }
    
    res.status(500).json({
      success: false,
      message: errorMessage,
      error: error.message
    });
  }
});

// Add endpoint to check for and clean up duplicate students
router.get('/duplicates', authenticate, async (req, res) => {
  try {
    const students = await User.find({ 
      role: 'Student',
      status: { $ne: 3 } // Exclude deleted users
    }).select('fullName email cnic prospectusStage createdOn');
    
    // Group by name and email to find duplicates
    const groups = {};
    students.forEach(student => {
      const key = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(student);
    });
    
    const duplicates = Object.entries(groups)
      .filter(([name, records]) => records.length > 1)
      .map(([name, records]) => ({
        name,
        count: records.length,
        records: records.map(r => ({
          id: r._id,
          email: r.email,
          cnic: r.cnic,
          level: r.prospectusStage || 1,
          createdOn: r.createdOn
        }))
      }));
      
    res.json({ success: true, duplicates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Migration endpoint to fix students without prospectusStage
router.post('/migrate-levels', authenticate, async (req, res) => {
  try {
    const studentsToUpdate = await User.find({ 
      role: 'Student',
      status: { $ne: 3 }, // Exclude deleted users
      $or: [
        { prospectusStage: { $exists: false } },
        { prospectusStage: null },
        { prospectusStage: undefined }
      ]
    });
    
    console.log(`Found ${studentsToUpdate.length} students without prospectusStage`);
    
    for (const student of studentsToUpdate) {
      student.prospectusStage = 1;
      await student.save();
      console.log(`Set prospectusStage to 1 for student: ${student.fullName?.firstName} ${student.fullName?.lastName}`);
    }
    
    res.json({
      success: true,
      message: `Updated ${studentsToUpdate.length} students with default prospectusStage`,
      updatedCount: studentsToUpdate.length
    });
  } catch (err) {
    console.error('Migration error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get students by class ID
router.get('/class/:classId', authenticate, async (req, res) => {
  try {
    const { classId } = req.params;
    
    const students = await User.find({
      classId: classId,
      role: 'Student',
      status: { $ne: 3 }, // Exclude deleted users
      $or: [
        { prospectusStage: 5 },
        { enquiryLevel: 5 }
      ]
    })
    .select('-password')
    .sort({ rollNumber: 1, 'fullName.firstName': 1 });

    res.json(students);
  } catch (error) {
    console.error('Error fetching class students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching class students',
      error: error.message
    });
  }
});

// Assign student to class
router.post('/:studentId/assign-class', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, grade, program } = req.body;

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }

    // Find the student
    const student = await User.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Check if student is at level 5 (officially admitted)
    const studentLevel = student.prospectusStage || student.enquiryLevel || 1;
    if (studentLevel !== 5) {
      return res.status(400).json({
        success: false,
        message: `Only officially admitted students (level 5) can be assigned to classes. This student is currently at level ${studentLevel}.`
      });
    }

    // Find the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Verify student matches class criteria
    const studentCampus = student.campus || (student.gender === 'Female' ? 'Girls' : 'Boys');
    
    if (studentCampus !== classDoc.campus) {
      return res.status(400).json({
        success: false,
        message: `Student campus (${studentCampus}) does not match class campus (${classDoc.campus})`
      });
    }

    // Check grade compatibility
    const studentGrade = student.admissionInfo?.grade;
    const classGrade = classDoc.grade;
    
    // If student doesn't have a grade set but is Level 5, update it to match the class
    if (!studentGrade && studentLevel === 5) {
      console.log('Student is Level 5 but missing grade, updating to match class grade:', classGrade);
      await User.findByIdAndUpdate(studentId, {
        'admissionInfo.grade': classGrade
      });
    } else if (studentGrade && studentGrade !== classGrade) {
      console.log('Grade mismatch:', {
        studentGrade: studentGrade,
        classGrade: classGrade,
        studentAdmissionInfo: student.admissionInfo
      });
      return res.status(400).json({
        success: false,
        message: `Student grade (${studentGrade}) does not match class grade (${classGrade}). Please update the student's grade first.`
      });
    }

    // Check program compatibility
    const studentProgram = student.admissionInfo?.program || student.program;
    const classProgram = classDoc.program;
    
    // If student doesn't have a program set but is Level 5, update it to match the class
    if (!studentProgram && studentLevel === 5) {
      console.log('Student is Level 5 but missing program, updating to match class program:', classProgram);
      await User.findByIdAndUpdate(studentId, {
        'admissionInfo.program': classProgram
      });
    } else if (studentProgram && studentProgram !== classProgram) {
      console.log('Program mismatch:', {
        studentProgram: studentProgram,
        classProgram: classProgram,
        studentAdmissionInfo: student.admissionInfo
      });
      return res.status(400).json({
        success: false,
        message: `Student program (${studentProgram}) does not match class program (${classProgram}). Please update the student's program first.`
      });
    }

    // Check if class is full
    const currentStudentCount = await User.countDocuments({
      classId: classId,
      role: 'Student',
      level: 5
    });

    if (currentStudentCount >= classDoc.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Class is full'
      });
    }

    // Generate roll number
    const rollNumber = await generateRollNumber(classId, classDoc);

    // Update student's grade if provided in the request
    if (grade && grade !== student.admissionInfo?.grade) {
      console.log(`Updating student grade from ${student.admissionInfo?.grade} to ${grade}`);
      if (!student.admissionInfo) {
        student.admissionInfo = {};
      }
      student.admissionInfo.grade = grade;
    }

    // Update student's program if provided in the request
    if (program && program !== (student.admissionInfo?.program || student.program)) {
      console.log(`Updating student program from ${student.admissionInfo?.program || student.program} to ${program}`);
      if (!student.admissionInfo) {
        student.admissionInfo = {};
      }
      student.admissionInfo.program = program;
    }

    // Assign student to class
    student.classId = classId;
    student.rollNumber = rollNumber;
    await student.save();

    // Update class student count
    await classDoc.updateStudentCount();

    res.json({
      success: true,
      message: 'Student assigned to class successfully',
      rollNumber: rollNumber
    });

  } catch (error) {
    console.error('Error assigning student to class:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning student to class',
      error: error.message
    });
  }
});

// Unassign student from class
router.post('/:studentId/unassign-class', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;

    const student = await User.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Store the class ID before removing it
    const oldClassId = student.classId;

    // Unassign student
    student.classId = null;
    student.rollNumber = null;
    await student.save();

    // Update class student count if student was previously assigned
    if (oldClassId) {
      const classDoc = await Class.findById(oldClassId);
      if (classDoc) {
        await classDoc.updateStudentCount();
      }
    }

    res.json({
      success: true,
      message: 'Student unassigned from class successfully'
    });

  } catch (error) {
    console.error('Error unassigning student from class:', error);
    res.status(500).json({
      success: false,
      message: 'Error unassigning student from class',
      error: error.message
    });
  }
});

// Bulk assign students to class
router.post('/bulk-assign', authenticate, async (req, res) => {
  try {
    const { studentIds, classId } = req.body;

    if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }

    // Find the class
    const classDoc = await Class.findById(classId);
    if (!classDoc) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    // Find all students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'Student',
      $or: [
        { prospectusStage: 5 },
        { enquiryLevel: 5 }
      ]
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some students not found or not officially admitted'
      });
    }

    // Check class capacity
    const currentStudentCount = await User.countDocuments({
      classId: classId,
      role: 'Student',
      level: 5
    });

    if (currentStudentCount + students.length > classDoc.maxStudents) {
      return res.status(400).json({
        success: false,
        message: `Class capacity exceeded. Available slots: ${classDoc.maxStudents - currentStudentCount}`
      });
    }

    // Validate all students match class criteria
    const errors = [];
    console.log('Class criteria:', { 
      campus: classDoc.campus, 
      grade: classDoc.grade, 
      program: classDoc.program 
    });
    
    for (const student of students) {
      console.log('Student data:', {
        name: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
        campus: student.campus,
        grade: student.admissionInfo?.grade,
        program: student.program
      });
      
      if (student.campus !== classDoc.campus) {
        errors.push(`${student.fullName?.firstName} ${student.fullName?.lastName}: Campus mismatch`);
      }
      if (student.admissionInfo?.grade !== classDoc.grade) {
        errors.push(`${student.fullName?.firstName} ${student.fullName?.lastName}: Grade mismatch`);
      }
      if (student.program !== classDoc.program) {
        errors.push(`${student.fullName?.firstName} ${student.fullName?.lastName}: Program mismatch`);
      }
    }

    if (errors.length > 0) {
      console.log('Student validation errors:', errors);
      return res.status(400).json({
        success: false,
        message: 'Some students do not match the class criteria',
        errors: errors,
        classRequirements: {
          campus: classDoc.campus,
          grade: classDoc.grade,
          program: classDoc.program
        },
        details: 'Students must have matching campus, grade, and program to be assigned to this class.'
      });
    }

    // Assign all students
    const assignments = [];
    for (const student of students) {
      const rollNumber = await generateRollNumber(classId, classDoc);
      student.classId = classId;
      student.rollNumber = rollNumber;
      await student.save();
      
      assignments.push({
        studentId: student._id,
        rollNumber: rollNumber
      });
    }

    // Update class student count
    await classDoc.updateStudentCount();

    res.json({
      success: true,
      message: `${students.length} students assigned to class successfully`,
      assignments: assignments
    });

  } catch (error) {
    console.error('Error in bulk assignment:', error);
    res.status(500).json({
      success: false,
      message: 'Error in bulk assignment',
      error: error.message
    });
  }
});

// Helper function to generate roll number
async function generateRollNumber(classId, classDoc) {
  // Get the highest roll number in the class
  const lastStudent = await User.findOne({
    classId: classId,
    role: 'Student',
    rollNumber: { $exists: true, $ne: null }
  }).sort({ rollNumber: -1 });

  let nextRollNumber;
  if (lastStudent && lastStudent.rollNumber) {
    // Extract numeric part and increment
    const match = lastStudent.rollNumber.match(/(\d+)$/);
    const lastNumber = match ? parseInt(match[1]) : 0;
    nextRollNumber = `${classDoc.name.replace(/\s+/g, '')}-${String(lastNumber + 1).padStart(3, '0')}`;
  } else {
    // First student in class
    nextRollNumber = `${classDoc.name.replace(/\s+/g, '')}-001`;
  }

  return nextRollNumber;
}

// Debug endpoint to check student assignments
router.get('/debug/assignments', authenticate, async (req, res) => {
  try {
    const students = await User.find({ 
      role: 'Student', 
      classId: { $exists: true, $ne: null } 
    }).select('_id fullName classId enquiryLevel prospectusStage isActive isApproved');
    
    const classAssignments = {};
    for (const student of students) {
      if (!classAssignments[student.classId]) {
        classAssignments[student.classId] = [];
      }
      classAssignments[student.classId].push({
        id: student._id,
        name: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
        enquiryLevel: student.enquiryLevel,
        prospectusStage: student.prospectusStage,
        isActive: student.isActive,
        isApproved: student.isApproved
      });
    }
    
    res.json({
      success: true,
      totalAssignedStudents: students.length,
      classAssignments
    });
  } catch (error) {
    console.error('Error fetching debug assignments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching debug assignments', 
      error: error.message 
    });
  }
});

module.exports = router;