const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Simplified Family Info Schema - keeping only essential family details
const FamilyInfoSchema = new mongoose.Schema({
  fatherName: String,
  fatherOccupation: String,
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  }
}, { _id: false });

const UserSchema = new mongoose.Schema({
  // Core Identity Fields
  userName: { type: String, required: true, unique: true },
  email: { type: String, required: false }, // Removed unique constraint
  password: { type: String, required: true },
  fullName: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true }
  },
  role: { type: String, required: true }, // e.g., 'SystemAdmin', 'Teacher', etc.
  roleId: { type: String }, // for legacy mapping if needed
  instituteId: { type: mongoose.Schema.Types.ObjectId, ref: 'Institute' },

  // Coordinator Assignment (only for Coordinator role)
  coordinatorAssignment: {
    grade: {
      type: String,
      enum: ['11th', '12th'],
      required: function () { return this.role === 'Coordinator'; }
    },
    campus: {
      type: String,
      enum: ['Boys', 'Girls'],
      required: function () { return this.role === 'Coordinator'; }
    }
  },

  status: { type: Number, default: 1 }, // 1=Active, 2=Paused, 3=Deleted

  // Contact Information - simplified to essential fields only
  phoneNumber: String,    // Primary phone number
  secondaryPhone: String, // Secondary phone number (optional)
  address: String,
  reference: String,      // Reference person name

  // Academic Background - simplified
  previousSchool: String,  // Previous school/college name
  program: {              // Student program (only for students)
    type: String,
    required: false,
    validate: {
      validator: function (value) {
        // If user is a teacher or admin, program field can be empty or any value
        if (this.role === 'Teacher' || this.role === 'SystemAdmin' || this.role === 'ITAdmin' || this.role === 'FinanceAdmin' || this.role === 'Receptionist' || this.role === 'Principal' || this.role === 'Coordinator') {
          return true; // Allow any value for non-student roles
        }
        // For students, validate against enum values only if value is provided
        if (!value || value.trim() === '') {
          return true; // Allow empty for students too
        }

        // Auto-map common variations to valid programs
        const programMappings = {
          'ICS': 'ICS-PHY',
          'ICS PHY': 'ICS-PHY',
          'ICS STAT': 'ICS-STAT',
          'F.A': 'FA',
          'Pre Eng': 'Pre Engineering',
          'Pre Med': 'Pre Medical'
        };

        // Apply mapping if needed
        const mappedProgram = programMappings[value] || value;
        if (mappedProgram !== value) {
          this.program = mappedProgram; // Auto-correct the value
        }

        const validPrograms = ['ICS-PHY', 'ICS-STAT', 'ICOM', 'Pre Engineering', 'Pre Medical', 'FA', 'FA IT', 'General Science'];
        return validPrograms.includes(mappedProgram);
      },
      message: 'Invalid program. Valid programs are: ICS-PHY, ICS-STAT, ICOM, Pre Engineering, Pre Medical, FA, FA IT, General Science'
    }
  },

  // Matriculation Details - simplified
  matricMarks: Number,     // Marks obtained in matriculation
  matricTotal: Number,     // Total marks in matriculation

  // Personal Information
  gender: String,
  dob: Date,
  cnic: {
    type: String,
    required: false, // Made optional
    unique: true,
    sparse: true, // Allows multiple null values
    validate: {
      validator: function (value) {
        // If CNIC is provided, validate format
        if (!value) return true; // Allow empty CNIC
        // CNIC can be in format 12345-1234567-1 or 1234512345671 (13 digits)
        const withDashes = /^\d{5}-\d{7}-\d{1}$/;
        const withoutDashes = /^\d{13}$/;
        return withDashes.test(value) || withoutDashes.test(value);
      },
      message: 'CNIC must be in format 12345-1234567-1 or 13 digits'
    }
  },
  fatherName: String,      // Added for student father name
  imageUrl: String,

  // Campus Assignment (for attendance tracking)
  campus: {
    type: String,
    enum: ['Boys', 'Girls'],
    required: false // Will be auto-assigned based on gender for active students
  },

  // System Fields
  createdOn: { type: Date, default: Date.now },
  updatedOn: { type: Date, default: Date.now },
  deletedAt: { type: Date }, // Added for soft delete
  lastPasswordChangedOn: Date,
  cookieId: String,
  newLoginOTP: String,

  // Class Assignment for Students
  classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  rollNumber: { type: String, required: false }, // Student's roll number in their assigned class

  // Enquiry Level System (1-5)
  enquiryLevel: {
    type: Number,
    default: 1,
    min: 1,
    max: 5,
    required: true
  }, // 1: Initial Enquiry, 2: Follow-up, 3: Serious Interest, 4: Documents Submitted, 5: Admitted

  // Level History Tracking - tracks when each level was achieved
  levelHistory: [{
    level: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    achievedOn: {
      type: Date,
      required: true,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false // Can be null for system updates or initial creation
    },
    updatedByName: {
      type: String,
      required: false
    },
    isDecrement: {
      type: Boolean,
      default: false // True when this entry represents a level decrease
    },
    previousLevel: {
      type: Number,
      required: false // Only set when isDecrement is true
    },
    reason: {
      type: String,
      required: false // Optional reason for level changes, especially decrements
    }
  }],

  // Additional Information for Level 5 (Admitted) Students
  admissionInfo: {
    grade: {
      type: String,
      enum: ['11th', '12th'],
      required: function () { return this.enquiryLevel === 5; }
    },
    program: {
      type: String,
      required: false // Added for program assignment
    },
    className: {
      type: String,
      required: false
    }
  },

  // Essential Student Fields Only
  prospectusStage: { type: Number, default: 1 }, // Keep for backward compatibility
  isEnrolledPreClasses: { type: Boolean, default: false },

  // Enquiry Progression Tracking
  prospectusPurchasedOn: Date,
  afSubmittedOn: Date,
  installmentSubmittedOn: Date,
  isProcessed: { type: Boolean, default: false },

  // Family Info (for all roles)
  familyInfo: FamilyInfoSchema,

  // Academic Records (for students only)
  academicRecords: {
    // Matriculation/10th Grade Records
    matriculation: {
      totalMarks: { type: Number, min: 0 },
      obtainedMarks: { type: Number, min: 0 },
      percentage: { type: Number, min: 0, max: 100 },
      passingYear: { type: Number },
      board: { type: String, trim: true }, // e.g., "Federal Board", "Punjab Board"
      subjects: [{
        name: { type: String, required: true, trim: true },
        totalMarks: { type: Number, required: true, min: 1 },
        obtainedMarks: { type: Number, required: true, min: 0 },
        percentage: { type: Number, min: 0, max: 100 },
        grade: { type: String, trim: true } // A+, A, B+, etc.
      }]
    },
    
    // Previous Grade Records (for 12th grade students - their 11th grade performance)
    previousGrade: {
      grade: { type: String, enum: ['10th', '11th'], required: false },
      totalMarks: { type: Number, min: 0 },
      obtainedMarks: { type: Number, min: 0 },
      percentage: { type: Number, min: 0, max: 100 },
      academicYear: { type: String }, // e.g., "2023-2024"
      subjects: [{
        name: { type: String, required: true, trim: true },
        totalMarks: { type: Number, required: true, min: 1 },
        obtainedMarks: { type: Number, required: true, min: 0 },
        percentage: { type: Number, min: 0, max: 100 },
        grade: { type: String, trim: true },
        term: { type: String, enum: ['1st Term', '2nd Term', 'Annual'], required: true }
      }]
    },
    
    // Academic Performance Tracking
    lastUpdatedOn: { type: Date, default: Date.now },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },

  // Attendance (relationship)
  attendance: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Attendance' }],

  // Receptionist Remarks
  receptionistRemarks: [{
    remark: { type: String, required: true },
    receptionistId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receptionistName: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],

  // Misc
  isActive: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: false },
  isSuspended: { type: Boolean, default: false }
});

