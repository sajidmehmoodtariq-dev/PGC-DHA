import React from 'react';
import { GraduationCap, Users, TrendingUp, Stethoscope, Cog, Calculator, BookOpen } from 'lucide-react';

/**
 * Program Distribution Component  
 * Shows attendance breakdown by academic programs
 */
const ProgramDistribution = ({ 
  attendanceData, 
  campus, 
  selectedProgram, 
  onProgramSelect 
}) => {
  // Extract program data from attendance data
  const getProgramData = () => {
    if (!attendanceData?.programBreakdown?.[campus.toLowerCase()]) {
      return {};
    }
    
    return attendanceData.programBreakdown[campus.toLowerCase()];
  };

  const programData = getProgramData();

  // Define available programs with their icons and colors
  const programConfigs = {
    'pre-medical': {
      name: 'Pre-Medical',
      icon: Stethoscope,
      color: 'red',
      description: 'Biology, Chemistry, Physics focus'
    },
    'pre-engineering': {
      name: 'Pre-Engineering', 
      icon: Cog,
      color: 'blue',
      description: 'Mathematics, Physics, Chemistry focus'
    },
    'computer-science': {
      name: 'Computer Science',
      icon: Calculator,
      color: 'green', 
      description: 'Mathematics, Physics, Computer focus'
    },
    'general': {
      name: 'General Studies',
      icon: BookOpen,
      color: 'purple',
      description: 'Humanities and Social Sciences'
    }
  };

  // Create programs array from available data
  const programs = Object.entries(programData).map(([programId, data]) => ({
    id: programId,
    ...programConfigs[programId] || {
      name: programId.charAt(0).toUpperCase() + programId.slice(1),
      icon: GraduationCap,
      color: 'gray',
      description: 'Academic program'
    },
    data: data || { total: 0, present: 0, absent: 0, percentage: 0 }
  }));

  const getProgramColorClasses = (color, isSelected) => {
    const colors = {
      red: {
        card: isSelected ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:border-red-200',
        icon: 'from-red-500 to-red-600',
        text: 'text-red-900',
        accent: 'text-red-600'
      },
      blue: {
        card: isSelected ? 'bg-blue-50 border-blue-300' : 'bg-white border-gray-200 hover:border-blue-200',
        icon: 'from-blue-500 to-blue-600',
        text: 'text-blue-900',
        accent: 'text-blue-600'
      },
      green: {
        card: isSelected ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:border-green-200',
        icon: 'from-green-500 to-green-600',
        text: 'text-green-900', 
        accent: 'text-green-600'
      },
      purple: {
        card: isSelected ? 'bg-purple-50 border-purple-300' : 'bg-white border-gray-200 hover:border-purple-200',
        icon: 'from-purple-500 to-purple-600',
        text: 'text-purple-900',
        accent: 'text-purple-600'
      },
      gray: {
        card: isSelected ? 'bg-gray-50 border-gray-300' : 'bg-white border-gray-200 hover:border-gray-200',
        icon: 'from-gray-500 to-gray-600',
        text: 'text-gray-900',
        accent: 'text-gray-600'
      }
    };
    
    return colors[color] || colors.gray;
  };

  if (programs.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            Program Distribution - {campus} Campus
          </h3>
          <p className="text-sm text-gray-600">
            Attendance breakdown by academic programs
          </p>
        </div>
        
        <div className="text-center py-8">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No Program Data</h4>
          <p className="text-gray-600">
            No program attendance data available for {campus} campus.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Program Distribution - {campus} Campus
        </h3>
        <p className="text-sm text-gray-600">
          Attendance breakdown by academic programs and specializations
        </p>
      </div>

      <div className="space-y-4">
        {programs.map((program) => {
          const { total, present, absent, percentage } = program.data;
          const isSelected = selectedProgram === program.id;
          const colorClasses = getProgramColorClasses(program.color, isSelected);
          
          return (
            <button
              key={program.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onProgramSelect(program.id);
              }}
              className={`w-full p-4 border-2 rounded-xl transition-all duration-200 hover:shadow-md ${colorClasses.card}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`h-12 w-12 bg-gradient-to-br ${colorClasses.icon} rounded-xl flex items-center justify-center`}>
                    <program.icon className="h-6 w-6 text-white" />
                  </div>
                  
                  <div className="text-left">
                    <h4 className={`font-bold ${colorClasses.text}`}>{program.name}</h4>
                    <p className={`text-sm ${colorClasses.accent}`}>{program.description}</p>
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
                <div className={`mt-4 p-3 ${
                  colorClasses.card.includes('red') ? 'bg-red-100' :
                  colorClasses.card.includes('blue') ? 'bg-blue-100' :
                  colorClasses.card.includes('green') ? 'bg-green-100' :
                  colorClasses.card.includes('purple') ? 'bg-purple-100' :
                  'bg-gray-100'
                } rounded-lg`}>
                  <p className={`text-sm ${colorClasses.text}`}>
                    ✓ Selected - View detailed class breakdown for {program.name}
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
            <GraduationCap className="h-4 w-4 text-gray-600" />
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-1">Program Navigation</h4>
            <p className="text-sm text-gray-600">
              Click on any program to see class-wise attendance breakdown. 
              Each program represents different academic specializations and career paths.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProgramDistribution;
