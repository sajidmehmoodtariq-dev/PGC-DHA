const mongoose = require('mongoose');

const correspondenceSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'student',           // Student-related communication
      'call',              // Phone call
      'meeting',           // In-person meeting
      'follow-up',         // Follow-up communication
      'enquiry'            // Enquiry-related communication (separate from level changes)
    ],
    required: true
  },
  subject: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  // Additional fields for admitted students with class assignments
  toWhom: {
    type: String,
    enum: ['parent', 'sibling', 'student'],
    required: function() {
      // Required only if the student is admitted (type === 'student') and has class
      return this.type === 'student';
    }
  },
  communicationCategory: {
    type: String,
    enum: ['appreciation', 'results', 'discipline', 'attendance', 'fee', 'general'],
    required: function() {
      // Required only if the student is admitted (type === 'student') and has class
      return this.type === 'student';
    },
    default: 'general'
  },
  staffMember: {
    id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    role: {
      type: String,
      required: true
    }
  },
  studentLevel: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better performance
correspondenceSchema.index({ studentId: 1, timestamp: -1 });
correspondenceSchema.index({ 'staffMember.id': 1, timestamp: -1 });
correspondenceSchema.index({ type: 1, timestamp: -1 });
correspondenceSchema.index({ studentLevel: 1 });

module.exports = mongoose.model('Correspondence', correspondenceSchema);
