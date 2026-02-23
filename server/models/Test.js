const mongoose = require('mongoose');

const TestSchema = new mongoose.Schema({
  // Basic Test Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Class Assignment
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  
  // Marks Information
  totalMarks: {
    type: Number,
    required: true,
    min: 1,
    max: 1000
  },
  
  // Test Date and Type
  testDate: {
    type: Date,
    required: true,
    index: true
  },
  
  testType: {
    type: String,
    required: true,
    enum: ['Quiz', 'Monthly', 'Mid Term', 'Final Term'],
    index: true
  },
  
  // Academic Context
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }
  },
  
  // Additional Information
  instructions: {
    type: String,
    maxlength: 1000,
    trim: true
  },
  
  // Phase 3 Enhanced Fields
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', 'Very Hard'],
    default: 'Medium'
  },
  
  syllabusCoverage: {
    type: [String], // Array of topics/chapters covered
    default: []
  },
  
  marksEntryDeadline: {
    type: Date,
    validate: {
      validator: function(v) {
        return !v || v > this.testDate;
      },
      message: 'Marks entry deadline must be after test date'
    }
  },
  
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    validate: {
      validator: async function(v) {
        if (!v) return true;
        const teacher = await mongoose.model('User').findById(v);
        return teacher && (teacher.role === 'teacher' || teacher.role === 'admin' || teacher.role === 'it-admin');
      },
      message: 'Assigned teacher must be a valid teacher, admin, or IT admin'
    }
  },
  
  isRetest: {
    type: Boolean,
    default: false
  },
  
  originalTestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: function() { return this.isRetest; }
  },
  
  allowLateSubmission: {
    type: Boolean,
    default: false
  },
  
  lateSubmissionPenalty: {
    type: Number,
    min: 0,
    max: 100,
    default: 0,
    validate: {
      validator: function(v) {
        return !this.allowLateSubmission || (v >= 0 && v <= 100);
      },
      message: 'Late submission penalty must be between 0 and 100'
    }
  },
  
  tags: {
    type: [String],
    default: []
  },
  
  estimatedDuration: {
    type: Number, // in minutes
    min: 5,
    max: 300,
    default: 60
  },
  
  passingMarks: {
    type: Number,
    min: 0,
    validate: {
      validator: function(v) {
        return !v || v <= this.totalMarks;
      },
      message: 'Passing marks cannot exceed total marks'
    }
  },
  
  duration: {
    type: Number, // in minutes
    min: 15,
    max: 300,
    default: 60
  },
  
  // Status and Management
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Who created the test
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Auto-assigned teacher based on subject and class
  assignedTeacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Will be auto-assigned when test is created
  },
  
  // Timestamps
  createdOn: {
    type: Date,
    default: Date.now
  },
  
  updatedOn: {
    type: Date,
    default: Date.now
  },
  
  // Marks entry deadline
  marksEntryDeadline: {
    type: Date,
    required: false
  },

  // Notification action tracking for late marksheet submissions
  notificationActionTaken: {
    type: Boolean,
    default: false
  },

  lastNotificationActionDate: {
    type: Date
  },

  originalMarksEntryDeadline: {
    type: Date
  }
});

// Indexes for better performance
TestSchema.index({ classId: 1, testDate: 1 });
TestSchema.index({ assignedTeacher: 1, testDate: 1 });
TestSchema.index({ academicYear: 1, testType: 1 });

// Pre-save middleware
TestSchema.pre('save', function(next) {
  this.updatedOn = new Date();
  
  // Auto-set marks entry deadline if not provided (7 days after test date)
  if (!this.marksEntryDeadline && this.testDate) {
    const deadline = new Date(this.testDate);
    deadline.setDate(deadline.getDate() + 7);
    this.marksEntryDeadline = deadline;
  }
  
  next();
});

// Virtual for formatted test date
TestSchema.virtual('formattedTestDate').get(function() {
  return this.testDate.toLocaleDateString();
});

// Method to check if marks entry is allowed
TestSchema.methods.canEnterMarks = function() {
  const now = new Date();
  const isDeadlinePassed = this.marksEntryDeadline && now > this.marksEntryDeadline;
  
  return {
    allowed: this.isActive && !isDeadlinePassed,
    reason: !this.isActive ? 'Test is inactive' :
            isDeadlinePassed ? 'Marks entry deadline passed' : null
  };
};

