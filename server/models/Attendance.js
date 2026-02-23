const mongoose = require('mongoose');

// Simplified Attendance Schema - only essential fields
const AttendanceSchema = new mongoose.Schema({
  // Core References
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  classId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true,
    index: true
  },
  
  // Date and Status - the essentials
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
  
  status: {
    type: String,
    required: true,
    enum: ['Present', 'Absent', 'Late', 'Half Leave', 'Full Leave'],
    default: 'Present'
  },
  
  // Optional fields
  remarks: {
    type: String,
    maxlength: 200,
    trim: true
  },
  
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Role of person marking attendance
  markedByRole: {
    type: String,
    enum: ['Class Incharge', 'Floor Incharge', 'Subject Teacher'],
    required: true
  },
  
  // Subject being taught (if marked by subject teacher)
  subject: {
    type: String,
    required: false,
    trim: true
  },
  
  // Timestamps
  createdOn: {
    type: Date,
    default: Date.now
  }
});

// Prevent duplicate attendance for same student on same day
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });

// Basic query methods
AttendanceSchema.statics.getClassAttendance = function(classId, date) {
  const queryDate = new Date(date);
  queryDate.setHours(0, 0, 0, 0);
  
  return this.find({ classId, date: queryDate })
    .populate('studentId', 'fullName userName')
    .sort({ 'studentId.fullName.firstName': 1 });
};

AttendanceSchema.statics.getStudentAttendance = function(studentId, startDate, endDate) {
  const query = { studentId };
  
  if (startDate || endDate) {
    query.date = {};
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      query.date.$gte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      query.date.$lte = end;
    }
  }
  
  return this.find(query).sort({ date: -1 });
};

// Simple virtual for formatted date
AttendanceSchema.virtual('formattedDate').get(function() {
  return this.date.toLocaleDateString();
});

AttendanceSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
