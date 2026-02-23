const express = require('express');
const router = express.Router();
const Correspondence = require('../models/Correspondence');
const User = require('../models/User');
const { authenticate } = require('../middleware/auth');

// Get all correspondence with filters
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      type, 
      dateFilter, 
      startDate, 
      endDate, 
      level,
      staffMember,
      nonProgression,
      progressionLevel,
      campus,
      program 
    } = req.query;

    // Build base query for correspondence
    let query = {};

    // Filter by correspondence type
    if (type && ['enquiry', 'student', 'call', 'meeting', 'follow-up'].includes(type)) {
      query.type = type;
    }

    // Filter by student level
    if (level && level !== 'all') {
      query.studentLevel = parseInt(level);
    }

    // Filter by staff member
    if (staffMember && staffMember !== 'all') {
      query['staffMember.id'] = staffMember;
    }

    // Get correspondence with populated student data first for campus/program filtering
    let correspondenceQuery = { ...query };
    
    // Get correspondence with populated student data
    let correspondenceData = await Correspondence.find(correspondenceQuery)
      .populate('studentId', 'fullName email prospectusStage gender campus program')
      .sort({ timestamp: -1 })
      .lean();

    // Apply campus filter on populated data
    if (campus && campus !== 'all') {
      correspondenceData = correspondenceData.filter(item => {
        const studentCampus = item.studentId?.campus?.toLowerCase();
        const filterCampus = campus.toLowerCase();
        return studentCampus === filterCampus || 
               (filterCampus === 'boys' && item.studentId?.gender?.toLowerCase() === 'male') ||
               (filterCampus === 'girls' && item.studentId?.gender?.toLowerCase() === 'female');
      });
    }

    // Apply program filter on populated data
    if (program && program !== 'all') {
      correspondenceData = correspondenceData.filter(item => {
        return item.studentId?.program?.toLowerCase().includes(program.toLowerCase());
      });
    }

    // Apply date filter for correspondence
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999);
        
        query.timestamp = { 
          $gte: customStartDate,
          $lte: customEndDate
        };
      } else {
        const now = new Date();
        let filterStartDate;

        switch (dateFilter) {
          case 'today':
            filterStartDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            filterStartDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case 'year':
            filterStartDate = new Date(now.getFullYear(), 0, 1);
            break;
          default:
            filterStartDate = null;
        }

        if (filterStartDate) {
          query.timestamp = { $gte: filterStartDate };
        }
      }
    }

    // Handle non-progression filter
    if (nonProgression === 'true' && progressionLevel) {
      const level = parseInt(progressionLevel);
      
      // Find students who didn't progress to the specified level
      const nonProgressedStudents = await User.find({
        role: 'Student',
        prospectusStage: level - 1 // Students at previous level who should have progressed
      }).select('_id');
      
      const studentIds = nonProgressedStudents.map(s => s._id);
      
      if (studentIds.length > 0) {
        query.studentId = { $in: studentIds };
      } else {
        // No non-progressed students found, return empty result
        return res.json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: 1,
            limit: 50,
            pages: 0
          }
        });
      }
    }

    // Get correspondence with populated student data
    const correspondence = correspondenceData;

    console.log('Correspondence data fetched:', {
      correspondenceRecords: correspondence.length,
      sampleCorrespondence: correspondence[0] || 'No regular correspondence found'
    });

    // Also get level changes from remarks as correspondence entries
    let levelChangeQuery = {
      role: 'Student',
      receptionistRemarks: { $exists: true, $ne: [] }
    };

    // Apply same date filters to level changes
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999);
        
        levelChangeQuery['receptionistRemarks.timestamp'] = { 
          $gte: customStartDate,
          $lte: customEndDate
        };
      } else {
        // Handle other date filters
        const now = new Date();
        let dateFrom = new Date();
        
        switch (dateFilter) {
          case 'today':
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'week':
            dateFrom.setDate(now.getDate() - 7);
            break;
          case 'month':
            dateFrom.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            dateFrom.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            dateFrom.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        if (dateFilter !== 'all') {
          levelChangeQuery['receptionistRemarks.timestamp'] = { $gte: dateFrom };
        }
      }
    }

    // Get students with level change remarks
    const studentsWithRemarks = await User.find(levelChangeQuery)
      .select('fullName email prospectusStage gender campus program receptionistRemarks')
      .lean();

    // Apply campus and program filters for level changes
    let filteredStudentsWithRemarks = studentsWithRemarks;
    
    if (campus && campus !== 'all') {
      filteredStudentsWithRemarks = filteredStudentsWithRemarks.filter(student => {
        const studentCampus = student.campus?.toLowerCase();
        const filterCampus = campus.toLowerCase();
        return studentCampus === filterCampus || 
               (filterCampus === 'boys' && student.gender?.toLowerCase() === 'male') ||
               (filterCampus === 'girls' && student.gender?.toLowerCase() === 'female');
      });
    }

    if (program && program !== 'all') {
      filteredStudentsWithRemarks = filteredStudentsWithRemarks.filter(student => {
        return student.program?.toLowerCase().includes(program.toLowerCase());
      });
    }

    // Convert remarks to correspondence format (individual entries for each level change)
    const levelChangeEntries = [];
    const uniqueStudentsContacted = new Set();
    
    filteredStudentsWithRemarks.forEach(student => {
      if (student.receptionistRemarks && student.receptionistRemarks.length > 0) {
        // Filter remarks by date
        const filteredRemarks = student.receptionistRemarks.filter(remark => {
          const remarkDate = new Date(remark.timestamp);
          let includeRemark = true;
          
          if (dateFilter && dateFilter !== 'all') {
            if (dateFilter === 'custom' && startDate && endDate) {
              const customStartDate = new Date(startDate);
              const customEndDate = new Date(endDate);
              customEndDate.setHours(23, 59, 59, 999);
              includeRemark = remarkDate >= customStartDate && remarkDate <= customEndDate;
            } else {
              const now = new Date();
              let dateFrom = new Date();
              
              switch (dateFilter) {
                case 'today':
                  dateFrom.setHours(0, 0, 0, 0);
                  break;
                case 'week':
                  dateFrom.setDate(now.getDate() - 7);
                  break;
                case 'month':
                  dateFrom.setMonth(now.getMonth() - 1);
                  break;
                case 'quarter':
                  dateFrom.setMonth(now.getMonth() - 3);
                  break;
                case 'year':
                  dateFrom.setFullYear(now.getFullYear() - 1);
                  break;
              }
              
              includeRemark = remarkDate >= dateFrom;
            }
          }
          
          return includeRemark;
        });

        if (filteredRemarks.length > 0) {
          // Determine type based on student level
          const studentLevel = student.prospectusStage || 1;
          const correspondenceType = studentLevel <= 4 ? 'enquiry' : 'student';
          
          // Filter by type if specified
          if (!type || type === correspondenceType) {
            // Filter by level if specified
            if (!level || level === 'all' || studentLevel === parseInt(level)) {
              // Count this student as contacted (only once regardless of number of remarks)
              uniqueStudentsContacted.add(student._id.toString());
              
              // Create individual correspondence entries for each remark/level change
              filteredRemarks.forEach((remark, index) => {
                levelChangeEntries.push({
                  _id: `remark_${student._id}_${remark._id || index}_${remark.timestamp}`,
                  studentId: {
                    _id: student._id,
                    fullName: student.fullName,
                    email: student.email,
                    prospectusStage: student.prospectusStage,
                    gender: student.gender,
                    campus: student.campus,
                    program: student.program
                  },
                  type: correspondenceType,
                  subject: 'Level Change / Communication',
                  message: remark.remark,
                  studentLevel: studentLevel,
                  staffMember: {
                    id: remark.receptionistId,
                    name: remark.receptionistName
                  },
                  timestamp: remark.timestamp,
                  isLevelChange: true, // Flag to identify level change entries
                  remarkIndex: index + 1,
                  totalRemarks: filteredRemarks.length
                });
              });
            }
          }
        }
      }
    });

    console.log('Level change data processed:', {
      studentsWithRemarks: filteredStudentsWithRemarks.length,
      levelChangeEntries: levelChangeEntries.length,
      sampleLevelChange: levelChangeEntries[0] || 'No level changes found'
    });

    // Combine correspondence and level changes
    const allEntries = [
      // Regular correspondence (mark as general communications)
      ...correspondence.map(entry => ({
        ...entry,
        isLevelChange: false, // Explicitly mark regular correspondence as non-level change
        type: entry.type || 'general', // Ensure type is set
        isGeneralCommunication: true
      })),
      ...levelChangeEntries
    ];
    
    // Sort by timestamp (newest first)
    allEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate comprehensive statistics
    const calculateStats = (entries) => {
      console.log('calculateStats called with:', entries.length, 'entries');
      
      // Initialize tracking structures
      const totalCommunicationsBreakdown = {};
      const uniqueStudentsByLevel = {};
      const levelChangeBreakdown = {};
      const allUniqueStudents = new Set();

      // Initialize level breakdowns (1-5)
      for (let i = 1; i <= 5; i++) {
        totalCommunicationsBreakdown[i] = { total: 0, boys: 0, girls: 0 };
        uniqueStudentsByLevel[i] = { 
          students: new Set(), 
          boys: new Set(), 
          girls: new Set() 
        };
      }

      // Initialize level change breakdown
      const levelTransitions = ['1→2', '2→3', '3→4', '4→5', 'Other'];
      levelTransitions.forEach(transition => {
        levelChangeBreakdown[transition] = { total: 0, boys: 0, girls: 0 };
      });

      // Separate counters
      let totalLevelChangeEntries = 0;
      let generalCommunicationEntries = 0;

      // Process each entry
      entries.forEach((entry, index) => {
        const level = entry.studentLevel || entry.studentId?.prospectusStage || 1;
        const gender = entry.studentId?.gender?.toLowerCase().trim(); // Add trim() to remove spaces
        const isLevelChange = entry.isLevelChange || false;
        const studentId = entry.studentId?._id?.toString();

        // Skip invalid entries
        if (!studentId || !level || level < 1 || level > 5) {
          return;
        }

        // 1. COUNT TOTAL COMMUNICATIONS (every entry counts)
        totalCommunicationsBreakdown[level].total++;
        if (gender === 'male') totalCommunicationsBreakdown[level].boys++;
        if (gender === 'female') totalCommunicationsBreakdown[level].girls++;

        // Debug: Track unmatched genders for Level 1
        if (level === 1 && !['male', 'female'].includes(gender)) {
          console.log(`Level 1 unmatched gender:`, {
            studentId,
            originalGender: entry.studentId?.gender,
            processedGender: gender,
            trimmedGender: entry.studentId?.gender?.toLowerCase().trim(),
            genderType: typeof entry.studentId?.gender
          });
        }

        // 2. TRACK UNIQUE STUDENTS (each student counted only once per level)
        uniqueStudentsByLevel[level].students.add(studentId);
        allUniqueStudents.add(studentId);
        if (gender === 'male') uniqueStudentsByLevel[level].boys.add(studentId);
        if (gender === 'female') uniqueStudentsByLevel[level].girls.add(studentId);

        // 3. COUNT LEVEL CHANGES vs GENERAL COMMUNICATIONS
        if (isLevelChange) {
          totalLevelChangeEntries++;
          
          // Determine transition type
          let transitionType = 'Other';
          if (level === 1) transitionType = '1→2';
          else if (level === 2) transitionType = '2→3';
          else if (level === 3) transitionType = '3→4';
          else if (level === 4) transitionType = '4→5';
          
          levelChangeBreakdown[transitionType].total++;
          if (gender === 'male') levelChangeBreakdown[transitionType].boys++;
          if (gender === 'female') levelChangeBreakdown[transitionType].girls++;
        } else {
          // This is a general communication (regular correspondence)
          generalCommunicationEntries++;
        }
      });

      // Convert unique student sets to counts
      const uniqueStudentsBreakdown = {};
      for (let i = 1; i <= 5; i++) {
        uniqueStudentsBreakdown[i] = {
          total: uniqueStudentsByLevel[i].students.size,
          boys: uniqueStudentsByLevel[i].boys.size,
          girls: uniqueStudentsByLevel[i].girls.size
        };
      }

      console.log('calculateStats completed:', {
        totalEntries: entries.length,
        totalCommunications: entries.length,
        uniqueStudents: allUniqueStudents.size,
        levelChanges: totalLevelChangeEntries,
        generalCommunications: generalCommunicationEntries
      });

      // Debug Level 1 inconsistency
      const level1Stats = {
        total: totalCommunicationsBreakdown[1].total,
        boys: totalCommunicationsBreakdown[1].boys,
        girls: totalCommunicationsBreakdown[1].girls,
        uniqueStudents: uniqueStudentsByLevel[1].students.size,
        uniqueBoys: uniqueStudentsByLevel[1].boys.size,
        uniqueGirls: uniqueStudentsByLevel[1].girls.size
      };
      
      if (level1Stats.total !== level1Stats.boys + level1Stats.girls) {
        console.warn('⚠️ LEVEL 1 INCONSISTENCY DETECTED:', level1Stats);
        
        // Find entries that might have undefined/null gender for Level 1
        const level1Entries = entries.filter(entry => {
          const level = entry.studentLevel || entry.studentId?.prospectusStage || 1;
          return level === 1;
        });
        
        console.log('Level 1 entries gender breakdown:', level1Entries.map(entry => ({
          studentId: entry.studentId?._id?.toString(),
          gender: entry.studentId?.gender,
          genderType: typeof entry.studentId?.gender,
          genderLowercase: entry.studentId?.gender?.toLowerCase(),
          genderTrimmed: entry.studentId?.gender?.toLowerCase().trim()
        })));
      }

      return {
        totalCommunications: {
          total: entries.length,
          breakdown: totalCommunicationsBreakdown
        },
        uniqueStudents: {
          total: allUniqueStudents.size,
          breakdown: uniqueStudentsBreakdown
        },
        levelChanges: {
          total: totalLevelChangeEntries,
          breakdown: levelChangeBreakdown
        },
        generalCommunications: {
          total: generalCommunicationEntries
        }
      };
    };

    const stats = calculateStats(allEntries);

    // Validation
    const validation = {
      totalEntriesMatch: allEntries.length === stats.totalCommunications.total,
      levelChangesVsGeneral: stats.levelChanges.total + stats.generalCommunications.total === allEntries.length,
      levelChangesVsUniqueStudents: stats.levelChanges.total >= stats.uniqueStudents.total ? 'OK' : 'ISSUE: More level changes than unique students'
    };

    console.log('Correspondence API Summary:', {
      totalEntries: allEntries.length,
      stats: {
        totalCommunications: stats.totalCommunications.total,
        uniqueStudents: stats.uniqueStudents.total,
        levelChanges: stats.levelChanges.total,
        generalCommunications: stats.generalCommunications.total
      },
      validation
    });

    res.json({
      success: true,
      data: allEntries,
      stats: {
        // Legacy fields for backward compatibility
        totalCorrespondence: correspondence.length,
        totalLevelChangeEntries: levelChangeEntries.length,
        uniqueStudentsContacted: stats.uniqueStudents.total,
        
        // New comprehensive stats structure
        ...stats,
        
        // Validation info
        validation,
        
        // Raw counts for debugging
        rawCounts: {
          correspondenceRecords: correspondence.length,
          levelChangeRecords: levelChangeEntries.length,
          totalRecords: allEntries.length
        }
      },
      pagination: {
        total: allEntries.length,
        page: 1,
        limit: 50,
        pages: Math.ceil(allEntries.length / 50)
      }
    });

  } catch (error) {
    console.error('Error fetching correspondence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch correspondence'
    });
  }
});

