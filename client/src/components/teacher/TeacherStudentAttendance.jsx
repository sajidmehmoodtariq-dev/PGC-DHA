import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  XCircle,
  Save,
  School,
  Download,
  FileSpreadsheet,
  BookOpen
} from 'lucide-react';
import { Button } from '../ui/button';
import { useAuth } from '../../hooks/useAuth';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import api from '../../services/api';
import * as XLSX from 'xlsx';

const TeacherStudentAttendance = () => {
  const { user } = useAuth();
  const { handleApiResponse, toast } = useApiWithToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [classes, setClasses] = useState([]);
  const [expandedClass, setExpandedClass] = useState(null);
  const [classStudents, setClassStudents] = useState({});
  const [attendanceData, setAttendanceData] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingAttendance, setSavingAttendance] = useState({});

  useEffect(() => {
    console.log('User effect triggered:', { 
      user: user, 
      userId: user?.id, 
      userRole: user?.role,
      userKeys: user ? Object.keys(user) : 'no user'
    });
    
    // Try different possible user ID fields
    const userId = user?.id || user?._id || user?.userId;
    
    if (userId) {
      console.log('User loaded with ID:', userId, 'calling loadTeacherClasses');
      loadTeacherClasses();
    } else {
      console.log('User not loaded yet, full user object:', user);
    }
  }, [user?.id, user?._id, user]);

  useEffect(() => {
    if (selectedDate && classes.length > 0) {
      loadStudentAttendanceData();
    }
  }, [selectedDate, classes]);

  const loadTeacherClasses = async () => {
    // Try different possible user ID fields
    const userId = user?.id || user?._id || user?.userId;
    
    if (!userId) {
      console.log('User ID not available, skipping class loading. User object:', user);
      return;
    }

    try {
      setLoading(true);
      
      console.log('Loading classes for teacher ID:', userId);
      
      // Get classes where this teacher is class incharge or assigned as teacher
      const response = await handleApiResponse(
        async () => api.get(`/classes/teacher-access/${userId}`),
        {
          successMessage: 'Classes loaded successfully'
        }
      );
      
      console.log('Teacher classes API response:', response);
      
      // Handle different response structures
      let classesData = [];
      if (response.data?.data && Array.isArray(response.data.data)) {
        classesData = response.data.data;
      } else if (Array.isArray(response.data)) {
        classesData = response.data;
      }
      
      const classesArray = Array.isArray(classesData) ? classesData : [];
      
      console.log('Classes data extracted:', classesData);
      console.log('Setting classes to:', classesArray);
      setClasses(classesArray);
      
      if (classesArray.length === 0) {
        console.log('No classes found for teacher:', userId);
      }
    } catch (error) {
      console.error('Error loading teacher classes:', error);
      setClasses([]); // Ensure classes is always an array
    } finally {
      setLoading(false);
    }
  };

  const loadClassStudents = async (classId) => {
    try {
      // Get students for this class
      const response = await handleApiResponse(
        async () => api.get(`/classes/${classId}/students`)
      );
      
      console.log('Students API response:', response);
      
      // Handle the students API response structure
      let students = [];
      
      if (response.data?.data?.students && Array.isArray(response.data.data.students)) {
        students = response.data.data.students;
        console.log('✅ Using nested data response (correct structure)');
      } else if (response.data?.students && Array.isArray(response.data.students)) {
        students = response.data.students;
        console.log('✅ Using students response');
      } else if (Array.isArray(response.data)) {
        students = response.data;
        console.log('⚠️ Using direct array response (fallback)');
      } else {
        console.log('❌ Unexpected students response structure:', response.data);
        students = [];
      }
      
      console.log('Processed students data:', students);
      console.log('Students count:', students.length);
      
      // Safety check before setting
      if (!Array.isArray(students)) {
        console.error('❌ Students is not an array:', students);
        setClassStudents(prev => ({
          ...prev,
          [classId]: []
        }));
        return;
      }

      setClassStudents(prev => ({
        ...prev,
        [classId]: students
      }));
    } catch (error) {
      console.error('Error loading class students:', error);
    }
  };

  const loadStudentAttendanceData = async () => {
    try {
      const attendanceMap = {};
      
      // Load attendance for all classes
      for (const classItem of classes) {
        const response = await handleApiResponse(
          async () => api.get(`/attendance/class/${classItem._id}/${selectedDate}`)
        );
        
        // Handle different response structures
        let attendanceRecords = [];
        if (response.data?.attendance && Array.isArray(response.data.attendance)) {
          attendanceRecords = response.data.attendance;
        } else if (Array.isArray(response.data?.data)) {
          attendanceRecords = response.data.data;
        } else if (Array.isArray(response.data)) {
          attendanceRecords = response.data;
        }
        
        attendanceRecords.forEach(record => {
          const key = `${classItem._id}_${record.studentId}`;
          attendanceMap[key] = record.status;
        });
      }
      
      setAttendanceData(attendanceMap);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    }
  };

  const handleClassClick = async (classId) => {
    console.log('Class clicked:', classId);
    console.log('Selected date:', selectedDate);
    
    if (expandedClass === classId) {
      setExpandedClass(null);
    } else {
      setExpandedClass(classId);
      if (!classStudents[classId]) {
        console.log('Loading students for class:', classId);
        await loadClassStudents(classId);
      } else {
        console.log('Using cached students for class:', classId);
      }
    }
  };

  const handleAttendanceChange = async (classId, studentId, status) => {
    const key = `${classId}_${studentId}`;
    
    // Set saving state for this specific student
    setSavingAttendance(prev => ({ ...prev, [key]: true }));
    
    // Update local state immediately for UI responsiveness
    setAttendanceData(prev => ({
      ...prev,
      [key]: status
    }));

    // Auto-save to database immediately
    try {
      const userId = user?.id || user?._id || user?.userId;
      
      console.log('Auto-saving attendance:', { studentId, classId, date: selectedDate, status, markedBy: userId });

      await handleApiResponse(
        async () => api.post('/attendance/mark', {
          studentId,
          classId,
          date: selectedDate,
          status,
          markedBy: userId
        }),
        {
          successMessage: `Student marked as ${status}`,
          errorMessage: 'Failed to save attendance'
        }
      );

      console.log(`✅ Auto-saved attendance: ${status} for student ${studentId}`);
    } catch (error) {
      console.error('❌ Failed to auto-save attendance:', error);
      // Revert local state on error
      setAttendanceData(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
      
      // Show error feedback
      toast.error('Failed to save attendance. Please try again.');
    } finally {
      // Clear saving state
      setSavingAttendance(prev => {
        const newState = { ...prev };
        delete newState[key];
        return newState;
      });
    }
  };

  const syncAllAttendance = async () => {
    try {
      setSaving(true);
      
      // Get all attendance records for sync
      const attendanceRecords = [];
      
      const userId = user?.id || user?._id || user?.userId;
      
      Object.entries(attendanceData).forEach(([key, status]) => {
        const [classId, studentId] = key.split('_');
        attendanceRecords.push({
          studentId,
          classId,
          date: selectedDate,
          status,
          markedBy: userId
        });
      });

      if (attendanceRecords.length === 0) {
        toast.info('No attendance data to sync');
        return;
      }

      console.log('Syncing all attendance records:', attendanceRecords);

      // Use bulk mark endpoint if available, otherwise mark individually
      for (const record of attendanceRecords) {
        await handleApiResponse(
          async () => api.post('/attendance/mark', record)
        );
      }

      toast.success(`Synced ${attendanceRecords.length} attendance records`);

      // Refresh data to ensure consistency
      await loadStudentAttendanceData();
    } catch (error) {
      console.error('Error syncing attendance:', error);
      toast.error('Failed to sync attendance data');
    } finally {
      setSaving(false);
    }
  };

  const exportToExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();
      
      // Create detailed sheet with all students
      const excelData = [
        ['Student Attendance Report'],
        ['Date:', selectedDate],
        ['Teacher:', `${user.fullName?.firstName || ''} ${user.fullName?.lastName || ''}`.trim()],
        ['Generated:', new Date().toLocaleString()],
        [''],
        ['Class', 'Student Name', 'Roll Number', 'Status']
      ];
      
      classes.forEach(classItem => {
        const students = classStudents[classItem._id] || [];
        
        students.forEach(student => {
          const key = `${classItem._id}_${student._id}`;
          const attendance = attendanceData[key];
          
          excelData.push([
            `${classItem.name} (${classItem.grade} ${classItem.program})`,
            student.fullName?.firstName && student.fullName?.lastName 
              ? `${student.fullName.firstName} ${student.fullName.lastName}`
              : student.name || 'Unknown',
            student.rollNumber || 'N/A',
            attendance || 'Absent'
          ]);
        });
      });
      
      const sheet = XLSX.utils.aoa_to_sheet(excelData);
      XLSX.utils.book_append_sheet(workbook, sheet, 'Attendance');
      
      // Save file
      const fileName = `student-attendance-${selectedDate}.xlsx`;
      XLSX.writeFile(workbook, fileName);
      
      toast.success('Attendance report exported successfully');
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast.error('Failed to export attendance report');
    }
  };

  const getAttendanceStats = () => {
    const total = Object.keys(attendanceData).length;
    const present = Object.values(attendanceData).filter(status => status === 'Present').length;
    const absent = Object.values(attendanceData).filter(status => status === 'Absent').length;
    
    return { total, present, absent };
  };

  const getTeacherRole = (classItem) => {
    const userId = user?.id || user?._id || user?.userId;
    
    // Check if user is class incharge
    if (classItem.classIncharge?._id === userId || classItem.classIncharge === userId) {
      return 'Class Incharge';
    }
    
    // Check if user is assigned as teacher
    const teacherAssignment = classItem.teachers?.find(t => 
      (t.teacherId?._id === userId || t.teacherId === userId)
    );
    
    if (teacherAssignment) {
      return `Subject Teacher${teacherAssignment.subject ? ` (${teacherAssignment.subject})` : ''}`;
    }
    
    return 'Teacher';
  };

  const stats = getAttendanceStats();

  // Try different possible user ID fields
  const userId = user?.id || user?._id || user?.userId;
  
  console.log('Render check:', { 
    userId: userId, 
    loading, 
    classesLength: classes.length,
    shouldShowLoading: !userId || (loading && classes.length === 0)
  });

  if (!userId || (loading && classes.length === 0)) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!user?.id ? 'Loading user...' : 'Loading classes...'}
          </p>
        </div>
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
              <div className="p-2 bg-blue-500 rounded-lg">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Student Attendance Management</h1>
                <p className="text-sm text-gray-600">Mark daily student attendance for your classes</p>
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
            <div className="flex items-center gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Date
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button
                onClick={exportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
              <Button
                onClick={syncAllAttendance}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? 'Syncing...' : 'Sync All Data'}
              </Button>
              <Button
                onClick={() => loadStudentAttendanceData()}
                disabled={loading}
                className="bg-gray-600 hover:bg-gray-700 text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Refresh Data
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Students</span>
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
        </div>

        {/* Class List */}
        <div className="space-y-4">
          {Array.isArray(classes) && classes.map((classItem) => {
            const classId = classItem._id;
            const isExpanded = expandedClass === classId;
            const students = classStudents[classId] || [];
            const teacherRole = getTeacherRole(classItem);
            
            return (
              <div key={classId} className="bg-white rounded-xl shadow-sm border border-gray-200">
                {/* Class Header */}
                <div 
                  className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => handleClassClick(classId)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <School className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {classItem.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {classItem.grade} {classItem.program} - {classItem.campus} • {teacherRole}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {students.length} Students
                        </p>
                        <p className="text-xs text-gray-600">
                          {students.filter(student => {
                            const key = `${classId}_${student._id}`;
                            return attendanceData[key] === 'Present';
                          }).length} Present
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

                {/* Class Students */}
                {isExpanded && (
                  <div className="border-t border-gray-200">
                    {students.length === 0 ? (
                      <div className="p-6 text-center text-gray-500">
                        <Users className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                        <p>No students found in this class</p>
                      </div>
                    ) : (
                      <div className="p-6">
                        <div className="space-y-3">
                          {students.map((student) => {
                            const studentKey = `${classId}_${student._id}`;
                            const currentStatus = attendanceData[studentKey];
                            
                            return (
                              <div key={student._id} className="w-full p-4 bg-gray-50 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-gray-900 truncate">
                                      {student.fullName?.firstName && student.fullName?.lastName 
                                        ? `${student.fullName.firstName} ${student.fullName.lastName}`
                                        : student.name || 'Unknown'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Roll: {student.rollNumber || 'N/A'}
                                    </p>
                                  </div>
                                  
                                  {/* Status Indicator */}
                                  {currentStatus && (
                                    <div className="ml-3">
                                      {currentStatus === 'Present' && (
                                        <div className="flex items-center text-green-600">
                                          <CheckCircle className="h-5 w-5" />
                                        </div>
                                      )}
                                      {currentStatus === 'Absent' && (
                                        <div className="flex items-center text-red-600">
                                          <XCircle className="h-5 w-5" />
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>

                                <div className="flex gap-2 w-full">
                                  {/* Attendance Buttons */}
                                  <button
                                    onClick={() => handleAttendanceChange(classId, student._id, 'Present')}
                                    disabled={savingAttendance[studentKey]}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                      currentStatus === 'Present'
                                        ? 'bg-green-600 text-white shadow-md'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-green-50 hover:border-green-300 hover:text-green-700'
                                    }`}
                                  >
                                    {savingAttendance[studentKey] && currentStatus === 'Present' ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                    Present
                                  </button>
                                  
                                  <button
                                    onClick={() => handleAttendanceChange(classId, student._id, 'Absent')}
                                    disabled={savingAttendance[studentKey]}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                                      currentStatus === 'Absent'
                                        ? 'bg-red-600 text-white shadow-md'
                                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-red-50 hover:border-red-300 hover:text-red-700'
                                    }`}
                                  >
                                    {savingAttendance[studentKey] && currentStatus === 'Absent' ? (
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    ) : (
                                      <XCircle className="h-4 w-4" />
                                    )}
                                    Absent
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {classes.length === 0 && !loading && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <BookOpen className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Assigned</h3>
            <p className="text-gray-600">You are not assigned as class incharge or teacher for any classes.</p>
            <div className="mt-4 text-sm text-gray-500">
              <p>User ID: {user?.id || 'Not loaded'}</p>
              <p>User Role: {user?.role || 'Not loaded'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherStudentAttendance;