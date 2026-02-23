import React from 'react';
import { Mail, Users, MessageCircle, TrendingUp, Clock, UserCheck } from 'lucide-react';

/**
 * Correspondence statistics cards component
 * Displays key metrics and totals for correspondence data
 * Following enquiry management pattern with onClick handlers
 */
const CorrespondenceStatsCards = ({ stats, onCardClick, loading }) => {
  // Use loading prop name consistent with enquiry pattern
  const isLoading = loading;
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="animate-pulse">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-gray-300 rounded"></div>
                <div className="ml-3 flex-1">
                  <div className="h-4 bg-gray-300 rounded w-3/4"></div>
                  <div className="h-6 bg-gray-300 rounded w-1/2 mt-2"></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      title: 'Total Communications',
      value: stats.total || 0,
      icon: Mail,
      color: 'blue',
      description: 'All correspondence entries',
      onClick: () => onCardClick && onCardClick('total')
    },
    {
      title: 'Unique Students',
      value: stats.uniqueStudents || 0,
      icon: Users,
      color: 'green',
      description: 'Students with correspondence',
      onClick: () => onCardClick && onCardClick('students')
    },
    {
      title: 'Level Changes',
      value: stats.levelChanges || 0,
      icon: TrendingUp,
      color: 'purple',
      description: 'Level change communications',
      onClick: () => onCardClick && onCardClick('levelChanges')
    },
    {
      title: 'General Correspondence',
      value: stats.generalCorrespondence || 0,
      icon: MessageCircle,
      color: 'orange',
      description: 'General communications',
      onClick: () => onCardClick && onCardClick('general')
    },
    {
      title: 'Recent (Last 7 Days)',
      value: stats.recent || 0,
      icon: Clock,
      color: 'indigo',
      description: 'Communications this week',
      onClick: () => onCardClick && onCardClick('recent')
    },
    {
      title: 'Active Staff',
      value: stats.activeStaff || 0,
      icon: UserCheck,
      color: 'teal',
      description: 'Staff members involved',
      onClick: () => onCardClick && onCardClick('staff')
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      purple: 'bg-purple-50 text-purple-600',
      orange: 'bg-orange-50 text-orange-600',
      indigo: 'bg-indigo-50 text-indigo-600',
      teal: 'bg-teal-50 text-teal-600'
    };
    return colorMap[color] || colorMap.blue;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div 
            key={index} 
            onClick={card.onClick}
            className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 cursor-pointer transform hover:scale-105"
          >
            <div className="flex items-center">
              <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${getColorClasses(card.color)}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="ml-4 flex-1">
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-2xl font-bold text-gray-900">{card.value.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">{card.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(CorrespondenceStatsCards);
