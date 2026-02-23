import api from './api.js';

export const classesAPI = {
  // Get all classes with filters
  getClasses: async (params = {}) => {
    try {
      const response = await api.get('/classes', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get classes' };
    }
  },

  // Get classes by floor
  getClassesByFloor: async (floorNumber) => {
    try {
      const response = await api.get(`/classes/floor/${floorNumber}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get classes by floor' };
    }
  },

  // Get classes by multiple floors
  getClassesByFloors: async (floors) => {
    try {
      const floorsParam = Array.isArray(floors) ? floors.join(',') : floors;
      const response = await api.get(`/classes/floors/${floorsParam}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get classes by floors' };
    }
  },

  // Create new class
  createClass: async (classData) => {
    try {
      const response = await api.post('/classes', classData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create class' };
    }
  },

  // Update class
  updateClass: async (classId, classData) => {
    try {
      const response = await api.put(`/classes/${classId}`, classData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update class' };
    }
  },

  // Delete class
  deleteClass: async (classId) => {
    try {
      const response = await api.delete(`/classes/${classId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete class' };
    }
  },

  // Add teacher to class
  addTeacher: async (classId, teacherData) => {
    try {
      const response = await api.post(`/classes/${classId}/teachers`, teacherData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to add teacher to class' };
    }
  },

  // Remove teacher from class
  removeTeacher: async (classId, teacherId) => {
    try {
      const response = await api.delete(`/classes/${classId}/teachers/${teacherId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to remove teacher from class' };
    }
  },

  // Update class incharge or floor incharge
  updateIncharge: async (classId, inchargeData) => {
    try {
      const response = await api.put(`/classes/${classId}/incharge`, inchargeData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update class incharge' };
    }
  },

  // Get classes where user can mark attendance
  getAttendanceAccess: async (userId) => {
    try {
      const response = await api.get(`/classes/attendance-access/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get attendance access' };
    }
  },

  // Get classes where teacher has access
  getTeacherAccess: async (teacherId) => {
    try {
      const response = await api.get(`/classes/teacher-access/${teacherId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get teacher access' };
    }
  },

  // Get floors where teacher is floor incharge
  getFloorInchargeStatus: async (teacherId) => {
    try {
      const response = await api.get(`/classes/floor-incharge/${teacherId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get floor incharge status' };
    }
  },

  // Get floors for coordinator
  getCoordinatorFloors: async (coordinatorId) => {
    try {
      const response = await api.get(`/classes/coordinator-floors/${coordinatorId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get coordinator floors' };
    }
  },

  // Get students for a specific class
  getClassStudents: async (classId) => {
    try {
      const response = await api.get(`/classes/${classId}/students`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get class students' };
    }
  }
};

export default classesAPI;