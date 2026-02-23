import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  UserCheck, 
  Calendar, 
  BarChart3, 
  FileText, 
  Download, 
  Search, 
  Filter,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  School,
  BookOpen
} from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const AttendanceReports = ({ config }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('student');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  
  // Student Attendance State
  const [studentAttendanceData, setStudentAttendanceData] = useState([]);
  const [studentFilters, setStudentFilters] = useState({
    campus: '',
    grade: '',
    classId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    attendanceStatus: 'all'
  });

  // Teacher Attendance State  
  const [teacherAttendanceData, setTeacherAttendanceData] = useState([]);
  const [teacherFilters, setTeacherFilters] = useState({
    floor: '',
    teacherId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    attendanceStatus: 'all'
  });

  const loadClasses = async () => {
    try {
      console.log('AttendanceReports: Loading classes...');
      const response = await api.get('/classes');
      console.log('AttendanceReports: Classes response:', response);
      if (response.data.success) {
        setClasses(response.data.classes || []);
        console.log('AttendanceReports: Classes loaded:', response.data.classes?.length || 0);
      } else {
        console.warn('AttendanceReports: Classes response not successful:', response.data);
        setClasses([]);
      }
    } catch (error) {
      console.error('AttendanceReports: Error loading classes:', error);
      toast.error('Failed to load classes');
      setClasses([]); // Set empty array on error
    }
  };

  const loadTeachers = async () => {
    try {
      console.log('AttendanceReports: Loading teachers...');
      const response = await api.get('/users?role=Teacher');
      console.log('AttendanceReports: Teachers response:', response);
      if (response.data?.data?.users) {
        setTeachers(response.data.data.users);
        console.log('AttendanceReports: Teachers loaded:', response.data.data.users.length);
      }
    } catch (error) {
      console.error('AttendanceReports: Error loading teachers:', error);
      toast.error('Failed to load teachers');
      setTeachers([]); // Set empty array on error
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      console.log('AttendanceReports: Component mounted, loading initial data');
      setInitialLoading(true);
      try {
        await Promise.all([loadClasses(), loadTeachers()]);
      } catch (error) {
        console.error('AttendanceReports: Error loading initial data:', error);
      } finally {
        setInitialLoading(false);
      }
    };
    
    loadInitialData();
  }, []); // Remove dependencies to prevent infinite loop 
 const loadStudentAttendanceData = useCallback(async () => {
    if (!studentFilters.classId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: studentFilters.startDate,
        endDate: studentFilters.endDate
      });

      const response = await api.get(`/attendance/class/${studentFilters.classId}/range?${params}`);
      if (response.data.success) {
        setStudentAttendanceData(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading student attendance:', error);
      toast.error('Failed to load student attendance data');
    } finally {
      setLoading(false);
    }
  }, [studentFilters.classId, studentFilters.startDate, studentFilters.endDate, toast]);

  const loadTeacherAttendanceData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: teacherFilters.startDate,
        endDate: teacherFilters.endDate
      });

      if (teacherFilters.teacherId) {
        params.append('teacherId', teacherFilters.teacherId);
      }
      if (teacherFilters.floor) {
        params.append('floor', teacherFilters.floor);
      }

      const response = await api.get(`/teacher-attendance/report/daily/${teacherFilters.startDate}?${params}`);
      if (response.data.success) {
        setTeacherAttendanceData(response.data.attendanceByFloor || {});
      }
    } catch (error) {
      console.error('Error loading teacher attendance:', error);
      toast.error('Failed to load teacher attendance data');
    } finally {
      setLoading(false);
    }
  }, [teacherFilters, toast]);

  useEffect(() => {
    if (activeTab === 'student' && studentFilters.classId) {
      loadStudentAttendanceData();
    } else if (activeTab === 'teacher') {
      loadTeacherAttendanceData();
    }
  }, [activeTab, loadStudentAttendanceData, loadTeacherAttendanceData]);

  // Filter classes based on campus and grade
  const filteredClasses = classes.filter(cls => {
    if (studentFilters.campus && cls.campus !== studentFilters.campus) return false;
    if (studentFilters.grade && cls.grade !== studentFilters.grade) return false;
    return true;
  });

  const calculateStudentStats = () => {
    if (!studentAttendanceData.length) return { totalStudents: 0, totalDays: 0, averageAttendance: 0, studentStats: {} };

    const studentStats = {};
    const uniqueDates = new Set();

    studentAttendanceData.forEach(record => {
      const studentId = record.studentId._id;
      const date = record.date;
      
      uniqueDates.add(date);
      
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          name: `${record.studentId.fullName?.firstName || ''} ${record.studentId.fullName?.lastName || ''}`.trim(),
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0
        };
      }
      
      studentStats[studentId].totalDays++;
      if (record.status === 'Present') {
        studentStats[studentId].presentDays++;
      } else if (record.status === 'Absent') {
        studentStats[studentId].absentDays++;
      } else if (record.status === 'Late') {
        studentStats[studentId].lateDays++;
      }
    });

    const totalDays = uniqueDates.size;
    const totalStudents = Object.keys(studentStats).length;
    const averageAttendance = totalStudents > 0 
      ? Object.values(studentStats).reduce((acc, student) => 
          acc + ((student.presentDays + student.lateDays) / student.totalDays), 0) / totalStudents * 100 
      : 0;

    return { totalStudents, totalDays, averageAttendance: averageAttendance.toFixed(1), studentStats };
  };

  const calculateTeacherStats = () => {
    const allRecords = Object.values(teacherAttendanceData).flat();
    if (!allRecords.length) return { totalTeachers: 0, totalLectures: 0, punctualityRate: 0, teacherStats: {} };

    const teacherStats = {};
    
    allRecords.forEach(record => {
      const teacherId = record.teacherId._id;
      
      if (!teacherStats[teacherId]) {
        teacherStats[teacherId] = {
          name: `${record.teacherId.fullName?.firstName || ''} ${record.teacherId.fullName?.lastName || ''}`.trim(),
          totalLectures: 0,
          onTime: 0,
          late: 0,
          absent: 0,
          cancelled: 0
        };
      }
      
      teacherStats[teacherId].totalLectures++;
      if (record.status === 'On Time') {
        teacherStats[teacherId].onTime++;
      } else if (record.status === 'Late') {
        teacherStats[teacherId].late++;
      } else if (record.status === 'Absent') {
        teacherStats[teacherId].absent++;
      } else if (record.status === 'Cancelled') {
        teacherStats[teacherId].cancelled++;
      }
    });

    const totalTeachers = Object.keys(teacherStats).length;
    const totalLectures = allRecords.length;
    const punctualityRate = totalLectures > 0 
      ? (allRecords.filter(r => r.status === 'On Time').length / totalLectures) * 100 
      : 0;

    return { totalTeachers, totalLectures, punctualityRate: punctualityRate.toFixed(1), teacherStats };
  }; 
 const exportStudentPDF = () => {
    const doc = new jsPDF();
    const stats = calculateStudentStats();
    
    // Title
    doc.setFontSize(20);
    doc.text('Student Attendance Report', 20, 20);
    
    // Report info
    doc.setFontSize(12);
    doc.text(`Period: ${studentFilters.startDate} to ${studentFilters.endDate}`, 20, 35);
    doc.text(`Class: ${classes.find(c => c._id === studentFilters.classId)?.name || 'All Classes'}`, 20, 45);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 55);
    
    // Summary stats
    doc.text(`Total Students: ${stats.totalStudents}`, 20, 70);
    doc.text(`Total Days: ${stats.totalDays}`, 20, 80);
    doc.text(`Average Attendance: ${stats.averageAttendance}%`, 20, 90);
    
    // Attendance table
    if (Object.keys(stats.studentStats).length > 0) {
      const tableData = Object.entries(stats.studentStats).map(([, student]) => [
        student.name,
        student.presentDays,
        student.lateDays,
        student.absentDays,
        student.totalDays,
        `${(((student.presentDays + student.lateDays) / student.totalDays) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        head: [['Student Name', 'Present', 'Late', 'Absent', 'Total Days', 'Attendance %']],
        body: tableData,
        startY: 105,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] }
      });
    }
    
    doc.save(`student-attendance-${studentFilters.startDate}-${studentFilters.endDate}.pdf`);
    toast.success('Student attendance PDF generated successfully');
  };

  const exportTeacherPDF = () => {
    const doc = new jsPDF();
    const stats = calculateTeacherStats();
    
    // Title
    doc.setFontSize(20);
    doc.text('Teacher Attendance Report', 20, 20);
    
    // Report info
    doc.setFontSize(12);
    doc.text(`Period: ${teacherFilters.startDate} to ${teacherFilters.endDate}`, 20, 35);
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
    
    // Summary stats
    doc.text(`Total Teachers: ${stats.totalTeachers}`, 20, 60);
    doc.text(`Total Lectures: ${stats.totalLectures}`, 20, 70);
    doc.text(`Punctuality Rate: ${stats.punctualityRate}%`, 20, 80);
    
    // Teacher table
    if (Object.keys(stats.teacherStats).length > 0) {
      const tableData = Object.entries(stats.teacherStats).map(([, teacher]) => [
        teacher.name,
        teacher.onTime,
        teacher.late,
        teacher.absent,
        teacher.cancelled,
        teacher.totalLectures,
        `${((teacher.onTime / teacher.totalLectures) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        head: [['Teacher Name', 'On Time', 'Late', 'Absent', 'Cancelled', 'Total', 'Punctuality %']],
        body: tableData,
        startY: 95,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [147, 51, 234] }
      });
    }
    
    doc.save(`teacher-attendance-${teacherFilters.startDate}-${teacherFilters.endDate}.pdf`);
    toast.success('Teacher attendance PDF generated successfully');
  };

  const exportStudentExcel = () => {
    const stats = calculateStudentStats();
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Student Attendance Report'],
      [''],
      ['Period', `${studentFilters.startDate} to ${studentFilters.endDate}`],
      ['Class', classes.find(c => c._id === studentFilters.classId)?.name || 'All Classes'],
      ['Generated', new Date().toLocaleDateString()],
      [''],
      ['Total Students', stats.totalStudents],
      ['Total Days', stats.totalDays],
      ['Average Attendance', `${stats.averageAttendance}%`]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Detailed sheet
    if (Object.keys(stats.studentStats).length > 0) {
      const detailedData = [
        ['Student Name', 'Present Days', 'Late Days', 'Absent Days', 'Total Days', 'Attendance %']
      ];
      
      Object.entries(stats.studentStats).forEach(([, student]) => {
        detailedData.push([
          student.name,
          student.presentDays,
          student.lateDays,
          student.absentDays,
          student.totalDays,
          `${(((student.presentDays + student.lateDays) / student.totalDays) * 100).toFixed(1)}%`
        ]);
      });
      
      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed');
    }
    
    XLSX.writeFile(workbook, `student-attendance-${studentFilters.startDate}-${studentFilters.endDate}.xlsx`);
    toast.success('Student attendance Excel generated successfully');
  };

  const exportTeacherExcel = () => {
    const stats = calculateTeacherStats();
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Teacher Attendance Report'],
      [''],
      ['Period', `${teacherFilters.startDate} to ${teacherFilters.endDate}`],
      ['Generated', new Date().toLocaleDateString()],
      [''],
      ['Total Teachers', stats.totalTeachers],
      ['Total Lectures', stats.totalLectures],
      ['Punctuality Rate', `${stats.punctualityRate}%`]
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Detailed sheet
    if (Object.keys(stats.teacherStats).length > 0) {
      const detailedData = [
        ['Teacher Name', 'On Time', 'Late', 'Absent', 'Cancelled', 'Total Lectures', 'Punctuality %']
      ];
      
      Object.entries(stats.teacherStats).forEach(([, teacher]) => {
        detailedData.push([
          teacher.name,
          teacher.onTime,
          teacher.late,
          teacher.absent,
          teacher.cancelled,
          teacher.totalLectures,
          `${((teacher.onTime / teacher.totalLectures) * 100).toFixed(1)}%`
        ]);
      });
      
      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed');
    }
    
    XLSX.writeFile(workbook, `teacher-attendance-${teacherFilters.startDate}-${teacherFilters.endDate}.xlsx`);
    toast.success('Teacher attendance Excel generated successfully');
  }; 
 const studentStats = calculateStudentStats();
  const teacherStats = calculateTeacherStats();

  // Show loading spinner while initial data is loading
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading attendance reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-border/50 p-8 transition-all duration-300 hover:shadow-2xl hover:bg-white/70" style={{boxShadow: '0 12px 48px 0 rgba(26,35,126,0.12)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/90 to-accent/80 text-white shadow-lg">
              <BarChart3 className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-primary mb-2 font-[Sora,Inter,sans-serif] tracking-tight">Attendance Reports</h2>
              <p className="text-muted-foreground font-medium">Comprehensive attendance analytics and reporting</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-2 transition-all duration-300 hover:shadow-xl hover:bg-white/70">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('student')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'student'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-white/60 hover:text-blue-600'
            }`}
          >
            <Users className="h-4 w-4" />
            Student Attendance
          </button>
          <button
            onClick={() => setActiveTab('teacher')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
              activeTab === 'teacher'
                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-white/60 hover:text-purple-600'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            Teacher Attendance
          </button>
        </div>
      </div>

      {/* Student Attendance Tab */}
      {activeTab === 'student' && (
        <div className="space-y-6">
          {/* Analytics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl">
                  <Users className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-xl lg:text-2xl font-bold">{studentStats.totalStudents}</span>
              </div>
              <h3 className="text-base lg:text-lg font-semibold">Total Students</h3>
              <p className="text-blue-100 text-xs lg:text-sm">In selected class</p>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl">
                  <Calendar className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-xl lg:text-2xl font-bold">{studentStats.totalDays}</span>
              </div>
              <h3 className="text-base lg:text-lg font-semibold">Total Days</h3>
              <p className="text-green-100 text-xs lg:text-sm">In selected period</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl">
                  <TrendingUp className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-xl lg:text-2xl font-bold">{studentStats.averageAttendance}%</span>
              </div>
              <h3 className="text-base lg:text-lg font-semibold">Average Attendance</h3>
              <p className="text-purple-100 text-xs lg:text-sm">Overall class performance</p>
            </div>
          </div>

          {/* Student Filters */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/70">
            <h3 className="text-lg font-bold text-primary mb-4 font-[Sora,Inter,sans-serif] flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
              Student Attendance Filters
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Campus</label>
                <select 
                  value={studentFilters.campus}
                  onChange={(e) => setStudentFilters({...studentFilters, campus: e.target.value, classId: ''})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                >
                  <option value="">All Campuses</option>
                  <option value="Boys">Boys Campus</option>
                  <option value="Girls">Girls Campus</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Grade</label>
                <select 
                  value={studentFilters.grade}
                  onChange={(e) => setStudentFilters({...studentFilters, grade: e.target.value, classId: ''})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                >
                  <option value="">All Grades</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Class</label>
                <select 
                  value={studentFilters.classId}
                  onChange={(e) => setStudentFilters({...studentFilters, classId: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                >
                  <option value="">Select a class</option>
                  {filteredClasses.map(cls => (
                    <option key={cls._id} value={cls._id}>
                      {cls.name} - Floor {cls.floor}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Start Date</label>
                <input
                  type="date"
                  value={studentFilters.startDate}
                  onChange={(e) => setStudentFilters({...studentFilters, startDate: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">End Date</label>
                <input
                  type="date"
                  value={studentFilters.endDate}
                  onChange={(e) => setStudentFilters({...studentFilters, endDate: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={loadStudentAttendanceData} disabled={!studentFilters.classId || loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
              
              {config?.canExport && studentAttendanceData.length > 0 && (
                <>
                  <Button onClick={exportStudentPDF} variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={exportStudentExcel} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </>
              )}
            </div>
          </div>   
       {/* Student Attendance Table */}
          {studentAttendanceData.length > 0 && Object.keys(studentStats.studentStats).length > 0 && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/70">
              <h3 className="text-lg font-bold text-primary mb-4 font-[Sora,Inter,sans-serif] flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                Student Attendance Details
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
                      <th className="text-left py-3 px-4 font-semibold text-primary">Student Name</th>
                      <th className="text-center py-3 px-4 font-semibold text-green-600">Present</th>
                      <th className="text-center py-3 px-4 font-semibold text-yellow-600">Late</th>
                      <th className="text-center py-3 px-4 font-semibold text-red-600">Absent</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Total Days</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Attendance %</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(studentStats.studentStats).map(([studentId, student]) => {
                      const attendancePercentage = ((student.presentDays + student.lateDays) / student.totalDays) * 100;
                      const status = attendancePercentage >= 80 ? 'Good' : attendancePercentage >= 70 ? 'Average' : 'Poor';
                      const statusColor = attendancePercentage >= 80 ? 'text-green-600 bg-green-100' : 
                                        attendancePercentage >= 70 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                      
                      return (
                        <tr key={studentId} className="border-b border-gray-200 hover:bg-primary/5 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{student.name}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold text-sm">
                              {student.presentDays}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-bold text-sm">
                              {student.lateDays}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                              {student.absentDays}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{student.totalDays}</td>
                          <td className="py-3 px-4 text-center font-bold text-primary">
                            {attendancePercentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Student Data Message */}
          {!loading && (!studentFilters.classId || studentAttendanceData.length === 0) && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-12 text-center transition-all duration-300 hover:shadow-xl hover:bg-white/70">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {!studentFilters.classId ? 'Select a Class' : 'No Student Attendance Data'}
              </h3>
              <p className="text-gray-600">
                {!studentFilters.classId 
                  ? 'Please select a class to view student attendance reports' 
                  : 'No attendance records found for the selected period'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Teacher Attendance Tab */}
      {activeTab === 'teacher' && (
        <div className="space-y-6">
          {/* Teacher Analytics Dashboard */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl">
                  <UserCheck className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-xl lg:text-2xl font-bold">{teacherStats.totalTeachers}</span>
              </div>
              <h3 className="text-base lg:text-lg font-semibold">Total Teachers</h3>
              <p className="text-purple-100 text-xs lg:text-sm">With attendance records</p>
            </div>

            <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl">
                  <BookOpen className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-xl lg:text-2xl font-bold">{teacherStats.totalLectures}</span>
              </div>
              <h3 className="text-base lg:text-lg font-semibold">Total Lectures</h3>
              <p className="text-indigo-100 text-xs lg:text-sm">In selected period</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-4 lg:p-6 text-white shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div className="p-2 lg:p-3 bg-white/20 rounded-xl">
                  <Clock className="w-5 h-5 lg:w-6 lg:h-6" />
                </div>
                <span className="text-xl lg:text-2xl font-bold">{teacherStats.punctualityRate}%</span>
              </div>
              <h3 className="text-base lg:text-lg font-semibold">Punctuality Rate</h3>
              <p className="text-emerald-100 text-xs lg:text-sm">On-time attendance</p>
            </div>
          </div>

          {/* Teacher Filters */}
          <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/70">
            <h3 className="text-lg font-bold text-primary mb-4 font-[Sora,Inter,sans-serif] flex items-center gap-2">
              <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
              Teacher Attendance Filters
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Floor</label>
                <select 
                  value={teacherFilters.floor}
                  onChange={(e) => setTeacherFilters({...teacherFilters, floor: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                >
                  <option value="">All Floors</option>
                  <option value="1">Floor 1 (11th Boys)</option>
                  <option value="2">Floor 2 (12th Boys)</option>
                  <option value="3">Floor 3 (11th Girls)</option>
                  <option value="4">Floor 4 (12th Girls)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Teacher</label>
                <select 
                  value={teacherFilters.teacherId}
                  onChange={(e) => setTeacherFilters({...teacherFilters, teacherId: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                >
                  <option value="">All Teachers</option>
                  {teachers.map(teacher => (
                    <option key={teacher._id} value={teacher._id}>
                      {`${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim() || teacher.userName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">Start Date</label>
                <input
                  type="date"
                  value={teacherFilters.startDate}
                  onChange={(e) => setTeacherFilters({...teacherFilters, startDate: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-primary/80 mb-2">End Date</label>
                <input
                  type="date"
                  value={teacherFilters.endDate}
                  onChange={(e) => setTeacherFilters({...teacherFilters, endDate: e.target.value})}
                  className="w-full px-4 py-3 border border-border/50 rounded-xl text-sm focus:outline-none focus:ring-3 focus:ring-primary/30 focus:border-primary bg-white/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={loadTeacherAttendanceData} disabled={loading}>
                <Search className="h-4 w-4 mr-2" />
                {loading ? 'Loading...' : 'Generate Report'}
              </Button>
              
              {config?.canExport && Object.keys(teacherAttendanceData).length > 0 && (
                <>
                  <Button onClick={exportTeacherPDF} variant="outline">
                    <FileText className="h-4 w-4 mr-2" />
                    Export PDF
                  </Button>
                  <Button onClick={exportTeacherExcel} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Excel
                  </Button>
                </>
              )}
            </div>
          </div>      
    {/* Teacher Attendance Table */}
          {Object.keys(teacherAttendanceData).length > 0 && Object.keys(teacherStats.teacherStats).length > 0 && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-6 transition-all duration-300 hover:shadow-xl hover:bg-white/70">
              <h3 className="text-lg font-bold text-primary mb-4 font-[Sora,Inter,sans-serif] flex items-center gap-2">
                <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
                Teacher Attendance Details
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-primary/20">
                      <th className="text-left py-3 px-4 font-semibold text-primary">Teacher Name</th>
                      <th className="text-center py-3 px-4 font-semibold text-green-600">On Time</th>
                      <th className="text-center py-3 px-4 font-semibold text-yellow-600">Late</th>
                      <th className="text-center py-3 px-4 font-semibold text-red-600">Absent</th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-600">Cancelled</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Total Lectures</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Punctuality %</th>
                      <th className="text-center py-3 px-4 font-semibold text-primary">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(teacherStats.teacherStats).map(([teacherId, teacher]) => {
                      const punctualityPercentage = (teacher.onTime / teacher.totalLectures) * 100;
                      const status = punctualityPercentage >= 90 ? 'Excellent' : punctualityPercentage >= 80 ? 'Good' : punctualityPercentage >= 70 ? 'Average' : 'Poor';
                      const statusColor = punctualityPercentage >= 90 ? 'text-green-600 bg-green-100' : 
                                        punctualityPercentage >= 80 ? 'text-blue-600 bg-blue-100' :
                                        punctualityPercentage >= 70 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                      
                      return (
                        <tr key={teacherId} className="border-b border-gray-200 hover:bg-primary/5 transition-colors">
                          <td className="py-3 px-4 font-medium text-gray-900">{teacher.name}</td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-600 font-bold text-sm">
                              {teacher.onTime}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 font-bold text-sm">
                              {teacher.late}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-100 text-red-600 font-bold text-sm">
                              {teacher.absent}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 text-gray-600 font-bold text-sm">
                              {teacher.cancelled}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center font-medium">{teacher.totalLectures}</td>
                          <td className="py-3 px-4 text-center font-bold text-primary">
                            {punctualityPercentage.toFixed(1)}%
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                              {status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* No Teacher Data Message */}
          {!loading && Object.keys(teacherAttendanceData).length === 0 && (
            <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-lg border border-border/50 p-12 text-center transition-all duration-300 hover:shadow-xl hover:bg-white/70">
              <UserCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Teacher Attendance Data</h3>
              <p className="text-gray-600">
                No teacher attendance records found for the selected period and filters
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttendanceReports;