import React, { useMemo } from 'react';

const ZoneStatisticsCard = ({ 
  data, 
  title, 
  showPercentages = true, 
  allowDrillDown = false, 
  onDrillDown,
  className = '',
  isLoading = false,
  size = 'default' // default, sm, xs
}) => {
  const zones = useMemo(() => [
    { key: 'green', label: 'Green Zone', color: 'bg-green-500', description: 'High Performance (Baseline+)' },
    { key: 'blue', label: 'Blue Zone', color: 'bg-blue-500', description: 'Good Performance (Baseline-1% to -4%)' },
    { key: 'yellow', label: 'Yellow Zone', color: 'bg-yellow-500', description: 'Average Performance (Baseline-5% to -9%)' },
    { key: 'red', label: 'Red Zone', color: 'bg-red-500', description: 'Needs Improvement (Baseline-10%+)' },
    { key: 'unassigned', label: 'Unassigned', color: 'bg-gray-400', description: 'No test data available' }
  ], []);

  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'xs':
        return {
          card: 'p-3',
          title: 'text-sm font-medium',
          spacing: 'space-y-2',
          total: 'text-sm',
          showBars: false,
          compactLayout: true
        };
      case 'sm':
        return {
          card: 'p-4',
          title: 'text-base font-semibold',
          spacing: 'space-y-3',
          total: 'text-base',
          showBars: false,
          compactLayout: false
        };
      default:
        return {
          card: 'p-6',
          title: 'text-lg font-semibold',
          spacing: 'space-y-4',
          total: 'text-lg',
          showBars: true,
          compactLayout: false
        };
    }
  }, [size]);

  const getPercentage = useMemo(() => (count) => {
    return data?.total > 0 ? ((count / data.total) * 100).toFixed(1) : 0;
  }, [data?.total]);
  if (isLoading) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${sizeClasses.card} ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className={sizeClasses.spacing}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data || data.total === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${sizeClasses.card} ${className}`}>
        <h3 className={`${sizeClasses.title} text-gray-900 mb-4`}>{title}</h3>
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">📊</div>
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  const handleCardClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (allowDrillDown && onDrillDown) {
      onDrillDown(data);
    }
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md ${sizeClasses.card} transition-all duration-200 ${
        allowDrillDown ? 'cursor-pointer hover:shadow-lg hover:scale-105' : ''
      } ${className}`}
      onClick={handleCardClick}
    >
      <div className={`flex justify-between items-center ${size === 'xs' ? 'mb-3' : 'mb-6'}`}>
        <h3 className={`${sizeClasses.title} text-gray-900`}>{title}</h3>
        {allowDrillDown && (
          <div className="text-blue-500 text-sm flex items-center">
            {size === 'xs' ? '→' : 'View Details'}
            {size !== 'xs' && (
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            )}
          </div>
        )}
      </div>

      <div className={sizeClasses.spacing}>
        {zones.map(zone => {
          const count = data[zone.key] || 0;
          const percentage = getPercentage(count);
          
          if (sizeClasses.compactLayout && count === 0) return null;
          
          return (
            <div key={zone.key} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className={`w-4 h-4 rounded-full ${zone.color}`}></div>
                <div>
                  <span className={`font-medium text-gray-900 ${size === 'xs' ? 'text-sm' : ''}`}>
                    {size === 'xs' ? zone.label.split(' ')[0] : zone.label}
                  </span>
                  {!showPercentages && size !== 'xs' && (
                    <span className="text-sm text-gray-500 ml-2">({zone.description})</span>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`font-bold text-gray-900 ${size === 'xs' ? 'text-sm' : ''}`}>{count}</span>
                {showPercentages && (
                  <span className={`text-sm text-gray-500 min-w-[3rem] text-right ${size === 'xs' ? 'hidden' : ''}`}>
                    ({percentage}%)
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`${size === 'xs' ? 'mt-3 pt-2' : 'mt-6 pt-4'} border-t border-gray-200`}>
        <div className="flex justify-between items-center">
          <span className={`font-semibold text-gray-900 ${size === 'xs' ? 'text-sm' : ''}`}>Total</span>
          <span className={`font-bold ${sizeClasses.total} text-gray-900`}>{data.total}</span>
        </div>
      </div>

      {/* Visual progress bars - only show for default size */}
      {sizeClasses.showBars && (
        <div className="mt-4 space-y-2">
          {zones.map(zone => {
            const count = data[zone.key] || 0;
            const percentage = getPercentage(count);
            
            return (
              <div key={`bar-${zone.key}`} className="flex items-center space-x-2">
                <div className="w-2 flex-1 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${zone.color} transition-all duration-500`}
                    style={{ width: `${percentage}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default React.memo(ZoneStatisticsCard);
