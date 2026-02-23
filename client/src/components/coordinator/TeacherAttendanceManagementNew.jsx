import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  MessageSquare,
  Save,
  BookOpen,
  School,
  AlertTriangle,
  Filter,
  Download,
  Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import api from '../../services/api';

const TeacherAttendanceManagement = () => {
  const { user } = useAuth();
  const { handleApiResponse, toast } = useApiWithToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [teachers, setTeachers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTeacher, setExpandedTeacher] = useState(null);
  const [teacherLectures, setTeacherLectures] = useState({});
  const [teacherLectureCounts, setTeacherLectureCounts] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [lateMinutesData, setLateMinutesData] = useState({});
  const [remarkData, setRemarkData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showRemarkModal, setShowRemarkModal] = useState(false);
  const [currentRemark, setCurrentRemark] = useState({ lectureId: '', text: '' });
  const [showLateOptions, setShowLateOptions] = useState({});

  // Floor mapping for coordinator
  const floorNames = {
    1: '11th Boys',
    2: '12th Boys', 
    3: '11th Girls',
    4: '12th Girls'
  };

  // Late minutes options
  const lateMinutesOptions = [
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
    { value: 15, label: '15 minutes' },
    { value: 20, label: '20 minutes' },
    { value: 30, label: '30 minutes' },
    { value: 45, label: '45+ minutes' }
  ];

  useEffect(() => {
    loadTeachers();
  }, []);

  useEffect(() => {
    if (selectedDate && teachers.length > 0) {
      loadTeacherAttendanceData();
      loadAllTeacherLectureCounts(teachers);
    }
  }, [selectedDate, teachers]);

  const loadTeachers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/users?role=Teacher');
      
      const teachersData = response.data.data?.users || response.data?.users || response.data || [];
      const teachersArray = Array.isArray(teachersData) ? teachersData : [];
      
      setTeachers(teachersArray);
      await loadAllTeacherLectureCounts(teachersArray);
    } catch (error) {
      console.error('Error loading teachers:', error);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadAllTeacherLectureCounts = async (teachersArray) => {
    try {
      const counts = {};
      
      await Promise.all(teachersArray.map(async (teacher) => {
        try {
          const response = await api.get(`/timetable/teacher/${teacher._id}/date/${selectedDate}`);
          const lectures = response.data?.data || response.data || [];
          
          const classCount = new Set(lectures.map(lecture => lecture.classId?._id)).size;
          const lectureCount = lectures.length;
          
          counts[teacher._id] = {
            classCount,
            lectureCount
          };
        } catch (error) {
          console.error(`Error loading lectures for teacher ${teacher._id}:`, error);
          counts[teacher._id] = {
            classCount: 0,
            lectureCount: 0
          };
        }
      }));
      
      setTeacherLectureCounts(counts);
    } catch (error) {
      console.error('Error loading teacher lecture counts:', error);
    }
  };

  const loadTeacherLectures = async (teacherId) => {
    try {
      const response = await api.get(`/timetable/teacher/${teacherId}/date/${selectedDate}`);
      const lectures = response.data?.data || response.data || [];
      
      const groupedLectures = lectures.reduce((acc, lecture) => {
        const classKey = lecture.classId?._id || 'unknown';
        const className = lecture.classId?.name || 'Unknown Class';
        
        if (!acc[classKey]) {
          acc[classKey] = {
            className,
            classInfo: lecture.classId,
            lectures: []
          };
        }
        
        acc[classKey].lectures.push(lecture);
        return acc;
      }, {});

      setTeacherLectures(prev => ({
        ...prev,
        [teacherId]: groupedLectures
      }));
    } catch (error) {
      console.error('Error loading teacher lectures:', error);
    }
  };

  const loadTeacherAttendanceData = async () => {
    try {
      const response = await api.get(`/teacher-attendance/date/${selectedDate}`);
      const attendanceRecords = response.data?.data || response.data || [];
      
      const attendanceMap = {};
      const remarksMap = {};
      const lateMinutesMap = {};
      
      attendanceRecords.forEach(record => {
        const key = `${record.teacherId}_${record.timetableId}`;
        attendanceMap[key] = record.status;
        if (record.coordinatorRemarks) {
          remarksMap[key] = record.coordinatorRemarks;
        }
        if (record.status === 'Late' && record.lateMinutes) {
          lateMinutesMap[key] = record.lateMinutes;
        }
      });
      
      setAttendanceData(attendanceMap);
      setRemarkData(remarksMap);
      setLateMinutesData(lateMinutesMap);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const handleTeacherClick = async (teacherId) => {
    if (expandedTeacher === teacherId) {
      setExpandedTeacher(null);
    } else {
      setExpandedTeacher(teacherId);
      if (!teacherLectures[teacherId]) {
        await loadTeacherLectures(teacherId);
      }
    }
  };

  const handleAttendanceChange = (teacherId, lectureId, status, lateMinutes = null) => {
    const key = `${teacherId}_${lectureId}`;
    setAttendanceData(prev => ({
      ...prev,
      [key]: status
    }));
    
    if (status === 'Late' && lateMinutes) {
      setLateMinutesData(prev => ({
        ...prev,
        [key]: lateMinutes
      }));
    } else if (status !== 'Late') {
      setLateMinutesData(prev => {
        const updated = { ...prev };
        delete updated[key];
        return updated;
      });
    }
    
    setShowLateOptions(prev => ({
      ...prev,
      [key]: false
    }));
  };

  const toggleLateOptions = (teacherId, lectureId) => {
    const key = `${teacherId}_${lectureId}`;
    setShowLateOptions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const openRemarkModal = (teacherId, lectureId) => {
    const key = `${teacherId}_${lectureId}`;
    setCurrentRemark({
      lectureId: key,
      text: remarkData[key] || ''
    });
    setShowRemarkModal(true);
  };

  const saveRemark = () => {
    setRemarkData(prev => ({
      ...prev,
      [currentRemark.lectureId]: currentRemark.text
    }));
    setShowRemarkModal(false);
    setCurrentRemark({ lectureId: '', text: '' });
  };

  const saveAllAttendance = async () => {
    try {
      setSaving(true);
      
      const attendanceRecords = Object.entries(attendanceData).map(([key, status]) => {
        const [teacherId, timetableId] = key.split('_');
        const record = {
          teacherId,
          timetableId,
          status,
          date: selectedDate,
          coordinatorRemarks: remarkData[key] || ''
        };
        
        // Add late minutes if status is Late
        if (status === 'Late' && lateMinutesData[key]) {
          record.lateMinutes = lateMinutesData[key];
          record.lateType = lateMinutesData[key] <= 10 ? `${lateMinutesData[key]} min` : 'Custom';
        }
        
        return record;
      });

      const response = await api.post('/teacher-attendance/mark-bulk', {
        attendanceRecords,
        date: selectedDate,
        markedBy: user._id
      });

      if (response.data.success) {
        toast.success('Teacher attendance saved successfully!');
        setAttendanceData({});
        setRemarkData({});
        setLateMinutesData({});
        loadTeacherAttendanceData();
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStats = () => {
    const total = Object.keys(attendanceData).length;
    const present = Object.values(attendanceData).filter(status => status === 'On Time').length;
    const late = Object.values(attendanceData).filter(status => status === 'Late').length;
    const absent = Object.values(attendanceData).filter(status => status === 'Absent').length;
    
    return { total, present, late, absent };
  };

  const stats = getAttendanceStats();

  // Filter teachers based on search term
  const filteredTeachers = teachers.filter(teacher => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim().toLowerCase();
    const userName = (teacher.userName || '').toLowerCase();
    const email = (teacher.email || '').toLowerCase();
    
    return fullName.includes(searchLower) || 
           userName.includes(searchLower) || 
           email.includes(searchLower);
  });

  if (loading && teachers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-purple-500 rounded-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Teacher Attendance Management</h1>
                <p className="text-sm text-gray-600">Mark teacher attendance and add remarks</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex-1 sm:min-w-[300px]">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Teachers
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name, username, or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={saveAllAttendance}
                disabled={saving || Object.keys(attendanceData).length === 0}
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save All Attendance'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Marked</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Present</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">{stats.present}</p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Late</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 mt-1">{stats.late}</p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Absent</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.absent}</p>
          </div>
        </div>

        {/* Teacher List */}
        <div className="space-y-4">
          {Array.isArray(filteredTeachers) && filteredTeachers.map((teacher) => {
            const teacherId = teacher._id;
            const isExpanded = expandedTeacher === teacherId;
            const teacherClasses = teacherLectures[teacherId] || {};
            
            return (
              <div key={teacherId} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Teacher Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleTeacherClick(teacherId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-5 w-5 text-purple-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {`${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim() || teacher.name || teacher.email}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {teacher.userName} • {teacher.email}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {teacherLectureCounts[teacherId]?.classCount || 0} Classes
                        </p>
                        <p className="text-xs text-gray-600">
                          {teacherLectureCounts[teacherId]?.lectureCount || 0} Lectures
                        </p>
                      </div>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Teacher Classes and Lectures */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {Object.keys(teacherClasses).length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>No lectures scheduled for selected date</p>
                      </div>
                    ) : (
                      <div className="p-6 space-y-6">
                        {Object.entries(teacherClasses).map(([classId, classData]) => (
                          <div key={classId} className="border border-gray-200 rounded-lg p-4">
                            {/* Class Header */}
                            <div className="flex items-center gap-3 mb-4">
                              <School className="h-5 w-5 text-blue-600" />
                              <div>
                                <h4 className="font-medium text-gray-900">{classData.className}</h4>
                                <p className="text-sm text-gray-600">
                                  {classData.classInfo?.grade} {classData.classInfo?.program} • 
                                  Floor {classData.classInfo?.floor} ({floorNames[classData.classInfo?.floor]})
                                </p>
                              </div>
                            </div>

                            {/* Lectures */}
                            <div className="space-y-3">
                              {classData.lectures.map((lecture) => {
                                const lectureKey = `${teacherId}_${lecture._id}`;
                                const currentStatus = attendanceData[lectureKey];
                                const currentLateMinutes = lateMinutesData[lectureKey];
                                const hasRemark = remarkData[lectureKey];
                                const showLateDropdown = showLateOptions[lectureKey];
                                
                                return (
                                  <div key={lecture._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                    <div className="flex-1">
                                      <div className="flex items-center gap-3">
                                        <div>
                                          <p className="font-medium text-gray-900">{lecture.subject}</p>
                                          <p className="text-sm text-gray-600">
                                            {lecture.startTime} - {lecture.endTime} • {lecture.lectureType}
                                          </p>
                                          {currentStatus === 'Late' && currentLateMinutes && (
                                            <p className="text-sm text-orange-600 font-medium">
                                              Late by {currentLateMinutes} minutes
                                            </p>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                      {/* Attendance Buttons */}
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => handleAttendanceChange(teacherId, lecture._id, 'On Time')}
                                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            currentStatus === 'On Time'
                                              ? 'bg-green-600 text-white'
                                              : 'bg-gray-200 text-gray-700 hover:bg-green-100'
                                          }`}
                                        >
                                          <CheckCircle className="h-4 w-4" />
                                          Present
                                        </button>
                                        
                                        {/* Late Button with Dropdown */}
                                        <div className="relative">
                                          <button
                                            onClick={() => toggleLateOptions(teacherId, lecture._id)}
                                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                              currentStatus === 'Late'
                                                ? 'bg-orange-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-orange-100'
                                            }`}
                                          >
                                            <Clock className="h-4 w-4" />
                                            Late
                                            <ChevronDown className="h-3 w-3" />
                                          </button>
                                          
                                          {/* Late Minutes Dropdown */}
                                          {showLateDropdown && (
                                            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[150px]">
                                              {lateMinutesOptions.map((option) => (
                                                <button
                                                  key={option.value}
                                                  onClick={() => handleAttendanceChange(teacherId, lecture._id, 'Late', option.value)}
                                                  className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-800"
                                                >
                                                  {option.label}
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        <button
                                          onClick={() => handleAttendanceChange(teacherId, lecture._id, 'Absent')}
                                          className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                            currentStatus === 'Absent'
                                              ? 'bg-red-600 text-white'
                                              : 'bg-gray-200 text-gray-700 hover:bg-red-100'
                                          }`}
                                        >
                                          <XCircle className="h-4 w-4" />
                                          Absent
                                        </button>
                                      </div>

                                      {/* Remark Button */}
                                      <button
                                        onClick={() => openRemarkModal(teacherId, lecture._id)}
                                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                                          hasRemark
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-700 hover:bg-blue-100'
                                        }`}
                                      >
                                        <MessageSquare className="h-4 w-4" />
                                        Remark
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredTeachers.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm ? 'No Teachers Found' : 'No Teachers Available'}
            </h3>
            <p className="text-gray-500">
              {searchTerm 
                ? `No teachers match your search "${searchTerm}"`
                : 'No teachers are available in the system.'
              }
            </p>
          </div>
        )}
      </div>

      {/* Remark Modal */}
      {showRemarkModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowRemarkModal(false)} />
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                      Add Remark
                    </h3>
                    <textarea
                      value={currentRemark.text}
                      onChange={(e) => setCurrentRemark(prev => ({ ...prev, text: e.target.value }))}
                      rows="4"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your remark here..."
                    />
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                <button
                  type="button"
                  onClick={saveRemark}
                  className="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Save Remark
                </button>
                <button
                  type="button"
                  onClick={() => setShowRemarkModal(false)}
                  className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendanceManagement;
