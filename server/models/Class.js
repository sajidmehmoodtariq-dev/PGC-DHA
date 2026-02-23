const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  // Basic Class Information - now descriptive name instead of class number
  name: { 
    type: String, 
    required: true,
    trim: true,
    maxlength: 100,
    // Examples: "Computer Science A", "Biology Advanced", "Commerce Morning Section"
  },
  
  // Campus Information (Boys/Girls) - determines floor assignment
  campus: { 
    type: String, 
    required: true,
    enum: ['Boys', 'Girls']
  },
  
  // Grade Level (11th/12th) - determines floor assignment  
  grade: { 
    type: String, 
    required: true,
    enum: ['11th', '12th']
  },
  
  // Floor assignment based on campus and grade
  // Floor 1: 11th Boys, Floor 2: 12th Boys, Floor 3: 11th Girls, Floor 4: 12th Girls
  floor: {
    type: Number,
    required: true,
    min: 1,
    max: 4,
    default: function() {
      if (this.campus === 'Boys' && this.grade === '11th') return 1;
      if (this.campus === 'Boys' && this.grade === '12th') return 2;
      if (this.campus === 'Girls' && this.grade === '11th') return 3;
      if (this.campus === 'Girls' && this.grade === '12th') return 4;
      return 1;
    }
  },
  
  // Program/Subject
  program: {
    type: String,
    enum: [
      'ICS', 
      'ICS-PHY',      // ICS with Physics
      'ICS-STAT',     // ICS with Statistics  
      'ICOM', 
      'Pre Engineering', 
      'Pre Medical',
      'FA',           // Faculty of Arts
      'FA IT',        // Faculty of Arts with IT
      'FSc',          // Faculty of Science
      'Commerce'      // Commerce
    ],
    required: true
  },
  
  // Class Capacity
  maxStudents: {
    type: Number,
    default: 50,
    min: 1,
    max: 120
  },
  
  // Current Student Count (calculated field)
  currentStudents: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Academic Year/Session
  academicYear: {
    type: String,
    required: true,
    default: () => {
      const currentYear = new Date().getFullYear();
      return `${currentYear}-${currentYear + 1}`;
    }
  },
  
  // Class Status
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Teacher Assignment - Updated to support multiple teachers
  classIncharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // The main incharge teacher responsible for the class
  },
  
  // Multiple teachers who can take lectures in this class
  teachers: [{
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    subject: {
      type: String,
      required: false, // Subject they teach in this class
      trim: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  }],
  
  // Floor Coordinator/Incharge for attendance management
  floorIncharge: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Floor incharge who can mark attendance for multiple classes on the floor
  },
  
  // System Fields
  createdOn: { 
    type: Date, 
    default: Date.now 
  },
  
  updatedOn: { 
    type: Date, 
    default: Date.now 
  }
});

// Pre-save middleware to update timestamp and set floor
ClassSchema.pre('save', function(next) {
  this.updatedOn = new Date();
  
  // Auto-assign floor based on campus and grade
  if (this.campus === 'Boys' && this.grade === '11th') this.floor = 1;
  else if (this.campus === 'Boys' && this.grade === '12th') this.floor = 2;
  else if (this.campus === 'Girls' && this.grade === '11th') this.floor = 3;
  else if (this.campus === 'Girls' && this.grade === '12th') this.floor = 4;
  
  next();
});

// Virtual for full class name with floor information
ClassSchema.virtual('fullName').get(function() {
  return `${this.grade} ${this.program} - ${this.name} (${this.campus} - Floor ${this.floor})`;
});

// Virtual for floor description
ClassSchema.virtual('floorDescription').get(function() {
  const floorNames = {
    1: '11th Boys Floor',
    2: '12th Boys Floor', 
    3: '11th Girls Floor',
    4: '12th Girls Floor'
  };
  return floorNames[this.floor] || 'Unknown Floor';
});

// Virtual for frontend floor format ('1st', '2nd')
ClassSchema.virtual('floorDisplay').get(function() {
  // Map numeric floor to grade-based display for frontend
  if (this.grade === '11th') return '1st';
  if (this.grade === '12th') return '2nd';
  return '1st';
});

// Virtual to check if class is full
ClassSchema.virtual('isFull').get(function() {
  return this.currentStudents >= this.maxStudents;
});

// Virtual for available spots
ClassSchema.virtual('availableSpots').get(function() {
  return Math.max(0, this.maxStudents - this.currentStudents);
});

// Static method to find classes by floor
ClassSchema.statics.findByFloor = function(floor) {
  return this.find({ floor, isActive: true });
};

// Static method to find classes by campus
ClassSchema.statics.findByCampus = function(campus) {
  return this.find({ campus, isActive: true });
};

