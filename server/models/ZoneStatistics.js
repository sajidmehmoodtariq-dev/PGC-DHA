const mongoose = require('mongoose');

const ZoneStatisticsSchema = new mongoose.Schema({
  // Statistics Type (overall or subject-specific)
  statisticType: {
    type: String,
    enum: ['overall', 'subject'],
    required: true,
    index: true
  },
  
  // Subject name (only for subject-specific statistics)
  subjectName: {
    type: String,
    required: function() {
      return this.statisticType === 'subject';
    },
    index: true
  },
  
  // Academic Year Context
  academicYear: {
    type: String,
    required: true,
    index: true,
    default: '2024-2025'
  },
  
  // Campus-wise Breakdown
  campusStats: [{
    campus: {
      type: String,
      enum: ['Boys', 'Girls'],
      required: true
    },
    
    // Grade-wise breakdown within campus
    gradeStats: [{
      grade: {
        type: String,
        enum: ['11th', '12th'],
        required: true
      },
      
      // Class-wise breakdown within grade
      classStats: [{
        classId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Class',
          required: true
        },
        className: {
          type: String,
          required: true
        },
        zoneDistribution: {
          green: { type: Number, default: 0 },
          blue: { type: Number, default: 0 },
          yellow: { type: Number, default: 0 },
          red: { type: Number, default: 0 },
          unassigned: { type: Number, default: 0 },
          total: { type: Number, default: 0 }
        }
      }],
      
      // Aggregated grade-level statistics
      gradeZoneDistribution: {
        green: { type: Number, default: 0 },
        blue: { type: Number, default: 0 },
        yellow: { type: Number, default: 0 },
        red: { type: Number, default: 0 },
        unassigned: { type: Number, default: 0 },
        total: { type: Number, default: 0 }
      }
    }],
    
    // Aggregated campus-level statistics
    campusZoneDistribution: {
      green: { type: Number, default: 0 },
      blue: { type: Number, default: 0 },
      yellow: { type: Number, default: 0 },
      red: { type: Number, default: 0 },
      unassigned: { type: Number, default: 0 },
      total: { type: Number, default: 0 }
    }
  }],
  
  // College-wide Aggregated Statistics
  collegeWideStats: {
    green: { type: Number, default: 0 },
    blue: { type: Number, default: 0 },
    yellow: { type: Number, default: 0 },
    red: { type: Number, default: 0 },
    unassigned: { type: Number, default: 0 },
    total: { type: Number, default: 0 }
  },
  
  // Metadata
  lastUpdated: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Performance tracking
  calculationDuration: {
    type: Number, // milliseconds
    default: 0
  },
  
  studentsProcessed: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  collection: 'zonestatistics'
});

// Compound Indexes for Performance
ZoneStatisticsSchema.index({ 
  statisticType: 1, 
  academicYear: 1, 
  subjectName: 1 
}, { unique: true });

ZoneStatisticsSchema.index({ academicYear: 1, lastUpdated: -1 });

// Virtual for zone percentages
ZoneStatisticsSchema.virtual('collegeWidePercentages').get(function() {
  const total = this.collegeWideStats.total;
  if (total === 0) return { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0 };
  
  return {
    green: Math.round((this.collegeWideStats.green / total) * 100),
    blue: Math.round((this.collegeWideStats.blue / total) * 100),
    yellow: Math.round((this.collegeWideStats.yellow / total) * 100),
    red: Math.round((this.collegeWideStats.red / total) * 100),
    unassigned: Math.round((this.collegeWideStats.unassigned / total) * 100)
  };
});

// Methods
ZoneStatisticsSchema.methods.getCampusStats = function(campus) {
  return this.campusStats.find(stat => stat.campus === campus);
};

ZoneStatisticsSchema.methods.getGradeStats = function(campus, grade) {
  const campusData = this.getCampusStats(campus);
  if (!campusData) return null;
  
  return campusData.gradeStats.find(stat => stat.grade === grade);
};

ZoneStatisticsSchema.methods.getClassStats = function(campus, grade, classId) {
  const gradeData = this.getGradeStats(campus, grade);
  if (!gradeData) return null;
  
  return gradeData.classStats.find(stat => stat.classId.toString() === classId.toString());
};

