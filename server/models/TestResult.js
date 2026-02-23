const mongoose = require('mongoose');

const TestResultSchema = new mongoose.Schema({
  // Test and Student References
  testId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Test',
    required: true,
    index: true
  },
  
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Marks Information
  obtainedMarks: {
    type: Number,
    required: function() {
      return !this.isAbsent;
    },
    min: 0,
    validate: {
      validator: function(value) {
        // Skip validation if student is absent
        if (this.isAbsent) return true;
        
        // Marks cannot exceed total marks of the test
        // Note: We'll need to populate test to check this
        return value >= 0;
      },
      message: 'Obtained marks cannot be negative'
    }
  },
  
  percentage: {
    type: Number,
    min: 0,
    max: 100
  },
  
  grade: {
    type: String,
    enum: ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D', 'F'],
    required: function() {
      return !this.isAbsent;
    }
  },
  
  // Status Information
  isAbsent: {
    type: Boolean,
    default: false
  },
  
  // Additional Information
  remarks: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Who entered the marks
  enteredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Entry Tracking
  enteredOn: {
    type: Date,
    default: Date.now
  },
  
  updatedOn: {
    type: Date,
    default: Date.now
  },
  
  // Version control for marks changes
  version: {
    type: Number,
    default: 1
  },
  
  // History of changes (for audit trail)
  changeHistory: [{
    previousMarks: Number,
    newMarks: Number,
    previousGrade: String,
    newGrade: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    changedOn: {
      type: Date,
      default: Date.now
    },
    reason: String
  }]
});

// Compound indexes for better performance
TestResultSchema.index({ testId: 1, studentId: 1 }, { unique: true });
TestResultSchema.index({ studentId: 1, enteredOn: -1 });
TestResultSchema.index({ testId: 1, percentage: -1 });

// Pre-save middleware
TestResultSchema.pre('save', async function(next) {
  this.updatedOn = new Date();
  
  // Calculate percentage if marks are provided
  if (!this.isAbsent && this.obtainedMarks !== undefined) {
    // Get the test to find total marks
    const Test = mongoose.model('Test');
    const test = await Test.findById(this.testId);
    
    if (test) {
      // Validate obtained marks don't exceed total marks
      if (this.obtainedMarks > test.totalMarks) {
        const error = new Error(`Obtained marks (${this.obtainedMarks}) cannot exceed total marks (${test.totalMarks})`);
        return next(error);
      }
      
      // Calculate percentage
      this.percentage = Math.round((this.obtainedMarks / test.totalMarks) * 100 * 100) / 100; // Round to 2 decimal places
      
      // Calculate grade based on percentage
      this.grade = this.calculateGrade(this.percentage);
    }
  } else if (this.isAbsent) {
    // Clear marks for absent students
    this.obtainedMarks = 0;
    this.percentage = 0;
    this.grade = 'F';
  }
  
  next();
});

// Pre-update middleware to track changes
TestResultSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  
  // If marks are being updated, add to change history
  if (update.obtainedMarks !== undefined || update.isAbsent !== undefined) {
    const doc = await this.model.findOne(this.getQuery());
    
    if (doc && (doc.obtainedMarks !== update.obtainedMarks || doc.isAbsent !== update.isAbsent)) {
      const changeEntry = {
        previousMarks: doc.obtainedMarks,
        newMarks: update.obtainedMarks,
        previousGrade: doc.grade,
        changedBy: update.enteredBy || doc.enteredBy,
        reason: update.changeReason || 'Marks updated'
      };
      
      // Add to change history
      if (!update.$push) update.$push = {};
      update.$push.changeHistory = changeEntry;
      
      // Increment version
      if (!update.$inc) update.$inc = {};
      update.$inc.version = 1;
    }
  }
  
  next();
});

// Method to calculate grade based on percentage
TestResultSchema.methods.calculateGrade = function(percentage) {
  if (percentage >= 90) return 'A+';
  if (percentage >= 85) return 'A';
  if (percentage >= 80) return 'B+';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C+';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'F';
};

// Method to get student's performance trend
TestResultSchema.statics.getStudentPerformanceTrend = async function(studentId, subject = null, limit = 10) {
  const pipeline = [
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        isAbsent: false
      }
    },
    {
      $lookup: {
        from: 'tests',
        localField: 'testId',
        foreignField: '_id',
        as: 'test'
      }
    },
    {
      $unwind: '$test'
    }
  ];
  
  // Filter by subject if provided
  if (subject) {
    pipeline.push({
      $match: {
        'test.subject': subject
      }
    });
  }
  
  pipeline.push(
    {
      $sort: { 'test.testDate': -1 }
    },
    {
      $limit: limit
    },
    {
      $project: {
        obtainedMarks: 1,
        percentage: 1,
        grade: 1,
        testTitle: '$test.title',
        testDate: '$test.testDate',
        testType: '$test.testType',
        subject: '$test.subject',
        totalMarks: '$test.totalMarks'
      }
    }
  );
  
  return this.aggregate(pipeline);
};

