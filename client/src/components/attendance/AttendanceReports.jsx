import React, { useState, useEffect } from 'react';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import { 
  BarChart3, 
  Calendar, 
  Download, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Users,
  UserCheck,
  Clock,
  Building,
  FileText,
  Eye
} from 'lucide-react';
import { Link } from 'react-router-dom';

const AttendanceReports = ({ user }) => {
  const { callApi } = useApiWithToast();
  const [reportType, setReportType] = useState('student-summary');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    {
      id: 'student-summary',
      name: 'Student Attendance Summary',
      description: 'Overall student attendance statistics',
      icon: Users
    },
    {
      id: 'teacher-punctuality',
      name: 'Teacher Punctuality Report',
      description: 'Teacher attendance and punctuality metrics',
      icon: UserCheck
    },
    {
      id: 'daily-breakdown',
      name: 'Daily Breakdown',
      description: 'Day-by-day attendance analysis',
      icon: Calendar
    },
    {
      id: 'floor-comparison',
      name: 'Floor Comparison',
      description: 'Compare attendance across floors',
      icon: Building
    }
  ];

  useEffect(() => {
    generateReport();
  }, [reportType, dateRange]);

  const generateReport = async () => {
    try {
      setLoading(true);
      
      let endpoint = '';
      switch (reportType) {
        case 'student-summary':
          endpoint = `/api/attendance/report/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        case 'teacher-punctuality':
          endpoint = `/teacher-attendance/report/summary?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        case 'daily-breakdown':
          endpoint = `/api/attendance/report/daily?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        case 'floor-comparison':
          endpoint = `/api/attendance/report/floors?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
          break;
        default:
          return;
      }
      
      const response = await callApi(endpoint, 'GET');
      if (response.success) {
        setReportData(response.data);
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async (format = 'csv') => {
    try {
      const response = await callApi(`/api/reports/export/${reportType}`, 'POST', {
        ...dateRange,
        format
      });
      
      if (response.success && response.data.downloadUrl) {
        // Trigger download
        const link = document.createElement('a');
        link.href = response.data.downloadUrl;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const renderStudentSummary = () => {
    if (!reportData) return null;

    const { overallStats, classBreakdown, trends } = reportData;

    return (
      <div className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Students</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{overallStats?.totalStudents || 0}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Avg Attendance</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {Math.round(overallStats?.averageAttendance || 0)}%
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Total Classes</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 mt-1">{overallStats?.totalClasses || 0}</p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
              <span className="text-sm font-medium text-purple-900">Best Performing</span>
            </div>
            <p className="text-lg font-bold text-purple-900 mt-1">
              {classBreakdown?.[0]?.className || 'N/A'}
            </p>
          </div>
        </div>

        {/* Class Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Class-wise Performance</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {classBreakdown?.map((classData, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{classData.className}</p>
                    <p className="text-sm text-gray-600">Floor {classData.floor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round(classData.attendancePercentage)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {classData.totalPresent}/{classData.totalSessions} sessions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderTeacherPunctuality = () => {
    if (!reportData) return null;

    const { overallStats, teacherBreakdown, punctualityTrends } = reportData;

    return (
      <div className="space-y-6">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Total Teachers</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{overallStats?.totalTeachers || 0}</p>
          </div>
          
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <span className="text-sm font-medium text-green-900">Punctuality Rate</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">
              {Math.round(overallStats?.punctualityRate || 0)}%
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-900">Avg Late Time</span>
            </div>
            <p className="text-2xl font-bold text-orange-900 mt-1">
              {Math.round(overallStats?.averageLateMinutes || 0)}m
            </p>
          </div>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm font-medium text-red-900">Late Arrivals</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{overallStats?.totalLateArrivals || 0}</p>
          </div>
        </div>

        {/* Teacher Breakdown */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Teacher Performance</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {teacherBreakdown?.map((teacher, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">
                      {teacher.fullName?.firstName && teacher.fullName?.lastName 
                        ? `${teacher.fullName.firstName} ${teacher.fullName.lastName}`
                        : teacher.name || teacher.userName || 'Unknown Teacher'
                      }
                    </p>
                    <p className="text-sm text-gray-600">{teacher.totalLectures} lectures</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-gray-900">
                      {Math.round(teacher.punctualityRate)}%
                    </p>
                    <p className="text-sm text-gray-600">
                      {teacher.lateCount > 0 && `${teacher.lateCount} late`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded-lg"></div>
        </div>
      );
    }

    switch (reportType) {
      case 'student-summary':
        return renderStudentSummary();
      case 'teacher-punctuality':
        return renderTeacherPunctuality();
      case 'daily-breakdown':
      case 'floor-comparison':
        return (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Report Coming Soon</h3>
            <p className="text-gray-600">
              This report type is currently under development.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Attendance Reports</h2>
          <p className="text-sm text-gray-600">Generate comprehensive attendance analytics</p>
        </div>
        
        <div className="flex items-center gap-3">
          <Link
            to="/reports?section=attendance"
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            View Full Reports
          </Link>
          
          <button
            onClick={() => exportReport('csv')}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Download className="h-4 w-4" />
            Export
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Report Type */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {reportTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range */}
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              max={new Date().toISOString().split('T')[0]}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Report Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportTypes.map((type) => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setReportType(type.id)}
              className={`p-4 text-left border rounded-lg transition-colors ${
                reportType === type.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <Icon className={`h-6 w-6 mb-2 ${
                reportType === type.id ? 'text-blue-600' : 'text-gray-600'
              }`} />
              <h3 className={`font-medium ${
                reportType === type.id ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {type.name}
              </h3>
              <p className={`text-sm mt-1 ${
                reportType === type.id ? 'text-blue-700' : 'text-gray-600'
              }`}>
                {type.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* Report Content */}
      {renderContent()}
    </div>
  );
};

export default AttendanceReports;
