const User = require('../models/User');
const ClassAssignmentService = require('./classAssignmentService');

/**
 * Analytics Prerequisites Checker
 * Validates and auto-fixes data integrity issues before calculating analytics
 */
class AnalyticsPrerequisiteChecker {
  /**
   * Validate student data for analytics calculation
   * @param {string} studentId - Student ID
   * @returns {Object} Validation result with issues and auto-fix capability
   */
  static async validateStudentData(studentId) {
    try {
      const student = await User.findById(studentId);
      if (!student) {
        return {
          isValid: false,
          issues: ['STUDENT_NOT_FOUND'],
          canAutoFix: false,
          student: null
        };
      }

      const issues = [];

      // Check if student has class assignment
      if (!student.classId) {
        issues.push('NO_CLASS_ASSIGNMENT');
      }

      // Check if student has program
      if (!student.program) {
        issues.push('NO_PROGRAM');
      }

      // Check if student has grade information
      if (!student.admissionInfo?.grade) {
        issues.push('NO_GRADE');
      }

      // Check if student has gender (needed for campus assignment)
      if (!student.gender) {
        issues.push('NO_GENDER');
      }

      // Check if student is admitted (enquiryLevel 5)
      if (student.enquiryLevel !== 5) {
        issues.push('NOT_ADMITTED');
      }

      // Check if student has matriculation marks for baseline from any supported source
      const hasLegacyMatric = (student.matricMarks && student.matricTotal);
      const hasAcademicPercentage = (student.academicRecords && student.academicRecords.matriculation && student.academicRecords.matriculation.percentage !== undefined && student.academicRecords.matriculation.percentage !== null);
      const hasAcademicSubjects = Array.isArray(student.academicRecords?.matriculation?.subjects) && student.academicRecords.matriculation.subjects.length > 0 && student.academicRecords.matriculation.subjects.some(sub => (sub.obtainedMarks || sub.totalMarks));

      if (!hasLegacyMatric && !hasAcademicPercentage && !hasAcademicSubjects) {
        issues.push('NO_MATRICULATION_DATA');
      }

      return {
        isValid: issues.length === 0,
        issues,
        canAutoFix: issues.every(issue => 
          ['NO_CLASS_ASSIGNMENT'].includes(issue)
        ),
        student
      };
    } catch (error) {
      console.error(`Error validating student data for ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Auto-fix fixable issues
   * @param {string} studentId - Student ID
   * @param {Array} issues - Array of issues to fix
   * @returns {Object} Fix results
   */
  static async autoFixIssues(studentId, issues) {
    try {
      const results = {
        fixed: [],
        failed: [],
        errors: []
      };

      for (const issue of issues) {
        try {
          switch (issue) {
            case 'NO_CLASS_ASSIGNMENT':
              const assignmentResult = await ClassAssignmentService.autoAssignClass(studentId);
              if (assignmentResult.success) {
                results.fixed.push({
                  issue: 'NO_CLASS_ASSIGNMENT',
                  solution: `Assigned to class: ${assignmentResult.className}`
                });
              } else {
                results.failed.push({
                  issue: 'NO_CLASS_ASSIGNMENT',
                  reason: assignmentResult.message
                });
              }
              break;

            default:
              results.failed.push({
                issue,
                reason: 'No auto-fix available for this issue'
              });
          }
        } catch (error) {
          results.failed.push({
            issue,
            reason: error.message
          });
          results.errors.push({
            issue,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error(`Error auto-fixing issues for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Validate and auto-fix student data for analytics
   * @param {string} studentId - Student ID
   * @returns {Object} Complete validation and fix result
   */
  static async validateAndFix(studentId) {
    try {
      // First validation
      const validation = await this.validateStudentData(studentId);
      
      if (validation.isValid) {
        return {
          success: true,
          message: 'Student data is valid for analytics calculation',
          studentId,
          issues: [],
          fixes: []
        };
      }

      // If issues can be auto-fixed, attempt to fix them
      if (validation.canAutoFix) {
        const fixResults = await this.autoFixIssues(studentId, validation.issues);
        
        // Re-validate after fixes
        const reValidation = await this.validateStudentData(studentId);
        
        return {
          success: reValidation.isValid,
          message: reValidation.isValid 
            ? 'Student data validated and fixed successfully'
            : 'Some issues remain after auto-fix attempts',
          studentId,
          originalIssues: validation.issues,
          remainingIssues: reValidation.issues,
          fixes: fixResults
        };
      } else {
        return {
          success: false,
          message: 'Student data has issues that cannot be auto-fixed',
          studentId,
          issues: validation.issues,
          requiresManualFix: validation.issues.filter(issue => 
            !['NO_CLASS_ASSIGNMENT'].includes(issue)
          )
        };
      }
    } catch (error) {
      console.error(`Error in validateAndFix for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Batch validate and fix multiple students
   * @param {Array} studentIds - Array of student IDs
   * @returns {Object} Batch validation results
   */
  static async batchValidateAndFix(studentIds) {
    try {
      const results = {
        total: studentIds.length,
        valid: 0,
        fixed: 0,
        failed: 0,
        details: []
      };

      for (const studentId of studentIds) {
        try {
          const result = await this.validateAndFix(studentId);
          results.details.push(result);

          if (result.success) {
            if (result.fixes && result.fixes.fixed.length > 0) {
              results.fixed++;
            } else {
              results.valid++;
            }
          } else {
            results.failed++;
          }
        } catch (error) {
          results.failed++;
          results.details.push({
            success: false,
            studentId,
            error: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error in batch validate and fix:', error);
      throw error;
    }
  }

  /**
   * Get overall data quality report for analytics
   * @returns {Object} Data quality report
   */
  static async getDataQualityReport() {
    try {
      // Get all admitted students
      const students = await User.find({
        role: 'Student',
        enquiryLevel: 5
      }).select('_id fullName classId program admissionInfo gender matricMarks matricTotal');

      const report = {
        totalStudents: students.length,
        issues: {
          noClassAssignment: 0,
          noProgram: 0,
          noGrade: 0,
          noGender: 0,
          noMatriculationData: 0
        },
        readyForAnalytics: 0,
        needsManualFix: 0,
        canAutoFix: 0
      };

      for (const student of students) {
        const validation = await this.validateStudentData(student._id);
        
        if (validation.isValid) {
          report.readyForAnalytics++;
        } else {
          // Count specific issues
          validation.issues.forEach(issue => {
            switch (issue) {
              case 'NO_CLASS_ASSIGNMENT':
                report.issues.noClassAssignment++;
                break;
              case 'NO_PROGRAM':
                report.issues.noProgram++;
                break;
              case 'NO_GRADE':
                report.issues.noGrade++;
                break;
              case 'NO_GENDER':
                report.issues.noGender++;
                break;
              case 'NO_MATRICULATION_DATA':
                report.issues.noMatriculationData++;
                break;
            }
          });

          if (validation.canAutoFix) {
            report.canAutoFix++;
          } else {
            report.needsManualFix++;
          }
        }
      }

      report.dataQualityScore = report.totalStudents > 0 
        ? ((report.readyForAnalytics / report.totalStudents) * 100).toFixed(2)
        : 0;

      return report;
    } catch (error) {
      console.error('Error generating data quality report:', error);
      throw error;
    }
  }
}

module.exports = AnalyticsPrerequisiteChecker;
