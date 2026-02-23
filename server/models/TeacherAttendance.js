const mongoose = require('mongoose');

const TeacherAttendanceSchema = new mongoose.Schema({
  // Core References
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  timetableId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Timetable',
    required: true,
    index: true
  },
  
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  
  // Date of the lecture
  date: {
    type: Date,
    required: true,
    index: true,
    default: () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return today;
    }
  },
  
  // Attendance Status
  status: {
    type: String,
    required: true,
    enum: ['On Time', 'Late', 'Absent', 'Cancelled'],
    default: 'On Time'
  },
  
  // Late arrival details (if status is Late)
  lateMinutes: {
    type: Number,
    min: 0,
    max: 60,
    required: function() {
      return this.status === 'Late';
    }
  },
  
  // Predefined late options: 1, 2, 3, 4, 5, 10, or custom
  lateType: {
    type: String,
    enum: ['1 min', '2 min', '3 min', '4 min', '5 min', '10 min', 'Custom'],
    required: function() {
      return this.status === 'Late';
    }
  },
  
  // Subject taught
  subject: {
    type: String,
    required: true,
    trim: true
  },
  
  // Lecture type
  lectureType: {
    type: String,
    enum: ['Theory', 'Practical', 'Lab', 'Tutorial'],
    default: 'Theory'
  },
  
  // Optional remarks
  remarks: {
    type: String,
    maxlength: 300,
    trim: true
  },
  
  // Coordinator remarks (separate from general remarks)
  coordinatorRemarks: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Who marked the attendance (Floor Coordinator)
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Floor information (auto-filled from class)
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 4
  },
  
  // Track if notification action has been taken
  notificationActionTaken: {
    type: Boolean,
    default: false
  },
  
  // Details of the notification action taken
  notificationAction: {
    action: {
      type: String,
      enum: ['contact_coordinator', 'escalate', 'mark_resolved']
    },
    takenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    takenAt: Date,
    notes: String
  },
  
  // Timestamps
  createdOn: {
    type: Date,
    default: Date.now
  },
  
  updatedOn: {
    type: Date,
    default: Date.now
  }
});

// Pre-save middleware
TeacherAttendanceSchema.pre('save', function(next) {
  this.updatedOn = new Date();
  
  // Auto-set lateMinutes based on lateType
  if (this.status === 'Late' && this.lateType && this.lateType !== 'Custom') {
    const minutes = parseInt(this.lateType.split(' ')[0]);
    if (!isNaN(minutes)) {
      this.lateMinutes = minutes;
    }
  }
  
  next();
});

// Prevent duplicate attendance for same teacher, timetable, and date
TeacherAttendanceSchema.index({ teacherId: 1, timetableId: 1, date: 1 }, { unique: true });

// Virtual for formatted late time
TeacherAttendanceSchema.virtual('formattedLateTime').get(function() {
  if (this.status !== 'Late') return null;
  
  if (this.lateMinutes === 1) return '1 minute late';
  return `${this.lateMinutes} minutes late`;
});

// Static method to get teacher attendance for a specific date
TeacherAttendanceSchema.statics.getTeacherAttendanceByDate = function(teacherId, date) {
  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);
  
  return this.find({ teacherId, date: queryDate })
    .populate('timetableId', 'subject startTime endTime dayOfWeek')
    .populate('classId', 'name grade campus program')
    .populate('markedBy', 'fullName userName')
    .sort({ 'timetableId.startTime': 1 });
};

// Static method to get floor teacher attendance for a date
TeacherAttendanceSchema.statics.getFloorAttendanceByDate = function(floor, date) {
  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);
  
  return this.find({ floor, date: queryDate })
    .populate('teacherId', 'fullName userName email')
    .populate('timetableId', 'subject startTime endTime dayOfWeek')
    .populate('classId', 'name grade campus program')
    .populate('markedBy', 'fullName userName')
    .sort({ 'timetableId.startTime': 1 });
};

// Static method to get attendance statistics for a teacher
TeacherAttendanceSchema.statics.getTeacherStats = function(teacherId, startDate, endDate) {
  const matchQuery = { teacherId };
  
  if (startDate || endDate) {
    matchQuery.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      matchQuery.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchQuery.date.$lte = end;
    }
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalLateMinutes: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'Late'] },
              '$lateMinutes',
              0
            ]
          }
        }
      }
    }
  ]);
};

// Static method to get monthly attendance report
TeacherAttendanceSchema.statics.getMonthlyReport = function(year, month, floor = null) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);
  
  const matchQuery = {
    date: { $gte: startDate, $lte: endDate }
  };
  
  if (floor) {
    matchQuery.floor = floor;
  }
  
  return this.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'users',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    { $unwind: '$teacher' },
    {
      $group: {
        _id: {
          teacherId: '$teacherId',
          teacherName: '$teacher.fullName',
          status: '$status'
        },
        count: { $sum: 1 },
        totalLateMinutes: {
          $sum: {
            $cond: [
              { $eq: ['$status', 'Late'] },
              '$lateMinutes',
              0
            ]
          }
        }
      }
    },
    {
      $group: {
        _id: {
          teacherId: '$_id.teacherId',
          teacherName: '$_id.teacherName'
        },
        stats: {
          $push: {
            status: '$_id.status',
            count: '$count',
            totalLateMinutes: '$totalLateMinutes'
          }
        },
        totalLectures: { $sum: '$count' }
      }
    },
    {
      $sort: { '_id.teacherName.firstName': 1 }
    }
  ]);
};

// Method to calculate punctuality percentage
TeacherAttendanceSchema.statics.getPunctualityStats = function(teacherId, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);
  
  return this.aggregate([
    {
      $match: {
        teacherId: new mongoose.Types.ObjectId(teacherId),
        date: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        onTime: {
          $sum: {
            $cond: [{ $eq: ['$status', 'On Time'] }, 1, 0]
          }
        },
        late: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Late'] }, 1, 0]
          }
        },
        absent: {
          $sum: {
            $cond: [{ $eq: ['$status', 'Absent'] }, 1, 0]
          }
        },
        avgLateMinutes: {
          $avg: {
            $cond: [
              { $eq: ['$status', 'Late'] },
              '$lateMinutes',
              0
            ]
          }
        }
      }
    },
    {
      $project: {
        _id: 0,
        total: 1,
        onTime: 1,
        late: 1,
        absent: 1,
        punctualityPercentage: {
          $round: [
            {
              $multiply: [
                { $divide: ['$onTime', '$total'] },
                100
              ]
            },
            1
          ]
        },
        avgLateMinutes: { $round: ['$avgLateMinutes', 1] }
      }
    }
  ]);
};

// Ensure virtual fields are serialized
TeacherAttendanceSchema.set('toJSON', { virtuals: true });
TeacherAttendanceSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('TeacherAttendance', TeacherAttendanceSchema);
