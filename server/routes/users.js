const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const { normalizeRole, getRoleDisplayName, getValidRoles } = require('../services/roleNormalizer');
const migrationService = require('../services/migrationService');
const { authenticate } = require('../middleware/auth');
const { asyncHandler, sendSuccessResponse } = require('../middleware/errorHandler');

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

/**
 * @route   GET /api/users
 * @desc    Get all users with pagination and filtering
 * @access  Private
 */
router.get('/', 
  asyncHandler(async (req, res) => {
    const {
      page = 1,
      limit = 10,
      search = '',
      role = '',
      excludeRole = '', // Add excludeRole parameter
      status = '',
      enquiryLevel = '',
      grade = '',
      campus = '',
      gender = '', // Add gender filter
      minLevel = '', // Add minimum level filter
      excludeClassAssigned = '', // Add excludeClassAssigned parameter
      hasClassAssigned = '', // Add hasClassAssigned parameter for students WITH classes
      sortBy = 'createdAt',
      sortOrder = 'desc',
      dateFilter = '',
      startDate = '',
      endDate = '',
      nonProgression = '',
      progressionLevel = ''
    } = req.query;

    // Build filter object
    const filter = {};
    
    // ALWAYS exclude deleted users unless explicitly requested by admin
    // This ensures deleted users never show up in regular enquiry management
    filter.status = { $ne: 3 };

    // Apply date filter
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        // Handle custom date range
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999); // Include the entire end date
        
        filter.createdOn = { 
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
            filter.createdOn = { 
              $gte: filterStartDate,
              $lt: filterEndDate 
            };
          } else {
            // For other ranges, use >= start date
            filter.createdOn = { $gte: filterStartDate };
          }
        }
      }
    }

    // Handle non-progression filter
    if (nonProgression === 'true' && progressionLevel) {
      const level = parseInt(progressionLevel);
      
      // For non-progression filtering, we need to find students who:
      // Are currently at this exact level and achieved it more than 1 month ago
      if (level >= 1 && level <= 5) {
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
        
        filter.prospectusStage = level; // Students currently at this level
        
        // Use levelHistory to find when they achieved this level
        filter.levelHistory = {
          $elemMatch: {
            level: level,
            achievedOn: { $lte: oneMonthAgo }
          }
        };
      }
    }

    // Search filter
    if (search) {
      filter.$or = [
        { 'fullName.firstName': new RegExp(search, 'i') },
        { 'fullName.lastName': new RegExp(search, 'i') },
        { fatherName: new RegExp(search, 'i') },
        { 'familyInfo.fatherName': new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
        { username: new RegExp(search, 'i') }
      ];
    }

    // Role filter - normalize the role before filtering
    if (role) {
      const normalizedRole = normalizeRole(role);
      console.log(`Role filter: "${role}" normalized to "${normalizedRole}"`);
      filter.role = normalizedRole;
    }

    // Exclude role filter - for user management that wants to exclude students
    if (excludeRole) {
      const normalizedExcludeRole = normalizeRole(excludeRole);
      console.log(`Exclude role filter: "${excludeRole}" normalized to "${normalizedExcludeRole}"`);
      filter.role = { $ne: normalizedExcludeRole };
    }

    // Status filter
    if (status) {
      if (status === 'active') {
        filter.isActive = true;
      } else if (status === 'inactive') {
        filter.isActive = false;
      } else if (status === 'approved') {
        filter.isApproved = true;
      } else if (status === 'pending') {
        filter.isApproved = false;
      } else if (status === 'all') {
        // If explicitly requesting all users, remove the default status filter
        // BUT this should be restricted to admin users only
        if (req.user && ['SystemAdmin', 'ITAdmin'].includes(req.user.role)) {
          delete filter.status;
        }
        // For non-admin users, keep the default filter (exclude deleted)
      }
      // For any other status values, keep the default filter (exclude deleted)
    }

    // Enquiry Level filter (for students)
    if (enquiryLevel) {
      filter.enquiryLevel = parseInt(enquiryLevel);
    }

    // Grade filter (for admitted students)
    if (grade) {
      filter['admissionInfo.grade'] = grade;
    }

    // Campus filter (for students)
    if (campus) {
      filter.$or = [
        { 'admissionInfo.campus': campus }, // For admitted students
        { 'campus': campus } // For general campus assignment
      ];
    }

    // Gender filter
    if (gender) {
      filter.gender = gender;
    }

    // Minimum Level filter (for students)
    if (minLevel) {
      const levelNumber = parseInt(minLevel);
      filter.$or = [
        { prospectusStage: { $gte: levelNumber } }, // Use prospectusStage
        { enquiryLevel: { $gte: levelNumber } } // Fallback to enquiryLevel
      ];
    }

    // Exclude students with class assignments (for enquiry reports)
    if (excludeClassAssigned === 'true') {
      filter.classId = { $exists: false };
      // Also apply the same level constraints as Principal enquiry reports
      filter.prospectusStage = { $gte: 1, $lte: 5 };
    }

    // Include only students with class assignments (for student profiles)
    if (hasClassAssigned === 'true') {
      filter.classId = { $exists: true };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    console.log('Final filter for users query:', JSON.stringify(filter, null, 2));

    // Execute query
    const users = await User.find(filter)
      .select('-password -passwordResetToken -passwordResetExpires')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    console.log(`Found ${users.length} users matching filter`);

    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    // Get aggregated statistics for accurate counts when pagination is requested
    let statistics = null;
    if (parseInt(page) && parseInt(limit) <= 200) { // Only for reasonable page sizes
      const genderStats = await User.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$gender',
            count: { $sum: 1 }
          }
        }
      ]);

      const stageStats = await User.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$prospectusStage',
            count: { $sum: 1 }
          }
        }
      ]);

      // Process gender statistics
      const genderBreakdown = {
        male: 0,
        female: 0,
        unspecified: 0
      };

      genderStats.forEach(stat => {
        const gender = (stat._id || '').toLowerCase();
        if (gender === 'male' || gender === 'm') {
          genderBreakdown.male = stat.count;
        } else if (gender === 'female' || gender === 'f') {
          genderBreakdown.female = stat.count;
        } else {
          genderBreakdown.unspecified += stat.count;
        }
      });

      // Process stage statistics (cumulative)
      const stageBreakdown = {};
      for (let stage = 1; stage <= 5; stage++) {
        stageBreakdown[stage] = stageStats
          .filter(stat => (stat._id || 1) >= stage)
          .reduce((sum, stat) => sum + stat.count, 0);
      }

      statistics = {
        gender: genderBreakdown,
        stages: stageBreakdown
      };
    }

    sendSuccessResponse(res, {
      users,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalUsers: total,
        limit: parseInt(limit),
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      statistics
    }, 'Users retrieved successfully');
  })
);