// Static method to find classes by grade and program
ClassSchema.statics.findByGradeAndProgram = function(grade, program) {
  return this.find({ grade, program, isActive: true });
};

// Static method to find available classes (not full)
ClassSchema.statics.findAvailable = function() {
  return this.find({ 
    isActive: true,
    $expr: { $lt: ['$currentStudents', '$maxStudents'] }
  });
};

// Method to add teacher to class
ClassSchema.methods.addTeacher = function(teacherId, subject = '') {
  // Check if teacher already exists
  const existingTeacher = this.teachers.find(t => t.teacherId.toString() === teacherId.toString());
  if (existingTeacher) {
    return { success: false, message: 'Teacher already assigned to this class' };
  }
  
  this.teachers.push({
    teacherId,
    subject: subject.trim(),
    isActive: true
  });
  
  return { success: true, message: 'Teacher added to class' };
};

// Method to remove teacher from class
ClassSchema.methods.removeTeacher = function(teacherId) {
  const teacherIndex = this.teachers.findIndex(t => t.teacherId.toString() === teacherId.toString());
  if (teacherIndex === -1) {
    return { success: false, message: 'Teacher not found in this class' };
  }
  
  this.teachers.splice(teacherIndex, 1);
  return { success: true, message: 'Teacher removed from class' };
};

// Method to check if user can mark attendance for this class
ClassSchema.methods.canMarkAttendance = function(userId) {
  // Class incharge can always mark attendance
  if (this.classIncharge) {
    // Handle both populated (object) and non-populated (ObjectId) classIncharge
    const classInchargeId = this.classIncharge._id || this.classIncharge;
    if (classInchargeId.toString() === userId.toString()) {
      return { canMark: true, role: 'Class Incharge' };
    }
  }
  
  // Floor incharge can mark attendance for any class on their floor
  if (this.floorIncharge) {
    // Handle both populated (object) and non-populated (ObjectId) floorIncharge
    const floorInchargeId = this.floorIncharge._id || this.floorIncharge;
    if (floorInchargeId.toString() === userId.toString()) {
      return { canMark: true, role: 'Floor Incharge' };
    }
  }
  
  // Any teacher assigned to this class can mark attendance
  const teacherAssignment = this.teachers.find(t => {
    // Handle both populated (object) and non-populated (ObjectId) teacherId
    const teacherId = t.teacherId._id || t.teacherId;
    return teacherId.toString() === userId.toString() && t.isActive;
  });
  if (teacherAssignment) {
    return { canMark: true, role: 'Subject Teacher', subject: teacherAssignment.subject };
  }
  
  return { canMark: false, reason: 'Not authorized to mark attendance for this class' };
};

// Method to update student count
ClassSchema.methods.updateStudentCount = async function() {
  const User = mongoose.model('User');
  
  // More comprehensive query to find students - use any one of the valid conditions
  const count = await User.countDocuments({ 
    classId: this._id,
    role: 'Student',
    // Look for active students (not deleted) - status !== 3 means not deleted
    status: { $ne: 3 },
    // Students should be at level 5 (admitted) OR have been approved/active
    $or: [
      { prospectusStage: { $gte: 5 } },  // Changed from exact 5 to >= 5
      { enquiryLevel: { $gte: 5 } },     // Changed from exact 5 to >= 5
      { isActive: true, isApproved: true } // Alternative: active & approved
    ]
  });
  
  console.log(`Updating student count for class ${this._id}: found ${count} students`);
  
  this.currentStudents = count;
  return this.save();
};

// Method to check if student can be assigned (campus and program match)
ClassSchema.methods.canAssignStudent = function(student) {
  // Check campus match based on gender
  const expectedCampus = student.gender === 'Male' ? 'Boys' : 'Girls';
  if (this.campus !== expectedCampus) {
    return { canAssign: false, reason: 'Campus mismatch' };
  }
  
  // Check program match
  if (this.program !== student.program) {
    return { canAssign: false, reason: 'Program mismatch' };
  }
  
  // Check if class is full
  if (this.currentStudents >= this.maxStudents) {
    return { canAssign: false, reason: 'Class is full' };
  }
  
  return { canAssign: true };
};

// Compound index for efficient queries
ClassSchema.index({ campus: 1, grade: 1, program: 1, isActive: 1 });
ClassSchema.index({ floor: 1, isActive: 1 });
ClassSchema.index({ academicYear: 1, isActive: 1 });
ClassSchema.index({ classIncharge: 1 });
ClassSchema.index({ floorIncharge: 1 });
ClassSchema.index({ 'teachers.teacherId': 1 });

// Ensure virtual fields are serialized
ClassSchema.set('toJSON', { virtuals: true });
ClassSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Class', ClassSchema);
