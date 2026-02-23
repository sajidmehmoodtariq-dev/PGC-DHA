const StudentAnalytics = require('../models/StudentAnalytics');
const ZoneStatistics = require('../models/ZoneStatistics');
const User = require('../models/User');
const TestResult = require('../models/TestResult');
const Test = require('../models/Test');

class ZoneAnalyticsService {
  /**
   * Calculate zone based on percentage
   * @param {number} percentage - The percentage to classify
   * @returns {string} Zone classification (green, blue, yellow, red)
   */
  /**
   * Calculate zone based on percentage and optional matriculation baseline.
   * If a matriculation percentage is provided, thresholds are shifted by
   * (matriculationPercentage - 80). This keeps the original behavior when
   * no matriculation baseline is supplied.
   *
   * Examples:
   *  - matric=90 => shift = +10 => green threshold = 76 + 10 = 86
   *  - matric=70 => shift = -10 => green threshold = 76 - 10 = 66
   *
   * @param {number} percentage - student's current percentage
   * @param {number} [matriculationPercentage] - optional matriculation baseline
   * @returns {string} Zone: 'green'|'blue'|'yellow'|'red'
   */
  static calculateZone(percentage, matriculationPercentage) {
    // Ensure numeric values
    const pct = Number(percentage) || 0;

    // Default thresholds (base) matching legacy behavior
    const base = {
      green: 76,
      blue: 71,
      yellow: 66
    };

    // If no matriculation baseline is provided, do not calculate a zone
    if (matriculationPercentage === undefined || matriculationPercentage === null || isNaN(Number(matriculationPercentage))) {
      return 'unassigned';
    }

    // If matriculation baseline is provided and is a number, shift thresholds
    let shift = 0;
    // Use difference from 80 as the shift (so matric 80 → no change)
    shift = Math.round(Number(matriculationPercentage) - 80);
    // Cap shift to avoid extreme thresholds
    if (shift > 20) shift = 20;
    if (shift < -20) shift = -20;

  // Compute exact zone boundaries based on matriculation baseline
  const mp = Number(matriculationPercentage);
  const greenMin = Math.max(Math.min(mp - 5, 100), 0);
  const blueMin = Math.max(Math.min(mp - 10, 100), 0);
  const yellowMin = Math.max(Math.min(mp - 20, 100), 0);

  if (pct >= greenMin) return 'green';
  if (pct >= blueMin && pct < greenMin) return 'blue';
  if (pct >= yellowMin && pct < blueMin) return 'yellow';
  return 'red';
  }

  /**
   * Return numeric thresholds used for zones given an optional matriculation baseline.
   * Useful for UI display and consistent evaluation.
   * @param {number} [matriculationPercentage]
   * @returns {{green:number, blue:number, yellow:number}}
   */
  static calculateThresholds(matriculationPercentage) {
    if (matriculationPercentage === undefined || matriculationPercentage === null || isNaN(Number(matriculationPercentage))) {
      return null;
    }

    const mp = Number(matriculationPercentage);
    const greenMin = Math.max(Math.min(mp - 5, 100), 0);
    const blueMin = Math.max(Math.min(mp - 10, 100), 0);
    const yellowMin = Math.max(Math.min(mp - 20, 100), 0);

    return {
      greenMin,
      blueMin,
      yellowMin
    };
  }