/**
 * @route   GET /api/users/all-students
 * @desc    Get all students for the search page
 * @access  Private
 */
router.get('/all-students', 
  authenticate,
  asyncHandler(async (req, res) => {
    try {
      console.log('Fetching all students...');
      
      const studentsData = await User.find({
        role: 'Student',
        status: { $ne: 3 } // Exclude deleted users
      })
      .populate('classId', 'name grade') // Populate class information
      .select('_id fullName email username role status admissionInfo program classId createdAt dob fatherName address')
      .sort({ 'fullName.firstName': 1 })
      .lean();
      
      // Transform the data to match the expected academicInfo structure
      const students = studentsData.map(student => ({
        ...student,
        academicInfo: {
          currentClass: student.classId ? student.classId.name : (student.admissionInfo?.className || null),
          session: student.admissionInfo?.grade || null,
          rollNumber: null, // This field doesn't exist in the current schema
          program: student.program || null,
          fatherName: student.fatherName || null,
          dateOfBirth: student.dob || null,
          address: student.address || null
        }
      }));
      
      console.log(`Found ${students.length} total students`);
      
      sendSuccessResponse(res, { students }, 'Students fetched successfully');
      
    } catch (error) {
      console.error('Error fetching all students:', error);
      res.status(500).json({
        success: false,
        message: 'Error fetching students',
        error: error.message
      });
    }
  })
);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Private
 */
router.get('/:id',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.params.id)
      .select('-password -passwordResetToken -passwordResetExpires')
      .lean();
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    sendSuccessResponse(res, { user }, 'User retrieved successfully');
  })
);

/**
 * @route   POST /api/users
 * @desc    Create new user
 * @access  Private
 */
