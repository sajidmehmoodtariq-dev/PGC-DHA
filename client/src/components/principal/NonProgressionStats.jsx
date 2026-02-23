import React, { useMemo } from 'react';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';

const NonProgressionStats = ({ currentData, selectedLevel, loading }) => {
  // Calculate non-progression statistics based on current view and level
  const nonProgressionData = useMemo(() => {
    if (!currentData) {
      return null;
    }

    const level = parseInt(selectedLevel);
    
    // The currentData should have levelProgression and genderLevelProgression
    const levelProgression = currentData.levelProgression;
    const genderLevelProgression = currentData.genderLevelProgression;

    if (!levelProgression || !genderLevelProgression) {
      return null;
    }

    const levelData = levelProgression[level];
    if (!levelData) {
      return null;
    }

    // Calculate totals
    const totalNotProgressed = levelData.notProgressed || 0;
    const totalPrevious = levelData.previous || 0;
    const progressionRate = totalPrevious > 0 ? ((totalPrevious - totalNotProgressed) / totalPrevious * 100) : 0;
    const nonProgressionRate = totalPrevious > 0 ? (totalNotProgressed / totalPrevious * 100) : 0;

    // Calculate gender breakdown
    const boysData = genderLevelProgression?.boys?.[level];
    const girlsData = genderLevelProgression?.girls?.[level];
    
    const boysNotProgressed = boysData?.notProgressed || 0;
    const girlsNotProgressed = girlsData?.notProgressed || 0;
    
    const boysPrevious = boysData?.previous || 0;
    const girlsPrevious = girlsData?.previous || 0;
    
    const boysNonProgressionRate = boysPrevious > 0 ? (boysNotProgressed / boysPrevious * 100) : 0;
    const girlsNonProgressionRate = girlsPrevious > 0 ? (girlsNotProgressed / girlsPrevious * 100) : 0;

    return {
      total: {
        count: totalNotProgressed,
        percentage: nonProgressionRate,
        progressionRate: progressionRate
      },
      boys: {
        count: boysNotProgressed,
        percentage: boysNonProgressionRate,
        previous: boysPrevious
      },
      girls: {
        count: girlsNotProgressed,
        percentage: girlsNonProgressionRate,
        previous: girlsPrevious
      },
      previous: totalPrevious
    };
  }, [currentData, selectedLevel]);

  // Don't show for Level 1 (no previous level to progress from)
  if (parseInt(selectedLevel) === 1) {
    return null;
  }

  if (loading) {
    return null;
  }

  if (!nonProgressionData) {
    return null;
  }

  // Show success message when no students failed to progress
  if (nonProgressionData.total.count === 0 && nonProgressionData.previous > 0) {
    return (
      <div className="mb-8">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <div className="p-1 bg-green-100 rounded-full">
              <TrendingDown className="w-4 h-4 text-green-600 rotate-180" />
            </div>
            <div>
              <h4 className="text-sm font-medium text-green-800">
                Excellent Academic Progression! 🎉
              </h4>
              <p className="text-sm text-green-700 mt-1">
                All {nonProgressionData.previous.toLocaleString()} eligible students successfully progressed from Level {parseInt(selectedLevel) - 1} to Level {selectedLevel}+. 
                This indicates strong academic performance and effective support systems.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Don't show if no data available
  if (nonProgressionData.total.count === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 bg-orange-100 rounded-lg">
          <TrendingDown className="w-5 h-5 text-orange-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-800">
            Non-Progression Analysis
          </h3>
          <p className="text-sm text-gray-600">
            Students who did not progress from Level {parseInt(selectedLevel) - 1} to Level {selectedLevel}+ (showing gaps in academic progression)
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Non-Progression */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Total Not Progressed</p>
                <p className="text-2xl font-bold">{nonProgressionData.total.count.toLocaleString()}</p>
                <p className="text-xs opacity-90 mt-1">
                  {nonProgressionData.total.percentage.toFixed(1)}% of eligible students
                </p>
              </div>
              <AlertTriangle className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <div className="p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Progression Rate:</span>
              <span className="font-medium text-green-600">
                {nonProgressionData.total.progressionRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Boys Non-Progression */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Boys Not Progressed</p>
                <p className="text-2xl font-bold">{nonProgressionData.boys.count.toLocaleString()}</p>
                <p className="text-xs opacity-90 mt-1">
                  {nonProgressionData.boys.percentage.toFixed(1)}% of eligible boys
                </p>
              </div>
              <Users className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <div className="p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Eligible Boys:</span>
              <span className="font-medium text-gray-800">
                {nonProgressionData.boys.previous.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Girls Non-Progression */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="bg-gradient-to-r from-pink-500 to-red-500 p-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Girls Not Progressed</p>
                <p className="text-2xl font-bold">{nonProgressionData.girls.count.toLocaleString()}</p>
                <p className="text-xs opacity-90 mt-1">
                  {nonProgressionData.girls.percentage.toFixed(1)}% of eligible girls
                </p>
              </div>
              <Users className="w-8 h-8 opacity-80" />
            </div>
          </div>
          <div className="p-3 bg-gray-50">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600">Eligible Girls:</span>
              <span className="font-medium text-gray-800">
                {nonProgressionData.girls.previous.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Alert */}
      {nonProgressionData.total.percentage > 20 && (
        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-amber-800">
                High Non-Progression Rate Alert
              </h4>
              <p className="text-sm text-amber-700 mt-1">
                {nonProgressionData.total.percentage.toFixed(1)}% of students did not progress to the next level. 
                Consider reviewing academic support programs and intervention strategies.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(NonProgressionStats);