// Create new correspondence
router.post('/', authenticate, async (req, res) => {
  try {
    const { studentId, type, subject, message, toWhom, communicationCategory } = req.body;

    // Validate required fields
    if (!studentId || !type || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required'
      });
    }

    // Get student details
    const student = await User.findById(studentId);
    if (!student || student.role !== 'Student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Validate correspondence type based on student level
    const studentLevel = student.prospectusStage || 1;
    const isAdmitted = studentLevel === 5;
    const hasClass = student.classId && student.classId !== null;
    
    // Allow all correspondence types for any level, but with logical constraints
    const validTypes = ['student', 'call', 'meeting', 'follow-up', 'enquiry'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid correspondence type. Must be one of: student, call, meeting, follow-up, enquiry'
      });
    }

    // Validate additional fields for admitted students with class assignments
    if (type === 'student' && isAdmitted && hasClass) {
      // For admitted students with class, validate required fields
      if (!toWhom || !['parent', 'sibling', 'student'].includes(toWhom)) {
        return res.status(400).json({
          success: false,
          message: 'toWhom field is required for admitted students with class assignments. Must be: parent, sibling, or student'
        });
      }
      
      if (!communicationCategory || !['appreciation', 'results', 'discipline', 'attendance', 'fee', 'general'].includes(communicationCategory)) {
        return res.status(400).json({
          success: false,
          message: 'communicationCategory field is required for admitted students with class assignments. Must be: appreciation, results, discipline, attendance, fee, or general'
        });
      }
    }

    // 'student' type is primarily for admitted students (Level 5+)
    // 'enquiry', 'call', 'meeting', 'follow-up' are for all levels
    if (type === 'student' && studentLevel < 5) {
      console.warn(`Student correspondence created for non-admitted student (Level ${studentLevel})`);
    }

    // Create correspondence object
    const correspondenceData = {
      studentId,
      type,
      subject,
      message,
      staffMember: {
        id: req.user._id,
        name: `${req.user.fullName?.firstName || ''} ${req.user.fullName?.lastName || ''}`.trim() || req.user.userName,
        role: req.user.role
      },
      studentLevel
    };

    // Add additional fields for admitted students with class assignments
    if (type === 'student' && isAdmitted && hasClass) {
      correspondenceData.toWhom = toWhom;
      correspondenceData.communicationCategory = communicationCategory || 'general';
    }

    // Create correspondence
    const correspondence = new Correspondence(correspondenceData);

    await correspondence.save();

    // Populate student details for response
    await correspondence.populate('studentId', 'fullName email prospectusStage classId');

    res.status(201).json({
      success: true,
      message: 'Correspondence created successfully',
      data: correspondence
    });

  } catch (error) {
    console.error('Error creating correspondence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create correspondence'
    });
  }
});

