import React from 'react';
import { Building, Users, TrendingUp, ArrowRight } from 'lucide-react';
import { Button } from '../../ui/button';

/**
 * Campus Tabs Component
 * Shows Boys and Girls campus attendance with tabs
 */
const CampusTabs = ({ 
  attendanceData, 
  selectedTab, 
  onTabChange, 
  onViewDetails 
}) => {
  // Extract campus data from attendance data
  const getCampusData = (campus) => {
    if (!attendanceData?.campusBreakdown) {
      return { total: 0, present: 0, absent: 0, percentage: 0 };
    }
    
    const campusData = attendanceData.campusBreakdown[campus] || {};
    return {
      total: campusData.total || 0,
      present: campusData.present || 0,
      absent: campusData.absent || 0,
      percentage: campusData.percentage || 0
    };
  };

  const boysData = getCampusData('boys');
  const girlsData = getCampusData('girls');

  const tabs = [
    {
      id: 'boys',
      label: 'Boys Campus',
      icon: Building,
      data: boysData,
      color: 'blue',
      bgGradient: 'from-blue-500 to-blue-600'
    },
    {
      id: 'girls',
      label: 'Girls Campus', 
      icon: Building,
      data: girlsData,
      color: 'pink',
      bgGradient: 'from-pink-500 to-pink-600'
    }
  ];

  const getColorClasses = (color) => {
    const colors = {
      blue: {
        active: 'bg-blue-50 border-blue-200 text-blue-700',
        inactive: 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
        accent: 'text-blue-600',
        button: 'bg-blue-500 hover:bg-blue-600'
      },
      pink: {
        active: 'bg-pink-50 border-pink-200 text-pink-700',
        inactive: 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50',
        accent: 'text-pink-600',
        button: 'bg-pink-500 hover:bg-pink-600'
      }
    };
    
    return colors[color] || colors.blue;
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Campus-wise Attendance</h2>
        <p className="text-sm text-gray-600">
          Select a campus to view detailed breakdown by floors and programs
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl mb-6">
        {tabs.map((tab) => {
          const colorClasses = getColorClasses(tab.color);
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all duration-200 font-medium ${
                selectedTab === tab.id 
                  ? colorClasses.active
                  : colorClasses.inactive
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {tabs.map((tab) => {
        if (selectedTab !== tab.id) return null;
        
        const colorClasses = getColorClasses(tab.color);
        const { total, present, absent, percentage } = tab.data;
        
        return (
          <div key={tab.id} className="space-y-6">
            {/* Campus Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Total Students */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 bg-gradient-to-br ${tab.bgGradient} rounded-lg flex items-center justify-center`}>
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 font-medium">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Present */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Present</p>
                    <p className="text-2xl font-bold text-green-900">{present.toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-1">{present}/{total}</p>
                  </div>
                </div>
              </div>

              {/* Absent */}
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm text-red-600 font-medium">Absent</p>
                    <p className="text-2xl font-bold text-red-900 flex items-center gap-2">
                      {absent.toLocaleString()}
                      <span className="text-lg text-red-600">students</span>
                    </p>
                    <p className="text-xs text-red-600 mt-1">{absent}/{total}</p>
                  </div>
                </div>
              </div>

              {/* Attendance Percentage */}
              <div className={`${
                percentage >= 80 ? 'bg-emerald-50 border-emerald-200' : 
                percentage >= 70 ? 'bg-yellow-50 border-yellow-200' : 
                'bg-orange-50 border-orange-200'
              } border rounded-xl p-6`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className={`h-10 w-10 bg-gradient-to-br ${
                    percentage >= 80 ? 'from-emerald-500 to-emerald-600' : 
                    percentage >= 70 ? 'from-yellow-500 to-yellow-600' : 
                    'from-orange-500 to-orange-600'
                  } rounded-lg flex items-center justify-center`}>
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${
                      percentage >= 80 ? 'text-emerald-600' : 
                      percentage >= 70 ? 'text-yellow-600' : 
                      'text-orange-600'
                    }`}>Attendance Rate</p>
                    <p className={`text-2xl font-bold ${
                      percentage >= 80 ? 'text-emerald-900' : 
                      percentage >= 70 ? 'text-yellow-900' : 
                      'text-orange-900'
                    }`}>{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex justify-center">
              <Button
                onClick={() => onViewDetails(tab.id === 'boys' ? 'Boys' : 'Girls')}
                className={`${colorClasses.button} text-white px-6 py-3 rounded-xl flex items-center gap-2 font-medium`}
              >
                View {tab.label} Details
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Campus Summary */}
            <div className={`${
              selectedTab === 'boys' ? 'bg-blue-50 border-blue-200' : 'bg-pink-50 border-pink-200'
            } border rounded-xl p-4`}>
              <div className="flex items-start gap-3">
                <div className={`flex-shrink-0 h-8 w-8 ${
                  selectedTab === 'boys' ? 'bg-blue-100' : 'bg-pink-100'
                } rounded-lg flex items-center justify-center`}>
                  <Building className={`h-4 w-4 ${
                    selectedTab === 'boys' ? 'text-blue-600' : 'text-pink-600'
                  }`} />
                </div>
                <div>
                  <h3 className={`text-sm font-medium ${
                    selectedTab === 'boys' ? 'text-blue-900' : 'text-pink-900'
                  } mb-1`}>
                    {tab.label} Overview
                  </h3>
                  <p className={`text-sm ${
                    selectedTab === 'boys' ? 'text-blue-700' : 'text-pink-700'
                  }`}>
                    {present} out of {total} students are present today ({percentage.toFixed(1)}% attendance rate).
                    Click "View Details" to see floor-wise and program-wise breakdown.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampusTabs;