// Static Methods
ZoneStatisticsSchema.statics.generateOverallStatistics = async function(academicYear = '2024-2025') {
  const StudentAnalytics = mongoose.model('StudentAnalytics');
  const Class = mongoose.model('Class');
  
  const startTime = Date.now();
  
  try {
    // Get all student analytics for the academic year
    const analytics = await StudentAnalytics.find({
      academicYear,
      'overallAnalytics.overallZone': { $exists: true }
    }).populate('classId', 'name grade campus program');
    
    console.log(`Processing ${analytics.length} student analytics records`);
    
    // Initialize statistics structure
    const stats = {
      statisticType: 'overall',
      academicYear,
      campusStats: [],
      collegeWideStats: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
    };
    
    // Get all classes for structure
    const allClasses = await Class.find().sort({ campus: 1, grade: 1, name: 1 });
    
    // Initialize campus structure
    const campuses = ['Boys', 'Girls'];
    const grades = ['11th', '12th'];
    
    campuses.forEach(campus => {
      const campusData = {
        campus,
        gradeStats: [],
        campusZoneDistribution: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
      };
      
      grades.forEach(grade => {
        const gradeData = {
          grade,
          classStats: [],
          gradeZoneDistribution: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
        };
        
        // Add classes for this campus and grade
        const relevantClasses = allClasses.filter(cls => 
          cls.campus === campus && cls.grade === grade
        );
        
        relevantClasses.forEach(cls => {
          gradeData.classStats.push({
            classId: cls._id,
            className: cls.name,
            zoneDistribution: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
          });
        });
        
        campusData.gradeStats.push(gradeData);
      });
      
      stats.campusStats.push(campusData);
    });
    
    // Process each student analytics record
    analytics.forEach(studentAnalytic => {
      const zone = studentAnalytic.overallAnalytics.overallZone;
      const campus = studentAnalytic.campus;
      const grade = studentAnalytic.grade;
      const classId = studentAnalytic.classId;
      
      if (!zone || !campus || !grade) return; // Skip incomplete records
      
      // Update college-wide stats
      stats.collegeWideStats[zone]++;
      stats.collegeWideStats.total++;
      
      // Find campus data
      const campusData = stats.campusStats.find(c => c.campus === campus);
      if (!campusData) return;
      
      // Update campus stats
      campusData.campusZoneDistribution[zone]++;
      campusData.campusZoneDistribution.total++;
      
      // Find grade data
      const gradeData = campusData.gradeStats.find(g => g.grade === grade);
      if (!gradeData) return;
      
      // Update grade stats
      gradeData.gradeZoneDistribution[zone]++;
      gradeData.gradeZoneDistribution.total++;
      
      // Find class data
      if (classId) {
        const classData = gradeData.classStats.find(c => 
          c.classId.toString() === classId.toString()
        );
        if (classData) {
          classData.zoneDistribution[zone]++;
          classData.zoneDistribution.total++;
        }
      }
    });
    
    // Save or update statistics
    const existingStats = await this.findOne({
      statisticType: 'overall',
      academicYear
    });
    
    const calculationDuration = Date.now() - startTime;
    
    if (existingStats) {
      Object.assign(existingStats, stats);
      existingStats.lastUpdated = new Date();
      existingStats.calculationDuration = calculationDuration;
      existingStats.studentsProcessed = analytics.length;
      await existingStats.save();
      return existingStats;
    } else {
      const newStats = new this({
        ...stats,
        calculationDuration,
        studentsProcessed: analytics.length
      });
      await newStats.save();
      return newStats;
    }
  } catch (error) {
    console.error('Error generating overall statistics:', error);
    throw error;
  }
};

