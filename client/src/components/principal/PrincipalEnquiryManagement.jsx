import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import useEnquiryData from '../../hooks/useEnquiryData';

// Import all the smaller components
import ErrorDisplay from './ErrorDisplay';
import Header from './Header';
import DateFilter from './DateFilter';
import CustomDateRange from './CustomDateRange';
import LevelTabs from './LevelTabs';
import TodaysStats from './TodaysStats';
import StatsCards from './StatsCards';
import ProgramBreakdownCards from './ProgramBreakdownCards';
import FloatingStatsPill from './FloatingStatsPill';
import StatsModal from './StatsModal';

/**
 * Principal Enquiry Management Component
 * Shows hierarchical family tree view of enquiries with level and date filtering
 */
const PrincipalEnquiryManagement = () => {
  const { userRole } = usePermissions();

  // Use the simple enquiry data hook
  const {
    fetchComprehensiveData,
    fetchCustomDateRange,
    refreshData,
    getFilteredData,
    getLevelStatistics,
    isInitialLoading,
    isRefreshing,
    isCustomDateLoading,
    error,
    lastUpdated
  } = useEnquiryData();

  // State management
  const [selectedLevel, setSelectedLevel] = useState('1');
  const [selectedDate, setSelectedDate] = useState('all');
  const [currentView, setCurrentView] = useState('default');
  const [selectedGender, setSelectedGender] = useState(null);

  // State for custom date filter
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customDatesApplied, setCustomDatesApplied] = useState(false);
  const [customData, setCustomData] = useState(null);
  
  // State for floating stats pill and background data loading
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [isGlimpseDataLoading, setIsGlimpseDataLoading] = useState(false);
  const [hasMainDataLoaded, setHasMainDataLoaded] = useState(false);
  const [pillPosition, setPillPosition] = useState({ 
    x: window.innerWidth * 0.1, // 10% from left
    y: window.innerHeight * 0.9 - 100 // 10% from bottom (minus pill height)
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const pillRef = useRef(null);

  // Auto-refresh state for Today's stats only
  // Default to disabled to avoid aggressive background polling that can
  // interfere with user interactions (was causing periodic requests).
  const [todaysAutoRefreshEnabled, setTodaysAutoRefreshEnabled] = useState(false);
  const todaysRefreshIntervalRef = useRef(null);

  // Level tabs configuration (updated with accurate terminology)
  const levelTabs = [
    { value: '1', label: 'Level 1', color: 'bg-green-500', count: 0 },
    { value: '2', label: 'Level 2', color: 'bg-yellow-500', count: 0 },
    { value: '3', label: 'Level 3', color: 'bg-orange-500', count: 0 },
    { value: '4', label: 'Level 4', color: 'bg-red-500', count: 0 },
    { value: '5', label: 'Level 5', color: 'bg-purple-500', count: 0 }
  ];

  // Date filter options
  const dateFilters = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // State for current data
  const [currentData, setCurrentData] = useState(null);
  const [isLoadingCurrentData, setIsLoadingCurrentData] = useState(false);

  // State for level statistics  
  const [levelStats, setLevelStats] = useState({});

  // Get current level statistics
  const fetchLevelStats = useCallback(async () => {
    try {
      const dateFilter = selectedDate === 'custom' && customDatesApplied ? 'custom' : selectedDate;
      
      console.log('fetchLevelStats - TRIGGERED with dateFilter:', dateFilter);
      console.log('fetchLevelStats - selectedDate:', selectedDate, 'customDatesApplied:', customDatesApplied);
      
      let stats;
      if (dateFilter === 'custom' && customData) {
        stats = await getLevelStatistics(dateFilter, customData);
      } else {
        stats = await getLevelStatistics(dateFilter);
      }
      
      console.log('fetchLevelStats - Stats:', stats);
      setLevelStats(stats);
    } catch (error) {
      console.error('Error fetching level stats:', error);
      setLevelStats({});
    }
  }, [selectedDate, customDatesApplied, customData, getLevelStatistics]);

  // Effect to fetch level stats when filters change
  useEffect(() => {
    fetchLevelStats();
  }, [fetchLevelStats]);

  // Get current data based on selected filters
  const fetchCurrentData = useCallback(async () => {
    setIsLoadingCurrentData(true);
    try {
      const dateFilter = selectedDate === 'custom' && customDatesApplied ? 'custom' : selectedDate;
      const level = parseInt(selectedLevel);
      
      console.log('fetchCurrentData - TRIGGERED with dateFilter:', dateFilter, 'level:', level);
      console.log('fetchCurrentData - selectedDate:', selectedDate, 'customDatesApplied:', customDatesApplied);
      
      let data;
      if (dateFilter === 'custom' && customData) {
        data = await getFilteredData(level, dateFilter, customData);
      } else {
        data = await getFilteredData(level, dateFilter);
      }
      
      console.log('fetchCurrentData - dateFilter:', dateFilter, 'level:', level);
      console.log('fetchCurrentData - data:', data);
      
      setCurrentData(data);
    } catch (error) {
      console.error('Error fetching current data:', error);
      setCurrentData(null);
    } finally {
      setIsLoadingCurrentData(false);
    }
  }, [selectedLevel, selectedDate, customDatesApplied, customData, getFilteredData]);

  // Effect to fetch data when filters change
  useEffect(() => {
    fetchCurrentData();
  }, [fetchCurrentData]);

  // Calculate percentages from current data
  const calculatePercentages = useCallback((data) => {
    const total = (data?.boys || 0) + (data?.girls || 0);
    const boysPercentage = total > 0 ? ((data?.boys || 0) / total) * 100 : 0;
    const girlsPercentage = total > 0 ? ((data?.girls || 0) / total) * 100 : 0;
    
    // Calculate program percentages for boys
    const boysProgramPercentages = {};
    if (data?.boys > 0) {
      Object.entries(data?.programs?.boys || {}).forEach(([program, count]) => {
        boysProgramPercentages[program] = (count / data.boys) * 100;
      });
    }
    
    // Calculate program percentages for girls
    const girlsProgramPercentages = {};
    if (data?.girls > 0) {
      Object.entries(data?.programs?.girls || {}).forEach(([program, count]) => {
        girlsProgramPercentages[program] = (count / data.girls) * 100;
      });
    }
    
    return {
      boysPercentage,
      girlsPercentage,
      boysProgramPercentages,
      girlsProgramPercentages
    };
  }, []);

  // State for today's stats data - will be derived from comprehensive data
  const [allLevelsData, setAllLevelsData] = useState({});

  // Extract today's data from comprehensive data (no separate API calls needed)
  const extractTodaysData = useCallback((comprehensiveData) => {
    console.log('extractTodaysData - Received comprehensive data:', comprehensiveData);
    
    if (!comprehensiveData?.dateRanges?.today?.levelData) {
      console.log('extractTodaysData - No today data found in comprehensive data structure');
      return {};
    }
    
    const todayLevelData = comprehensiveData.dateRanges.today.levelData;
    console.log('extractTodaysData - Today level data from API:', todayLevelData);
    
    const levelsData = {};
    
    for (let level = 1; level <= 5; level++) {
      levelsData[`level${level}`] = todayLevelData[level]?.total || 0;
    }
    
    console.log('extractTodaysData - Extracted for TodaysStats component:', levelsData);
    console.log('extractTodaysData - Expected: {level1: 10, level2: 11, level3: 14, level4: 13, level5: 26}');
    setAllLevelsData(levelsData);
    return levelsData;
  }, []);

  // REMOVED: fetchTodaysData function - no longer needed since we get this data from comprehensive endpoint

  // REMOVED: Effect to fetch today's data - now extracted from comprehensive data

  // No longer need time period data for AdvancedStatsTable (Glimpse)

  // Event handlers
  const handleCardClick = (view, gender = null) => {
    if (view === 'total') {
      setCurrentView('total');
      setSelectedGender(null);
    } else if (view === 'gender') {
      setCurrentView('gender');
      setSelectedGender(gender);
    }
  };

  const handleBackClick = () => {
    setCurrentView('default');
    setSelectedGender(null);
  };

  const handleApplyFilters = async () => {
    if (!customStartDate || !customEndDate) return;
    
    try {
      const response = await fetchCustomDateRange(customStartDate, customEndDate, selectedLevel);
      // Extract the actual data from the response
      setCustomData(response.data);
      setCustomDatesApplied(true);
    } catch (error) {
      // Don't log errors for canceled requests
      if (error.name !== 'CanceledError' && error.code !== 'ERR_CANCELED') {
        console.error('Failed to apply custom date range:', error);
      }
    }
  };

  // Auto-refresh function for Today's stats only (every 30 seconds)
  const refreshTodaysStatsOnly = useCallback(async () => {
    if (!todaysAutoRefreshEnabled) return;
    
    try {
      console.log('Auto-refreshing Today\'s stats silently...');
      
      // Fetch fresh comprehensive data silently (no loading states, no error disruption)
      const freshData = await fetchComprehensiveData(true, true); // forceRefresh=true, silent=true
      
      if (freshData) {
        // Extract and update today's data silently
        extractTodaysData(freshData);
        console.log('Today\'s stats updated silently via auto-refresh');
      }
      
    } catch (error) {
      // Silent failure - don't disturb user experience
      console.warn('Silent auto-refresh failed (this is ok):', error.message);
    }
  }, [todaysAutoRefreshEnabled, fetchComprehensiveData, extractTodaysData]);

  // Manual refresh for Today's stats (triggered by button)
  const handleTodaysRefresh = useCallback(async () => {
    try {
      console.log('Manual refresh of Today\'s stats...');
      await refreshTodaysStatsOnly();
    } catch (error) {
      console.error('Manual refresh failed:', error);
    }
  }, [refreshTodaysStatsOnly]);

  // Full data refresh (only for main refresh button - rare use)
  const handleFullRefreshData = async () => {
    try {
      await refreshData();
      // Reset custom data if we have any
      if (customDatesApplied) {
        setCustomData(null);
        setCustomDatesApplied(false);
      }
    } catch (error) {
      console.error('Failed to refresh data:', error);
    }
  };

  // Drag functionality for floating pill
  const handleMouseDown = (e) => {
    setIsDragging(true);
    const rect = pillRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = useCallback((e) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y));
      
      setPillPosition({ x: newX, y: newY });
    }
  }, [isDragging, dragOffset]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Effects
  useEffect(() => {
    // Load main data immediately (this will use the hook's loading state)
    // Then load additional glimpse data in background once main loading is done
    const loadMainData = async () => {
      try {
        console.log('Loading main data...');
        const comprehensiveData = await fetchComprehensiveData();
        
        // Extract today's data from comprehensive data immediately
        if (comprehensiveData) {
          extractTodaysData(comprehensiveData);
        }
        
        setHasMainDataLoaded(true);
        
        // Start background glimpse data preparation
        // This ensures glimpse data is fully ready for instant display
        console.log('Preparing glimpse data in background...');
        setIsGlimpseDataLoading(true);
        
        // Small delay to let main UI settle
        setTimeout(async () => {
          try {
            // Force a fresh fetch to ensure glimpse has latest data
            const freshData = await fetchComprehensiveData(true);
            if (freshData) {
              extractTodaysData(freshData);
            }
            console.log('Glimpse data prepared successfully');
          } catch (error) {
            console.warn('Failed to prepare glimpse data:', error);
          } finally {
            setIsGlimpseDataLoading(false);
          }
        }, 300); // Shorter delay since main data is already loaded
        
      } catch (error) {
        console.error('Failed to load main data:', error);
        setHasMainDataLoaded(false);
        setIsGlimpseDataLoading(false);
      }
    };
    
  loadMainData();
  }, [fetchComprehensiveData, extractTodaysData]); // Include dependencies

  // Auto-refresh setup for Today's stats only (every 30 seconds)
  useEffect(() => {
    if (todaysAutoRefreshEnabled && hasMainDataLoaded) {
      console.log('Setting up auto-refresh for Today\'s stats every 30 seconds...');
      
      todaysRefreshIntervalRef.current = setInterval(() => {
        refreshTodaysStatsOnly();
      }, 30000); // 30 seconds
      
      return () => {
        if (todaysRefreshIntervalRef.current) {
          clearInterval(todaysRefreshIntervalRef.current);
          console.log('Auto-refresh interval cleared');
        }
      };
    }
  }, [todaysAutoRefreshEnabled, hasMainDataLoaded, refreshTodaysStatsOnly]);

  useEffect(() => {
    console.log('useEffect - selectedDate changed to:', selectedDate);
    if (selectedDate !== 'custom') {
      console.log('useEffect - Resetting custom data because selectedDate is not custom');
      setCustomDatesApplied(false);
      setCustomData(null);
    }
  }, [selectedDate]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Cleanup auto-refresh interval on unmount
  useEffect(() => {
    return () => {
      if (todaysRefreshIntervalRef.current) {
        clearInterval(todaysRefreshIntervalRef.current);
        console.log('Auto-refresh interval cleaned up on unmount');
      }
    };
  }, []);

  // Compute current state
  // Data for the current filters
  const displayData = currentData || { total: 0, boys: 0, girls: 0, programs: { boys: {}, girls: {} } };
  const percentages = calculatePercentages(displayData);
  const loading = isInitialLoading || (selectedDate === 'custom' && isCustomDateLoading) || isLoadingCurrentData;

  // Show simple error state if data fetch fails and no cached data
  if (error && loading) {
    return (
      <ErrorDisplay 
        error={error}
        isRefreshing={isRefreshing}
        onRetry={refreshData}
      />
    );
  }

  // Early return for unauthorized access
  if (userRole !== 'Principal' && userRole !== 'InstituteAdmin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-red-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <Header 
          error={error}
          isRefreshing={isRefreshing}
          isInitialLoading={isInitialLoading}
          onRefresh={handleFullRefreshData}
          lastUpdated={lastUpdated}
        />

        {/* Time Filter Section */}
        <div className="bg-white rounded-xl shadow-lg mb-8 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                Time Filter
              </h2>
              <p className="text-sm text-gray-600">
                Select the time period for enquiry data analysis
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <DateFilter 
                selectedDate={selectedDate}
                dateFilters={dateFilters}
                onDateChange={setSelectedDate}
                loading={loading}
              />
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-600">Auto-refresh Today's stats</label>
                <button
                  type="button"
                  onClick={() => setTodaysAutoRefreshEnabled(prev => !prev)}
                  className={`px-3 py-1 rounded text-sm ${todaysAutoRefreshEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}
                >
                  {todaysAutoRefreshEnabled ? 'On' : 'Off'}
                </button>
                {isGlimpseDataLoading && (
                  <div className="text-sm text-gray-500">Preparing glimpse...</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Custom Date Range in Main Page */}
          {selectedDate === 'custom' && (
            <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-800 mb-4">Custom Date Range</h3>
              <CustomDateRange 
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                customDatesApplied={customDatesApplied}
                isCustomDateLoading={isCustomDateLoading}
                onStartDateChange={setCustomStartDate}
                onEndDateChange={setCustomEndDate}
                onApplyFilters={handleApplyFilters}
                loading={loading}
              />
            </div>
          )}
        </div>

        {/* Level Tabs */}
        <LevelTabs 
          levelTabs={levelTabs}
          selectedLevel={selectedLevel}
          onLevelChange={setSelectedLevel}
          levelStats={levelStats}
          loading={isInitialLoading}
        />

        {/* Today's Statistics */}
        <TodaysStats 
          allTimeData={allLevelsData}
          isLoading={false}
          error={error}
          lastUpdated={lastUpdated}
          onRefresh={handleTodaysRefresh}
        />

        {/* Stats Cards OR Program Breakdown Cards */}
        {currentView === 'default' ? (
          <StatsCards 
            currentData={displayData}
            percentages={percentages}
            currentView={currentView}
            selectedGender={selectedGender}
            selectedLevel={selectedLevel}
            onCardClick={handleCardClick}
            loading={loading}
          />
        ) : (
          <ProgramBreakdownCards 
            currentView={currentView}
            selectedGender={selectedGender}
            currentData={displayData}
            onBackClick={handleBackClick}
            loading={loading}
          />
        )}

        {/* Floating Stats Pill - Always enabled, never disabled by auto-refresh */}
        {hasMainDataLoaded && (
          <FloatingStatsPill 
            position={pillPosition}
            loading={false}
            isDragging={isDragging}
            onShowStats={() => setShowStatsModal(true)}
            onMouseDown={handleMouseDown}
            pillRef={pillRef}
          />
        )}

        {/* Stats Modal */}
        <StatsModal 
          showStatsModal={showStatsModal}
          onCloseModal={() => setShowStatsModal(false)}
          loading={isInitialLoading}
          lastUpdated={lastUpdated}
        />
      </div>
    </div>
  );
};

export default PrincipalEnquiryManagement;