router.post('/',
  asyncHandler(async (req, res) => {
    console.log('Received body:', req.body); // Debug log
    const {
      firstName,
      lastName,
      email,
      password, // Add password field from request
      fatherName,
      cnic,
      gender,
      phoneNumber,
      secondaryPhone, // Updated from mobileNumber
      role = 'Student',
      program,
      dateOfBirth,
      address,
      reference,
      previousSchool,
      emergencyContact,
      status = 'active',
      matricMarks,      // Updated from matriculationObtainedMarks
      matricTotal,      // Updated from matriculationTotalMarks
      academicBackground, // New field for comprehensive academic data
      coordinatorGrade, // For coordinator role
      coordinatorCampus, // For coordinator role
      classId,          // For student class assignment
      admissionInfo,    // For Level 5 students (grade, className)
      enquiryLevel      // New field for enquiry levels
    } = req.body;

    // For students, if lastName is not provided, use fatherName as lastName
    let finalLastName = lastName;
    if (role === 'Student' && !lastName && fatherName) {
      finalLastName = fatherName;
    }

    // Validate required fields
    if (!firstName || !finalLastName) {
      return res.status(400).json({
        success: false,
        message: 'First name and last name (or father name for students) are required'
      });
    }

    // Preprocess optional fields - convert empty strings to undefined for sparse indexing
    const processedCnic = cnic && cnic.trim() !== '' ? cnic.trim() : undefined;
    const processedEmail = email && email.trim() !== '' ? email.trim() : undefined;

    // Additional validation for Student role
    if (role === 'Student') {
      const missingFields = [];
      if (!fatherName) missingFields.push('Father name');
      if (!gender) missingFields.push('Gender');
      if (!program) missingFields.push('Program');
      if (!phoneNumber) missingFields.push('Phone number');
      
      if (missingFields.length > 0) {
        return res.status(400).json({
          success: false,
          message: `The following fields are required for students: ${missingFields.join(', ')}`
        });
      }
    } else {
      // For non-student roles, password is required
      if (!password) {
        return res.status(400).json({
          success: false,
          message: 'Password is required for non-student users'
        });
      }
      
      // For coordinator role, grade and campus are required
      if (role === 'Coordinator') {
        if (!coordinatorGrade) {
          return res.status(400).json({
            success: false,
            message: 'Grade (11th/12th) is required for Coordinator role'
          });
        }
        if (!coordinatorCampus) {
          return res.status(400).json({
            success: false,
            message: 'Campus (Boys/Girls) is required for Coordinator role'
          });
        }
        if (!['11th', '12th'].includes(coordinatorGrade)) {
          return res.status(400).json({
            success: false,
            message: 'Grade must be either 11th or 12th'
          });
        }
        if (!['Boys', 'Girls'].includes(coordinatorCampus)) {
          return res.status(400).json({
            success: false,
            message: 'Campus must be either Boys or Girls'
          });
        }
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Generate username from first and last name
    const baseUserName = `${firstName.toLowerCase()}.${finalLastName.toLowerCase()}`.replace(/\s+/g, '');
    
    // Check if username already exists, if so, append a number
    let userName = baseUserName;
    let counter = 1;
    while (await User.findOne({ userName })) {
      userName = `${baseUserName}${counter}`;
      counter++;
    }

    // Generate default password for students (first name + last 4 digits of CNIC or phone number or "1234")
    // For non-students, use the provided password
    let userPassword;
    if (role === 'Student') {
      let suffix = '1234'; // Default suffix
      if (cnic) {
        suffix = cnic.replace(/-/g, '').slice(-4); // Last 4 digits of CNIC
      } else if (phoneNumber) {
        suffix = phoneNumber.replace(/\D/g, '').slice(-4); // Last 4 digits of phone number
      }
      userPassword = `${firstName.toLowerCase()}${suffix}`;
    } else {
      userPassword = password; // Use provided password for non-student users
    }

    // Normalize role before creating user
    const normalizedRole = normalizeRole(role);
    
    // Create new user with simplified schema
    const userData = {
      email: processedEmail,
      userName,
      password: userPassword,
      fullName: {
        firstName,
        lastName: finalLastName
      },
      fatherName,
      cnic: processedCnic,
      gender,
      dob: dateOfBirth ? new Date(dateOfBirth) : undefined,
      phoneNumber,
      secondaryPhone,
      program,
      address,
      reference,
      previousSchool,
      role: normalizedRole,
      isActive: status === 'active',
      isApproved: true,
      createdOn: new Date(),
      updatedOn: new Date(),
      matricMarks: matricMarks !== undefined && matricMarks !== '' && !isNaN(matricMarks) ? Number(matricMarks) : undefined,
      matricTotal: matricTotal !== undefined && matricTotal !== '' && !isNaN(matricTotal) ? Number(matricTotal) : undefined
    };

    // Handle academic background if provided (maps to academicRecords in the model)
    if (academicBackground && typeof academicBackground === 'object') {
      userData.academicRecords = {
        lastUpdatedOn: new Date()
      };

      // Process matriculation data
      if (academicBackground.matriculation) {
        const matric = academicBackground.matriculation;
        userData.academicRecords.matriculation = {
          percentage: matric.percentage ? Number(matric.percentage) : undefined,
          passingYear: matric.passingYear ? Number(matric.passingYear) : undefined,
          board: matric.board || undefined,
          subjects: Array.isArray(matric.subjects) ? matric.subjects.map(subject => ({
            name: subject.name,
            totalMarks: Number(subject.totalMarks) || 0,
            obtainedMarks: Number(subject.obtainedMarks) || 0,
            percentage: subject.totalMarks > 0 ? 
              ((Number(subject.obtainedMarks) / Number(subject.totalMarks)) * 100).toFixed(2) : 0
          })).filter(subject => subject.name && subject.totalMarks > 0) : []
        };
      }

      // Process intermediate data (map to previousGrade in the model)
      if (academicBackground.intermediate) {
        const inter = academicBackground.intermediate;
        userData.academicRecords.previousGrade = {
          grade: '11th', // This represents previous grade (11th) for 12th graders - academic record, not current grade
          percentage: inter.percentage ? Number(inter.percentage) : undefined,
          academicYear: inter.passingYear ? `${inter.passingYear-1}-${inter.passingYear}` : undefined,
          subjects: Array.isArray(inter.subjects) ? inter.subjects.map(subject => ({
            name: subject.name,
            totalMarks: Number(subject.totalMarks) || 0,
            obtainedMarks: Number(subject.obtainedMarks) || 0,
            percentage: subject.totalMarks > 0 ? 
              ((Number(subject.obtainedMarks) / Number(subject.totalMarks)) * 100).toFixed(2) : 0,
            term: 'Annual' // Default term
          })).filter(subject => subject.name && subject.totalMarks > 0) : []
        };
      }
    }

    // Handle emergency contact if provided
    if (emergencyContact) {
      userData.familyInfo = {
        fatherName,
        emergencyContact: typeof emergencyContact === 'string' ? 
          { name: emergencyContact, relationship: '', phone: '' } : 
          emergencyContact
      };
    }

    // Handle coordinator assignment if provided
    if (normalizedRole === 'Coordinator' && coordinatorGrade && coordinatorCampus) {
      userData.coordinatorAssignment = {
        grade: coordinatorGrade,
        campus: coordinatorCampus
      };
    }

    // Auto-assign campus based on gender for students
    if (role === 'Student' && gender) {
      userData.campus = gender === 'Male' ? 'Boys' : 'Girls';
    }

    // Handle enquiry level for students
    if (role === 'Student') {
      userData.enquiryLevel = enquiryLevel || 1; // Default to level 1
      userData.prospectusStage = enquiryLevel || 1; // Sync both fields
    }

    // Handle admission info for Level 5 students
    if (role === 'Student' && admissionInfo && typeof admissionInfo === 'object') {
      userData.admissionInfo = {
        grade: admissionInfo.grade || undefined,
        className: admissionInfo.className || undefined,
        program: admissionInfo.program || program // Use program from admissionInfo or fallback to main program
      };
      
      // If student is at Level 5 and has admission info, mark as approved
      if (enquiryLevel === 5 || (enquiryLevel >= 5)) {
        userData.isApproved = true;
        userData.isProcessed = true;
        userData.enquiryLevel = 5;
        userData.prospectusStage = 5;
      }
    }

    // Handle class assignment for students
    if (role === 'Student' && classId) {
      // Validate that the class exists
      const Class = require('../models/Class');
      const classDoc = await Class.findById(classId);
      
      if (!classDoc) {
        return res.status(400).json({
          success: false,
          message: 'Selected class does not exist'
        });
      }

      // Validate that the class matches the student's gender/campus
      if (userData.campus && classDoc.campus !== userData.campus) {
        return res.status(400).json({
          success: false,
          message: `Selected class is for ${classDoc.campus} campus but student is ${userData.campus}`
        });
      }

      // Check if class is full
      const currentStudentCount = await User.countDocuments({
        classId: classId,
        role: 'Student'
      });

      if (currentStudentCount >= classDoc.maxStudents) {
        return res.status(400).json({
          success: false,
          message: 'Selected class is full'
        });
      }

      // If class is assigned, set student to level 5 (officially admitted)
      userData.prospectusStage = 5;
      userData.enquiryLevel = 5;
      
      // Assign the class
      userData.classId = classId;
      
      // Set program and grade from class if not provided
      if (!userData.program) userData.program = classDoc.program;
      userData.admissionInfo = {
        grade: classDoc.grade,
        program: classDoc.program,
        className: classDoc.name
      };
    }

    // Set status based on isActive and isApproved
    if (userData.isApproved && userData.isActive) {
      userData.status = 1; // Active
    } else if (userData.isApproved && !userData.isActive) {
      userData.status = 2; // Paused
    } else {
      userData.status = 3; // Pending/Inactive
    }

    const user = await User.create(userData);

    // Remove sensitive data from response
    const userResponse = user.toJSON();
    delete userResponse.password;

    // If a class was assigned, add the student to the class roster and generate roll number
    if (role === 'Student' && classId && user._id) {
      try {
        const Class = require('../models/Class');
        const classDoc = await Class.findById(classId);
        
        // Generate roll number
        const rollNumber = await generateRollNumber(classId, classDoc);
        
        // Update the user with roll number
        await User.findByIdAndUpdate(user._id, { rollNumber });
        
        // Add student to class roster
        await Class.findByIdAndUpdate(
          classId,
          { $addToSet: { students: user._id } }, // Use $addToSet to avoid duplicates
          { new: true }
        );
        
        // Update class student count
        await classDoc.updateStudentCount();
        
        console.log(`Successfully assigned student ${user._id} to class ${classId} with roll number ${rollNumber}`);
        
        // Add roll number to response
        userResponse.rollNumber = rollNumber;
      } catch (classUpdateError) {
        console.error('Error updating class roster:', classUpdateError);
        // Don't fail the user creation if class roster update fails
        // The user still has the classId reference
      }
    }

    sendSuccessResponse(res, { 
      user: userResponse,
      generatedCredentials: {
        userName,
        password: userPassword
      }
    }, 'User created successfully');
  })
);
/**
 * @route   PUT /api/users/:id
 * @desc    Update user
 * @access  Private
 */
router.put('/:id',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const {
      firstName,
      lastName,
      email,
      password, // Add password field
      fatherName,
      cnic,
      gender,
      phoneNumber,
      secondaryPhone,
      role,
      program,
      dateOfBirth,
      address,
      reference,
      emergencyContact,
      status,
      matricMarks,
      matricTotal,
      academicBackground, // Add academic background support
      enquiryLevel,
      admissionInfo,
      coordinatorGrade, // For coordinator role assignment
      coordinatorCampus // For coordinator role assignment
    } = req.body;

    // Get current user to check if email is changing
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if new email already exists
    if (email && email !== currentUser.email) {
      const existingUser = await User.findOne({ email, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'User with this email already exists'
        });
      }
    }

    // Prepare update data
    const updateData = {
      updatedOn: new Date()
    };

    // Map frontend fields to backend structure
    if (firstName || lastName) {
      updateData.fullName = {
        firstName: firstName || currentUser.fullName?.firstName || '',
        lastName: lastName || currentUser.fullName?.lastName || ''
      };
    }

    if (email) updateData.email = email;
    if (fatherName) updateData.fatherName = fatherName;
    if (cnic) updateData.cnic = cnic;
    if (gender) updateData.gender = gender;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (secondaryPhone) updateData.secondaryPhone = secondaryPhone;
    if (program) updateData.program = program;
    if (dateOfBirth) updateData.dob = new Date(dateOfBirth);
    if (address) updateData.address = address;
    if (reference) updateData.reference = reference;
    if (matricMarks !== undefined && matricMarks !== '' && !isNaN(matricMarks)) updateData.matricMarks = Number(matricMarks);
    if (matricTotal !== undefined && matricTotal !== '' && !isNaN(matricTotal)) updateData.matricTotal = Number(matricTotal);

    // Handle academic background update (maps to academicRecords in the model)
    if (academicBackground && typeof academicBackground === 'object') {
      updateData.academicRecords = {
        lastUpdatedOn: new Date()
      };

      // Process matriculation data
      if (academicBackground.matriculation) {
        const matric = academicBackground.matriculation;
        updateData.academicRecords.matriculation = {
          percentage: matric.percentage ? Number(matric.percentage) : undefined,
          passingYear: matric.passingYear ? Number(matric.passingYear) : undefined,
          board: matric.board || undefined,
          subjects: Array.isArray(matric.subjects) ? matric.subjects.map(subject => ({
            name: subject.name,
            totalMarks: Number(subject.totalMarks) || 0,
            obtainedMarks: Number(subject.obtainedMarks) || 0,
            percentage: subject.totalMarks > 0 ? 
              ((Number(subject.obtainedMarks) / Number(subject.totalMarks)) * 100).toFixed(2) : 0
          })).filter(subject => subject.name && subject.totalMarks > 0) : []
        };
      }

      // Process intermediate data (map to previousGrade in the model)
      if (academicBackground.intermediate) {
        const inter = academicBackground.intermediate;
        updateData.academicRecords.previousGrade = {
          grade: '11th', // Default since intermediate is 11th/12th
          percentage: inter.percentage ? Number(inter.percentage) : undefined,
          academicYear: inter.passingYear ? `${inter.passingYear-1}-${inter.passingYear}` : undefined,
          subjects: Array.isArray(inter.subjects) ? inter.subjects.map(subject => ({
            name: subject.name,
            totalMarks: Number(subject.totalMarks) || 0,
            obtainedMarks: Number(subject.obtainedMarks) || 0,
            percentage: subject.totalMarks > 0 ? 
              ((Number(subject.obtainedMarks) / Number(subject.totalMarks)) * 100).toFixed(2) : 0,
            term: 'Annual' // Default term
          })).filter(subject => subject.name && subject.totalMarks > 0) : []
        };
      }
    }

    // Handle enquiry level and admission info
    if (enquiryLevel !== undefined) {
      const newLevel = parseInt(enquiryLevel);
      const oldLevel = currentUser.enquiryLevel || currentUser.prospectusStage;
      
      updateData.enquiryLevel = newLevel;
      updateData.prospectusStage = newLevel; // Keep both in sync
      
      // Set updatedBy information for level history tracking
      updateData._updatedBy = req.user._id;
      updateData._updatedByName = `${req.user.fullName?.firstName || ''} ${req.user.fullName?.lastName || ''}`.trim() || req.user.userName;
      
      // If level is being decreased, set the reason
      if (newLevel < oldLevel && req.body.decrementReason) {
        updateData._decrementReason = req.body.decrementReason;
      }
    }
    if (admissionInfo) {
      updateData.admissionInfo = admissionInfo;
    }

    // Handle password update if provided
    if (password && password.trim() !== '') {
      updateData.password = password; // This will be hashed by the pre-save hook
    }

    // Normalize role if provided
    if (role) {
      updateData.role = normalizeRole(role);
    }

    // Handle status changes
    if (status) {
      updateData.isActive = status === 'active';
      updateData.status = status === 'active' ? 1 : 2;
    }

    // Handle emergency contact if provided
    if (emergencyContact) {
      updateData.familyInfo = {
        fatherName: fatherName || currentUser.fatherName,
        emergencyContact: typeof emergencyContact === 'string' ? 
          { name: emergencyContact, relationship: '', phone: '' } : 
          emergencyContact
      };
    }

    // Handle coordinator assignment if provided
    const normalizedRole = role ? normalizeRole(role) : currentUser.role;
    if (normalizedRole === 'Coordinator' && coordinatorGrade && coordinatorCampus) {
      updateData.coordinatorAssignment = {
        grade: coordinatorGrade,
        campus: coordinatorCampus
      };
    }

    // Handle password update separately if provided (requires save() to trigger pre-save hook)
    if (password && password.trim() !== '') {
      // Update the user with the new password using save() to trigger hashing
      const userToUpdate = await User.findById(userId);
      if (!userToUpdate) {
        return res.status(404).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Apply all updates to the user object
      Object.assign(userToUpdate, updateData);
      userToUpdate.password = password; // This will trigger the pre-save hook for hashing
      
      const user = await userToUpdate.save();
      
      // Remove sensitive data from response
      const userResponse = user.toJSON();
      delete userResponse.password;
      delete userResponse.passwordResetToken;
      delete userResponse.passwordResetExpires;
      
      sendSuccessResponse(res, { user: userResponse }, 'User updated successfully');
    } else {
      // Update without password change
      const user = await User.findByIdAndUpdate(
        userId,
        updateData,
        { 
          new: true, 
          runValidators: true 
        }
      ).select('-password -passwordResetToken -passwordResetExpires');

      sendSuccessResponse(res, { user }, 'User updated successfully');
    }
  })
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user
 * @access  Private
 */
router.delete('/:id',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;

    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format'
      });
    }

    console.log('Delete user request:', {
      userId,
      currentUser: req.user?._id?.toString(),
      comparison: userId === req.user?._id?.toString()
    });

    // First check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      console.log('User not found for deletion:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User found for deletion:', {
      id: existingUser._id,
      email: existingUser.email,
      role: existingUser.role
    });

    // Prevent deleting own account (only if we have user context)
    if (req.user && userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Use hard delete instead of soft delete
    const user = await User.findByIdAndDelete(userId);

    if (!user) {
      console.log('User disappeared between check and update:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('User hard deleted successfully:', {
      id: user._id,
      email: user.email,
      role: user.role
    });

    sendSuccessResponse(res, { 
      deletedUser: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role
      }
    }, 'User deleted successfully');
  })
);