// Method to get test statistics
TestSchema.methods.getTestStats = async function() {
  const TestResult = mongoose.model('TestResult');
  
  const stats = await TestResult.aggregate([
    { $match: { testId: this._id } },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        averageMarks: { $avg: '$obtainedMarks' },
        highestMarks: { $max: '$obtainedMarks' },
        lowestMarks: { $min: '$obtainedMarks' },
        passCount: {
          $sum: {
            $cond: [
              { $gte: ['$percentage', 40] }, // 40% passing criteria
              1,
              0
            ]
          }
        },
        absentCount: {
          $sum: {
            $cond: ['$isAbsent', 1, 0]
          }
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalStudents: 0,
    averageMarks: 0,
    highestMarks: 0,
    lowestMarks: 0,
    passCount: 0,
    absentCount: 0
  };
};

// Static method to get tests for a teacher
TestSchema.statics.getTeacherTests = function(teacherId, options = {}) {
  const query = { assignedTeacher: teacherId, isActive: true };
  
  // Add date filters if provided
  if (options.fromDate || options.toDate) {
    query.testDate = {};
    if (options.fromDate) query.testDate.$gte = new Date(options.fromDate);
    if (options.toDate) query.testDate.$lte = new Date(options.toDate);
  }
  
  // Add academic year filter
  if (options.academicYear) query.academicYear = options.academicYear;
  
  // Add test type filter
  if (options.testType) query.testType = options.testType;
  
  return this.find(query)
    .populate('classId', 'name grade campus program')
    .populate('createdBy', 'fullName userName')
    .sort({ testDate: -1 });
};

// Static method to get upcoming tests
TestSchema.statics.getUpcomingTests = function(classId = null) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  
  const query = {
    testDate: { $gte: tomorrow },
    isActive: true
  };
  
  if (classId) query.classId = classId;
  
  return this.find(query)
    .populate('classId', 'name grade campus program')
    .populate('assignedTeacher', 'fullName userName')
    .sort({ testDate: 1 })
    .limit(10);
};

// Phase 3 Enhanced Static Methods

// Check for duplicate tests (same class, subject, test type, and date)
TestSchema.statics.checkDuplicateTest = function(testData) {
  const sameDayStart = new Date(testData.testDate);
  sameDayStart.setHours(0, 0, 0, 0);
  const sameDayEnd = new Date(testData.testDate);
  sameDayEnd.setHours(23, 59, 59, 999);
  
  return this.findOne({
    classId: testData.classId,
    subject: testData.subject,
    testType: testData.testType,
    testDate: { $gte: sameDayStart, $lte: sameDayEnd },
    isActive: true,
    _id: { $ne: testData._id } // Exclude current test when updating
  });
};

// Get available teachers for auto-assignment
TestSchema.statics.getAvailableTeachers = function(subject, testDate) {
  const User = mongoose.model('User');
  
  return User.find({
    role: { $in: ['teacher', 'admin', 'it-admin'] },
    isActive: true,
    subjects: subject // Assuming teachers have subjects array
  }).select('fullName userName subjects');
};

// Get tests by difficulty level
TestSchema.statics.getTestsByDifficulty = function(difficulty, academicYear = null) {
  const query = { difficulty, isActive: true };
  if (academicYear) query.academicYear = academicYear;
  
  return this.find(query)
    .populate('classId', 'name grade program')
    .populate('assignedTeacher', 'fullName')
    .sort({ testDate: -1 });
};

// Get test statistics by various criteria
TestSchema.statics.getAdvancedStats = async function(filters = {}) {
  const matchStage = { isActive: true };
  
  // Apply filters
  if (filters.academicYear) matchStage.academicYear = filters.academicYear;
  if (filters.classId) matchStage.classId = mongoose.Types.ObjectId(filters.classId);
  if (filters.subject) matchStage.subject = filters.subject;
  if (filters.testType) matchStage.testType = filters.testType;
  if (filters.difficulty) matchStage.difficulty = filters.difficulty;
  if (filters.assignedTeacher) matchStage.assignedTeacher = mongoose.Types.ObjectId(filters.assignedTeacher);
  
  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: null,
        totalTests: { $sum: 1 },
        upcomingTests: {
          $sum: { $cond: [{ $gt: ['$testDate', new Date()] }, 1, 0] }
        },
        completedTests: {
          $sum: { $cond: [{ $lt: ['$testDate', new Date()] }, 1, 0] }
        },
        avgMarks: { $avg: '$totalMarks' },
        difficultyDistribution: {
          $push: '$difficulty'
        },
        testTypeDistribution: {
          $push: '$testType'
        }
      }
    }
  ]);
  
  return stats[0] || {
    totalTests: 0,
    publishedTests: 0,
    upcomingTests: 0,
    completedTests: 0,
    draftTests: 0,
    avgMarks: 0,
    difficultyDistribution: [],
    testTypeDistribution: []
  };
};

// Get tests requiring marks entry
TestSchema.statics.getTestsRequiringMarksEntry = function(teacherId = null) {
  const query = {
    isActive: true,
    testDate: { $lt: new Date() }, // Test has occurred
    marksEntryDeadline: { $gte: new Date() } // Deadline not passed
  };
  
  if (teacherId) query.assignedTeacher = teacherId;
  
  return this.find(query)
    .populate('classId', 'name grade program')
    .populate('assignedTeacher', 'fullName userName')
    .sort({ marksEntryDeadline: 1 });
};

// Create retest
TestSchema.statics.createRetest = async function(originalTestId, retestData) {
  const originalTest = await this.findById(originalTestId);
  if (!originalTest) {
    throw new Error('Original test not found');
  }
  
  const retestDoc = new this({
    ...originalTest.toObject(),
    _id: undefined,
    isRetest: true,
    originalTestId: originalTestId,
    testDate: retestData.testDate,
    title: retestData.title || `${originalTest.title} (Retest)`,
    instructions: retestData.instructions || originalTest.instructions,
    createdBy: retestData.createdBy,
    createdOn: new Date(),
    updatedOn: new Date()
  });
  
  return retestDoc.save();
};

// Ensure virtual fields are serialized
TestSchema.set('toJSON', { virtuals: true });
TestSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Test', TestSchema);