// PUT /correspondence/:id - Update correspondence
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId, type, subject, message } = req.body;

    // Validate required fields
    if (!studentId || !type || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required (studentId, type, subject, message)'
      });
    }

    // Validate correspondence type
    const validTypes = ['student', 'call', 'meeting', 'follow-up', 'enquiry'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid correspondence type. Must be one of: student, call, meeting, follow-up, enquiry'
      });
    }

    // Check if correspondence exists
    const existingCorrespondence = await Correspondence.findById(id);
    if (!existingCorrespondence) {
      return res.status(404).json({
        success: false,
        message: 'Correspondence not found'
      });
    }

    // Get student details to validate type constraints
    const student = await User.findById(studentId);
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Student not found'
      });
    }

    const studentLevel = student.enquiryLevel || 1;

    // Validate type constraints (more flexible now)
    const allowedTypes = ['student', 'call', 'meeting', 'follow-up', 'enquiry'];
    if (!allowedTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid correspondence type'
      });
    }

    // Optional warnings for type usage
    if (type === 'student' && studentLevel < 5) {
      console.warn(`Student correspondence updated for non-admitted student (Level ${studentLevel})`);
    }

    // Update correspondence
    const updatedCorrespondence = await Correspondence.findByIdAndUpdate(
      id,
      {
        studentId,
        type,
        subject: subject.trim(),
        message: message.trim(),
        studentLevel,
        // Keep original staffMember and timestamp
        staffMember: existingCorrespondence.staffMember,
        timestamp: existingCorrespondence.timestamp
      },
      { new: true, runValidators: true }
    ).populate('studentId', 'fullName enquiryLevel');

    res.status(200).json({
      success: true,
      message: 'Correspondence updated successfully',
      data: updatedCorrespondence
    });

  } catch (error) {
    console.error('Error updating correspondence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update correspondence',
      error: error.message
    });
  }
});

