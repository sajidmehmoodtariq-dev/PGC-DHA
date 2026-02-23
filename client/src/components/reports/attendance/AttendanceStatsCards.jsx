import React from 'react';
import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';

/**
 * Attendance Statistics Cards Component
 * Shows total, present, absent counts and percentages
 */
const AttendanceStatsCards = ({ 
  stats, 
  title = "Attendance Statistics",
  showPercentage = true,
  onClick = null,
  isClickable = false 
}) => {
  const { total, present, absent, percentage, totalRecords } = stats;
  
  const cards = [
    {
      title: 'Total Students',
      value: total?.toLocaleString() || '0',
      subtitle: 'Unique students',
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-900',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Present Records',
      value: present?.toLocaleString() || '0',
      subtitle: totalRecords > 0 ? `${present}/${totalRecords} records` : '0/0 records',
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-900',
      iconColor: 'text-green-600'
    },
    {
      title: 'Absent Records',
      value: absent?.toLocaleString() || '0',
      subtitle: totalRecords > 0 ? `${absent}/${totalRecords} records` : '0/0 records',
      icon: UserX,
      color: 'from-red-500 to-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-900',
      iconColor: 'text-red-600'
    }
  ];

  // Add percentage card if enabled
  if (showPercentage) {
    cards.push({
      title: 'Attendance Rate',
      value: `${percentage?.toFixed(1) || '0.0'}%`,
      subtitle: `${present || 0} present of ${totalRecords || 0} records`,
      icon: TrendingUp,
      color: percentage >= 80 ? 'from-emerald-500 to-emerald-600' : 
             percentage >= 70 ? 'from-yellow-500 to-yellow-600' : 
             'from-orange-500 to-orange-600',
      bgColor: percentage >= 80 ? 'bg-emerald-50' : 
               percentage >= 70 ? 'bg-yellow-50' : 
               'bg-orange-50',
      borderColor: percentage >= 80 ? 'border-emerald-200' : 
                   percentage >= 70 ? 'border-yellow-200' : 
                   'border-orange-200',
      textColor: percentage >= 80 ? 'text-emerald-900' : 
                 percentage >= 70 ? 'text-yellow-900' : 
                 'text-orange-900',
      iconColor: percentage >= 80 ? 'text-emerald-600' : 
                 percentage >= 70 ? 'text-yellow-600' : 
                 'text-orange-600'
    });
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-600 mt-1">
          Current attendance metrics and statistics
        </p>
      </div>

      <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-${cards.length} gap-4`}>
        {cards.map((card, index) => {
          const CardContent = () => (
            <div className={`${card.bgColor} ${card.borderColor} border rounded-xl p-6 h-full`}>
              <div className="flex items-center justify-between mb-4">
                <div className={`h-12 w-12 bg-gradient-to-br ${card.color} rounded-xl flex items-center justify-center`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                {card.subtitle && (
                  <div className="text-right">
                    <span className={`text-xs font-medium ${card.textColor.replace('900', '600')}`}>
                      {card.subtitle}
                    </span>
                  </div>
                )}
              </div>
              
              <div>
                <p className={`text-sm font-medium ${card.textColor.replace('900', '600')} mb-1`}>
                  {card.title}
                </p>
                <p className={`text-3xl font-bold ${card.textColor}`}>
                  {card.value}
                </p>
              </div>
            </div>
          );

          if (isClickable && onClick) {
            return (
              <button
                key={index}
                onClick={() => onClick(card)}
                className="text-left transition-all duration-200 hover:scale-105 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-xl"
              >
                <CardContent />
              </button>
            );
          }

          return (
            <div key={index}>
              <CardContent />
            </div>
          );
        })}
      </div>

      {/* Additional info if total is 0 */}
      {total === 0 && (
        <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <p className="text-sm text-gray-600 text-center">
            No student data available for the selected filters and date range.
          </p>
        </div>
      )}
    </div>
  );
};

export default AttendanceStatsCards;
