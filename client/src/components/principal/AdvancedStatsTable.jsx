import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { TrendingUp, X, ChevronDown, Calendar, RefreshCw } from 'lucide-react';
import { default as api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const AdvancedStatsTable = ({ 
  loading
}) => {
  const { toast } = useToast();
  
  // Year selection state
  const [selectedYear, setSelectedYear] = useState(2025);
  
  // API data state
  const [monthlyApiData, setMonthlyApiData] = useState([]);
  const [dailyApiData, setDailyApiData] = useState([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingDailyData, setIsLoadingDailyData] = useState(false);
  
  // Daily breakdown modal state
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(null);

  // Available years for dropdown
  const availableYears = [2023, 2024, 2025, 2026];
  
  // Month names
  const monthNames = useMemo(() => [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ], []);

  // Fetch monthly breakdown data from API
  const fetchMonthlyBreakdown = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const response = await api.get(`/enquiries/monthly-breakdown/${selectedYear}`);
      
      if (response.data.success) {
        setMonthlyApiData(response.data.data.months || []);
      } else {
        toast.error('Failed to fetch monthly breakdown data');
        setMonthlyApiData([]);
      }
    } catch (error) {
      console.error('Error fetching monthly breakdown:', error);
      toast.error('Failed to fetch monthly breakdown data');
      setMonthlyApiData([]);
    } finally {
      setIsLoadingData(false);
    }
  }, [selectedYear, toast]);

  // Fetch daily breakdown data from API
  const fetchDailyBreakdown = useCallback(async (year, month) => {
    setIsLoadingDailyData(true);
    try {
      const response = await api.get(`/enquiries/daily-breakdown/${year}/${month}`);
      
      if (response.data.success) {
        setDailyApiData(response.data.data.days);
        return response.data.data.days;
      } else {
        toast.error('Failed to fetch daily breakdown data');
        setDailyApiData([]);
        return [];
      }
    } catch (error) {
      console.error('Error fetching daily breakdown:', error);
      toast.error('Failed to fetch daily breakdown data');
      setDailyApiData([]);
      return [];
    } finally {
      setIsLoadingDailyData(false);
    }
  }, [toast]);

  // Fetch data when component mounts or year changes
  useEffect(() => {
    fetchMonthlyBreakdown();
  }, [fetchMonthlyBreakdown]);

  // Convert API data to the format expected by the component
  const monthlyData = useMemo(() => {
    console.log('Converting API data for year:', selectedYear);
    console.log('Monthly API data:', monthlyApiData);
    
    const data = {};
    
    // Convert API data to the expected format
    monthlyApiData.forEach(monthData => {
      const monthName = monthData.name;
      data[monthName] = {
        level1: monthData.level1 || 0,
        level2: monthData.level2 || 0,
        level3: monthData.level3 || 0,
        level4: monthData.level4 || 0,
        level5: monthData.level5 || 0,
      };
    });
    
    // Ensure all months are present (fill missing months with zeros)
    monthNames.forEach(month => {
      if (!data[month]) {
        data[month] = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
      }
    });
    
    return data;
  }, [selectedYear, monthNames, monthlyApiData]);

  // Convert daily API data to the format expected by the component
  const dailyData = useMemo(() => {
    if (!selectedMonth || !dailyApiData || dailyApiData.length === 0) return {};
    
    console.log('Converting daily API data for month:', selectedMonth.name);
    console.log('Daily API data:', dailyApiData);
    
    const dailyDataForMonth = {};
    
    // Convert API data to the expected format
    dailyApiData.forEach(dayData => {
      // Only include days with actual data (totalCount > 0)
      if (dayData.totalCount > 0) {
        dailyDataForMonth[dayData.day] = {
          level1: dayData.level1 || 0,
          level2: dayData.level2 || 0,
          level3: dayData.level3 || 0,
          level4: dayData.level4 || 0,
          level5: dayData.level5 || 0,
        };
      }
    });
    
    console.log('Converted daily breakdown:', dailyDataForMonth);
    return dailyDataForMonth;
  }, [selectedMonth, dailyApiData]);

  // Handle month row click with API call
  const handleMonthClick = async (monthName, monthIndex) => {
    setSelectedMonth({ 
      name: monthName, 
      year: selectedYear,
      index: monthIndex 
    });
    setShowDailyModal(true);
    
    // Fetch daily data for the selected month
    const monthNumber = monthIndex + 1; // Convert 0-based index to 1-based month
    await fetchDailyBreakdown(selectedYear, monthNumber);
  };

  // Calculate totals for each level
  const levelTotals = useMemo(() => {
    const totals = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
    
    Object.values(monthlyData).forEach(monthData => {
      totals.level1 += monthData.level1 || 0;
      totals.level2 += monthData.level2 || 0;
      totals.level3 += monthData.level3 || 0;
      totals.level4 += monthData.level4 || 0;
      totals.level5 += monthData.level5 || 0;
    });
    
    return totals;
  }, [monthlyData]);

  // Level styling
  const levelColors = {
    level1: 'text-green-600',
    level2: 'text-yellow-600', 
    level3: 'text-orange-600',
    level4: 'text-red-600',
    level5: 'text-purple-600'
  };

  const levelBgColors = {
    level1: 'bg-green-50',
    level2: 'bg-yellow-50',
    level3: 'bg-orange-50', 
    level4: 'bg-red-50',
    level5: 'bg-purple-50'
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with Year Dropdown */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Monthly Student Achievements</h3>
          
          {/* Year Dropdown */}
          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={fetchMonthlyBreakdown}
            disabled={isLoadingData}
            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg text-sm font-medium text-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Refresh data"
          >
            <RefreshCw className={`h-4 w-4 ${isLoadingData ? 'animate-spin' : ''}`} />
            <span>{isLoadingData ? 'Loading...' : 'Refresh'}</span>
          </button>
        </div>
        
        {/* Status indicator */}
        <div className="text-sm text-gray-500">
          {isLoadingData ? 'Loading data...' : `Showing data for ${selectedYear}`}
        </div>
      </div>

      {/* Monthly Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider border-r border-gray-200 bg-gray-100 sticky left-0 z-10">
                  Month
                </th>
                {Object.entries(levelColors).map(([level, colorClass]) => (
                  <th key={level} className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wider ${levelBgColors[level]} ${colorClass}`}>
                    {level.replace('level', 'Level ')}
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider bg-gray-100">
                  Monthly Total
                </th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="bg-white divide-y divide-gray-200">
              {monthNames.map((month, index) => {
                const monthData = monthlyData[month] || {};
                const monthTotal = Object.values(monthData).reduce((sum, val) => sum + val, 0);
                
                return (
                  <tr 
                    key={month} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 cursor-pointer transition-colors duration-200`}
                    onClick={() => handleMonthClick(month, index)}
                    title="Click to view daily breakdown"
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900 border-r border-gray-200 bg-gray-50 sticky left-0 z-10">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-500 mr-1" />
                        <span>{month}</span>
                        <span className="text-xs text-gray-500">'{selectedYear.toString().slice(-2)}</span>
                      </div>
                    </td>
                    {Object.entries(levelColors).map(([level, colorClass]) => (
                      <td key={level} className={`px-3 py-2 whitespace-nowrap text-center text-sm font-medium ${colorClass}`}>
                        {monthData[level]?.toLocaleString() || '0'}
                      </td>
                    ))}
                    <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-bold text-gray-900 bg-gray-50">
                      {monthTotal.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              
              {/* Totals Row */}
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-4 py-2 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-200 sticky left-0 z-10">
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                    <span>YEARLY TOTAL</span>
                    <span className="text-xs text-blue-600">{selectedYear}</span>
                  </div>
                </td>
                {Object.entries(levelColors).map(([level, colorClass]) => (
                  <td key={level} className={`px-3 py-2 whitespace-nowrap text-center text-sm font-bold ${colorClass}`}>
                    {levelTotals[level].toLocaleString()}
                  </td>
                ))}
                <td className="px-3 py-2 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                  {Object.values(levelTotals).reduce((sum, val) => sum + val, 0).toLocaleString()}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Breakdown Modal */}
      {showDailyModal && selectedMonth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                <span className="flex items-center">
                  <Calendar className="h-5 w-5 text-blue-600 mr-2" />
                  Daily Breakdown: {selectedMonth.name} {selectedYear}
                </span>
              </h3>
              <button
                onClick={() => setShowDailyModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {isLoadingDailyData ? (
                <div className="flex items-center justify-center h-64">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading daily breakdown...</p>
                  </div>
                </div>
              ) : (
                <>
                  {/* Monthly Summary Cards */}
                  <div className="grid grid-cols-5 gap-4 mb-6">
                    {Object.entries(levelColors).map(([level, colorClass]) => {
                      const monthData = monthlyData[selectedMonth.name] || {};
                      const count = monthData[level] || 0;
                      return (
                        <div key={level} className={`${levelBgColors[level]} p-4 rounded-lg text-center`}>
                          <div className={`text-2xl font-bold ${colorClass}`}>
                            {count.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-600 font-medium">
                            {level.replace('level', 'Level ')}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Daily Breakdown Table */}
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Date
                        </th>
                        {Object.entries(levelColors).map(([level, colorClass]) => (
                          <th key={level} className={`px-3 py-3 text-center text-xs font-bold uppercase tracking-wider ${levelBgColors[level]} ${colorClass}`}>
                            {level.replace('level', 'L')}
                          </th>
                        ))}
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-900 uppercase tracking-wider">
                          Daily Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(dailyData).map(([day, dayData]) => {
                        const dayTotal = Object.values(dayData).reduce((sum, val) => sum + (val || 0), 0);
                        
                        if (dayTotal === 0) return null; // Skip days with no data
                        
                        // Create a date object for this day in the selected month/year
                        const dateStr = `${selectedYear}-${(monthNames.indexOf(selectedMonth.name) + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
                        
                        return (
                          <tr key={day} className={parseInt(day) % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-semibold text-gray-900">
                              <div className="flex items-center">
                                <span className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center mr-2 text-xs font-bold">
                                  {day}
                                </span>
                                <span>{new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                              </div>
                            </td>
                            {Object.entries(levelColors).map(([level, colorClass]) => (
                              <td key={level} className={`px-3 py-3 whitespace-nowrap text-center text-sm font-medium ${colorClass}`}>
                                {dayData[level]?.toLocaleString() || '0'}
                              </td>
                            ))}
                            <td className="px-3 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-900">
                              {dayTotal.toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                      
                      {Object.keys(dailyData).length === 0 && (
                        <tr>
                          <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                            No daily data available for {selectedMonth.name} {selectedYear}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedStatsTable;
