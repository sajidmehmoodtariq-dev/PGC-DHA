import React from 'react';
import { Users, UserCheck, GraduationCap } from 'lucide-react';

const StatsCards = ({ 
  currentData, 
  percentages, 
  currentView, 
  selectedGender, 
  selectedLevel,
  onCardClick, 
  loading 
}) => {
  // Get non-progression data for the selected level
  const getNonProgressionData = () => {
    if (!currentData?.levelProgression || !currentData?.genderLevelProgression || parseInt(selectedLevel) === 1) {
      return { total: 0, boys: 0, girls: 0 };
    }

    const level = parseInt(selectedLevel);
    const levelData = currentData.levelProgression[level];
    const boysData = currentData.genderLevelProgression?.boys?.[level];
    const girlsData = currentData.genderLevelProgression?.girls?.[level];

    return {
      total: levelData?.notProgressed || 0,
      boys: boysData?.notProgressed || 0,
      girls: girlsData?.notProgressed || 0
    };
  };

  const nonProgressionData = getNonProgressionData();
  const cards = [
    {
      title: 'Total Students',
      value: currentData.total,
      nonProgressed: nonProgressionData.total,
      icon: Users,
      color: 'from-blue-500 to-blue-600',
      view: 'total',
      isActive: currentView === 'total'
    },
    {
      title: 'Boys',
      value: currentData.boys,
      nonProgressed: nonProgressionData.boys,
      percentage: percentages.boysPercentage,
      icon: UserCheck,
      color: 'from-green-500 to-green-600',
      view: 'gender',
      gender: 'boys',
      isActive: currentView === 'gender' && selectedGender === 'boys'
    },
    {
      title: 'Girls',
      value: currentData.girls,
      nonProgressed: nonProgressionData.girls,
      percentage: percentages.girlsPercentage,
      icon: GraduationCap,
      color: 'from-pink-500 to-red-500',
      view: 'gender',
      gender: 'girls',
      isActive: currentView === 'gender' && selectedGender === 'girls'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 mb-4 sm:mb-6 lg:mb-8">
      {cards.map((card) => {
        const IconComponent = card.icon;
        
        return (
          <div
            key={card.title}
            onClick={() => !loading && onCardClick(card.view, card.gender)}
            className={`
              bg-white rounded-lg sm:rounded-xl shadow-lg overflow-hidden cursor-pointer transform transition-all duration-200 hover:scale-105 hover:shadow-xl
              ${card.isActive ? 'ring-2 sm:ring-4 ring-blue-500 ring-opacity-50' : ''}
              ${loading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <div className={`bg-gradient-to-r ${card.color} p-3 sm:p-4 lg:p-6 text-white`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base lg:text-lg font-semibold opacity-90 truncate">{card.title}</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{card.value.toLocaleString()}</p>
                  {card.percentage !== undefined && (
                    <p className="text-xs sm:text-sm opacity-90 mt-1">
                      {card.percentage.toFixed(1)}% of total
                    </p>
                  )}
                  {card.nonProgressed > 0 && parseInt(selectedLevel) > 1 && (
                    <p className="text-xs sm:text-sm opacity-90 mt-1 bg-red-500 bg-opacity-20 px-2 py-1 rounded">
                      {card.nonProgressed.toLocaleString()} did not progress
                    </p>
                  )}
                </div>
                <IconComponent className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 opacity-80 flex-shrink-0 ml-2" />
              </div>
            </div>
            <div className="p-2 sm:p-3 lg:p-4 bg-gray-50">
              <p className="text-xs sm:text-sm text-gray-600 text-center leading-tight">
                Click to {card.isActive ? 'view program breakdown' : 'view program distribution'}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default React.memo(StatsCards);