// DELETE /correspondence/:id - Delete correspondence
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Check if correspondence exists
    const correspondence = await Correspondence.findById(id);
    if (!correspondence) {
      return res.status(404).json({
        success: false,
        message: 'Correspondence not found'
      });
    }

    // Delete the correspondence
    await Correspondence.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Correspondence deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting correspondence:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete correspondence',
      error: error.message
    });
  }
});

// Get unique students contact statistics
router.get('/stats/unique-students', authenticate, async (req, res) => {
  try {
    const { 
      dateFilter, 
      startDate, 
      endDate, 
      type,
      level,
      campus,
      program 
    } = req.query;

    // Build date query
    let dateQuery = {};
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999);
        dateQuery = { 
          $gte: customStartDate,
          $lte: customEndDate
        };
      } else {
        const now = new Date();
        let dateFrom = new Date();
        
        switch (dateFilter) {
          case 'today':
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'week':
            dateFrom.setDate(now.getDate() - 7);
            break;
          case 'month':
            dateFrom.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            dateFrom.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            dateFrom.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        if (dateFilter !== 'all') {
          dateQuery = { $gte: dateFrom };
        }
      }
    }

    // Get unique students from correspondence
    let correspondenceQuery = {};
    if (Object.keys(dateQuery).length > 0) {
      correspondenceQuery.timestamp = dateQuery;
    }
    if (type && ['enquiry', 'student', 'call', 'meeting', 'follow-up'].includes(type)) {
      correspondenceQuery.type = type;
    }
    if (level && level !== 'all') {
      correspondenceQuery.studentLevel = parseInt(level);
    }

    const correspondenceStudents = await Correspondence.find(correspondenceQuery)
      .populate('studentId', 'fullName email prospectusStage gender campus program')
      .distinct('studentId');

    // Apply campus and program filters for correspondence students
    let filteredCorrespondenceStudents = correspondenceStudents;
    if (campus || program) {
      const studentDetails = await User.find({
        _id: { $in: correspondenceStudents }
      }).select('_id campus program gender').lean();
      
      let filteredStudentIds = studentDetails;
      
      if (campus && campus !== 'all') {
        filteredStudentIds = filteredStudentIds.filter(student => {
          const studentCampus = student.campus?.toLowerCase();
          const filterCampus = campus.toLowerCase();
          return studentCampus === filterCampus || 
                 (filterCampus === 'boys' && student.gender?.toLowerCase() === 'male') ||
                 (filterCampus === 'girls' && student.gender?.toLowerCase() === 'female');
        });
      }
      
      if (program && program !== 'all') {
        filteredStudentIds = filteredStudentIds.filter(student => {
          return student.program?.toLowerCase().includes(program.toLowerCase());
        });
      }
      
      filteredCorrespondenceStudents = filteredStudentIds.map(s => s._id);
    }

    // Get unique students from remarks
    let remarksQuery = {
      role: 'Student',
      receptionistRemarks: { $exists: true, $ne: [] }
    };
    
    if (Object.keys(dateQuery).length > 0) {
      remarksQuery['receptionistRemarks.timestamp'] = dateQuery;
    }

    const studentsWithRemarks = await User.find(remarksQuery)
      .select('_id prospectusStage gender campus program receptionistRemarks')
      .lean();

    // Filter students with remarks by type, level, campus, and program
    const filteredRemarksStudents = studentsWithRemarks.filter(student => {
      const studentLevel = student.prospectusStage || 1;
      const correspondenceType = studentLevel <= 4 ? 'enquiry' : 'student';
      
      // Check type filter
      if (type && type !== correspondenceType) {
        return false;
      }
      
      // Check level filter
      if (level && level !== 'all' && studentLevel !== parseInt(level)) {
        return false;
      }

      // Check campus filter
      if (campus && campus !== 'all') {
        const studentCampus = student.campus?.toLowerCase();
        const filterCampus = campus.toLowerCase();
        const campusMatch = studentCampus === filterCampus || 
                           (filterCampus === 'boys' && student.gender?.toLowerCase() === 'male') ||
                           (filterCampus === 'girls' && student.gender?.toLowerCase() === 'female');
        if (!campusMatch) {
          return false;
        }
      }

      // Check program filter
      if (program && program !== 'all') {
        if (!student.program?.toLowerCase().includes(program.toLowerCase())) {
          return false;
        }
      }

      // Check if student has remarks in the date range
      if (Object.keys(dateQuery).length > 0) {
        return student.receptionistRemarks.some(remark => {
          const remarkDate = new Date(remark.timestamp);
          if (dateQuery.$gte && dateQuery.$lte) {
            return remarkDate >= dateQuery.$gte && remarkDate <= dateQuery.$lte;
          } else if (dateQuery.$gte) {
            return remarkDate >= dateQuery.$gte;
          }
          return true;
        });
      }
      
      return true;
    });

    const remarksStudentIds = filteredRemarksStudents.map(s => s._id.toString());
    const correspondenceStudentIds = filteredCorrespondenceStudents.map(s => s.toString());
    
    // Combine unique students
    const allUniqueStudents = new Set([...correspondenceStudentIds, ...remarksStudentIds]);

    // Get student details for the unique students
    const uniqueStudentDetails = await User.find({
      _id: { $in: Array.from(allUniqueStudents) }
    }).select('fullName email prospectusStage gender campus program')
      .lean();

    // Group by level and type
    const statsByLevel = {};
    const statsByType = { enquiry: 0, student: 0 };
    const statsByGender = { male: 0, female: 0, other: 0 };

    uniqueStudentDetails.forEach(student => {
      const level = student.prospectusStage || 1;
      const studentType = level <= 4 ? 'enquiry' : 'student';
      const gender = (student.gender || 'other').toLowerCase();

      // Count by level
      statsByLevel[level] = (statsByLevel[level] || 0) + 1;
      
      // Count by type
      statsByType[studentType]++;
      
      // Count by gender
      if (gender === 'male' || gender === 'female') {
        statsByGender[gender]++;
      } else {
        statsByGender.other++;
      }
    });

    res.json({
      success: true,
      data: {
        uniqueStudentsCount: allUniqueStudents.size,
        fromCorrespondence: correspondenceStudentIds.length,
        fromRemarks: remarksStudentIds.length,
        statsByLevel,
        statsByType,
        statsByGender,
        studentDetails: uniqueStudentDetails
      }
    });

  } catch (error) {
    console.error('Error fetching unique students stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch unique students statistics',
      error: error.message
    });
  }
});

