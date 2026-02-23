import React from 'react';
import { Building2, Users, TrendingUp } from 'lucide-react';

/**
 * Floor Distribution Component
 * Shows attendance breakdown by floor (1st, 2nd)
 */
const FloorDistribution = ({ 
  attendanceData, 
  campus, 
  selectedFloor, 
  onFloorSelect 
}) => {
  // Extract floor data from attendance data
  const getFloorData = () => {
    if (!attendanceData?.floorBreakdown?.[campus.toLowerCase()]) {
      return {
        '1st': { total: 0, present: 0, absent: 0, percentage: 0, grade: '11th' },
        '2nd': { total: 0, present: 0, absent: 0, percentage: 0, grade: '12th' }
      };
    }
    
    return attendanceData.floorBreakdown[campus.toLowerCase()];
  };

  const floorData = getFloorData();

  const floors = [
    {
      id: '1st',
      name: '1st Floor',
      grade: '11th Grade',
      icon: Building2,
      data: floorData['1st'] || { total: 0, present: 0, absent: 0, percentage: 0 },
      color: 'blue'
    },
    {
      id: '2nd', 
      name: '2nd Floor',
      grade: '12th Grade',
      icon: Building2,
      data: floorData['2nd'] || { total: 0, present: 0, absent: 0, percentage: 0 },
      color: 'purple'
    }
  ];

  const getFloorColorClasses = (color, isSelected) => {
    const colors = {
      blue: {
        card: isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-200',
        icon: 'from-blue-500 to-blue-600',
        text: 'text-blue-900',
        accent: 'text-blue-600'
      },
      purple: {
        card: isSelected ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:border-purple-200',
        icon: 'from-purple-500 to-purple-600',
        text: 'text-purple-900',
        accent: 'text-purple-600'
      }
    };
    
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Floor Distribution - {campus} Campus
        </h3>
        <p className="text-sm text-gray-600">
          Attendance breakdown by floor (11th and 12th grades)
        </p>
      </div>

      <div className="space-y-4">
        {floors.map((floor) => {
          const { total, present, absent, percentage } = floor.data;
          const isSelected = selectedFloor === floor.id;
          const colorClasses = getFloorColorClasses(floor.color, isSelected);
          
          return (
            <button
              key={floor.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFloorSelect(floor.id);
              }}
              className={`w-full p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md ${colorClasses.card}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 bg-gradient-to-br ${colorClasses.icon} rounded-xl flex items-center justify-center`}>
                    <floor.icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="text-left">
                    <h4 className={`font-bold ${colorClasses.text}`}>{floor.name}</h4>
                    <p className={`text-sm ${colorClasses.accent}`}>{floor.grade}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Total Students */}
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <Users className={`h-4 w-4 ${colorClasses.accent}`} />
                      <span className="text-xs text-gray-600">Total</span>
                    </div>
                    <p className={`text-xl font-bold ${colorClasses.text}`}>
                      {total.toLocaleString()}
                    </p>
                  </div>

                  {/* Present/Absent */}
                  <div className="text-center">
                    <p className="text-xs text-gray-600 mb-1">Present/Absent</p>
                    <p className={`text-lg font-bold ${colorClasses.text}`}>
                      <span className="text-green-600">{present}</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-red-600">{absent}</span>
                    </p>
                    <p className="text-xs text-gray-500">{present}/{total}</p>
                  </div>

                  {/* Percentage */}
                  <div className="text-center">
                    <div className="flex items-center gap-1">
                      <TrendingUp className={`h-4 w-4 ${
                        percentage >= 80 ? 'text-green-600' : 
                        percentage >= 70 ? 'text-yellow-600' : 
                        'text-red-600'
                      }`} />
                      <span className="text-xs text-gray-600">Rate</span>
                    </div>
                    <p className={`text-xl font-bold ${
                      percentage >= 80 ? 'text-green-700' : 
                      percentage >= 70 ? 'text-yellow-700' : 
                      'text-red-700'
                    }`}>
                      {percentage.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      percentage >= 80 ? 'bg-green-500' : 
                      percentage >= 70 ? 'bg-yellow-500' : 
                      'bg-red-500'
                    }`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              {isSelected && (
                <div className={`mt-4 p-3 ${colorClasses.card.includes('blue') ? 'bg-blue-100' : 'bg-purple-100'} rounded-lg`}>
                  <p className={`text-sm ${colorClasses.text}`}>
                    ✓ Selected - View detailed class breakdown for {floor.grade}
                  </p>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 h-8 w-8 bg-gray-100 rounded-lg flex items-center justify-center">
            <Building2 className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Floor Navigation</h4>
            <p className="text-sm text-gray-600">
              Click on any floor to see class-wise attendance breakdown. 
              1st Floor houses 11th grade students, 2nd Floor houses 12th grade students.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FloorDistribution;
