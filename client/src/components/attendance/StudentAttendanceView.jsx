import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  Download,
  RefreshCw,
  UserX,
  ChevronDown
} from 'lucide-react';

const StudentAttendanceView = ({ user }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [students, setStudents] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [leaveDropdownOpen, setLeaveDropdownOpen] = useState(null);
  const dropdownRef = useRef(null);

  // Helper functions for time validation
  const isToday = (dateString) => {
    const today = new Date().toISOString().split('T')[0];
    return dateString === today;
  };

  const isWithinCollegeHours = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;
    
    // College hours: 8:00 AM to 6:00 PM (8 * 60 = 480 minutes, 18 * 60 = 1080 minutes)
    const startTime = 8 * 60; // 8:00 AM
    const endTime = 18 * 60;  // 6:00 PM
    
    return currentTime >= startTime && currentTime <= endTime;
  };

  const canMarkAttendance = () => {
    return isToday(attendanceDate) && isWithinCollegeHours();
  };

  const getAttendanceMessage = () => {
    if (!isToday(attendanceDate)) {
      return "Attendance can only be marked for today's date.";
    }
    if (!isWithinCollegeHours()) {
      return "Attendance can only be marked during college hours (8:00 AM - 6:00 PM).";
    }
    return null;
  };

  const loadAccessibleClasses = useCallback(async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      if (user?.role === 'InstituteAdmin' || user?.role === 'IT') {
        // Institute Admin can see all classes
        endpoint = '/classes';
      } else if (user?.role === 'Teacher') {
        // Teachers can only see classes where they have attendance access
        endpoint = `/classes/attendance-access/${user._id}`;
      } else {
        // No access for other roles
        setClasses([]);
        return;
      }
      
      const response = await api.get(endpoint);
      if (response.data.success) {
        const accessibleClasses = response.data.classes || response.data.data || [];
        
        // Filter classes based on role responsibility
        let filteredClasses = accessibleClasses;
        if (user?.role === 'Teacher') {
          // Only show classes where user is classIncharge for student attendance
          filteredClasses = accessibleClasses.filter(cls => 
            cls.userRole === 'Class Incharge'
          );
        }
        
        setClasses(filteredClasses);
        if (filteredClasses.length > 0) {
          setSelectedClass(filteredClasses[0]);
        }
      }
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load classes that user has access to
  useEffect(() => {
    loadAccessibleClasses();
  }, [loadAccessibleClasses]);

  const loadStudents = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/classes/${selectedClass._id}/students`);
      if (response.data.success) {
        const studentsData = response.data.data?.students || [];
        setStudents(Array.isArray(studentsData) ? studentsData : []);
      } else {
        setStudents([]);
      }
    } catch (error) {
      console.error('Error loading students:', error);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [selectedClass]);

  const loadExistingAttendance = useCallback(async () => {
    if (!selectedClass) return;
    
    try {
      const response = await api.get(`/attendance/class/${selectedClass._id}/${attendanceDate}`);
      if (response.data.success && response.data.attendance) {
        const attendanceMap = {};
        response.data.attendance.forEach(record => {
          if (record.studentId) {
            attendanceMap[record.studentId] = {
              status: record.status,
              markedAt: record.markedAt,
              markedBy: record.markedBy,
              marked: record.marked
            };
          }
        });
        setAttendance(attendanceMap);
      } else {
        setAttendance({});
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
      setAttendance({});
    }
  }, [selectedClass, attendanceDate]);

  // Load students for selected class
  useEffect(() => {
    if (selectedClass) {
      loadStudents();
      loadExistingAttendance();
    }
  }, [selectedClass, attendanceDate, loadStudents, loadExistingAttendance]);

  const markAttendance = async (studentId, status) => {
    // Check if attendance can be marked
    if (!canMarkAttendance()) {
      alert(getAttendanceMessage());
      return;
    }

    try {
      setSaving(true);
      const response = await api.post('/attendance/mark', {
        studentId,
        classId: selectedClass._id,
        date: attendanceDate,
        status,
        markedBy: user._id
      });

      if (response.data.success) {
        setAttendance(prev => ({
          ...prev,
          [studentId]: {
            status,
            markedAt: new Date().toISOString(),
            markedBy: user._id
          }
        }));
      }
    } catch (error) {
      console.error('Error marking attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = async () => {
    try {
      setSaving(true);
      const unmarkedStudents = students.filter(student => !attendance[student._id]);
      
      for (const student of unmarkedStudents) {
        await markAttendance(student._id, 'Present');
      }
    } catch (error) {
      console.error('Error marking all present:', error);
    } finally {
      setSaving(false);
    }
  };

  const getAttendanceStats = () => {
    const total = students.length;
    const marked = Object.keys(attendance).length;
    const present = Object.values(attendance).filter(a => a.status === 'Present').length;
    const absent = Object.values(attendance).filter(a => a.status === 'Absent').length;
    const halfLeave = Object.values(attendance).filter(a => a.status === 'Half Leave').length;
    const fullLeave = Object.values(attendance).filter(a => a.status === 'Full Leave').length;
    
    return { total, marked, present, absent, halfLeave, fullLeave, unmarked: total - marked };
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setLeaveDropdownOpen(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const stats = getAttendanceStats();

  if (loading && classes.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Classes Assigned</h3>
        <p className="text-gray-600">
          You don't have attendance access to any classes. Contact your administrator for access.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Student Attendance</h2>
          <p className="text-sm text-gray-600">Mark and track student attendance</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={loadExistingAttendance}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Controls Row */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Class Selection */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
            <select
              value={selectedClass?._id || ''}
              onChange={(e) => setSelectedClass(classes.find(c => c._id === e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {classes.map((cls) => (
                <option key={cls._id} value={cls._id}>
                  {cls.className} - Floor {cls.floor} ({cls.userRole})
                </option>
              ))}
            </select>
          </div>

          {/* Date Selection */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => {
                const selectedDate = e.target.value;
                const today = new Date().toISOString().split('T')[0];
                if (selectedDate !== today) {
                  alert('Attendance can only be marked for today\'s date. Date has been reset to today.');
                  setAttendanceDate(today);
                } else {
                  setAttendanceDate(selectedDate);
                }
              }}
              min={new Date().toISOString().split('T')[0]}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {!isToday(attendanceDate) && (
              <p className="text-xs text-red-600 mt-1">
                Attendance can only be marked for today's date.
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Quick Actions</label>
            <button
              onClick={markAllPresent}
              disabled={saving || stats.unmarked === 0}
              className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Mark All Present ({stats.unmarked})
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total</span>
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
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-sm font-medium text-red-900">Absent</span>
          </div>
          <p className="text-2xl font-bold text-red-900 mt-1">{stats.absent}</p>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">Half Leave</span>
          </div>
          <p className="text-2xl font-bold text-purple-900 mt-1">{stats.halfLeave}</p>
        </div>
        
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <UserX className="h-5 w-5 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">Full Leave</span>
          </div>
          <p className="text-2xl font-bold text-indigo-900 mt-1">{stats.fullLeave}</p>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-900">Pending</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 mt-1">{stats.unmarked}</p>
        </div>
      </div>

              {/* Time Restriction Warning */}
        {!isWithinCollegeHours() && isToday(attendanceDate) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-600" />
              <div>
                <h3 className="font-medium text-yellow-800">Outside College Hours</h3>
                <p className="text-sm text-yellow-700">
                  Attendance can only be marked during college hours (8:00 AM - 6:00 PM).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Students List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">Students ({students.length})</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {Array.isArray(students) && students.map((student) => {
            const studentAttendance = attendance[student._id];
            const isMarked = !!studentAttendance;
            const isPresent = studentAttendance?.status === 'Present';
            const isOnHalfLeave = studentAttendance?.status === 'Half Leave';
            const isOnFullLeave = studentAttendance?.status === 'Full Leave';
            const isOnLeave = isOnHalfLeave || isOnFullLeave;
            
            return (
              <div key={student._id} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-gray-700">
                        {student.fullName?.firstName?.charAt(0)?.toUpperCase() || 'S'}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">
                        {student.fullName?.firstName && student.fullName?.lastName 
                          ? `${student.fullName.firstName} ${student.fullName.lastName}`
                          : 'Unknown Student'
                        }
                      </p>
                      <p className="text-sm text-gray-600">Roll: {student.rollNumber || 'N/A'}</p>
                      {isOnLeave && (
                        <p className="text-xs text-purple-600">
                          {isOnHalfLeave ? 'Half Leave' : 'Full Leave'}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isMarked && studentAttendance.markedAt && (
                      <span className="text-xs text-gray-500">
                        {new Date(studentAttendance.markedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </span>
                    )}
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance(student._id, 'Present')}
                        disabled={saving || !canMarkAttendance()}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          !canMarkAttendance() 
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            : isPresent
                              ? 'bg-green-100 text-green-800 border border-green-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-green-50 hover:text-green-700'
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </button>
                      
                      <button
                        onClick={() => markAttendance(student._id, 'Absent')}
                        disabled={saving || !canMarkAttendance()}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          !canMarkAttendance()
                            ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                            : isMarked && !isPresent && !isOnLeave
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-red-50 hover:text-red-700'
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                      
                      <div className="relative" ref={leaveDropdownOpen === student._id ? dropdownRef : null}>
                        <button
                          onClick={() => {
                            if (!canMarkAttendance() || saving) return;
                            setLeaveDropdownOpen(leaveDropdownOpen === student._id ? null : student._id);
                          }}
                          disabled={saving || !canMarkAttendance()}
                          className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 ${
                            !canMarkAttendance()
                              ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                              : isOnLeave
                                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-purple-50 hover:text-purple-700'
                          }`}
                        >
                          <UserX className="h-4 w-4" />
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        
                        {leaveDropdownOpen === student._id && canMarkAttendance() && (
                          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-[120px]">
                            <button
                              onClick={() => {
                                markAttendance(student._id, 'Half Leave');
                                setLeaveDropdownOpen(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 hover:text-purple-700 first:rounded-t-lg"
                            >
                              Half Leave
                            </button>
                            <button
                              onClick={() => {
                                markAttendance(student._id, 'Full Leave');
                                setLeaveDropdownOpen(null);
                              }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-purple-50 hover:text-purple-700 last:rounded-b-lg border-t border-gray-100"
                            >
                              Full Leave
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {students.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No students found for this class</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendanceView;