/**
 * @route   PATCH /api/users/:id/status
 * @desc    Update user status (active/inactive, approved/pending)
 * @access  Private
 */
router.patch('/:id/status',
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const { status } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update status based on the provided value
    if (status === 'active') {
      user.isActive = true;
    } else if (status === 'inactive') {
      user.isActive = false;
    } else if (status === 'approved') {
      user.isApproved = true;
    } else if (status === 'pending') {
      user.isApproved = false;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Use: active, inactive, approved, or pending'
      });
    }

    await user.save();

    const userResponse = user.toJSON();
    delete userResponse.password;

    sendSuccessResponse(res, { user: userResponse }, 'User status updated successfully');
  })
);

// Helper methods for the frontend
router.patch('/:id/approve', 
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { isApproved: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    sendSuccessResponse(res, { user }, 'User approved successfully');
  })
);

router.patch('/:id/suspend', 
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    sendSuccessResponse(res, { user }, 'User suspended successfully');
  })
);

router.patch('/:id/activate', 
  asyncHandler(async (req, res) => {
    const userId = req.params.id;
    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    sendSuccessResponse(res, { user }, 'User activated successfully');
  })
);

/**
 * @route   GET /api/users/roles
 * @desc    Get all valid roles with display names
 * @access  Private
 */
