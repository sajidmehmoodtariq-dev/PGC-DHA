import React, { useState, useEffect, useCallback } from 'react';
import { UserX, Calendar, AlertTriangle, Download, Filter, Search, Users, BarChart3, FileText } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const StudentAttendanceReports = ({ config }) => {
  console.log('StudentAttendanceReports: Component rendering, config:', config);
  
  const toastContext = useToast();
  const { addToast } = toastContext || {};
  
  console.log('StudentAttendanceReports: Toast context:', toastContext);
  
  const [loading, setLoading] = useState(false);
  const [classesLoading, setClassesLoading] = useState(true);
  const [attendanceData, setAttendanceData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [filters, setFilters] = useState({
    campus: '',
    grade: '',
    classId: '',
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    attendanceStatus: 'all' // all, present, absent, leave
  });
  const [reportType, setReportType] = useState('summary'); // summary, detailed, analytics

  const handleError = useCallback((error, context) => {
    console.error(`StudentAttendanceReports: Error in ${context}:`, error);
    if (addToast && typeof addToast === 'function') {
      addToast({ type: 'error', message: `Error loading ${context}: ${error.message || 'Unknown error'}` });
    } else {
      console.error('StudentAttendanceReports: Toast not available, error:', error.message);
      // Fallback - show alert if toast is not working
      alert(`Error loading ${context}: ${error.message || 'Unknown error'}`);
    }
  }, [addToast]);

  const loadClasses = useCallback(async () => {
    try {
      console.log('StudentAttendanceReports: Loading classes...');
      setClassesLoading(true);
      const response = await api.get('/classes');
      console.log('StudentAttendanceReports: Classes response:', response.data);
      if (response.data && response.data.success) {
        const classesData = response.data.data || response.data.classes || [];
        setClasses(classesData);
        console.log('StudentAttendanceReports: Classes loaded:', classesData.length);
      } else {
        console.error('StudentAttendanceReports: Invalid response format:', response.data);
        handleError(new Error('Invalid response format from server'), 'classes');
      }
    } catch (error) {
      console.error('StudentAttendanceReports: Error loading classes:', error);
      handleError(error, 'classes');
    } finally {
      console.log('StudentAttendanceReports: Setting classesLoading to false');
      setClassesLoading(false);
    }
  }, [handleError]);

  const loadAttendanceData = useCallback(async () => {
    if (!filters.classId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams({
        classId: filters.classId,
        startDate: filters.startDate,
        endDate: filters.endDate
      });

      const response = await api.get(`/attendance/class/${filters.classId}/range?${params}`);
      if (response.data.success) {
        setAttendanceData(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading attendance data:', error);
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message: 'Failed to load attendance data' });
      }
    } finally {
      setLoading(false);
    }
  }, [filters.classId, filters.startDate, filters.endDate, addToast]);

  useEffect(() => {
    console.log('StudentAttendanceReports: Component mounted, loading classes...');
    loadClasses();
  }, [loadClasses]);

  useEffect(() => {
    console.log('StudentAttendanceReports: Filters changed, classId:', filters.classId);
    if (filters.classId) {
      loadAttendanceData();
    }
  }, [filters, loadAttendanceData]);

  // Filter classes based on campus and grade
  const filteredClasses = classes.filter(cls => {
    if (filters.campus && cls.campus !== filters.campus) return false;
    if (filters.grade && cls.grade !== filters.grade) return false;
    return true;
  });

  // Filter attendance data based on selected status
  const filteredAttendanceData = attendanceData.filter(record => {
    if (filters.attendanceStatus === 'all') return true;
    return record.status === filters.attendanceStatus;
  });

  const calculateAttendanceStats = () => {
    const dataToUse = filteredAttendanceData.length > 0 ? filteredAttendanceData : attendanceData;
    if (!dataToUse.length) return { totalStudents: 0, totalDays: 0, averageAttendance: 0, studentStats: {} };

    const studentStats = {};
    let totalDays = 0;
    const uniqueDates = new Set();

    dataToUse.forEach(record => {
      const studentId = record.studentId._id;
      const date = record.date;
      
      uniqueDates.add(date);
      
      if (!studentStats[studentId]) {
        studentStats[studentId] = {
          name: `${record.studentId.fullName?.firstName} ${record.studentId.fullName?.lastName}`,
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          leaveDays: 0
        };
      }
      
      studentStats[studentId].totalDays++;
      if (record.status === 'present') {
        studentStats[studentId].presentDays++;
      } else if (record.status === 'absent') {
        studentStats[studentId].absentDays++;
      } else if (record.status === 'leave') {
        studentStats[studentId].leaveDays++;
      }
    });

    totalDays = uniqueDates.size;
    const totalStudents = Object.keys(studentStats).length;
    const averageAttendance = totalStudents > 0 
      ? Object.values(studentStats).reduce((acc, student) => 
          acc + (student.presentDays / student.totalDays), 0) / totalStudents * 100 
      : 0;

    return { totalStudents, totalDays, averageAttendance: averageAttendance.toFixed(1), studentStats };
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const stats = calculateAttendanceStats();
    
    // Title
    doc.setFontSize(20);
    doc.text('Student Attendance Report', 20, 20);
    
    // Report info
    doc.setFontSize(12);
    doc.text(`Period: ${filters.startDate} to ${filters.endDate}`, 20, 35);
    doc.text(`Class: ${classes.find(c => c._id === filters.classId)?.className || 'All Classes'}`, 20, 45);
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
        student.totalDays,
        `${((student.presentDays / student.totalDays) * 100).toFixed(1)}%`
      ]);

      autoTable(doc, {
        head: [['Student Name', 'Present Days', 'Total Days', 'Attendance %']],
        body: tableData,
        startY: 105,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [59, 130, 246] }
      });
    }
    
    doc.save(`student-attendance-${filters.startDate}-${filters.endDate}.pdf`);
    if (typeof addToast === 'function') {
      addToast({ type: 'success', message: 'PDF report generated successfully' });
    }
  };

  const exportToExcel = () => {
    const stats = calculateAttendanceStats();
    
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Student Attendance Report'],
      [''],
      ['Period', `${filters.startDate} to ${filters.endDate}`],
      ['Class', classes.find(c => c._id === filters.classId)?.className || 'All Classes'],
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
        ['Student Name', 'Present Days', 'Total Days', 'Attendance %', 'Absent Days']
      ];
      
      Object.entries(stats.studentStats).forEach(([, student]) => {
        detailedData.push([
          student.name,
          student.presentDays,
          student.totalDays,
          `${((student.presentDays / student.totalDays) * 100).toFixed(1)}%`,
          student.totalDays - student.presentDays
        ]);
      });
      
      const detailedSheet = XLSX.utils.aoa_to_sheet(detailedData);
      XLSX.utils.book_append_sheet(workbook, detailedSheet, 'Detailed');
    }
    
    XLSX.writeFile(workbook, `student-attendance-${filters.startDate}-${filters.endDate}.xlsx`);
    if (typeof addToast === 'function') {
      addToast({ type: 'success', message: 'Excel report generated successfully' });
    }
  };

  const stats = calculateAttendanceStats();

  // Show loading screen while classes are being loaded
  if (classesLoading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
              <span className="text-blue-600 font-medium">Loading classes...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <UserX className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Student Attendance Reports</h2>
            <p className="text-sm text-gray-600">
              Track and analyze student attendance patterns
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          {/* Campus Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Campus
            </label>
            <select 
              value={filters.campus}
              onChange={(e) => setFilters({...filters, campus: e.target.value, classId: ''})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Campuses</option>
              <option value="Boys">Boys Campus</option>
              <option value="Girls">Girls Campus</option>
            </select>
          </div>

          {/* Grade Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Grade
            </label>
            <select 
              value={filters.grade}
              onChange={(e) => setFilters({...filters, grade: e.target.value, classId: ''})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Grades</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Class
            </label>
            <select 
              value={filters.classId}
              onChange={(e) => setFilters({...filters, classId: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a class</option>
              {filteredClasses.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {cls.className} - Floor {cls.floor}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({...filters, startDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({...filters, endDate: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Report Type
            </label>
            <select 
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="summary">Summary</option>
              <option value="detailed">Detailed</option>
              <option value="analytics">Analytics</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attendance Status
            </label>
            <select 
              value={filters.attendanceStatus}
              onChange={(e) => setFilters({...filters, attendanceStatus: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present Only</option>
              <option value="absent">Absent Only</option>
              <option value="leave">Leave Only</option>
            </select>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mb-6">
          <Button onClick={loadAttendanceData} disabled={!filters.classId || loading}>
            <Search className="h-4 w-4 mr-2" />
            {loading ? 'Loading...' : 'Generate Report'}
          </Button>
          
          {config?.canExport && attendanceData.length > 0 && (
            <>
              <Button onClick={exportToPDF} variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Export PDF
              </Button>
              <Button onClick={exportToExcel} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Excel
              </Button>
            </>
          )}
        </div>

        {/* Summary Stats */}
        {attendanceData.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Users className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-600 font-medium">Total Students</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.totalStudents}</p>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-600 font-medium">Total Days</p>
                  <p className="text-2xl font-bold text-green-900">{stats.totalDays}</p>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-sm text-purple-600 font-medium">Average Attendance</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.averageAttendance}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Attendance Table */}
        {attendanceData.length > 0 && Object.keys(stats.studentStats).length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-300 px-4 py-2 text-left">Student Name</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Present</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Absent</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Leave</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Total Days</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Attendance %</th>
                  <th className="border border-gray-300 px-4 py-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(stats.studentStats).map(([studentId, student]) => {
                  const attendancePercentage = (student.presentDays / student.totalDays) * 100;
                  const status = attendancePercentage >= 80 ? 'Good' : attendancePercentage >= 70 ? 'Average' : 'Poor';
                  const statusColor = attendancePercentage >= 80 ? 'text-green-600 bg-green-100' : 
                                    attendancePercentage >= 70 ? 'text-yellow-600 bg-yellow-100' : 'text-red-600 bg-red-100';
                  
                  return (
                    <tr key={studentId} className="hover:bg-gray-50">
                      <td className="border border-gray-300 px-4 py-2">{student.name}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <span className="text-green-600 font-medium">{student.presentDays}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <span className="text-red-600 font-medium">{student.absentDays}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <span className="text-yellow-600 font-medium">{student.leaveDays}</span>
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">{student.totalDays}</td>
                      <td className="border border-gray-300 px-4 py-2 text-center font-medium">
                        {attendancePercentage.toFixed(1)}%
                      </td>
                      <td className="border border-gray-300 px-4 py-2 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* No data message */}
        {!loading && (!filters.classId || attendanceData.length === 0) && (
          <div className="text-center py-8">
            <UserX className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {!filters.classId ? 'Select a Class' : 'No Attendance Data'}
            </h3>
            <p className="text-gray-600">
              {!filters.classId 
                ? 'Please select a class to view attendance reports' 
                : 'No attendance records found for the selected period'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAttendanceReports;
