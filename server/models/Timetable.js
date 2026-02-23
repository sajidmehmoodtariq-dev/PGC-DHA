const mongoose = require('mongoose');

const TimetableSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  
  // Academic Session
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }
  },
  
  // Class Information
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  
  // Day of the week
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    index: true
  },
  
  // Time Slot
  startTime: {
    type: String,
    required: true,
    validate: {
      validator: function(time) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Time must be in HH:MM format'
    }
  },
  
  endTime: {
    type: String,
    required: true,
    validate: {
      validator: function(time) {
        return /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
      },
      message: 'Time must be in HH:MM format'
    }
  },
  
  // Teacher Assignment
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Subject Information
  subject: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  
  // Lecture Type
  lectureType: {
    type: String,
    enum: ['Theory', 'Practical', 'Lab', 'Tutorial'],
    default: 'Theory'
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Who created/updated the timetable
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
TimetableSchema.pre('save', function(next) {
  this.updatedOn = new Date();
  next();
});

// Virtual for duration in minutes
TimetableSchema.virtual('durationMinutes').get(function() {
  const [startHour, startMin] = this.startTime.split(':').map(Number);
  const [endHour, endMin] = this.endTime.split(':').map(Number);
  
  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;
  
  return endTotal - startTotal;
});

// Virtual for formatted time slot
TimetableSchema.virtual('timeSlot').get(function() {
  return `${this.startTime} - ${this.endTime}`;
});

// Static method to get timetable for a specific class and day
TimetableSchema.statics.getClassTimetable = function(classId, dayOfWeek) {
  return this.find({ 
    classId, 
    dayOfWeek, 
    isActive: true 
  })
  .populate('teacherId', 'fullName userName email')
  .populate('classId', 'name grade campus program floor')
  .sort({ startTime: 1 });
};

// Static method to get teacher's schedule
TimetableSchema.statics.getTeacherSchedule = function(teacherId, dayOfWeek) {
  const query = { teacherId, isActive: true };
  if (dayOfWeek) query.dayOfWeek = dayOfWeek;
  
  return this.find(query)
    .populate('classId', 'name grade campus program floor')
    .sort({ dayOfWeek: 1, startTime: 1 });
};

// Static method to get floor timetable
TimetableSchema.statics.getFloorTimetable = function(floor, dayOfWeek) {
  return this.aggregate([
    {
      $lookup: {
        from: 'classes',
        localField: 'classId',
        foreignField: '_id',
        as: 'class'
      }
    },
    {
      $unwind: '$class'
    },
    {
      $match: {
        'class.floor': floor,
        dayOfWeek: dayOfWeek,
        isActive: true
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'teacherId',
        foreignField: '_id',
        as: 'teacher'
      }
    },
    {
      $unwind: '$teacher'
    },
    {
      $sort: { startTime: 1 }
    },
    {
      $project: {
        _id: 1,
        title: 1,
        dayOfWeek: 1,
        startTime: 1,
        endTime: 1,
        subject: 1,
        lectureType: 1,
        'class._id': 1,
        'class.name': 1,
        'class.grade': 1,
        'class.campus': 1,
        'class.program': 1,
        'teacher.fullName': 1,
        'teacher.userName': 1,
        'teacher._id': 1
      }
    }
  ]);
};

// Method to check for time conflicts
TimetableSchema.methods.hasTimeConflict = async function() {
  // Use $and to combine participant overlap (teacher or class) with time overlap.
  // Previous implementation mistakenly had two $or keys, causing one to overwrite the other.
  const conflicts = await this.constructor.find({
    _id: { $ne: this._id },
    dayOfWeek: this.dayOfWeek,
    isActive: true,
    $and: [
      { $or: [ { teacherId: this.teacherId }, { classId: this.classId } ] },
      { startTime: { $lt: this.endTime }, endTime: { $gt: this.startTime } }
    ]
  }).populate('teacherId classId');
  
  return conflicts;
};

// Compound indexes for efficient queries
TimetableSchema.index({ classId: 1, dayOfWeek: 1, startTime: 1 });
TimetableSchema.index({ teacherId: 1, dayOfWeek: 1, startTime: 1 });
TimetableSchema.index({ dayOfWeek: 1, startTime: 1 });
TimetableSchema.index({ academicYear: 1, isActive: 1 });

// Ensure virtual fields are serialized
TimetableSchema.set('toJSON', { virtuals: true });
TimetableSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Timetable', TimetableSchema);
