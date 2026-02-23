import React from 'react';
import { Users, TrendingUp, MapPin, GraduationCap } from 'lucide-react';

/**
 * Class Distribution Component
 * Shows attendance breakdown by individual classes
 */
const ClassDistribution = ({ 
  attendanceData, 
  classesData, 
  filters, 
  selectedClass, 
  onClassSelect 
}) => {
  // Filter classes based on current filters
  const getFilteredClasses = () => {
    return classesData.filter(cls => {
      if (filters.campus && filters.campus !== 'all' && cls.campus !== filters.campus) return false;
      if (filters.floor && filters.floor !== 'all' && cls.floor !== filters.floor) return false;
      if (filters.program && filters.program !== 'all' && cls.program !== filters.program) return false;
      return true;
    });
  };

  // Get attendance data for each class
  const getClassAttendanceData = (classId) => {
    if (!attendanceData?.classBreakdown?.[classId]) {
      return { total: 0, present: 0, absent: 0, percentage: 0 };
    }
    
    return attendanceData.classBreakdown[classId];
  };

  const filteredClasses = getFilteredClasses();

  // Create classes with attendance data
  const classesWithAttendance = filteredClasses.map(cls => ({
    ...cls,
    attendanceData: getClassAttendanceData(cls._id)
  }));

  // Sort classes by attendance percentage (lowest first to highlight issues)
  const sortedClasses = classesWithAttendance.sort((a, b) => {
    return a.attendanceData.percentage - b.attendanceData.percentage;
  });

  const getAttendanceColor = (percentage) => {
    if (percentage >= 90) return 'emerald';
    if (percentage >= 80) return 'green';
    if (percentage >= 70) return 'yellow';
    if (percentage >= 60) return 'orange';
    return 'red';
  };

  const getColorClasses = (color, isSelected) => {
    const colors = {
      emerald: {
        card: isSelected ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-gray-200 hover:border-emerald-200',
        icon: 'from-emerald-500 to-emerald-600',
        text: 'text-emerald-900',
        accent: 'text-emerald-600',
        progress: 'bg-emerald-500'
      },
      green: {
        card: isSelected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-green-200',
        icon: 'from-green-500 to-green-600',
        text: 'text-green-900',
        accent: 'text-green-600',
        progress: 'bg-green-500'
      },
      yellow: {
        card: isSelected ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-200 hover:border-yellow-200',
        icon: 'from-yellow-500 to-yellow-600',
        text: 'text-yellow-900',
        accent: 'text-yellow-600',
        progress: 'bg-yellow-500'
      },
      orange: {
        card: isSelected ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 hover:border-orange-200',
        icon: 'from-orange-500 to-orange-600',
        text: 'text-orange-900',
        accent: 'text-orange-600',
        progress: 'bg-orange-500'
      },
      red: {
        card: isSelected ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-200',
        icon: 'from-red-500 to-red-600',
        text: 'text-red-900',
        accent: 'text-red-600',
        progress: 'bg-red-500'
      }
    };
    
    return colors[color] || colors.green;
  };

  if (sortedClasses.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Class Distribution</h3>
          <p className="text-sm text-gray-600">
            Individual class attendance breakdown
          </p>
        </div>
        
        <div className="text-center py-8">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h4>
          <p className="text-gray-600">
            No classes match the current filter criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Class Distribution</h3>
        <p className="text-sm text-gray-600">
          Individual class attendance breakdown ({sortedClasses.length} classes)
        </p>
        
        {/* Filter summary */}
        <div className="mt-2 flex flex-wrap gap-2">
          {filters.campus && filters.campus !== 'all' && (
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
              {filters.campus} Campus
            </span>
          )}
          {filters.floor && filters.floor !== 'all' && (
            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
              {filters.floor} Floor
            </span>
          )}
          {filters.program && filters.program !== 'all' && (
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {filters.program}
            </span>
          )}
        </div>
      </div>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedClasses.map((cls) => {
          const { total, present, absent, percentage } = cls.attendanceData;
          const isSelected = selectedClass === cls._id;
          const color = getAttendanceColor(percentage);
          const colorClasses = getColorClasses(color, isSelected);
          
          return (
            <button
              key={cls._id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClassSelect(cls._id);
              }}
              className={`p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-lg text-left ${colorClasses.card}`}
            >
              {/* Class Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 bg-gradient-to-br ${colorClasses.icon} rounded-lg flex items-center justify-center`}>
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className={`font-bold ${colorClasses.text}`}>{cls.className}</h4>
                    <p className={`text-xs ${colorClasses.accent}`}>Floor {cls.floor}</p>
                  </div>
                </div>
                
                {/* Attendance percentage badge */}
                <div className={`px-3 py-1 rounded-full ${
                  percentage >= 90 ? 'bg-emerald-100 text-emerald-700' :
                  percentage >= 80 ? 'bg-green-100 text-green-700' :
                  percentage >= 70 ? 'bg-yellow-100 text-yellow-700' :
                  percentage >= 60 ? 'bg-orange-100 text-orange-700' :
                  'bg-red-100 text-red-700'
                } text-xs font-bold`}>
                  {percentage.toFixed(1)}%
                </div>
              </div>

              {/* Class Details */}
              <div className="space-y-3">
                {/* Stats Row */}
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-1">
                    <Users className={`h-4 w-4 ${colorClasses.accent}`} />
                    <span className="text-gray-600">Total:</span>
                    <span className={`font-bold ${colorClasses.text}`}>{total}</span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-green-600 font-bold">{present}P</span>
                    <span className="text-red-600 font-bold">{absent}A</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${colorClasses.progress}`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{present}/{total}</span>
                    <span>{percentage.toFixed(1)}%</span>
                  </div>
                </div>

                {/* Class Metadata */}
                <div className="pt-2 border-t border-gray-200 space-y-1">
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <MapPin className="h-3 w-3" />
                    <span>{cls.campus} Campus</span>
                  </div>
                  {cls.program && (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <GraduationCap className="h-3 w-3" />
                      <span>{cls.program}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className={`mt-3 p-2 ${
                  colorClasses.card.includes('emerald') ? 'bg-emerald-100' :
                  colorClasses.card.includes('green') ? 'bg-green-100' :
                  colorClasses.card.includes('yellow') ? 'bg-yellow-100' :
                  colorClasses.card.includes('orange') ? 'bg-orange-100' :
                  'bg-red-100'
                } rounded-lg`}>
                  <p className={`text-xs ${colorClasses.text}`}>
                    ✓ Class Selected - View student details
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary Stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Classes</p>
          <p className="text-2xl font-bold text-gray-900">{sortedClasses.length}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Students</p>
          <p className="text-2xl font-bold text-gray-900">
            {sortedClasses.reduce((sum, cls) => sum + cls.attendanceData.total, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Total Present</p>
          <p className="text-2xl font-bold text-green-600">
            {sortedClasses.reduce((sum, cls) => sum + cls.attendanceData.present, 0).toLocaleString()}
          </p>
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-600">Average Rate</p>
          <p className="text-2xl font-bold text-blue-600">
            {sortedClasses.length > 0 
              ? (sortedClasses.reduce((sum, cls) => sum + cls.attendanceData.percentage, 0) / sortedClasses.length).toFixed(1)
              : 0}%
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClassDistribution;