// Get detailed conversation history for a specific student
router.get('/student/:studentId/history', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { dateFilter, startDate, endDate } = req.query;

    // Validate student exists
    const student = await User.findById(studentId).select('fullName email prospectusStage gender campus program receptionistRemarks');
    if (!student || student.role !== 'Student') {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build date query
    let dateQuery = {};
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999);
        dateQuery = { 
          $gte: customStartDate,
          $lte: customEndDate
        };
      } else {
        const now = new Date();
        let dateFrom = new Date();
        
        switch (dateFilter) {
          case 'today':
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'week':
            dateFrom.setDate(now.getDate() - 7);
            break;
          case 'month':
            dateFrom.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            dateFrom.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            dateFrom.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        if (dateFilter !== 'all') {
          dateQuery = { $gte: dateFrom };
        }
      }
    }

    // Get correspondence history
    let correspondenceQuery = { studentId };
    if (Object.keys(dateQuery).length > 0) {
      correspondenceQuery.timestamp = dateQuery;
    }

    const correspondenceHistory = await Correspondence.find(correspondenceQuery)
      .sort({ timestamp: -1 })
      .lean();

    // Get level change history from remarks
    let levelChangeHistory = [];
    if (student.receptionistRemarks && student.receptionistRemarks.length > 0) {
      levelChangeHistory = student.receptionistRemarks
        .filter(remark => {
          if (Object.keys(dateQuery).length === 0) return true;
          const remarkDate = new Date(remark.timestamp);
          if (dateQuery.$gte && dateQuery.$lte) {
            return remarkDate >= dateQuery.$gte && remarkDate <= dateQuery.$lte;
          } else if (dateQuery.$gte) {
            return remarkDate >= dateQuery.$gte;
          }
          return true;
        })
        .map(remark => ({
          _id: `remark_${remark._id || remark.timestamp}`,
          type: 'level-change',
          subject: 'Level Change / Communication',
          message: remark.remark,
          staffMember: {
            id: remark.receptionistId,
            name: remark.receptionistName,
            role: 'Receptionist'
          },
          timestamp: remark.timestamp,
          isLevelChange: true
        }));
    }

    // Combine and sort all history
    const allHistory = [
      ...correspondenceHistory.map(item => ({
        ...item,
        isLevelChange: false
      })),
      ...levelChangeHistory
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Calculate statistics
    const stats = {
      totalCommunications: allHistory.length,
      correspondences: correspondenceHistory.length,
      levelChanges: levelChangeHistory.length,
      communicationsByType: {},
      communicationsByStaff: {},
      timespan: {
        firstContact: allHistory.length > 0 ? allHistory[allHistory.length - 1].timestamp : null,
        lastContact: allHistory.length > 0 ? allHistory[0].timestamp : null
      }
    };

    // Group by type
    allHistory.forEach(item => {
      const type = item.isLevelChange ? 'level-change' : item.type;
      stats.communicationsByType[type] = (stats.communicationsByType[type] || 0) + 1;
    });

    // Group by staff member
    allHistory.forEach(item => {
      const staffName = item.staffMember?.name || 'Unknown';
      if (!stats.communicationsByStaff[staffName]) {
        stats.communicationsByStaff[staffName] = {
          name: staffName,
          role: item.staffMember?.role || 'Unknown',
          count: 0,
          types: {}
        };
      }
      stats.communicationsByStaff[staffName].count++;
      
      const type = item.isLevelChange ? 'level-change' : item.type;
      stats.communicationsByStaff[staffName].types[type] = 
        (stats.communicationsByStaff[staffName].types[type] || 0) + 1;
    });

    res.json({
      success: true,
      data: {
        student: {
          id: student._id,
          fullName: student.fullName,
          email: student.email,
          currentLevel: student.prospectusStage,
          gender: student.gender,
          campus: student.campus,
          program: student.program
        },
        history: allHistory,
        stats
      }
    });

  } catch (error) {
    console.error('Error fetching student conversation history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch student conversation history',
      error: error.message
    });
  }
});

