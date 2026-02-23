import React, { useState, useEffect, useMemo } from 'react';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import { 
  Calendar, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Building,
  Users,
  BookOpen,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';

const TimetableManagement = ({ user }) => {
  const { callApi } = useApiWithToast();
  const [timetable, setTimetable] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [selectedWeek, setSelectedWeek] = useState(getCurrentWeek());
  const [loading, setLoading] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // Derive time rows dynamically from existing timetable start times; fallback to hourly slots
  const defaultSlots = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  const toMinutes = (t) => {
    const [h, m] = (t || '00:00').split(':').map(Number);
    return h * 60 + m;
  };
  const timeSlots = useMemo(() => {
    const unique = new Set();
    (timetable || []).forEach(e => {
      if (e?.startTime) unique.add(e.startTime);
    });
    if (unique.size === 0) return defaultSlots;
    return Array.from(unique).sort((a, b) => toMinutes(a) - toMinutes(b));
  }, [timetable]);
  
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  
  const floorNames = {
    1: '11th Boys',
    2: '12th Boys', 
    3: '11th Girls',
    4: '12th Girls'
  };

  function getCurrentWeek() {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    return monday.toISOString().split('T')[0];
  }

  useEffect(() => {
    loadInitialData();
  }, [user]);

  useEffect(() => {
    loadTimetable();
  }, [selectedWeek, user]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      if (user?.role === 'InstituteAdmin' || user?.role === 'IT') {
        // Institute Admin gets all classes and teachers
        const [classesRes, teachersRes] = await Promise.all([
          callApi('/api/classes', 'GET'),
          callApi('/api/users/teachers', 'GET')
        ]);
        
        if (classesRes.success) setClasses(classesRes.data || []);
        if (teachersRes.success) setTeachers(teachersRes.data || []);
      } else if (user?.role === 'Teacher') {
        // Check if teacher is floor incharge
        const floorResponse = await callApi(`/api/classes/floor-incharge/${user._id}`, 'GET');
        if (floorResponse.success && floorResponse.data.floors?.length > 0) {
          // Get classes and teachers for their floors only
          const floors = floorResponse.data.floors.join(',');
          const [classesRes, teachersRes] = await Promise.all([
            callApi(`/api/classes/floors/${floors}`, 'GET'),
            callApi('/api/users/teachers', 'GET') // All teachers (they might teach across floors)
          ]);
          
          if (classesRes.success) setClasses(classesRes.data || []);
          if (teachersRes.success) setTeachers(teachersRes.data || []);
        } else {
          // Regular teacher - no timetable management access
          setClasses([]);
          setTeachers([]);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTimetable = async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      if (user?.role === 'InstituteAdmin' || user?.role === 'IT') {
        // Institute Admin sees all timetables
        endpoint = `/api/timetable/week/${selectedWeek}`;
      } else if (user?.role === 'Teacher') {
        // Check if teacher is floor incharge
        const floorResponse = await callApi(`/api/classes/floor-incharge/${user._id}`, 'GET');
        if (floorResponse.success && floorResponse.data.floors?.length > 0) {
          // Get timetable for their floors only
          const floors = floorResponse.data.floors.join(',');
          endpoint = `/api/timetable/floors/${floors}/week/${selectedWeek}`;
        } else {
          // Regular teacher - no access
          setTimetable([]);
          return;
        }
      }
      
      const response = await callApi(endpoint, 'GET');
      if (response.success) {
        setTimetable(response.data || []);
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveTimetableEntry = async (entryData) => {
    try {
      const endpoint = editingEntry ? `/api/timetable/${editingEntry._id}` : '/api/timetable';
      const method = editingEntry ? 'PUT' : 'POST';
      
      const response = await callApi(endpoint, method, entryData);
      
      if (response.success) {
        loadTimetable();
        setEditingEntry(null);
        setShowAddForm(false);
      }
    } catch (error) {
      console.error('Error saving timetable entry:', error);
    }
  };

  const deleteTimetableEntry = async (entryId) => {
    if (!confirm('Are you sure you want to delete this timetable entry?')) return;
    
    try {
      const response = await callApi(`/api/timetable/${entryId}`, 'DELETE');
      if (response.success) {
        loadTimetable();
      }
    } catch (error) {
      console.error('Error deleting timetable entry:', error);
    }
  };

  const TimetableForm = ({ entry = null, onSave, onCancel }) => {
    const [formData, setFormData] = useState({
      dayOfWeek: entry?.dayOfWeek || 'Monday',
      startTime: entry?.startTime || '08:00',
      endTime: entry?.endTime || '09:00',
      subject: entry?.subject || '',
      teacher: entry?.teacher?._id || '',
      class: entry?.class?._id || '',
      weekDate: selectedWeek
    });

    const [conflicts, setConflicts] = useState([]);

    useEffect(() => {
      checkConflicts();
    }, [formData.dayOfWeek, formData.startTime, formData.endTime, formData.teacher, formData.class]);

    const checkConflicts = async () => {
      if (!formData.teacher || !formData.class || !formData.startTime || !formData.endTime) {
        setConflicts([]);
        return;
      }

      try {
        const response = await callApi('/api/timetable/check-conflicts', 'POST', {
          ...formData,
          excludeId: entry?._id
        });
        
        if (response.success) {
          setConflicts(response.data.conflicts || []);
        }
      } catch (error) {
        console.error('Error checking conflicts:', error);
      }
    };

    const handleSubmit = (e) => {
      e.preventDefault();
      if (conflicts.length > 0) {
        alert('Please resolve conflicts before saving.');
        return;
      }
      onSave(formData);
    };

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {entry ? 'Edit Lecture' : 'Add New Lecture'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Day</label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({...formData, dayOfWeek: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {weekDays.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter subject name"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
              <input
                type="time"
                step="60"
                value={formData.startTime}
                onChange={(e) => setFormData({...formData, startTime: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
              <input
                type="time"
                step="60"
                value={formData.endTime}
                onChange={(e) => setFormData({...formData, endTime: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teacher</label>
              <select
                value={formData.teacher}
                onChange={(e) => setFormData({...formData, teacher: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Teacher</option>
                {teachers.map(teacher => (
                  <option key={teacher._id} value={teacher._id}>
                    {teacher.fullName?.firstName && teacher.fullName?.lastName 
                      ? `${teacher.fullName.firstName} ${teacher.fullName.lastName}`
                      : teacher.name || teacher.userName || 'Unknown Teacher'
                    }
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
              <select
                value={formData.class}
                onChange={(e) => setFormData({...formData, class: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls._id} value={cls._id}>
                    {cls.className} - Floor {cls.floor}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          {conflicts.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-800">Scheduling Conflicts Detected</h4>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {conflicts.map((conflict, index) => (
                      <li key={index}>• {conflict}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={conflicts.length > 0}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="h-4 w-4" />
              {entry ? 'Update' : 'Add'} Lecture
            </button>
            
            <button
              type="button"
              onClick={onCancel}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <X className="h-4 w-4" />
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  };

  const getTimetableGrid = () => {
    const grid = {};
    
    weekDays.forEach(day => {
      grid[day] = {};
      timeSlots.forEach(time => {
        grid[day][time] = [];
      });
    });
    
    timetable.forEach(entry => {
      if (grid[entry.dayOfWeek] && grid[entry.dayOfWeek][entry.startTime]) {
        grid[entry.dayOfWeek][entry.startTime].push(entry);
      }
    });
    
    return grid;
  };

  const grid = getTimetableGrid();

  if (loading && timetable.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-6 gap-2">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Timetable Management</h2>
          <p className="text-sm text-gray-600">Manage class schedules and lecture assignments</p>
        </div>
        
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Lecture
          </button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingEntry) && (
        <TimetableForm
          entry={editingEntry}
          onSave={saveTimetableEntry}
          onCancel={() => {
            setShowAddForm(false);
            setEditingEntry(null);
          }}
        />
      )}

      {/* Timetable Grid */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-900">
            Week of {new Date(selectedWeek).toLocaleDateString()}
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 w-24">Time</th>
                {weekDays.map(day => (
                  <th key={day} className="px-4 py-3 text-left text-sm font-medium text-gray-700">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {timeSlots.map(time => (
                <tr key={time} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50">
                    {time}
                  </td>
                  {weekDays.map(day => (
                    <td key={`${day}-${time}`} className="px-4 py-3 align-top">
                      <div className="space-y-2">
                        {grid[day][time].map(entry => (
                          <div
                            key={entry._id}
                            className="relative bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm group hover:bg-blue-100"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-blue-900 truncate">
                                  {entry.subject}
                                </p>
                                <p className="text-blue-700 text-xs truncate">
                                  {entry.teacher?.fullName?.firstName && entry.teacher?.fullName?.lastName 
                                    ? `${entry.teacher.fullName.firstName} ${entry.teacher.fullName.lastName}`
                                    : entry.teacher?.name || entry.teacher?.userName || 'Unknown Teacher'
                                  }
                                </p>
                                <p className="text-blue-600 text-xs truncate">
                                  {entry.class?.className}
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  <Building className="h-3 w-3 text-blue-500" />
                                  <span className="text-xs text-blue-600">
                                    Floor {entry.class?.floor}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => setEditingEntry(entry)}
                                  className="p-1 text-blue-600 hover:bg-blue-200 rounded"
                                >
                                  <Edit className="h-3 w-3" />
                                </button>
                                <button
                                  onClick={() => deleteTimetableEntry(entry._id)}
                                  className="p-1 text-red-600 hover:bg-red-200 rounded"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total Lectures</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{timetable.length}</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">Active Teachers</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">
            {new Set(timetable.map(entry => entry.teacher?._id)).size}
          </p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Active Classes</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-1">
            {new Set(timetable.map(entry => entry.class?._id)).size}
          </p>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Subjects</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 mt-1">
            {new Set(timetable.map(entry => entry.subject)).size}
          </p>
        </div>
      </div>
    </div>
  );
};

export default TimetableManagement;