  /**
   * Calculate analytics for a single student
   * @param {string} studentId - MongoDB ObjectId of the student
   * @param {string} academicYear - Academic year (default: current year)
   * @returns {Object} Student analytics object
   */
  static async calculateStudentAnalytics(studentId, academicYear = '2024-2025') {
    try {
      return await StudentAnalytics.calculateForStudent(studentId, academicYear);
    } catch (error) {
      console.error(`Error calculating analytics for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate analytics for all students
   * @param {string} academicYear - Academic year
   * @returns {Object} Summary of calculations
   */
  static async calculateAllStudentAnalytics(academicYear = '2024-2025') {
    try {
      // Get all admitted students (Level 5)
      const students = await User.find({
        role: 'Student',
        $or: [
          { prospectusStage: 5 },
          { enquiryLevel: 5 }
        ]
      }).select('_id fullName');

      console.log(`Calculating analytics for ${students.length} students`);

      const results = {
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process students in batches to avoid overwhelming the database
      const batchSize = 10;
      for (let i = 0; i < students.length; i += batchSize) {
        const batch = students.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (student) => {
          try {
            await this.calculateStudentAnalytics(student._id, academicYear);
            results.successful++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              studentId: student._id,
              studentName: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
              error: error.message
            });
          }
        }));

        // Log progress
        console.log(`Processed ${Math.min(i + batchSize, students.length)}/${students.length} students`);
      }

      console.log(`Analytics calculation completed: ${results.successful} successful, ${results.failed} failed`);
      return results;
    } catch (error) {
      console.error('Error calculating all student analytics:', error);
      throw error;
    }
  }

  /**
   * Generate all zone statistics
   * @param {string} academicYear - Academic year
   * @returns {Object} Generated statistics
   */
  static async generateAllStatistics(academicYear = '2024-2025') {
    try {
      return await ZoneStatistics.refreshAllStatistics(academicYear);
    } catch (error) {
      console.error('Error generating all statistics:', error);
      throw error;
    }
  }

  /**
   * Get college-wide overview statistics
   * @param {string} academicYear - Academic year
   * @returns {Object} College-wide statistics
   */
  static async getCollegeOverview(academicYear = '2024-2025') {
    try {
      const overallStats = await ZoneStatistics.findOne({
        statisticType: 'overall',
        academicYear
      });

      if (!overallStats) {
        throw new Error('Overall statistics not found. Please generate statistics first.');
      }

      return {
        collegeWideStats: overallStats.collegeWideStats,
        lastUpdated: overallStats.lastUpdated,
        studentsProcessed: overallStats.studentsProcessed,
        campusBreakdown: overallStats.campusStats.map(campus => ({
          campus: campus.campus,
          stats: campus.campusZoneDistribution
        }))
      };
    } catch (error) {
      console.error('Error getting college overview:', error);
      throw error;
    }
  }

  /**
   * Get campus-specific statistics
   * @param {string} campus - Campus name (Boys/Girls)
   * @param {string} academicYear - Academic year
   * @returns {Object} Campus statistics
   */
  static async getCampusStatistics(campus, academicYear = '2024-2025') {
    try {
      const overallStats = await ZoneStatistics.findOne({
        statisticType: 'overall',
        academicYear
      });

      if (!overallStats) {
        throw new Error('Overall statistics not found. Please generate statistics first.');
      }

      const campusData = overallStats.getCampusStats(campus);
      if (!campusData) {
        throw new Error(`Statistics not found for campus: ${campus}`);
      }

      return {
        campus: campusData.campus,
        campusStats: campusData.campusZoneDistribution,
        gradeBreakdown: campusData.gradeStats.map(grade => ({
          grade: grade.grade,
          stats: grade.gradeZoneDistribution,
          classCount: grade.classStats.length
        })),
        lastUpdated: overallStats.lastUpdated
      };
    } catch (error) {
      console.error(`Error getting campus statistics for ${campus}:`, error);
      throw error;
    }
  }

  /**
   * Get grade-specific statistics
   * @param {string} campus - Campus name
   * @param {string} grade - Grade (11th/12th)
   * @param {string} academicYear - Academic year
   * @returns {Object} Grade statistics
   */
  static async getGradeStatistics(campus, grade, academicYear = '2024-2025') {
    try {
      const overallStats = await ZoneStatistics.findOne({
        statisticType: 'overall',
        academicYear
      });

      if (!overallStats) {
        throw new Error('Overall statistics not found. Please generate statistics first.');
      }

      const gradeData = overallStats.getGradeStats(campus, grade);
      if (!gradeData) {
        throw new Error(`Statistics not found for ${campus} campus, ${grade} grade`);
      }

      return {
        campus,
        grade: gradeData.grade,
        gradeStats: gradeData.gradeZoneDistribution,
        classBreakdown: gradeData.classStats.map(cls => ({
          classId: cls.classId,
          className: cls.className,
          stats: cls.zoneDistribution
        })),
        lastUpdated: overallStats.lastUpdated
      };
    } catch (error) {
      console.error(`Error getting grade statistics for ${campus} ${grade}:`, error);
      throw error;
    }
  }

  /**
   * Get class-specific statistics
   * @param {string} classId - Class ID
   * @param {string} academicYear - Academic year
   * @returns {Object} Class statistics with student list
   */
  static async getClassStatistics(classId, academicYear = '2024-2025') {
    try {
      const Class = require('../models/Class');
      const classInfo = await Class.findById(classId);
      
      if (!classInfo) {
        throw new Error('Class not found');
      }

      // Get class statistics from overall stats
      const overallStats = await ZoneStatistics.findOne({
        statisticType: 'overall',
        academicYear
      });

      let classStats = null;
      if (overallStats) {
        const gradeData = overallStats.getGradeStats(classInfo.campus, classInfo.grade);
        if (gradeData) {
          classStats = gradeData.classStats.find(cls => 
            cls.classId.toString() === classId.toString()
          );
        }
      }

      // Get detailed student analytics for the class
      const studentAnalytics = await StudentAnalytics.find({
        classId,
        academicYear
      }).populate('studentId', 'fullName email');

      const students = studentAnalytics.map(analytics => ({
        studentId: analytics.studentId._id,
        studentName: `${analytics.studentId.fullName?.firstName || ''} ${analytics.studentId.fullName?.lastName || ''}`.trim(),
        email: analytics.studentId.email,
        overallZone: analytics.overallAnalytics?.overallZone,
        overallPercentage: analytics.overallAnalytics?.currentOverallPercentage,
        matriculationPercentage: analytics.overallAnalytics?.matriculationPercentage,
        totalCTs: analytics.overallAnalytics?.totalCTsIncluded || 0,
        subjects: analytics.subjectAnalytics.map(subject => ({
          name: subject.subjectName,
          zone: subject.zone,
          percentage: subject.currentPercentage,
          totalCTs: subject.totalCTsIncluded
        }))
      }));

      return {
        classInfo: {
          id: classInfo._id,
          name: classInfo.name,
          campus: classInfo.campus,
          grade: classInfo.grade,
          program: classInfo.program
        },
        statistics: classStats?.zoneDistribution || { green: 0, blue: 0, yellow: 0, red: 0, total: 0 },
        students: students.sort((a, b) => a.studentName.localeCompare(b.studentName)),
        lastUpdated: overallStats?.lastUpdated
      };
    } catch (error) {
      console.error(`Error getting class statistics for ${classId}:`, error);
      throw error;
    }
  }

  /**
   * Get subject-specific statistics
   * @param {string} subjectName - Subject name
   * @param {string} academicYear - Academic year
   * @returns {Object} Subject statistics
   */
  static async getSubjectStatistics(subjectName, academicYear = '2024-2025') {
    try {
      const subjectStats = await ZoneStatistics.findOne({
        statisticType: 'subject',
        subjectName,
        academicYear
      });

      if (!subjectStats) {
        throw new Error(`Subject statistics not found for: ${subjectName}`);
      }

      return {
        subjectName: subjectStats.subjectName,
        collegeWideStats: subjectStats.collegeWideStats,
        campusBreakdown: subjectStats.campusStats.map(campus => ({
          campus: campus.campus,
          stats: campus.campusZoneDistribution,
          gradeBreakdown: campus.gradeStats.map(grade => ({
            grade: grade.grade,
            stats: grade.gradeZoneDistribution
          }))
        })),
        lastUpdated: subjectStats.lastUpdated
      };
    } catch (error) {
      console.error(`Error getting subject statistics for ${subjectName}:`, error);
      throw error;
    }
  }

  /**
   * Get filtered student list based on criteria
   * @param {Object} filters - Filter criteria
   * @returns {Array} Filtered student list
   */
  static async getFilteredStudents(filters = {}) {
    try {
      const {
        campus,
        grade,
        classId,
        zone,
        subject,
        academicYear = '2024-2025'
      } = filters;

      let query = { academicYear };

      // Apply filters
      if (campus) query.campus = campus;
      if (grade) query.grade = grade;
      if (classId) query.classId = classId;

      // Zone filter
      if (zone) {
        if (subject) {
          // Subject-specific zone filter
          query['subjectAnalytics'] = {
            $elemMatch: {
              subjectName: subject,
              zone: zone
            }
          };
        } else {
          // Overall zone filter
          query['overallAnalytics.overallZone'] = zone;
        }
      }

      const studentAnalytics = await StudentAnalytics.find(query)
        .populate('studentId', 'fullName email phoneNumber')
        .populate('classId', 'name grade campus program')
        .sort({ 'studentId.fullName.firstName': 1 });

      return studentAnalytics.map(analytics => {
        const student = analytics.studentId;
        const classInfo = analytics.classId;

        let relevantData = {
          zone: analytics.overallAnalytics?.overallZone,
          percentage: analytics.overallAnalytics?.currentOverallPercentage,
          totalCTs: analytics.overallAnalytics?.totalCTsIncluded
        };

        // If subject filter is applied, get subject-specific data
        if (subject) {
          const subjectData = analytics.subjectAnalytics.find(
            sub => sub.subjectName === subject
          );
          if (subjectData) {
            relevantData = {
              zone: subjectData.zone,
              percentage: subjectData.currentPercentage,
              totalCTs: subjectData.totalCTsIncluded
            };
          }
        }

        return {
          studentId: student._id,
          studentName: `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
          email: student.email,
          phoneNumber: student.phoneNumber,
          classInfo: {
            id: classInfo?._id,
            name: classInfo?.name,
            campus: classInfo?.campus,
            grade: classInfo?.grade,
            program: classInfo?.program
          },
          performance: relevantData,
          matriculationPercentage: analytics.overallAnalytics?.matriculationPercentage
        };
      });
    } catch (error) {
      console.error('Error getting filtered students:', error);
      throw error;
    }
  }

  /**
   * Get available subjects for analytics
   * @param {string} academicYear - Academic year
   * @returns {Array} List of subjects
   */
  static async getAvailableSubjects(academicYear = '2024-2025') {
    try {
      return await ZoneStatistics.getAllSubjects(academicYear);
    } catch (error) {
      console.error('Error getting available subjects:', error);
      throw error;
    }
  }

  /**
   * Get detailed student performance matrix
   * @param {string} studentId - Student ID
   * @param {string} academicYear - Academic year
   * @returns {Object} Performance matrix data
   */
  static async getStudentPerformanceMatrix(studentId, academicYear = '2024-2025') {
    try {
      const analytics = await StudentAnalytics.findOne({
        studentId,
        academicYear
      }).populate('studentId', 'fullName email phoneNumber')
        .populate('classId', 'name grade campus program');

      if (!analytics) {
        throw new Error('Student analytics not found');
      }

      const student = analytics.studentId;
      const classInfo = analytics.classId;

      // Get matriculation data from User model
      const User = require('../models/User');
      const studentData = await User.findById(studentId);
      
      const matrix = analytics.getPerformanceMatrix();
      
      // Enhance with matriculation data if available
      if (studentData?.academicRecords?.matriculation) {
        const matric = studentData.academicRecords.matriculation;
        if (matric.totalMarks && matric.totalMarks > 0) {
          matrix.matriculationBaseline.overall = Math.round((matric.totalMarks / 1100) * 10000) / 100; // Assuming 1100 total
        }
        
        if (matric.subjects && matric.subjects.length > 0) {
          matric.subjects.forEach(subject => {
            if (subject.totalMarks > 0) {
              matrix.matriculationBaseline.subjects[subject.name] = 
                Math.round((subject.marks / subject.totalMarks) * 10000) / 100;
            }
          });
        }
      }

      return {
        studentInfo: {
          id: student._id,
          name: `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
          email: student.email,
          phoneNumber: student.phoneNumber,
          class: classInfo?.name,
          grade: classInfo?.grade,
          campus: classInfo?.campus,
          program: classInfo?.program,
          rollNumber: studentData?.rollNumber || 'N/A'
        },
        performanceMatrix: matrix,
        lastUpdated: analytics.lastCalculated
      };
    } catch (error) {
      console.error(`Error getting student performance matrix for ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Get graph data for student performance visualization
   * @param {string} studentId - Student ID
   * @param {string} academicYear - Academic year
   * @returns {Object} Graph data
   */
  static async getStudentGraphData(studentId, academicYear = '2024-2025') {
    try {
      const analytics = await StudentAnalytics.findOne({
        studentId,
        academicYear
      });

      if (!analytics) {
        throw new Error('Student analytics not found');
      }

      return analytics.getGraphData();
    } catch (error) {
      console.error(`Error getting student graph data for ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Export student analytics data
   * @param {string} studentId - Student ID
   * @param {string} format - Export format (json, csv, excel)
   * @param {string} academicYear - Academic year
   * @returns {Object} Export data
   */
  static async exportStudentAnalytics(studentId, format = 'json', academicYear = '2024-2025') {
    try {
      const analytics = await StudentAnalytics.findOne({
        studentId,
        academicYear
      }).populate('studentId', 'fullName email')
        .populate('classId', 'name grade campus program');

      if (!analytics) {
        throw new Error('Student analytics not found');
      }

      const exportData = analytics.generateExportData(format);
      
      // Add student info to export
      const student = analytics.studentId;
      const classInfo = analytics.classId;
      
      exportData.studentInfo = {
        ...exportData.studentInfo,
        name: `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
        email: student.email,
        className: classInfo?.name
      };

      return {
        data: exportData,
        filename: `student_analytics_${student.fullName?.firstName}_${student.fullName?.lastName}_${academicYear}.${format}`,
        format,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error exporting student analytics for ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Export class analytics data
   * @param {string} classId - Class ID
   * @param {string} format - Export format
   * @param {string} academicYear - Academic year
   * @returns {Object} Export data
   */
  static async exportClassAnalytics(classId, format = 'json', academicYear = '2024-2025') {
    try {
      const classData = await this.getClassStatistics(classId, academicYear);
      
      if (format === 'csv') {
        const rows = [];
        
        // Header
        rows.push(['Student Name', 'Overall Zone', 'Overall %', 'Matriculation %', 'Total CTs'].join(','));
        
        // Student rows
        classData.students.forEach(student => {
          rows.push([
            student.studentName,
            student.overallZone,
            student.overallPercentage || 'N/A',
            student.matriculationPercentage || 'N/A',
            student.totalCTs
          ].join(','));
        });
        
        return {
          data: rows.join('\n'),
          filename: `class_analytics_${classData.classInfo.name}_${academicYear}.csv`,
          format: 'csv',
          generatedAt: new Date()
        };
      }

      return {
        data: classData,
        filename: `class_analytics_${classData.classInfo.name}_${academicYear}.json`,
        format,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error exporting class analytics for ${classId}:`, error);
      throw error;
    }
  }

  /**
   * Export zone statistics
   * @param {string} type - Statistics type (overall/subject)
   * @param {string} subjectName - Subject name (for subject stats)
   * @param {string} format - Export format
   * @param {string} academicYear - Academic year
   * @returns {Object} Export data
   */
  static async exportZoneStatistics(type = 'overall', subjectName = null, format = 'json', academicYear = '2024-2025') {
    try {
      let statsData;
      
      if (type === 'overall') {
        statsData = await this.getCollegeOverview(academicYear);
      } else {
        statsData = await this.getSubjectStatistics(subjectName, academicYear);
      }

      if (format === 'csv') {
        const rows = [];
        
        // Header
        rows.push(['Level', 'Green', 'Blue', 'Yellow', 'Red', 'Total'].join(','));
        
        // College-wide
        const college = statsData.collegeWideStats || statsData.collegeWideStats;
        rows.push([
          'College-wide',
          college.green,
          college.blue,
          college.yellow,
          college.red,
          college.total
        ].join(','));
        
        // Campus breakdown
        if (statsData.campusBreakdown) {
          statsData.campusBreakdown.forEach(campus => {
            rows.push([
              `${campus.campus} Campus`,
              campus.stats.green,
              campus.stats.blue,
              campus.stats.yellow,
              campus.stats.red,
              campus.stats.total
            ].join(','));
          });
        }
        
        return {
          data: rows.join('\n'),
          filename: `zone_statistics_${type}_${subjectName || 'overall'}_${academicYear}.csv`,
          format: 'csv',
          generatedAt: new Date()
        };
      }

      return {
        data: statsData,
        filename: `zone_statistics_${type}_${subjectName || 'overall'}_${academicYear}.json`,
        format,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error(`Error exporting zone statistics:`, error);
      throw error;
    }
  }

  /**
   * Force refresh all analytics and statistics
   * @param {string} academicYear - Academic year
   * @returns {Object} Refresh summary
   */
  static async forceRefreshAnalytics(academicYear = '2024-2025') {
    try {
      console.log('Starting force refresh of all analytics...');

      // Step 1: Calculate analytics for all students
      const studentResults = await this.calculateAllStudentAnalytics(academicYear);

      // Step 2: Generate all statistics
      const statisticsResults = await this.generateAllStatistics(academicYear);

      return {
        studentAnalytics: studentResults,
        statistics: statisticsResults,
        message: 'All analytics and statistics have been refreshed successfully'
      };
    } catch (error) {
      console.error('Error during force refresh:', error);
      throw error;
    }
  }
}

module.exports = ZoneAnalyticsService;
