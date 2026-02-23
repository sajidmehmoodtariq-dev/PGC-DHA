import api from './api.js';

export const timetableAPI = {
  // Get all timetable entries with filters
  getTimetable: async (params = {}) => {
    try {
      const response = await api.get('/timetable', { params });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get timetable' };
    }
  },

  // Get timetable for specific class
  getClassTimetable: async (classId, dayOfWeek) => {
    try {
      const response = await api.get(`/timetable/class/${classId}`, {
        params: dayOfWeek ? { dayOfWeek } : {}
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get class timetable' };
    }
  },

  // Get timetable for specific teacher
  getTeacherTimetable: async (teacherId, dayOfWeek) => {
    try {
      const response = await api.get(`/timetable/teacher/${teacherId}`, {
        params: dayOfWeek ? { dayOfWeek } : {}
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get teacher timetable' };
    }
  },

  // Get timetable for specific floor
  getFloorTimetable: async (floorNumber, dayOfWeek) => {
    try {
      const response = await api.get(`/timetable/floor/${floorNumber}`, {
        params: dayOfWeek ? { dayOfWeek } : {}
      });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get floor timetable' };
    }
  },

  // Get timetable for specific floors and date
  getFloorsTimetableByDate: async (floors, date) => {
    try {
      const floorsParam = Array.isArray(floors) ? floors.join(',') : floors;
      const response = await api.get(`/timetable/floors/${floorsParam}/date/${date}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get floors timetable by date' };
    }
  },

  // Get timetable for specific floors and week
  getFloorsTimetableByWeek: async (floors, weekDate) => {
    try {
      const floorsParam = Array.isArray(floors) ? floors.join(',') : floors;
      const response = await api.get(`/timetable/floors/${floorsParam}/week/${weekDate}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get floors timetable by week' };
    }
  },

  // Get teacher's lectures for a specific date
  getTeacherLecturesByDate: async (teacherId, date) => {
    try {
      const response = await api.get(`/timetable/teacher/${teacherId}/date/${date}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to get teacher lectures by date' };
    }
  },

  // Create new timetable entry
  createTimetable: async (timetableData) => {
    try {
      const response = await api.post('/timetable', timetableData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to create timetable entry' };
    }
  },

  // Update timetable entry
  updateTimetable: async (id, timetableData) => {
    try {
      const response = await api.put(`/timetable/${id}`, timetableData);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to update timetable entry' };
    }
  },

  // Delete timetable entry
  deleteTimetable: async (id) => {
    try {
      const response = await api.delete(`/timetable/${id}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete timetable entry' };
    }
  },

  // Bulk delete timetable entries for a class
  deleteClassTimetable: async (classId) => {
    try {
      const response = await api.delete(`/timetable/class/${classId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to delete class timetable' };
    }
  },

  // Bulk create timetable entries
  bulkCreateTimetable: async (timetableEntries) => {
    try {
      const response = await api.post('/timetable/bulk', { timetableEntries });
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to bulk create timetable entries' };
    }
  },

  // Sync class teachers with timetable data
  syncClassTeachers: async () => {
    try {
      const response = await api.post('/timetable/sync-class-teachers');
      return response.data;
    } catch (error) {
      throw error.response?.data || { message: 'Failed to sync class teachers' };
    }
  }
};

export default timetableAPI;