ZoneStatisticsSchema.statics.generateSubjectStatistics = async function(subjectName, academicYear = '2024-2025') {
  const StudentAnalytics = mongoose.model('StudentAnalytics');
  const Class = mongoose.model('Class');
  
  const startTime = Date.now();
  
  try {
    // Get all student analytics with the specific subject
    const analytics = await StudentAnalytics.find({
      academicYear,
      'subjectAnalytics.subjectName': subjectName,
      'subjectAnalytics.zone': { $exists: true }
    }).populate('classId', 'name grade campus program');
    
    console.log(`Processing ${analytics.length} student analytics records for subject: ${subjectName}`);
    
    // Initialize statistics structure
    const stats = {
      statisticType: 'subject',
      subjectName,
      academicYear,
      campusStats: [],
      collegeWideStats: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
    };
    
    // Get all classes for structure
    const allClasses = await Class.find().sort({ campus: 1, grade: 1, name: 1 });
    
    // Initialize campus structure (same as overall)
    const campuses = ['Boys', 'Girls'];
    const grades = ['11th', '12th'];
    
    campuses.forEach(campus => {
      const campusData = {
        campus,
        gradeStats: [],
        campusZoneDistribution: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
      };
      
      grades.forEach(grade => {
        const gradeData = {
          grade,
          classStats: [],
          gradeZoneDistribution: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
        };
        
        const relevantClasses = allClasses.filter(cls => 
          cls.campus === campus && cls.grade === grade
        );
        
        relevantClasses.forEach(cls => {
          gradeData.classStats.push({
            classId: cls._id,
            className: cls.name,
            zoneDistribution: { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 }
          });
        });
        
        campusData.gradeStats.push(gradeData);
      });
      
      stats.campusStats.push(campusData);
    });
    
    // Process each student analytics record
    analytics.forEach(studentAnalytic => {
      const subjectData = studentAnalytic.subjectAnalytics.find(
        sub => sub.subjectName === subjectName
      );
      
      if (!subjectData || !subjectData.zone) return;
      
      const zone = subjectData.zone;
      const campus = studentAnalytic.campus;
      const grade = studentAnalytic.grade;
      const classId = studentAnalytic.classId;
      
      if (!campus || !grade) return;
      
      // Update college-wide stats
      stats.collegeWideStats[zone]++;
      stats.collegeWideStats.total++;
      
      // Find and update campus, grade, and class stats (same logic as overall)
      const campusData = stats.campusStats.find(c => c.campus === campus);
      if (!campusData) return;
      
      campusData.campusZoneDistribution[zone]++;
      campusData.campusZoneDistribution.total++;
      
      const gradeData = campusData.gradeStats.find(g => g.grade === grade);
      if (!gradeData) return;
      
      gradeData.gradeZoneDistribution[zone]++;
      gradeData.gradeZoneDistribution.total++;
      
      if (classId) {
        const classData = gradeData.classStats.find(c => 
          c.classId.toString() === classId.toString()
        );
        if (classData) {
          classData.zoneDistribution[zone]++;
          classData.zoneDistribution.total++;
        }
      }
    });
    
    // Save or update statistics
    const existingStats = await this.findOne({
      statisticType: 'subject',
      subjectName,
      academicYear
    });
    
    const calculationDuration = Date.now() - startTime;
    
    if (existingStats) {
      Object.assign(existingStats, stats);
      existingStats.lastUpdated = new Date();
      existingStats.calculationDuration = calculationDuration;
      existingStats.studentsProcessed = analytics.length;
      await existingStats.save();
      return existingStats;
    } else {
      const newStats = new this({
        ...stats,
        calculationDuration,
        studentsProcessed: analytics.length
      });
      await newStats.save();
      return newStats;
    }
  } catch (error) {
    console.error(`Error generating subject statistics for ${subjectName}:`, error);
    throw error;
  }
};

ZoneStatisticsSchema.statics.getAllSubjects = async function(academicYear = '2024-2025') {
  const StudentAnalytics = mongoose.model('StudentAnalytics');
  
  try {
    const subjects = await StudentAnalytics.distinct('subjectAnalytics.subjectName', {
      academicYear
    });
    
    return subjects.filter(subject => subject && subject.trim().length > 0).sort();
  } catch (error) {
    console.error('Error getting all subjects:', error);
    throw error;
  }
};

ZoneStatisticsSchema.statics.refreshAllStatistics = async function(academicYear = '2024-2025') {
  try {
    console.log(`Refreshing all statistics for academic year: ${academicYear}`);
    
    // Generate overall statistics
    const overallStats = await this.generateOverallStatistics(academicYear);
    console.log('Overall statistics generated');
    
    // Get all subjects and generate statistics for each
    const subjects = await this.getAllSubjects(academicYear);
    console.log(`Found ${subjects.length} subjects: ${subjects.join(', ')}`);
    
    const subjectStats = [];
    for (const subject of subjects) {
      const stats = await this.generateSubjectStatistics(subject, academicYear);
      subjectStats.push(stats);
      console.log(`Statistics generated for subject: ${subject}`);
    }
    
    return {
      overallStats,
      subjectStats,
      message: `Statistics refreshed for ${subjects.length} subjects`
    };
  } catch (error) {
    console.error('Error refreshing all statistics:', error);
    throw error;
  }
};

module.exports = mongoose.model('ZoneStatistics', ZoneStatisticsSchema);