router.get('/roles', asyncHandler(async (req, res) => {
  const validRoles = getValidRoles();
  const rolesWithDisplayNames = validRoles.map(role => ({
    value: role,
    label: getRoleDisplayName(role)
  }));

  sendSuccessResponse(res, {
    roles: rolesWithDisplayNames,
    message: 'Roles retrieved successfully'
  });
}));

/**
 * @route   GET /api/users/migration/stats
 * @desc    Get migration statistics
 * @access  Private (Admin only)
 */
router.get('/migration/stats', asyncHandler(async (req, res) => {
  const stats = await migrationService.getMigrationStats();
  
  sendSuccessResponse(res, {
    stats,
    message: 'Migration statistics retrieved successfully'
  });
}));

/**
 * @route   POST /api/users/migration/validate
 * @desc    Validate all user roles
 * @access  Private (Admin only)
 */
router.post('/migration/validate', asyncHandler(async (req, res) => {
  const validationResults = await migrationService.validateUserRoles();
  
  sendSuccessResponse(res, {
    validation: validationResults,
    message: 'User role validation completed'
  });
}));

/**
 * @route   POST /api/users/migration/migrate
 * @desc    Migrate all users to normalized roles
 * @access  Private (Admin only)
 */
router.post('/migration/migrate', asyncHandler(async (req, res) => {
  // Create backup first
  const backup = await migrationService.createUserBackup();
  
  // Perform migration
  const migrationResults = await migrationService.migrateUserRoles();
  
  sendSuccessResponse(res, {
    backup,
    migration: migrationResults,
    message: 'User role migration completed'
  });
}));

