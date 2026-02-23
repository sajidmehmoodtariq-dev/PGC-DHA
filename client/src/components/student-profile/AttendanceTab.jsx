import React, { useState, useEffect } from 'react';
import { Calendar, Clock, TrendingUp, TrendingDown, BarChart3, CheckCircle, XCircle, AlertCircle, Users, UserX } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const AttendanceTab = ({ studentId }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [stats, setStats] = useState({
    totalClasses: 0,
    presentDays: 0,
    absentDays: 0,
    lateDays: 0,
    halfLeaveDays: 0,
    fullLeaveDays: 0,
    attendancePercentage: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState([]);

  const { showToast } = useToast();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Fetch attendance data
  const fetchAttendanceData = async () => {
    try {
      setLoading(true);
      
      // Fetch student's attendance records
      const response = await api.get(`/attendance/student/${studentId}`, {
        params: {
          month: selectedMonth + 1,
          year: selectedYear
        }
      });

      if (response.data.success) {
        setAttendanceData(response.data.data || []);
        calculateStats(response.data.data || []);
      }

      // Fetch monthly statistics for the year
      const monthlyResponse = await api.get(`/attendance/student/${studentId}/monthly`, {
        params: { year: selectedYear }
      });

      if (monthlyResponse.data.success) {
        setMonthlyStats(monthlyResponse.data.data || []);
      }

    } catch (error) {
      console.error('Error fetching attendance data:', error);
      showToast('Failed to load attendance data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Calculate attendance statistics
  const calculateStats = (data) => {
    const totalClasses = data.length;
    const presentDays = data.filter(record => record.status === 'Present').length;
    const absentDays = data.filter(record => record.status === 'Absent').length;
    const lateDays = data.filter(record => record.status === 'Late').length;
    const halfLeaveDays = data.filter(record => record.status === 'Half Leave').length;
    const fullLeaveDays = data.filter(record => record.status === 'Full Leave').length;
    
    const attendancePercentage = totalClasses > 0 
      ? Math.round(((presentDays + lateDays) / totalClasses) * 100)
      : 0;

    setStats({
      totalClasses,
      presentDays,
      absentDays,
      lateDays,
      halfLeaveDays,
      fullLeaveDays,
      attendancePercentage
    });
  };

  useEffect(() => {
    if (studentId) {
      fetchAttendanceData();
    }
  }, [studentId, selectedMonth, selectedYear]);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Late':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'Half Leave':
        return <UserX className="h-4 w-4 text-purple-500" />;
      case 'Full Leave':
        return <UserX className="h-4 w-4 text-indigo-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Present':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Absent':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Late':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Half Leave':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Full Leave':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A';
    return new Date(`2000-01-01T${timeString}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-500" />
            Attendance Overview
          </h3>
          <p className="text-gray-600 text-sm">Track student attendance patterns and statistics</p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {[2023, 2024, 2025].map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Present Days</p>
              <p className="text-2xl font-bold text-green-600">{stats.presentDays}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Absent Days</p>
              <p className="text-2xl font-bold text-red-600">{stats.absentDays}</p>
            </div>
            <XCircle className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Late Days</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.lateDays}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Half Leave</p>
              <p className="text-2xl font-bold text-purple-600">{stats.halfLeaveDays}</p>
            </div>
            <UserX className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Full Leave</p>
              <p className="text-2xl font-bold text-indigo-600">{stats.fullLeaveDays}</p>
            </div>
            <UserX className="h-8 w-8 text-indigo-500" />
          </div>
        </div>
      </div>

      {/* Monthly Trend Chart (Simple) */}
      {monthlyStats.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            Monthly Attendance Trend ({selectedYear})
          </h4>
          <div className="space-y-3">
            {monthlyStats.map((monthData, index) => (
              <div key={index} className="flex items-center gap-4">
                <div className="w-20 text-sm font-medium text-gray-600">
                  {months[index].substring(0, 3)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${monthData.percentage || 0}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12">
                      {monthData.percentage || 0}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Attendance Records */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">
          Recent Attendance Records - {months[selectedMonth]} {selectedYear}
        </h4>
        
        {attendanceData.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-600">No attendance data found for the selected period.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {attendanceData.slice().reverse().slice(0, 10).map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {getStatusIcon(record.status)}
                  <div>
                    <div className="font-medium text-gray-900">
                      {formatDate(record.date)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {record.subject || 'General Class'}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="text-right text-sm">
                    <div className="text-gray-600">
                      In: {formatTime(record.timeIn)}
                    </div>
                    {record.timeOut && (
                      <div className="text-gray-600">
                        Out: {formatTime(record.timeOut)}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(record.status)}`}>
                    {record.status}
                  </span>
                </div>
              </div>
            ))}
            
            {attendanceData.length > 10 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  View All Records ({attendanceData.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attendance Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Quick Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-gray-600">
              Present: <span className="font-medium text-gray-900">{stats.presentDays} days</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-gray-600">
              Absent: <span className="font-medium text-gray-900">{stats.absentDays} days</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-yellow-500" />
            <span className="text-gray-600">
              Late: <span className="font-medium text-gray-900">{stats.lateDays} days</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-purple-500" />
            <span className="text-gray-600">
              Half Leave: <span className="font-medium text-gray-900">{stats.halfLeaveDays} days</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <UserX className="h-4 w-4 text-indigo-500" />
            <span className="text-gray-600">
              Full Leave: <span className="font-medium text-gray-900">{stats.fullLeaveDays} days</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceTab;