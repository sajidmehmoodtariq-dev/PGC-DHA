import React, { useState, useMemo } from 'react';
import { X, Calendar, MessageSquare, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';

const CorrespondenceStatsModal = ({ 
  isOpen, 
  onClose, 
  correspondences, 
  allCorrespondences 
}) => {
  const [activeTab, setActiveTab] = useState('general');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [generalSubFilter, setGeneralSubFilter] = useState('all'); // all, fees, attendance, discipline, results, appreciation

  // Get available years and months from data
  const availableYears = useMemo(() => {
    const yearsSet = new Set();
    allCorrespondences.forEach(item => {
      const dateField = item.timestamp || item.communicationDate;
      if (dateField) {
        const year = new Date(dateField).getFullYear();
        if (!isNaN(year)) {
          yearsSet.add(year);
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [allCorrespondences]);

  const availableMonths = useMemo(() => {
    const monthsSet = new Set();
    allCorrespondences.forEach(item => {
      const dateField = item.timestamp || item.communicationDate;
      if (dateField) {
        const date = new Date(dateField);
        if (date.getFullYear() === selectedYear) {
          monthsSet.add(date.getMonth() + 1);
        }
      }
    });
    return Array.from(monthsSet).sort((a, b) => a - b);
  }, [allCorrespondences, selectedYear]);

  // Filter correspondences based on tab and date
  const filteredCorrespondences = useMemo(() => {
    return allCorrespondences.filter(item => {
      // Check tab filter
      if (activeTab === 'level-change' && !item.isLevelChange) return false;
      if (activeTab === 'general' && item.isLevelChange) return false;

      // Check general sub-filter
      if (activeTab === 'general' && generalSubFilter !== 'all') {
        const category = item.communicationCategory || item.type;
        if (generalSubFilter !== category) return false;
      }

      // Check date filter
      const dateField = item.timestamp || item.communicationDate;
      if (!dateField) return false;
      
      const date = new Date(dateField);
      return date.getFullYear() === selectedYear && date.getMonth() + 1 === selectedMonth;
    });
  }, [allCorrespondences, activeTab, selectedYear, selectedMonth, generalSubFilter]);



  // Get unique staff members
  const staffMembers = useMemo(() => {
    const staffMap = new Map();
    allCorrespondences.forEach(item => {
      const staffId = item.staffMember?.id || item.staffMember?._id;
      const staffName = item.staffMember?.name || 'Unknown Staff';
      const staffRole = item.staffMember?.role || 'Unknown';
      
      if (!staffMap.has(staffId)) {
        staffMap.set(staffId, {
          id: staffId,
          name: staffName,
          role: staffRole,
          total: 0,
          general: 0,
          levelChanges: 0
        });
      }
      
      const staff = staffMap.get(staffId);
      staff.total++;
      
      if (item.isLevelChange) {
        staff.levelChanges++;
      } else {
        staff.general++;
      }
    });
    
    return Array.from(staffMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allCorrespondences]);

  // Get dates for the selected month
  const getDatesInMonth = (year, month) => {
    const dates = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(new Date(year, month - 1, day));
    }
    return dates;
  };

  const datesInMonth = getDatesInMonth(selectedYear, selectedMonth);

  // Calculate statistics for current filter
  const stats = useMemo(() => {
    const total = filteredCorrespondences.length;
    const uniqueStudents = new Set(filteredCorrespondences.map(item => item.studentId?._id)).size;
    const levelChanges = filteredCorrespondences.filter(item => item.isLevelChange).length;
    const general = total - levelChanges;



    // Staff breakdown
    const staffBreakdown = {};
    filteredCorrespondences.forEach(item => {
      const staffId = item.staffMember?.id || item.staffMember?._id;
      const staffName = item.staffMember?.name || 'Unknown Staff';
      
      if (!staffBreakdown[staffId]) {
        staffBreakdown[staffId] = {
          name: staffName,
          count: 0,
          levelChanges: 0,
          general: 0
        };
      }
      
      staffBreakdown[staffId].count++;
      if (item.isLevelChange) {
        staffBreakdown[staffId].levelChanges++;
      } else {
        staffBreakdown[staffId].general++;
      }
    });

    return {
      total,
      uniqueStudents,
      levelChanges,
      general,
      staffBreakdown
    };
  }, [filteredCorrespondences]);

  // Create Excel-like table data
  const tableData = useMemo(() => {
    const data = [];
    
    datesInMonth.forEach(date => {
      const row = {
        date: date,
        dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        staffData: {}
      };
      
      staffMembers.forEach(staff => {
        const dayCorrespondences = filteredCorrespondences.filter(item => {
          const itemDate = new Date(item.timestamp || item.communicationDate);
          const staffId = item.staffMember?.id || item.staffMember?._id;
          return itemDate.toDateString() === date.toDateString() && staffId === staff.id;
        });
        
        row.staffData[staff.id] = {
          count: dayCorrespondences.length,
          levelChanges: dayCorrespondences.filter(item => item.isLevelChange).length,
          general: dayCorrespondences.filter(item => !item.isLevelChange).length
        };
      });
      
      data.push(row);
    });
    
    return data;
  }, [filteredCorrespondences, staffMembers, datesInMonth]);

  // General communication categories
  const generalCategories = [
    { value: 'all', label: 'All General', icon: MessageSquare, color: 'text-gray-600 bg-gray-50 border-gray-200' },
    { value: 'fees', label: 'Fees', icon: '💰', color: 'text-purple-600 bg-purple-50 border-purple-200' },
    { value: 'attendance', label: 'Attendance', icon: '📅', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'discipline', label: 'Discipline', icon: '⚠️', color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'results', label: 'Results', icon: '📊', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'appreciation', label: 'Appreciation', icon: '👏', color: 'text-green-600 bg-green-50 border-green-200' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-none max-h-none flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Correspondence Statistics - {activeTab === 'general' ? 'General Communications' : 'Level Changes'}
            </h3>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                {availableMonths.map(month => (
                  <option key={month} value={month}>
                    {new Date(2000, month - 1).toLocaleDateString('en-US', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b bg-white">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('general')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'general'
                  ? 'bg-blue-100 text-blue-700 border border-blue-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              General Communications
            </button>
            <button
              onClick={() => setActiveTab('level-change')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'level-change'
                  ? 'bg-orange-100 text-orange-700 border border-orange-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              Level Changes
            </button>
          </div>

          {/* General Sub-Filters */}
          {activeTab === 'general' && (
            <div className="mt-3 flex flex-wrap gap-2">
              {generalCategories.map((category) => (
                <button
                  key={category.value}
                  onClick={() => setGeneralSubFilter(category.value)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1 ${
                    generalSubFilter === category.value
                      ? 'bg-blue-100 text-blue-700 border border-blue-200'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {typeof category.icon === 'string' ? (
                    <span>{category.icon}</span>
                  ) : (
                    <category.icon className="h-3 w-3" />
                  )}
                  {category.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Modal Content with Scroll */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-blue-600 text-sm font-medium">Total Communications</div>
              <div className="text-2xl font-bold text-blue-700">
                {stats.total}
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-green-600 text-sm font-medium">Unique Students</div>
              <div className="text-2xl font-bold text-green-700">
                {stats.uniqueStudents}
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="text-orange-600 text-sm font-medium">Level Changes</div>
              <div className="text-2xl font-bold text-orange-700">
                {stats.levelChanges}
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-purple-600 text-sm font-medium">General Communications</div>
              <div className="text-2xl font-bold text-purple-700">
                {stats.general}
              </div>
            </div>
          </div>

          {/* Staff Performance Summary */}
          <div className="mb-6">
            <h4 className="text-lg font-semibold mb-3">Staff Performance Summary</h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <div className="min-w-full">
                <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `200px repeat(${staffMembers.length}, minmax(120px, 1fr))` }}>
                  <div className="px-3 py-2 font-semibold text-sm text-gray-700 border-b-2 border-gray-300">
                    Staff Member
                  </div>
                  {staffMembers.map((staff, index) => (
                    <div key={index} className="px-3 py-2 font-semibold text-sm text-gray-700 border-b-2 border-gray-300 text-center">
                      <div className="truncate" title={staff.name}>
                        {staff.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {staff.role}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-1">
                  <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${staffMembers.length}, minmax(120px, 1fr))` }}>
                    <div className="px-3 py-2 font-medium text-sm bg-gray-100 rounded-l border-r border-gray-300 flex items-center">
                      Total Communications
                    </div>
                    {staffMembers.map((staff, index) => {
                      const staffStats = stats.staffBreakdown[staff.id] || { count: 0, levelChanges: 0, general: 0 };
                      return (
                        <div key={index} className="px-3 py-2 text-center">
                          <div className="text-sm font-bold text-gray-900">
                            {staffStats.count}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${staffMembers.length}, minmax(120px, 1fr))` }}>
                    <div className="px-3 py-2 font-medium text-sm bg-gray-100 rounded-l border-r border-gray-300 flex items-center">
                      Level Changes
                    </div>
                    {staffMembers.map((staff, index) => {
                      const staffStats = stats.staffBreakdown[staff.id] || { count: 0, levelChanges: 0, general: 0 };
                      return (
                        <div key={index} className="px-3 py-2 text-center">
                          <div className="text-sm font-bold text-orange-600">
                            {staffStats.levelChanges}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="grid gap-1" style={{ gridTemplateColumns: `200px repeat(${staffMembers.length}, minmax(120px, 1fr))` }}>
                    <div className="px-3 py-2 font-medium text-sm bg-gray-100 rounded-l border-r border-gray-300 flex items-center">
                      General Communications
                    </div>
                    {staffMembers.map((staff, index) => {
                      const staffStats = stats.staffBreakdown[staff.id] || { count: 0, levelChanges: 0, general: 0 };
                      return (
                        <div key={index} className="px-3 py-2 text-center">
                          <div className="text-sm font-bold text-green-600">
                            {staffStats.general}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Excel-like Table View */}
          <div>
            <h4 className="text-lg font-semibold mb-3">Daily Breakdown - Excel View</h4>
            <div className="bg-gray-50 rounded-lg p-4 overflow-auto">
              <div className="min-w-full">
                {/* Table Header - Staff Names */}
                <div className="grid gap-1 mb-2" style={{ gridTemplateColumns: `120px repeat(${staffMembers.length}, minmax(100px, 1fr))` }}>
                  <div className="px-2 py-3 font-semibold text-sm text-gray-700 border-b-2 border-gray-300 bg-white rounded-l">
                    Date
                  </div>
                  {staffMembers.map((staff, index) => (
                    <div key={index} className="px-2 py-3 font-semibold text-sm text-gray-700 border-b-2 border-gray-300 text-center bg-white">
                      <div className="truncate" title={staff.name}>
                        {staff.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {staff.role}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table Rows - Dates */}
                <div className="space-y-1">
                  {tableData.map((row, rowIndex) => (
                    <div key={rowIndex} className="grid gap-1" style={{ gridTemplateColumns: `120px repeat(${staffMembers.length}, minmax(100px, 1fr))` }}>
                      {/* Date Label */}
                      <div className="px-2 py-3 font-medium text-sm bg-white rounded-l border-r border-gray-300 flex items-center">
                        {row.dateStr}
                      </div>
                      
                      {/* Staff Data for this Date */}
                      {staffMembers.map((staff, staffIndex) => {
                        const dayData = row.staffData[staff.id] || { count: 0, levelChanges: 0, general: 0 };
                        return (
                          <div key={staffIndex} className="px-1 py-1">
                            {dayData.count > 0 ? (
                              <div className="w-full bg-white rounded border border-gray-300 p-2 h-full">
                                <div className="text-xs space-y-1">
                                  <div className="font-bold text-gray-900 text-base">
                                    {dayData.count}
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-orange-600 font-medium">
                                      L: {dayData.levelChanges}
                                    </span>
                                    <span className="text-green-600 font-medium">
                                      G: {dayData.general}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full bg-gray-50 rounded border p-2 h-full flex items-center justify-center">
                                <div className="text-xs text-gray-400">-</div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-600 bg-white p-3 rounded border">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-gray-900 rounded"></div>
                    <span>Total Communications</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-orange-600 rounded"></div>
                    <span>L: Level Changes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 bg-green-600 rounded"></div>
                    <span>G: General Communications</span>
                  </div>
                  <div className="text-blue-600 font-medium">
                    💡 Hover over cells to see details
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CorrespondenceStatsModal;