/**
 * @route   POST /api/users/bulk-assign-class
 * @desc    Bulk assign students to a class
 * @access  Private (InstituteAdmin, Principal, Teacher, Coordinator, IT)
 */
router.post('/bulk-assign-class', asyncHandler(async (req, res) => {
  // Check if user has permission
  if (!['InstituteAdmin', 'Principal', 'Teacher', 'Coordinator', 'IT'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied. Only Institute Admin, Principal, Teachers, Coordinators, and IT can bulk assign students to classes.' 
    });
  }

  const { studentIds, classId } = req.body;

  // Validate required fields
  if (!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({
      message: 'Student IDs array is required and must not be empty'
    });
  }

  if (!classId) {
    return res.status(400).json({
      message: 'Class ID is required'
    });
  }

  // Verify all provided IDs are valid ObjectIds
  const invalidIds = studentIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
  if (invalidIds.length > 0) {
    return res.status(400).json({
      message: `Invalid student IDs: ${invalidIds.join(', ')}`
    });
  }

  if (!mongoose.Types.ObjectId.isValid(classId)) {
    return res.status(400).json({
      message: 'Invalid class ID'
    });
  }

  // Check if class exists
  const Class = require('../models/Class');
  const classDoc = await Class.findById(classId);
  if (!classDoc) {
    return res.status(404).json({
      message: 'Class not found'
    });
  }

  // Find students and verify they exist and are students
  const students = await User.find({
    _id: { $in: studentIds },
    role: 'Student',
    enquiryLevel: 5, // Only Level 5 (admitted) students can be assigned to classes
    status: { $ne: 3 } // Not deleted
  });

  if (students.length !== studentIds.length) {
    const foundIds = students.map(s => s._id.toString());
    const notFoundIds = studentIds.filter(id => !foundIds.includes(id));
    return res.status(400).json({
      message: `Some students were not found or are not Level 5 admitted students: ${notFoundIds.join(', ')}`
    });
  }

  // Check class capacity
  const currentStudentCount = await User.countDocuments({
    classId: classId,
    role: 'Student',
    status: { $ne: 3 }
  });

  if (currentStudentCount + students.length > classDoc.maxStudents) {
    return res.status(400).json({
      message: `Cannot assign ${students.length} students. Class capacity would be exceeded. Current: ${currentStudentCount}, Max: ${classDoc.maxStudents}`
    });
  }

  // Perform bulk assignment
  const bulkUpdate = await User.updateMany(
    { _id: { $in: studentIds } },
    { 
      classId: classId,
      updatedOn: new Date()
    }
  );

  // Get updated students for response
  const updatedStudents = await User.find(
    { _id: { $in: studentIds } },
    { password: 0 }
  ).populate('classId', 'name campus grade floor');

  sendSuccessResponse(res, {
    assignedCount: bulkUpdate.modifiedCount,
    students: updatedStudents,
    class: classDoc
  }, `Successfully assigned ${bulkUpdate.modifiedCount} students to ${classDoc.name}`);
}));

