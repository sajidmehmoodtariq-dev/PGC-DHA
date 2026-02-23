import React, { useState, useEffect, useCallback } from 'react';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import { 
  UserCheck, 
  Clock, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  Calendar,
  Users,
  Timer,
  Building,
  BookOpen,
  Search,
  Filter
} from 'lucide-react';

const TeacherAttendanceView = ({ user }) => {
  const { callApi } = useApiWithToast();
  const [timetable, setTimetable] = useState([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [attendanceRecords, setAttendanceRecords] = useState({});

  // Floor mapping
  const floorNames = {
    1: '11th Boys',
    2: '12th Boys', 
    3: '11th Girls',
    4: '12th Girls'
  };

  useEffect(() => {
    loadTimetable();
    loadTeacherAttendance();
  }, [selectedDate, user, loadTimetable, loadTeacherAttendance]);

  const loadTimetable = useCallback(async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      
      if (user?.role === 'InstituteAdmin' || user?.role === 'IT') {
        // Institute Admin sees all lectures for the date
        endpoint = `/api/timetable/date/${selectedDate}`;
      } else if (user?.role === 'Teacher') {
        // Check if teacher is floor incharge for any floor
        const floorResponse = await callApi(`/api/classes/floor-incharge/${user._id}`, 'GET');
        if (floorResponse.success && floorResponse.data.floors?.length > 0) {
          // Teacher is floor incharge - get lectures for their floors
          const floors = floorResponse.data.floors.join(',');
          endpoint = `/api/timetable/floors/${floors}/date/${selectedDate}`;
        } else {
          // Regular teacher - only their own lectures (for viewing)
          endpoint = `/api/timetable/teacher/${user._id}/date/${selectedDate}`;
        }
      } else {
        // No access for other roles
        setTimetable([]);
        return;
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
  }, [callApi, selectedDate, user?.role, user?._id]);

  const loadTeacherAttendance = useCallback(async () => {
    try {
      const response = await callApi(`/teacher-attendance/date/${selectedDate}`, 'GET');
      if (response.success) {
        const attendanceMap = {};
        response.data.forEach(record => {
          attendanceMap[record.timetableEntry] = record;
        });
        setAttendanceRecords(attendanceMap);
      }
    } catch (error) {
      console.error('Error loading teacher attendance:', error);
    }
  }, [callApi, selectedDate]);

  const markTeacherAttendance = async (timetableId, status, lateMinutes = 0) => {
    try {
      setSaving(true);
      
      const response = await callApi('/teacher-attendance/mark', 'POST', {
        timetableEntry: timetableId,
        date: selectedDate,
        status,
        lateMinutes: status === 'late' ? lateMinutes : 0,
        markedBy: user._id
      });

      if (response.success) {
        setAttendanceRecords(prev => ({
          ...prev,
          [timetableId]: response.data
        }));
      }
    } catch (error) {
      console.error('Error marking teacher attendance:', error);
    } finally {
      setSaving(false);
    }
  };

  const LateMinutesSelector = ({ timetableId }) => {
    const [showSelector, setShowSelector] = useState(false);
    const lateOptions = [1, 2, 3, 4, 5, 10];
    const [customMinutes, setCustomMinutes] = useState('');

    if (!showSelector) {
      return (
        <button
          onClick={() => setShowSelector(true)}
          className="px-3 py-1 bg-orange-100 text-orange-800 border border-orange-200 rounded-lg text-sm font-medium hover:bg-orange-200 transition-colors"
        >
          Mark Late
        </button>
      );
    }

    return (
      <div className="flex flex-wrap gap-1">
        {lateOptions.map(minutes => (
          <button
            key={minutes}
            onClick={() => {
              markTeacherAttendance(timetableId, 'late', minutes);
              setShowSelector(false);
            }}
            className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
          >
            {minutes}m
          </button>
        ))}
        
        <div className="flex items-center gap-1">
          <input
            type="number"
            placeholder="min"
            value={customMinutes}
            onChange={(e) => setCustomMinutes(e.target.value)}
            className="w-12 px-1 py-1 text-xs border border-gray-300 rounded"
            min="1"
            max="60"
          />
          <button
            onClick={() => {
              if (customMinutes && parseInt(customMinutes) > 0) {
                markTeacherAttendance(timetableId, 'late', parseInt(customMinutes));
                setShowSelector(false);
                setCustomMinutes('');
              }
            }}
            className="px-2 py-1 bg-orange-500 text-white rounded text-xs hover:bg-orange-600"
          >
            ✓
          </button>
        </div>
        
        <button
          onClick={() => setShowSelector(false)}
          className="px-2 py-1 bg-gray-300 text-gray-700 rounded text-xs hover:bg-gray-400"
        >
          ✕
        </button>
      </div>
    );
  };

  const getAttendanceStats = () => {
    const total = timetable.length;
    const onTime = Object.values(attendanceRecords).filter(r => r.status === 'present').length;
    const late = Object.values(attendanceRecords).filter(r => r.status === 'late').length;
    const absent = Object.values(attendanceRecords).filter(r => r.status === 'absent').length;
    const pending = total - onTime - late - absent;
    
    return { total, onTime, late, absent, pending };
  };

  const groupedTimetable = timetable.reduce((acc, entry) => {
    const floor = entry.class?.floor || 'Unknown';
    if (!acc[floor]) acc[floor] = [];
    acc[floor].push(entry);
    return acc;
  }, {});

  const stats = getAttendanceStats();

  if (loading && timetable.length === 0) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
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
          <h2 className="text-lg font-semibold text-gray-900">Teacher Attendance</h2>
          <p className="text-sm text-gray-600">Track teacher punctuality and lecture attendance</p>
        </div>
        
        <div className="flex gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-green-900">On Time</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.onTime}</p>
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
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-900">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.pending}</p>
        </div>
      </div>

      {/* Lectures by Floor */}
      {Object.keys(groupedTimetable).length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Lectures Scheduled</h3>
          <p className="text-gray-600">No lectures found for the selected date.</p>
        </div>
      ) : (
        Object.entries(groupedTimetable).map(([floor, lectures]) => (
          <div key={floor} className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">
                  Floor {floor} - {floorNames[floor] || 'Unknown'}
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                  {lectures.length} lectures
                </span>
              </div>
            </div>
            
            <div className="divide-y divide-gray-200">
              {lectures.map((lecture) => {
                const attendanceRecord = attendanceRecords[lecture._id];
                const isMarked = !!attendanceRecord;
                
                return (
                  <div key={lecture._id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <p className="text-lg font-bold text-gray-900">
                            {lecture.startTime}
                          </p>
                          <p className="text-xs text-gray-500">
                            {lecture.endTime}
                          </p>
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {lecture.teacher?.fullName?.firstName && lecture.teacher?.fullName?.lastName 
                              ? `${lecture.teacher.fullName.firstName} ${lecture.teacher.fullName.lastName}`
                              : lecture.teacher?.name || 'Unknown Teacher'
                            }
                          </p>
                          <p className="text-sm text-gray-600">
                            {lecture.subject} • {lecture.class?.className}
                          </p>
                          <p className="text-xs text-gray-500">
                            Room: {lecture.class?.room || 'TBD'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {isMarked && (
                          <div className="text-right">
                            <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                              attendanceRecord.status === 'present' 
                                ? 'bg-green-100 text-green-800'
                                : attendanceRecord.status === 'late'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {attendanceRecord.status === 'present' && <CheckCircle className="h-3 w-3" />}
                              {attendanceRecord.status === 'late' && <Clock className="h-3 w-3" />}
                              {attendanceRecord.status === 'absent' && <XCircle className="h-3 w-3" />}
                              
                              {attendanceRecord.status === 'present' && 'On Time'}
                              {attendanceRecord.status === 'late' && `Late (${attendanceRecord.lateMinutes}m)`}
                              {attendanceRecord.status === 'absent' && 'Absent'}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(attendanceRecord.markedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        )}
                        
                        {/* Action Buttons */}
                        {!isMarked && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => markTeacherAttendance(lecture._id, 'present')}
                              disabled={saving}
                              className="px-3 py-1 bg-green-100 text-green-800 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            
                            <LateMinutesSelector 
                              timetableId={lecture._id} 
                              currentRecord={attendanceRecord}
                            />
                            
                            <button
                              onClick={() => markTeacherAttendance(lecture._id, 'absent')}
                              disabled={saving}
                              className="px-3 py-1 bg-red-100 text-red-800 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                              <XCircle className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default TeacherAttendanceView;
