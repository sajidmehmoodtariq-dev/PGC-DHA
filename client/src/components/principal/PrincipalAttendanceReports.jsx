import React, { useState, useEffect } from 'react';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import { Calendar, Users, UserCheck, UserX, Clock, TrendingUp, Building } from 'lucide-react';
import { Button } from '../ui/button';
import Card from '../ui/card';
import api from '../../services/api';

/**
 * Principal Attendance Reports Component
 * Shows simple attendance statistics and numbers without graphs
 * Similar to enquiry and correspondence reports - focuses on numbers only
 */
const PrincipalAttendanceReports = () => {
  const { handleApiResponse } = useApiWithToast();
  
  // State management
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [monthlyData, setMonthlyData] = useState(null);

  // Floor mapping
  const floorNames = {
    1: '11th Boys',
    2: '12th Boys', 
    3: '11th Girls',
    4: '12th Girls'
  };

  // Helper function to safely render teacher name
  const getTeacherName = (teacher) => {
    if (typeof teacher.teacherName === 'string') {
      return teacher.teacherName;
    }
    if (teacher.teacherName && typeof teacher.teacherName === 'object') {
      const { firstName, lastName } = teacher.teacherName;
      return `${firstName || ''} ${lastName || ''}`.trim();
    }
    if (teacher.fullName) {
      if (typeof teacher.fullName === 'string') {
        return teacher.fullName;
      }
      if (typeof teacher.fullName === 'object') {
        const { firstName, lastName } = teacher.fullName;
        return `${firstName || ''} ${lastName || ''}`.trim();
      }
    }
    return 'Unknown Teacher';
  };

  // Load attendance data
  const loadAttendanceData = async (date) => {
    try {
      setLoading(true);
      
      // Get daily attendance report
      const dailyResponse = await handleApiResponse(
        async () => api.get(`/teacher-attendance/report/daily/${date}`)
      );

      // Get current month data
      const currentDate = new Date(date);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      
      const monthlyResponse = await handleApiResponse(
        async () => api.get(`/teacher-attendance/report/monthly/${year}/${month}`)
      );

      setAttendanceData(dailyResponse.data);
      setMonthlyData(monthlyResponse.data.report);
      
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount and date change
  useEffect(() => {
    loadAttendanceData(selectedDate);
  }, [selectedDate]);

  // Calculate overall statistics
  const getOverallStats = () => {
    if (!attendanceData?.overallSummary) {
      return { total: 0, onTime: 0, late: 0, absent: 0, punctuality: 0 };
    }

    const { total, onTime, late, absent, cancelled } = attendanceData.overallSummary;
    const punctuality = total > 0 ? Math.round((onTime / total) * 100) : 0;

    return {
      total: total || 0,
      onTime: onTime || 0,
      late: late || 0,
      absent: absent || 0,
      cancelled: cancelled || 0,
      punctuality
    };
  };

  const stats = getOverallStats();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-3 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-8">
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
                Attendance Reports
              </h1>
              <p className="text-sm sm:text-base text-gray-600">
                View daily and monthly attendance statistics for all teachers
              </p>
            </div>
            
            {/* Date Selector */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2 sm:gap-3">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-2 sm:px-3 py-1 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base"
                />
              </div>
              <Button
                onClick={() => loadAttendanceData(selectedDate)}
                disabled={loading}
                variant="outline"
                size="sm"
                className="text-xs sm:text-sm"
              >
                {loading ? 'Loading...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </div>

        {/* Overall Statistics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-8">
          <Card className="p-3 sm:p-4 lg:p-6 bg-white/70 backdrop-blur-sm border-blue-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-blue-100 rounded-full">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Total Lectures</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6 bg-white/70 backdrop-blur-sm border-green-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-green-100 rounded-full">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">On Time</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">{stats.onTime}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6 bg-white/70 backdrop-blur-sm border-yellow-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-yellow-100 rounded-full">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-yellow-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Late</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-yellow-600">{stats.late}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6 bg-white/70 backdrop-blur-sm border-red-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-red-100 rounded-full">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-red-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Absent</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">{stats.absent}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6 bg-white/70 backdrop-blur-sm border-purple-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-purple-100 rounded-full">
                <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Punctuality</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-purple-600">{stats.punctuality}%</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 lg:p-6 bg-white/70 backdrop-blur-sm border-gray-200 hover:shadow-lg transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-2 sm:p-3 bg-gray-100 rounded-full">
                <UserX className="w-4 h-4 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-gray-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm font-medium text-gray-600 truncate">Cancelled</p>
                <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-600">{stats.cancelled}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Floor-wise Breakdown */}
        {attendanceData?.floorSummaries && (
          <Card className="p-4 sm:p-6 mb-4 sm:mb-8 bg-white/70 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-6 flex items-center gap-2">
              <Building className="w-4 h-4 sm:w-5 sm:h-5" />
              Floor-wise Attendance Summary
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
              {Object.entries(attendanceData.floorSummaries).map(([floor, summary]) => (
                <div key={floor} className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-white/50">
                  <h3 className="font-semibold text-sm sm:text-base lg:text-lg mb-2 sm:mb-3 text-gray-800">
                    Floor {floor} - {floorNames[floor]}
                  </h3>
                  
                  <div className="space-y-1 sm:space-y-2">
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Total:</span>
                      <span className="font-medium text-xs sm:text-sm">{summary.total}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-green-600">On Time:</span>
                      <span className="font-medium text-green-600 text-xs sm:text-sm">{summary.onTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-yellow-600">Late:</span>
                      <span className="font-medium text-yellow-600 text-xs sm:text-sm">{summary.late}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-xs sm:text-sm text-red-600">Absent:</span>
                      <span className="font-medium text-red-600 text-xs sm:text-sm">{summary.absent}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 sm:pt-2">
                      <span className="text-xs sm:text-sm text-purple-600">Punctuality:</span>
                      <span className="font-medium text-purple-600 text-xs sm:text-sm">
                        {summary.total > 0 ? Math.round((summary.onTime / summary.total) * 100) : 0}%
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Monthly Statistics */}
        {monthlyData && (
          <Card className="p-4 sm:p-6 bg-white/70 backdrop-blur-sm">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-6 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5" />
              Monthly Overview - {monthlyData.monthName} {monthlyData.year}
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-blue-50">
                <h3 className="font-medium text-blue-800 mb-1 sm:mb-2 text-sm sm:text-base">Total Teachers</h3>
                <p className="text-xl sm:text-2xl font-bold text-blue-600">{monthlyData.summary?.totalTeachers || 0}</p>
              </div>
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-green-50">
                <h3 className="font-medium text-green-800 mb-1 sm:mb-2 text-sm sm:text-base">Total Lectures</h3>
                <p className="text-xl sm:text-2xl font-bold text-green-600">{monthlyData.summary?.totalLectures || 0}</p>
              </div>
              <div className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-purple-50">
                <h3 className="font-medium text-purple-800 mb-1 sm:mb-2 text-sm sm:text-base">Overall Punctuality</h3>
                <p className="text-xl sm:text-2xl font-bold text-purple-600">{monthlyData.summary?.overallPunctuality || 0}%</p>
              </div>
            </div>

            {/* Status breakdown incl. late buckets */}
            {monthlyData.summary?.breakdown && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 mb-4 sm:mb-8">
                <div className="p-2 sm:p-3 lg:p-4 rounded-lg border border-green-200 bg-green-50">
                  <p className="text-xs sm:text-sm text-green-800 truncate">On Time</p>
                  <p className="text-lg sm:text-xl font-bold text-green-700">{monthlyData.summary.breakdown.onTime}</p>
                </div>
                <div className="p-2 sm:p-3 lg:p-4 rounded-lg border border-yellow-200 bg-yellow-50">
                  <p className="text-xs sm:text-sm text-yellow-800 truncate">Late 5–10 min</p>
                  <p className="text-lg sm:text-xl font-bold text-yellow-700">{monthlyData.summary.breakdown.late5to10}</p>
                </div>
                <div className="p-2 sm:p-3 lg:p-4 rounded-lg border border-orange-200 bg-orange-50">
                  <p className="text-xs sm:text-sm text-orange-800 truncate">Late &gt; 10 min</p>
                  <p className="text-lg sm:text-xl font-bold text-orange-700">{monthlyData.summary.breakdown.lateOver10}</p>
                </div>
                <div className="p-2 sm:p-3 lg:p-4 rounded-lg border border-red-200 bg-red-50">
                  <p className="text-xs sm:text-sm text-red-800 truncate">Not Attended</p>
                  <p className="text-lg sm:text-xl font-bold text-red-700">{monthlyData.summary.breakdown.notAttended}</p>
                </div>
                <div className="p-2 sm:p-3 lg:p-4 rounded-lg border border-gray-200 bg-gray-50 col-span-2 sm:col-span-1">
                  <p className="text-xs sm:text-sm text-gray-800 truncate">Cancelled</p>
                  <p className="text-lg sm:text-xl font-bold text-gray-700">{monthlyData.summary.breakdown.cancelled}</p>
                </div>
              </div>
            )}

            {/* Teachers List with per-teacher breakdown */}
            {monthlyData.teachers && monthlyData.teachers.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-800 mb-3 sm:mb-4 text-sm sm:text-base">Teacher Performance Summary</h3>
                <div className="space-y-2 sm:space-y-3 max-h-80 sm:max-h-96 overflow-y-auto">
                  {monthlyData.teachers.map((teacher, index) => (
                    <div key={index} className="p-3 border border-gray-200 rounded-lg bg-white/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 text-sm sm:text-base truncate">{getTeacherName(teacher)}</p>
                          <p className="text-xs sm:text-sm text-gray-600">Total Lectures: {teacher.totalLectures}</p>
                        </div>
                        <div className="text-left sm:text-right flex-shrink-0">
                          <p className="font-semibold text-purple-600 text-sm sm:text-base">{teacher.punctualityPercentage}%</p>
                          <p className="text-xs text-gray-500">Punctuality</p>
                        </div>
                      </div>
                      {teacher.breakdown && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-1 sm:gap-2 mt-2 sm:mt-3">
                          <div className="p-1 sm:p-2 rounded border border-green-200 bg-green-50 text-center">
                            <p className="text-xs text-green-800">On Time</p>
                            <p className="text-xs sm:text-sm font-semibold text-green-700">{teacher.breakdown.onTime}</p>
                          </div>
                          <div className="p-1 sm:p-2 rounded border border-yellow-200 bg-yellow-50 text-center">
                            <p className="text-xs text-yellow-800">Late 5–10</p>
                            <p className="text-xs sm:text-sm font-semibold text-yellow-700">{teacher.breakdown.late5to10}</p>
                          </div>
                          <div className="p-1 sm:p-2 rounded border border-orange-200 bg-orange-50 text-center">
                            <p className="text-xs text-orange-800">Late &gt; 10</p>
                            <p className="text-xs sm:text-sm font-semibold text-orange-700">{teacher.breakdown.lateOver10}</p>
                          </div>
                          <div className="p-1 sm:p-2 rounded border border-red-200 bg-red-50 text-center">
                            <p className="text-xs text-red-800">Not Attended</p>
                            <p className="text-xs sm:text-sm font-semibold text-red-700">{teacher.breakdown.notAttended}</p>
                          </div>
                          <div className="p-1 sm:p-2 rounded border border-gray-200 bg-gray-50 text-center col-span-2 sm:col-span-1">
                            <p className="text-xs text-gray-800">Cancelled</p>
                            <p className="text-xs sm:text-sm font-semibold text-gray-700">{teacher.breakdown.cancelled}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading attendance data...</p>
          </div>
        )}

        {/* No Data State */}
        {!loading && !attendanceData && (
          <Card className="p-8 text-center bg-white/70 backdrop-blur-sm">
            <UserCheck className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Data</h3>
            <p className="text-gray-600">No attendance records found for the selected date.</p>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PrincipalAttendanceReports;
