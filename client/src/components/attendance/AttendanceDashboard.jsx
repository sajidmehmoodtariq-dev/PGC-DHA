import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Users, 
  UserCheck, 
  UserX, 
  Clock,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  GraduationCap,
  MapPin,
  Save,
  RotateCcw,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { Button } from '../ui/button';
import PermissionGuard from '../PermissionGuard';
import api from '../../services/api';
import { PERMISSIONS } from '../../utils/rolePermissions';
import { useAuth } from '../../hooks/useAuth';

const AttendanceDashboard = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedClass, setSelectedClass] = useState('');
  const [assignedClasses, setAssignedClasses] = useState([]);
  const [classStudents, setClassStudents] = useState([]);
  const [teacherAttendance, setTeacherAttendance] = useState([]);
  const [studentAttendance, setStudentAttendance] = useState({});
  const [teacherAttendanceStatus, setTeacherAttendanceStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchAssignedClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && selectedDate) {
      fetchClassData();
    }
  }, [selectedClass, selectedDate]);

  const fetchAssignedClasses = async () => {
    setLoading(true);
    try {
      // Get classes assigned to this coordinator
      const response = await api.get(`/classes?coordinatorId=${user._id}`);
      const classes = response.data || [];
      setAssignedClasses(classes);
      
      if (classes.length > 0 && !selectedClass) {
        setSelectedClass(classes[0]._id);
      }
    } catch (error) {
      console.error('Error fetching assigned classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassData = async () => {
    setLoading(true);
    try {
      // Fetch students in the class
      const studentsResponse = await api.get(`/students/class/${selectedClass}`);
      setClassStudents(studentsResponse.data || []);

      // Fetch existing attendance for the date
      const attendanceResponse = await api.get(`/attendance/class/${selectedClass}/date/${selectedDate}`);
      const existingAttendance = attendanceResponse.data || [];
      
      // Convert to object for easier lookup
      const attendanceMap = {};
      existingAttendance.forEach(record => {
        attendanceMap[record.studentId] = record.status;
      });
      setStudentAttendance(attendanceMap);

      // Fetch teacher attendance for the class
      const teacherResponse = await api.get(`/teacher-attendance/class/${selectedClass}/date/${selectedDate}`);
      const teacherAttendanceData = teacherResponse.data || [];
      setTeacherAttendance(teacherAttendanceData);
      
      // Convert teacher attendance to status map
      const teacherStatusMap = {};
      teacherAttendanceData.forEach(record => {
        teacherStatusMap[record.teacherId] = record.status;
      });
      setTeacherAttendanceStatus(teacherStatusMap);

    } catch (error) {
      console.error('Error fetching class data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStudentAttendanceChange = (studentId, status) => {
    setStudentAttendance(prev => ({
      ...prev,
      [studentId]: status
    }));
  };

  const handleTeacherAttendanceChange = (teacherId, status) => {
    setTeacherAttendanceStatus(prev => ({
      ...prev,
      [teacherId]: status
    }));
  };

  const saveStudentAttendance = async () => {
    setSaving(true);
    try {
      const attendanceData = Object.entries(studentAttendance).map(([studentId, status]) => ({
        studentId,
        status,
        date: selectedDate,
        classId: selectedClass,
        markedBy: user._id
      }));

      await api.post('/attendance/mark-bulk', {
        attendanceRecords: attendanceData
      });

      alert('Student attendance saved successfully!');
    } catch (error) {
      console.error('Error saving student attendance:', error);
      alert('Failed to save student attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const saveTeacherAttendance = async () => {
    setSaving(true);
    try {
      const attendanceData = Object.entries(teacherAttendanceStatus).map(([teacherId, status]) => ({
        teacherId,
        status,
        date: selectedDate,
        classId: selectedClass,
        markedBy: user._id
      }));

      await api.post('/teacher-attendance/mark-bulk', {
        attendanceRecords: attendanceData
      });

      alert('Teacher attendance saved successfully!');
    } catch (error) {
      console.error('Error saving teacher attendance:', error);
      alert('Failed to save teacher attendance. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getSelectedClassInfo = () => {
    return assignedClasses.find(cls => cls._id === selectedClass);
  };

  const filteredStudents = classStudents.filter(student => {
    const fullName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase();
    const fatherName = (student.fatherName || '').toLowerCase();
    const rollNumber = (student.rollNumber || '').toLowerCase();
    const searchLower = searchTerm.toLowerCase();
    
    return fullName.includes(searchLower) || 
           fatherName.includes(searchLower) || 
           rollNumber.includes(searchLower);
  });

  const getAttendanceStats = () => {
    const totalStudents = classStudents.length;
    const presentCount = Object.values(studentAttendance).filter(status => status === 'Present').length;
    const absentCount = Object.values(studentAttendance).filter(status => status === 'Absent').length;
    const lateCount = Object.values(studentAttendance).filter(status => status === 'Late').length;
    const unmarked = totalStudents - presentCount - absentCount - lateCount;

    return { totalStudents, presentCount, absentCount, lateCount, unmarked };
  };

  const markAllPresent = () => {
    const newAttendance = {};
    classStudents.forEach(student => {
      newAttendance[student._id] = 'Present';
    });
    setStudentAttendance(newAttendance);
  };

  const clearAllAttendance = () => {
    setStudentAttendance({});
  };

  if (loading && assignedClasses.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  const classInfo = getSelectedClassInfo();
  const stats = getAttendanceStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Attendance Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">Mark and manage attendance for your assigned classes</p>
        </div>

        {assignedClasses.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
            <p className="text-gray-500">You don't have any classes assigned to you yet.</p>
          </div>
        ) : (
          <>
            {/* Controls */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Class Selection */}
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Class
                    </label>
                    <select
                      value={selectedClass}
                      onChange={(e) => setSelectedClass(e.target.value)}
                      className="w-full px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    >
                      {assignedClasses.map(cls => (
                        <option key={cls._id} value={cls._id}>
                          {cls.name} - {cls.grade} {cls.program} ({cls.campus})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Date Selection */}
                  <div className="sm:w-auto">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full sm:w-auto px-3 sm:px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                    />
                  </div>
                </div>

                {/* Date Navigation */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <button
                    onClick={() => {
                      const prevDate = new Date(selectedDate);
                      prevDate.setDate(prevDate.getDate() - 1);
                      setSelectedDate(prevDate.toISOString().split('T')[0]);
                    }}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() => {
                      const nextDate = new Date(selectedDate);
                      nextDate.setDate(nextDate.getDate() + 1);
                      if (nextDate <= new Date()) {
                        setSelectedDate(nextDate.toISOString().split('T')[0]);
                      }
                    }}
                    disabled={new Date(selectedDate) >= new Date(new Date().toISOString().split('T')[0])}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              {/* Class Info */}
              {classInfo && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{classInfo.grade} {classInfo.program}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{classInfo.campus} Campus - Floor {classInfo.floor}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>{classStudents.length} Students</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 overflow-x-auto">
                <nav className="flex min-w-max">
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'students'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Student Attendance</span>
                      <span className="sm:hidden">Students</span>
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveTab('teachers')}
                    className={`px-4 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      activeTab === 'teachers'
                        ? 'border-blue-500 text-blue-600 bg-blue-50'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Teacher Attendance</span>
                      <span className="sm:hidden">Teachers</span>
                    </div>
                  </button>
                </nav>
              </div>

              {activeTab === 'students' && (
                <div className="p-4 sm:p-6">
                  {/* Student Attendance Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalStudents}</div>
                      <div className="text-xs sm:text-sm text-gray-600">Total</div>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 sm:p-4 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-green-600">{stats.presentCount}</div>
                      <div className="text-xs sm:text-sm text-green-600">Present</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-3 sm:p-4 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-red-600">{stats.absentCount}</div>
                      <div className="text-xs sm:text-sm text-red-600">Absent</div>
                    </div>
                    <div className="bg-yellow-50 rounded-lg p-3 sm:p-4 text-center">
                      <div className="text-lg sm:text-2xl font-bold text-yellow-600">{stats.lateCount}</div>
                      <div className="text-xs sm:text-sm text-yellow-600">Late</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3 sm:p-4 text-center col-span-2 sm:col-span-1">
                      <div className="text-lg sm:text-2xl font-bold text-orange-600">{stats.unmarked}</div>
                      <div className="text-xs sm:text-sm text-orange-600">Unmarked</div>
                    </div>
                  </div>

                  {/* Student Attendance Controls */}
                  <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        placeholder="Search by name, father name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                      />
                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        onClick={markAllPresent}
                        variant="outline"
                        size="sm"
                        className="text-green-600 hover:bg-green-50 text-xs sm:text-sm"
                      >
                        <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        <span className="sm:hidden">All Present</span>
                        <span className="hidden sm:inline">Mark All Present</span>
                      </Button>
                      <Button
                        onClick={clearAllAttendance}
                        variant="outline"
                        size="sm"
                        className="text-gray-600 hover:bg-gray-50 text-xs sm:text-sm"
                      >
                        <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Clear All
                      </Button>
                    </div>
                  </div>

                  {/* Students List */}
                  <div className="space-y-3 mb-6">
                    {filteredStudents.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                        <p>No students found</p>
                      </div>
                    ) : (
                      filteredStudents.map((student) => (
                        <div key={student._id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium text-gray-900 text-sm sm:text-base">
                              {`${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim()}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-500 mt-1">
                              <span className="block sm:inline">Roll: {student.rollNumber || 'N/A'}</span>
                              <span className="hidden sm:inline"> | </span>
                              <span className="block sm:inline">Father: {student.fatherName || 'N/A'}</span>
                            </div>
                          </div>
                          
                          <div className="flex gap-1 sm:gap-2">
                            {['Present', 'Absent', 'Late'].map((status) => (
                              <button
                                key={status}
                                onClick={() => handleStudentAttendanceChange(student._id, status)}
                                className={`flex-1 sm:flex-none px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                                  studentAttendance[student._id] === status
                                    ? status === 'Present'
                                      ? 'bg-green-600 text-white'
                                      : status === 'Absent'
                                      ? 'bg-red-600 text-white'
                                      : 'bg-yellow-600 text-white'
                                    : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span className="sm:hidden">{status.charAt(0)}</span>
                                <span className="hidden sm:inline">{status}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Save Button */}
                  <PermissionGuard permission={PERMISSIONS.ATTENDANCE.MARK_STUDENT_ATTENDANCE}>
                    <div className="flex justify-end">
                      <Button
                        onClick={saveStudentAttendance}
                        disabled={saving || Object.keys(studentAttendance).length === 0}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? 'Saving...' : 'Save Student Attendance'}
                      </Button>
                    </div>
                  </PermissionGuard>
                </div>
              )}

              {activeTab === 'teachers' && (
                <div className="p-6">
                  <div className="text-center py-8 text-gray-500">
                    <UserCheck className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Teacher attendance functionality will be implemented soon</p>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AttendanceDashboard;
