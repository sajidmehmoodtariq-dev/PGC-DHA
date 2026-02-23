const User = require('../models/User');
const Class = require('../models/Class');

/**
 * Class Assignment Service
 * Handles automatic class assignment for students based on their profile
 */
class ClassAssignmentService {
  /**
   * Suggest a class for a student based on their profile
   * @param {Object} student - Student object
   * @returns {Object|null} Suggested class or null if none found
   */
  static async suggestClass(student) {
    try {
      const criteria = {
        grade: student.admissionInfo?.grade,
        program: student.program,
        campus: this.determineCampus(student.gender)
      };

      console.log(`Suggesting class for student ${student._id} with criteria:`, criteria);

      // Find classes matching criteria with available capacity
      const availableClasses = await Class.find(criteria);

      // Filter classes with available capacity (max 40 students per class)
      const classesWithCapacity = availableClasses.filter(cls => {
        const currentStudentCount = cls.students ? cls.students.length : 0;
        return currentStudentCount < 40;
      });

      if (classesWithCapacity.length === 0) {
        console.log(`No available classes found for student ${student._id}`);
        return null;
      }

      // Return class with least students
      const suggestedClass = classesWithCapacity.sort((a, b) => {
        const aCount = a.students ? a.students.length : 0;
        const bCount = b.students ? b.students.length : 0;
        return aCount - bCount;
      })[0];

      console.log(`Suggested class ${suggestedClass.name} for student ${student._id}`);
      return suggestedClass;
    } catch (error) {
      console.error('Error suggesting class:', error);
      throw error;
    }
  }

  /**
   * Determine campus based on student gender
   * @param {string} gender - Student gender
   * @returns {string} Campus (Boys/Girls)
   */
  static determineCampus(gender) {
    return gender?.toLowerCase() === 'female' ? 'Girls' : 'Boys';
  }

  /**
   * Auto-assign class to a student
   * @param {string} studentId - Student ID
   * @returns {Object} Assignment result
   */
  static async autoAssignClass(studentId) {
    try {
      const student = await User.findById(studentId);
      if (!student) {
        throw new Error('Student not found');
      }

      if (student.classId) {
        return {
          success: true,
          message: 'Student already has a class assignment',
          classId: student.classId
        };
      }

      const suggestedClass = await this.suggestClass(student);
      if (!suggestedClass) {
        return {
          success: false,
          message: 'No suitable class found for student'
        };
      }

      // Update student with class assignment
      await User.findByIdAndUpdate(studentId, {
        classId: suggestedClass._id,
        'admissionInfo.className': suggestedClass.name
      });

      // Add student to class
      await Class.findByIdAndUpdate(suggestedClass._id, {
        $addToSet: { students: studentId }
      });

      console.log(`Auto-assigned student ${studentId} to class ${suggestedClass.name}`);

      return {
        success: true,
        message: `Student assigned to class ${suggestedClass.name}`,
        classId: suggestedClass._id,
        className: suggestedClass.name
      };
    } catch (error) {
      console.error(`Error auto-assigning class for student ${studentId}:`, error);
      throw error;
    }
  }

  /**
   * Assign all unassigned students to classes
   * @returns {Object} Assignment results
   */
  static async assignAllUnassignedStudents() {
    try {
      const unassignedStudents = await User.find({
        role: 'Student',
        enquiryLevel: 5,
        $or: [
          { classId: { $exists: false } },
          { classId: null }
        ]
      });

      console.log(`Found ${unassignedStudents.length} unassigned students`);

      const results = {
        assigned: 0,
        failed: 0,
        alreadyAssigned: 0,
        errors: []
      };

      for (const student of unassignedStudents) {
        try {
          const result = await this.autoAssignClass(student._id);
          if (result.success) {
            if (result.message.includes('already has')) {
              results.alreadyAssigned++;
            } else {
              results.assigned++;
            }
          } else {
            results.failed++;
            results.errors.push({
              studentId: student._id,
              studentName: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
              reason: result.message
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            studentId: student._id,
            studentName: `${student.fullName?.firstName} ${student.fullName?.lastName}`,
            reason: error.message
          });
        }
      }

      console.log(`Class assignment completed: ${results.assigned} assigned, ${results.failed} failed, ${results.alreadyAssigned} already assigned`);
      return results;
    } catch (error) {
      console.error('Error assigning all unassigned students:', error);
      throw error;
    }
  }

  /**
   * Assign selected students to classes
   * @param {Array} studentIds - Array of student IDs
   * @returns {Object} Assignment results
   */
  static async assignSelectedStudents(studentIds) {
    try {
      const results = {
        assigned: 0,
        failed: 0,
        alreadyAssigned: 0,
        errors: []
      };

      for (const studentId of studentIds) {
        try {
          const result = await this.autoAssignClass(studentId);
          if (result.success) {
            if (result.message.includes('already has')) {
              results.alreadyAssigned++;
            } else {
              results.assigned++;
            }
          } else {
            results.failed++;
            results.errors.push({
              studentId,
              reason: result.message
            });
          }
        } catch (error) {
          results.failed++;
          results.errors.push({
            studentId,
            reason: error.message
          });
        }
      }

      return results;
    } catch (error) {
      console.error('Error assigning selected students:', error);
      throw error;
    }
  }

  /**
   * Get class assignment statistics
   * @returns {Object} Statistics about class assignments
   */
  static async getAssignmentStatistics() {
    try {
      const totalStudents = await User.countDocuments({
        role: 'Student',
        enquiryLevel: 5
      });

      const assignedStudents = await User.countDocuments({
        role: 'Student',
        enquiryLevel: 5,
        classId: { $exists: true, $ne: null }
      });

      const unassignedStudents = totalStudents - assignedStudents;

      return {
        total: totalStudents,
        assigned: assignedStudents,
        unassigned: unassignedStudents,
        assignmentRate: totalStudents > 0 ? (assignedStudents / totalStudents * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('Error getting assignment statistics:', error);
      throw error;
    }
  }
}

module.exports = ClassAssignmentService;