/**
 * @route   PUT /api/users/:id/enquiry-level
 * @desc    Update user's enquiry level
 * @access  Private (InstituteAdmin, Principal)
 */
router.put('/:id/enquiry-level', asyncHandler(async (req, res) => {
  // Check if user has permission
  if (!['InstituteAdmin', 'Principal'].includes(req.user.role)) {
    return res.status(403).json({ 
      message: 'Access denied. Only Institute Admin and Principal can update enquiry levels.' 
    });
  }

  const { id } = req.params;
  const { enquiryLevel, admissionInfo } = req.body;

  // Validate enquiry level
  if (!enquiryLevel || enquiryLevel < 1 || enquiryLevel > 5) {
    return res.status(400).json({
      message: 'Enquiry level must be between 1 and 5'
    });
  }

  // Find the user
  const user = await User.findById(id);
  if (!user) {
    return res.status(404).json({
      message: 'User not found'
    });
  }

  // Update enquiry level
  user.enquiryLevel = enquiryLevel;
  user.updatedOn = new Date();

  // If upgrading to Level 5 (admitted), handle admission info
  if (enquiryLevel === 5) {
    if (!admissionInfo || !admissionInfo.grade) {
      return res.status(400).json({
        message: 'Grade is required for Level 5 students'
      });
    }

    user.admissionInfo = {
      grade: admissionInfo.grade,
      className: admissionInfo.className || ''
    };

    // Auto-assign campus based on gender if not already set
    if (!user.campus && user.gender) {
      user.campus = user.gender.toLowerCase() === 'male' ? 'Boys' : 'Girls';
    }
  }

  await user.save();

  // Remove sensitive data from response
  const userResponse = user.toJSON();
  delete userResponse.password;

  sendSuccessResponse(res, { user: userResponse }, 'Enquiry level updated successfully');
}));

// Helper function to generate roll numbers
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

module.exports = router;