// Get employee correspondence performance statistics
router.get('/stats/employee-performance', authenticate, async (req, res) => {
  try {
    const { 
      dateFilter, 
      startDate, 
      endDate, 
      type,
      level,
      campus,
      program 
    } = req.query;

    // Build date query
    let dateQuery = {};
    if (dateFilter && dateFilter !== 'all') {
      if (dateFilter === 'custom' && startDate && endDate) {
        const customStartDate = new Date(startDate);
        const customEndDate = new Date(endDate);
        customEndDate.setHours(23, 59, 59, 999);
        dateQuery = { 
          $gte: customStartDate,
          $lte: customEndDate
        };
      } else {
        const now = new Date();
        let dateFrom = new Date();
        
        switch (dateFilter) {
          case 'today':
            dateFrom.setHours(0, 0, 0, 0);
            break;
          case 'week':
            dateFrom.setDate(now.getDate() - 7);
            break;
          case 'month':
            dateFrom.setMonth(now.getMonth() - 1);
            break;
          case 'quarter':
            dateFrom.setMonth(now.getMonth() - 3);
            break;
          case 'year':
            dateFrom.setFullYear(now.getFullYear() - 1);
            break;
        }
        
        if (dateFilter !== 'all') {
          dateQuery = { $gte: dateFrom };
        }
      }
    }

    // Get correspondence statistics by employee
    let correspondenceQuery = {};
    if (Object.keys(dateQuery).length > 0) {
      correspondenceQuery.timestamp = dateQuery;
    }
    if (type && ['student', 'call', 'meeting', 'follow-up', 'enquiry'].includes(type)) {
      correspondenceQuery.type = type;
    }
    if (level && level !== 'all') {
      correspondenceQuery.studentLevel = parseInt(level);
    }

    const correspondenceStats = await Correspondence.aggregate([
      { $match: correspondenceQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      { $unwind: '$student' },
      // Apply campus filter
      ...(campus && campus !== 'all' ? [{
        $match: {
          $or: [
            { 'student.campus': new RegExp(campus, 'i') },
            ...(campus.toLowerCase() === 'boys' ? [{ 'student.gender': 'Male' }] : []),
            ...(campus.toLowerCase() === 'girls' ? [{ 'student.gender': 'Female' }] : [])
          ]
        }
      }] : []),
      // Apply program filter
      ...(program && program !== 'all' ? [{
        $match: {
          'student.program': new RegExp(program, 'i')
        }
      }] : []),
      {
        $group: {
          _id: '$staffMember.id',
          employeeName: { $first: '$staffMember.name' },
          employeeRole: { $first: '$staffMember.role' },
          totalCorrespondences: { $sum: 1 },
          uniqueStudents: { $addToSet: '$studentId' },
          correspondencesByType: {
            $push: {
              type: '$type',
              timestamp: '$timestamp',
              studentLevel: '$studentLevel'
            }
          }
        }
      },
      {
        $addFields: {
          uniqueStudentsCount: { $size: '$uniqueStudents' }
        }
      },
      {
        $sort: { totalCorrespondences: -1 }
      }
    ]);

    // Get level change statistics by employee (from remarks)
    let remarksQuery = {
      role: 'Student',
      receptionistRemarks: { $exists: true, $ne: [] }
    };
    
    if (Object.keys(dateQuery).length > 0) {
      remarksQuery['receptionistRemarks.timestamp'] = dateQuery;
    }

    const remarksStats = await User.aggregate([
      { $match: remarksQuery },
      // Apply campus filter
      ...(campus && campus !== 'all' ? [{
        $match: {
          $or: [
            { campus: new RegExp(campus, 'i') },
            ...(campus.toLowerCase() === 'boys' ? [{ gender: 'Male' }] : []),
            ...(campus.toLowerCase() === 'girls' ? [{ gender: 'Female' }] : [])
          ]
        }
      }] : []),
      // Apply program filter
      ...(program && program !== 'all' ? [{
        $match: {
          program: new RegExp(program, 'i')
        }
      }] : []),
      // Apply level filter
      ...(level && level !== 'all' ? [{
        $match: {
          prospectusStage: parseInt(level)
        }
      }] : []),
      { $unwind: '$receptionistRemarks' },
      // Apply date filter to individual remarks
      ...(Object.keys(dateQuery).length > 0 ? [{
        $match: {
          'receptionistRemarks.timestamp': dateQuery
        }
      }] : []),
      {
        $group: {
          _id: '$receptionistRemarks.receptionistId',
          employeeName: { $first: '$receptionistRemarks.receptionistName' },
          employeeRole: { $first: 'Receptionist' }, // Default role for remarks
          totalLevelChanges: { $sum: 1 },
          uniqueStudents: { $addToSet: '$_id' },
          levelChangesByStudent: {
            $push: {
              studentId: '$_id',
              studentName: '$fullName',
              remark: '$receptionistRemarks.remark',
              timestamp: '$receptionistRemarks.timestamp',
              studentLevel: '$prospectusStage'
            }
          }
        }
      },
      {
        $addFields: {
          uniqueStudentsCount: { $size: '$uniqueStudents' }
        }
      },
      {
        $sort: { totalLevelChanges: -1 }
      }
    ]);

    // Combine correspondence and level change statistics
    const employeePerformance = {};

    // Process correspondence stats
    correspondenceStats.forEach(stat => {
      const employeeId = stat._id?.toString() || 'unknown';
      employeePerformance[employeeId] = {
        employeeId,
        employeeName: stat.employeeName || 'Unknown',
        employeeRole: stat.employeeRole || 'Unknown',
        correspondences: stat.totalCorrespondences,
        levelChanges: 0,
        totalCommunications: stat.totalCorrespondences,
        uniqueStudentsFromCorrespondence: stat.uniqueStudentsCount,
        uniqueStudentsFromLevelChanges: 0,
        correspondenceDetails: stat.correspondencesByType
      };
    });

    // Process level change stats
    remarksStats.forEach(stat => {
      const employeeId = stat._id?.toString() || 'unknown';
      if (employeePerformance[employeeId]) {
        employeePerformance[employeeId].levelChanges = stat.totalLevelChanges;
        employeePerformance[employeeId].totalCommunications += stat.totalLevelChanges;
        employeePerformance[employeeId].uniqueStudentsFromLevelChanges = stat.uniqueStudentsCount;
        employeePerformance[employeeId].levelChangeDetails = stat.levelChangesByStudent;
      } else {
        employeePerformance[employeeId] = {
          employeeId,
          employeeName: stat.employeeName || 'Unknown',
          employeeRole: stat.employeeRole || 'Receptionist',
          correspondences: 0,
          levelChanges: stat.totalLevelChanges,
          totalCommunications: stat.totalLevelChanges,
          uniqueStudentsFromCorrespondence: 0,
          uniqueStudentsFromLevelChanges: stat.uniqueStudentsCount,
          levelChangeDetails: stat.levelChangesByStudent
        };
      }
    });

    // Calculate total unique students per employee (combining both sources)
    Object.values(employeePerformance).forEach(employee => {
      // This is a simplified calculation - for exact unique count, 
      // we'd need to check for overlapping students between correspondence and level changes
      employee.totalUniqueStudents = Math.max(
        employee.uniqueStudentsFromCorrespondence,
        employee.uniqueStudentsFromLevelChanges
      );
    });

    // Convert to array and sort by total communications
    const performanceArray = Object.values(employeePerformance)
      .sort((a, b) => b.totalCommunications - a.totalCommunications);

    res.json({
      success: true,
      data: {
        employeePerformance: performanceArray,
        summary: {
          totalEmployees: performanceArray.length,
          totalCorrespondences: performanceArray.reduce((sum, emp) => sum + emp.correspondences, 0),
          totalLevelChanges: performanceArray.reduce((sum, emp) => sum + emp.levelChanges, 0),
          totalCommunications: performanceArray.reduce((sum, emp) => sum + emp.totalCommunications, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching employee performance stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch employee performance statistics',
      error: error.message
    });
  }
});

// Get available campuses for filtering
router.get('/filters/campuses', authenticate, async (req, res) => {
  try {
    const campuses = await User.distinct('campus', { role: 'Student' });
    const validCampuses = campuses.filter(campus => campus && campus.trim() !== '');
    
    // Add gender-based campus options
    const campusOptions = [
      { value: 'all', label: 'All Campuses' },
      { value: 'boys', label: 'Boys Campus' },
      { value: 'girls', label: 'Girls Campus' },
      ...validCampuses.map(campus => ({
        value: campus.toLowerCase(),
        label: campus
      }))
    ];

    res.json({
      success: true,
      data: campusOptions
    });
  } catch (error) {
    console.error('Error fetching campuses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch campuses'
    });
  }
});

// Get available programs for filtering
router.get('/filters/programs', authenticate, async (req, res) => {
  try {
    const programs = await User.distinct('program', { role: 'Student' });
    const validPrograms = programs.filter(program => program && program.trim() !== '');
    
    const programOptions = [
      { value: 'all', label: 'All Programs' },
      ...validPrograms.map(program => ({
        value: program.toLowerCase(),
        label: program
      }))
    ];

    res.json({
      success: true,
      data: programOptions
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch programs'
    });
  }
});

// Get available staff members for filtering
router.get('/filters/staff', authenticate, async (req, res) => {
  try {
    const staffMembers = await Correspondence.aggregate([
      {
        $group: {
          _id: '$staffMember.id',
          name: { $first: '$staffMember.name' },
          role: { $first: '$staffMember.role' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const staffOptions = [
      { value: 'all', label: 'All Staff Members' },
      ...staffMembers.map(staff => ({
        value: staff._id.toString(),
        label: `${staff.name} (${staff.role}) - ${staff.count} communications`,
        count: staff.count
      }))
    ];

    res.json({
      success: true,
      data: staffOptions
    });
  } catch (error) {
    console.error('Error fetching staff members:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch staff members'
    });
  }
});

module.exports = router;