// Method to get class performance summary for a test
TestResultSchema.statics.getClassPerformanceSummary = function(testId) {
  return this.aggregate([
    {
      $match: { testId: new mongoose.Types.ObjectId(testId) }
    },
    {
      $group: {
        _id: null,
        totalStudents: { $sum: 1 },
        averagePercentage: { $avg: '$percentage' },
        highestMarks: { $max: '$obtainedMarks' },
        lowestMarks: { $min: '$obtainedMarks' },
        passCount: {
          $sum: {
            $cond: [{ $gte: ['$percentage', 40] }, 1, 0]
          }
        },
        absentCount: {
          $sum: {
            $cond: ['$isAbsent', 1, 0]
          }
        },
        gradeDistribution: {
          $push: '$grade'
        }
      }
    },
    {
      $project: {
        totalStudents: 1,
        averagePercentage: { $round: ['$averagePercentage', 2] },
        highestMarks: 1,
        lowestMarks: 1,
        passCount: 1,
        failCount: { $subtract: ['$totalStudents', '$passCount'] },
        absentCount: 1,
        passPercentage: {
          $round: [
            { $multiply: [{ $divide: ['$passCount', '$totalStudents'] }, 100] },
            2
          ]
        },
        gradeDistribution: 1
      }
    }
  ]);
};

// Method to compare with matriculation performance
TestResultSchema.statics.compareWithMatriculation = async function(studentId, subject) {
  const pipeline = [
    {
      $match: {
        studentId: new mongoose.Types.ObjectId(studentId),
        isAbsent: false
      }
    },
    {
      $lookup: {
        from: 'tests',
        localField: 'testId',
        foreignField: '_id',
        as: 'test'
      }
    },
    {
      $unwind: '$test'
    },
    {
      $match: {
        'test.subject': subject
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'studentId',
        foreignField: '_id',
        as: 'student'
      }
    },
    {
      $unwind: '$student'
    },
    {
      $project: {
        percentage: 1,
        testDate: '$test.testDate',
        testType: '$test.testType',
        matricSubject: {
          $filter: {
            input: '$student.academicRecords.matriculation.subjects',
            cond: { $eq: ['$$this.name', subject] }
          }
        }
      }
    },
    {
      $sort: { testDate: -1 }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Virtual for formatted entry date
TestResultSchema.virtual('formattedEntryDate').get(function() {
  return this.enteredOn.toLocaleDateString();
});

// Ensure virtual fields are serialized
TestResultSchema.set('toJSON', { virtuals: true });
TestResultSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TestResult', TestResultSchema);

// ------------------------
// Background recalculation scheduler
// ------------------------
// Debounce recalculation calls per-student so multiple quick edits trigger only
// one analytics recalculation. This runs in the background and won't block
// the request that saved/updated the TestResult.
const pendingRecalc = new Map(); // studentId -> timeoutId
const RECALC_DELAY_MS = 2000; // 2 seconds

function scheduleStudentRecalc(studentId) {
  try {
    const sid = String(studentId);
    // Clear existing timer if present
    if (pendingRecalc.has(sid)) {
      clearTimeout(pendingRecalc.get(sid));
    }

    const timeoutId = setTimeout(async () => {
      pendingRecalc.delete(sid);
      try {
        const StudentAnalytics = mongoose.model('StudentAnalytics');
        // Fire-and-forget; log any error
        await StudentAnalytics.calculateForStudent(sid).catch(err => {
          console.error(`Background analytics recalculation failed for ${sid}:`, err && err.message ? err.message : err);
        });
      } catch (err) {
        console.error('Failed to run background analytics recalculation:', err && err.message ? err.message : err);
      }
    }, RECALC_DELAY_MS);

    pendingRecalc.set(sid, timeoutId);
  } catch (err) {
    console.error('Error scheduling student analytics recalculation:', err && err.message ? err.message : err);
  }
}

// Trigger after creating a new test result
TestResultSchema.post('save', function(doc) {
  if (doc && doc.studentId) {
    scheduleStudentRecalc(doc.studentId);
  }
});

// Trigger after an update via findOneAndUpdate
TestResultSchema.post('findOneAndUpdate', function(doc) {
  // `doc` is the document after update when { new: true } is used; otherwise it may be the pre-update doc
  if (doc && doc.studentId) {
    scheduleStudentRecalc(doc.studentId);
  } else if (this && this.getQuery) {
    // Fallback: try to fetch the updated doc to determine studentId
    const q = this.getQuery();
    if (q && q._id) {
      const Model = this.model;
      Model.findById(q._id).select('studentId').lean().then(d => {
        if (d && d.studentId) scheduleStudentRecalc(d.studentId);
      }).catch(err => {
        console.error('Failed to schedule student recalculation after update (lookup failed):', err && err.message ? err.message : err);
      });
    }
  }
});
