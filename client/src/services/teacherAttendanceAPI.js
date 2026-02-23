import api from './api.js';

export const teacherAttendanceAPI = {
  // Mark teacher attendance
  markAttendance: async (attendanceData) => {
    try {
      const response = await api.post('/teacher-attendance/mark', attendanceData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark teacher attendance' };
    }
  },

  // Mark bulk teacher attendance
  markBulkAttendance: async (attendanceRecords) => {
    try {
      const response = await api.post('/teacher-attendance/mark-bulk', { 
        attendanceRecords 
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark bulk teacher attendance' };
    }
  },

  // Get teacher attendance for a specific floor and date
  getFloorAttendance: async (floor, date) => {
    try {
      const response = await api.get(`/teacher-attendance/floor/${floor}/${date}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get floor attendance' };
    }
  },

  // Get teacher attendance history
  getTeacherAttendance: async (teacherId, params = {}) => {
    try {
      const response = await api.get(`/teacher-attendance/teacher/${teacherId}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get teacher attendance' };
    }
  },

  // Get monthly teacher attendance report
  getMonthlyReport: async (year, month, floor = null) => {
    try {
      const params = floor ? { floor } : {};
      const response = await api.get(`/teacher-attendance/report/monthly/${year}/${month}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get monthly report' };
    }
  },

  // Get daily teacher attendance report
  getDailyReport: async (date, floor = null) => {
    try {
      const params = floor ? { floor } : {};
      const response = await api.get(`/teacher-attendance/report/daily/${date}`, { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get daily report' };
    }
  },

  // Get teacher punctuality statistics
  getPunctualityStats: async (teacherId, days = 30) => {
    try {
      const response = await api.get(`/teacher-attendance/stats/punctuality/${teacherId}`, {
        params: { days }
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get punctuality stats' };
    }
  },

  // Mark attendance by coordinator
  markByCoordinator: async (attendanceRecords) => {
    try {
      const response = await api.post('/teacher-attendance/coordinator/mark', { attendanceRecords });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to mark attendance by coordinator' };
    }
  },

  // Get teacher attendance for a specific date
  getAttendanceByDate: async (date) => {
    try {
      const response = await api.get(`/teacher-attendance/date/${date}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get attendance by date' };
    }
  }
};

export default teacherAttendanceAPI;