// Password hashing pre-save hook
UserSchema.pre('save', async function (next) {
  // Auto-assign campus based on gender if not set
  if (!this.campus && this.gender) {
    this.campus = this.gender === 'Female' ? 'Girls' : 'Boys';
  }

  // Auto-map program variations to standard programs for students
  if (this.role === 'Student' && this.program) {
    const programMappings = {
      'ICS': 'ICS-PHY',
      'ICS PHY': 'ICS-PHY',
      'ICS STAT': 'ICS-STAT',
      'F.A': 'FA',
      'Pre Eng': 'Pre Engineering',
      'Pre Med': 'Pre Medical'
    };

    if (programMappings[this.program]) {
      console.log(`Auto-mapping program from "${this.program}" to "${programMappings[this.program]}" for student ${this.fullName?.firstName} ${this.fullName?.lastName}`);
      this.program = programMappings[this.program];
    }
  }

  // Track level history for enquiry/prospectus stage changes
  if (this.role === 'Student') {
    const currentLevel = this.prospectusStage || this.enquiryLevel || 1;
    
    // If this is a new document (no levelHistory exists), initialize it with incremental approach
    if (!this.levelHistory || this.levelHistory.length === 0) {
      this.levelHistory = [];
      const creationDate = this.createdOn || new Date();
      
      // Add entries for all levels from 1 up to the current level
      // This ensures that a student created at Level 3 shows up in Level 1+, 2+, and 3+ stats
      for (let level = 1; level <= currentLevel; level++) {
        this.levelHistory.push({
          level: level,
          achievedOn: creationDate,
          updatedBy: this._updatedBy || null,
          updatedByName: this._updatedByName || 'System'
        });
      }
      
      console.log(`Initializing incremental level history for new student ${this.fullName?.firstName} ${this.fullName?.lastName}: Levels 1-${currentLevel} on ${creationDate.toISOString()}`);
    } else {
      // Check if level has changed from the most recent entry
      const lastLevelEntry = this.levelHistory[this.levelHistory.length - 1];
      if (lastLevelEntry.level !== currentLevel) {
        const changeDate = new Date();
        
        if (currentLevel > lastLevelEntry.level) {
          // Level increased - add entries for any missing intermediate levels and the new level
          const startLevel = lastLevelEntry.level + 1;
          
          for (let level = startLevel; level <= currentLevel; level++) {
            this.levelHistory.push({
              level: level,
              achievedOn: changeDate,
              updatedBy: this._updatedBy || null,
              updatedByName: this._updatedByName || 'System'
            });
          }
          
          console.log(`Level progression for student ${this.fullName?.firstName} ${this.fullName?.lastName}: Added levels ${startLevel}-${currentLevel} on ${changeDate.toISOString()}`);
        } else {
          // Level decreased - add a decrementation entry
          this.levelHistory.push({
            level: currentLevel,
            achievedOn: changeDate,
            updatedBy: this._updatedBy || null,
            updatedByName: this._updatedByName || 'System',
            isDecrement: true,
            previousLevel: lastLevelEntry.level,
            reason: this._decrementReason || 'Level decreased'
          });
          
          console.log(`Level decremented for student ${this.fullName?.firstName} ${this.fullName?.lastName}: From level ${lastLevelEntry.level} to ${currentLevel} on ${changeDate.toISOString()}`);
        }
      }
    }

    // Sync prospectusStage with enquiryLevel if they differ
    if (this.enquiryLevel && this.prospectusStage !== this.enquiryLevel) {
      this.prospectusStage = this.enquiryLevel;
    }
  }

  // Update the updatedOn timestamp
  this.updatedOn = new Date();

  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Virtual for accountStatus
UserSchema.virtual('accountStatus').get(function () {
  if (this.status === 1 && this.isActive && this.isApproved) return 'Active';
  if (this.status === 2 || this.isSuspended || this.isActive === false) return 'Paused';
  return 'Pending';
});

module.exports = mongoose.model('User', UserSchema);
