import React, { useState, useEffect, useCallback } from 'react';
import { X, TrendingUp, Users, Calendar, BarChart3, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../../ui/button';
import api from '../../../services/api';

/**
 * Attendance Glimpse Modal Component
 * Shows monthly attendance statistics in an Excel-like table format
 * Only visible to Principal users
 */
const AttendanceGlimpse = ({ onClose }) => {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [monthlyStats, setMonthlyStats] = useState([]);
  const [selectedMonthDetails, setSelectedMonthDetails] = useState(null);
  const [showDayWiseReport, setShowDayWiseReport] = useState(false);
  const [availableYears, setAvailableYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Get available years (current year and previous 2 years)
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const years = [currentYear, currentYear - 1, currentYear - 2];
    setAvailableYears(years);
  }, []);

  // Fetch monthly attendance statistics
  const fetchMonthlyStats = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`Fetching monthly stats for year: ${selectedYear}`);
      
      const response = await api.get(`/attendance/monthly-stats/${selectedYear}`);
      
      console.log('API Response:', response.data);
      
      if (response.data.success) {
        console.log('Monthly stats data:', response.data.data);
        setMonthlyStats(response.data.data);
      } else {
        console.error('API call failed:', response.data);
        setMonthlyStats([]);
      }
    } catch (error) {
      console.error('Error fetching monthly stats:', error);
      setMonthlyStats([]);
    } finally {
      setLoading(false);
    }
  }, [selectedYear]);

  // Fetch day-wise report for a specific month
  const fetchDayWiseReport = async (year, month) => {
    try {
      const response = await api.get(`/attendance/day-wise-report/${year}/${month}`);
      
      if (response.data.success) {
        setSelectedMonthDetails(response.data.data);
        setShowDayWiseReport(true);
      }
    } catch (error) {
      console.error('Error fetching day-wise report:', error);
    }
  };

  useEffect(() => {
    fetchMonthlyStats();
  }, [selectedYear, fetchMonthlyStats]);

  const handleMonthClick = (monthData) => {
    fetchDayWiseReport(selectedYear, monthData.month);
  };

  const formatMonthName = (monthNumber) => {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[monthNumber - 1] || '';
  };

  const calculatePercentage = (present, total) => {
    if (total === 0) return 0;
    return ((present / total) * 100).toFixed(1);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-500 to-purple-600 text-white">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">
                  Student Attendance Overview
                </h3>
                <p className="text-blue-100 text-sm">
                  Monthly statistics and day-wise breakdown
                </p>
              </div>
            </div>
            <Button
              onClick={onClose}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white hover:bg-opacity-20"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(95vh-120px)]">
          {/* Year Filter */}
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-4">
              <h4 className="text-xl font-semibold text-gray-900">Monthly Attendance Statistics</h4>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
            
            {!showDayWiseReport && (
              <div className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
                💡 Click on any month row to view day-wise breakdown
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading attendance statistics...</span>
            </div>
          ) : !showDayWiseReport ? (
            /* Monthly Overview Table */
            <div className="bg-white rounded-lg border overflow-hidden">
              {monthlyStats.length === 0 ? (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <div className="text-gray-500">No attendance data available for {selectedYear}</div>
                  <div className="text-sm text-gray-400 mt-2">
                    Try selecting a different year or ensure attendance records exist
                  </div>
                  <div className="text-xs text-gray-400 mt-2">
                    Check browser console for detailed debug information
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full">
                    {/* Table Header */}
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900 border-b">
                          Month
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                          Total Students
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                          Present
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                          Absent
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                          Attendance %
                        </th>
                        <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900 border-b">
                          Total Records
                        </th>
                      </tr>
                    </thead>
                    
                    {/* Table Body */}
                    <tbody className="divide-y divide-gray-200">
                      {monthlyStats.map((monthData) => (
                        <tr
                          key={monthData.month}
                          onClick={() => handleMonthClick(monthData)}
                          className="hover:bg-blue-50 cursor-pointer transition-colors group"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-900">
                                {formatMonthName(monthData.month)} {selectedYear}
                              </span>
                              <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-blue-600" />
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-gray-900">
                              {monthData.totalStudents}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-green-600">
                              {monthData.presentCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm font-semibold text-red-600">
                              {monthData.absentCount}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-sm font-semibold text-blue-600">
                                {calculatePercentage(monthData.presentCount, monthData.totalRecords)}%
                              </span>
                              <div className="w-16 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                                  style={{ 
                                    width: `${calculatePercentage(monthData.presentCount, monthData.totalRecords)}%` 
                                  }}
                                ></div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <span className="text-sm text-gray-600">
                              {monthData.totalRecords}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            /* Day-wise Report */
            <div className="space-y-4">
              {/* Back Button and Header */}
              <div className="flex items-center justify-between">
                <Button
                  onClick={() => setShowDayWiseReport(false)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <ChevronUp className="h-4 w-4" />
                  Back to Monthly View
                </Button>
                <h5 className="text-lg font-semibold">
                  {formatMonthName(selectedMonthDetails?.month)} {selectedYear} - Day-wise Report
                </h5>
              </div>

              {/* Day-wise Table */}
              {selectedMonthDetails && (
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Day</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total Students</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Present</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Absent</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Attendance %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {selectedMonthDetails.dayWiseData?.map((dayData, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                              {new Date(dayData.date).toLocaleDateString()}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-600">
                              {new Date(dayData.date).toLocaleDateString('en-US', { weekday: 'short' })}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-900">
                              {dayData.totalStudents}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-green-600 font-semibold">
                              {dayData.present}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-red-600 font-semibold">
                              {dayData.absent}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                              <div className="flex items-center justify-center gap-2">
                                <span className="font-semibold text-blue-600">
                                  {calculatePercentage(dayData.present, dayData.totalStudents)}%
                                </span>
                                <div className="w-12 bg-gray-200 rounded-full h-2">
                                  <div 
                                    className="bg-blue-600 h-2 rounded-full" 
                                    style={{ 
                                      width: `${calculatePercentage(dayData.present, dayData.totalStudents)}%` 
                                    }}
                                  ></div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Summary Statistics */}
          {!showDayWiseReport && monthlyStats.length > 0 && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  <div className="text-blue-600 text-sm font-medium">Average Monthly Attendance</div>
                </div>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {monthlyStats.length > 0 ? (
                    monthlyStats.reduce((acc, month) => 
                      acc + parseFloat(calculatePercentage(month.presentCount, month.totalRecords)), 0
                    ) / monthlyStats.length
                  ).toFixed(1) : 0}%
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div className="text-green-600 text-sm font-medium">Total Present Records</div>
                </div>
                <div className="text-2xl font-bold text-green-700 mt-1">
                  {monthlyStats.reduce((acc, month) => acc + month.presentCount, 0)}
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-600" />
                  <div className="text-red-600 text-sm font-medium">Total Absent Records</div>
                </div>
                <div className="text-2xl font-bold text-red-700 mt-1">
                  {monthlyStats.reduce((acc, month) => acc + month.absentCount, 0)}
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                  <div className="text-purple-600 text-sm font-medium">Months with Data</div>
                </div>
                <div className="text-2xl font-bold text-purple-700 mt-1">
                  {monthlyStats.length}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendanceGlimpse;
