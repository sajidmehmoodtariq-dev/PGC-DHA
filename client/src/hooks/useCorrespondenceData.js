import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';

/**
 * Hook for managing correspondence data with filtering and statistics
 * Similar to useEnquiryData but for correspondence management
 */
const useCorrespondenceData = () => {
  // Cache state
  const [cache, setCache] = useState({
    data: null,
    timestamp: null,
    isValid: false
  });

  // Loading states
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCustomDateLoading, setIsCustomDateLoading] = useState(false);
  const [error, setError] = useState(null);

  // Cache validity (5 minutes)
  const CACHE_DURATION = 5 * 60 * 1000;
  const REQUEST_TIMEOUT = 15000; // 15 seconds (increased from 10)
  
  // Abort controller  
  const abortControllerRef = useRef(null);
  const fetchFunctionRef = useRef(null);

  // Cleanup function to abort ongoing requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Filter correspondence by date range
   */
  const filterByDateRange = useCallback((data, range, now) => {
    let startDate = new Date();
    
    switch (range) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        return data;
    }

    return data.filter(item => new Date(item.timestamp) >= startDate);
  }, []);

  /**
   * Calculate correspondence statistics
   */
  const calculateCorrespondenceStats = useCallback((data) => {
    return {
      total: data.length,
      uniqueStudents: [...new Set(data.map(c => c.studentId))].length,
      byType: {
        levelChange: data.filter(c => c.type === 'levelChange').length,
        generalCorrespondence: data.filter(c => c.type === 'generalCorrespondence').length
      },
      byLevel: {
        1: data.filter(c => c.studentLevel === 1).length,
        2: data.filter(c => c.studentLevel === 2).length,
        3: data.filter(c => c.studentLevel === 3).length,
        4: data.filter(c => c.studentLevel === 4).length,
        5: data.filter(c => c.studentLevel === 5).length
      }
    };
  }, []);

  /**
   * Calculate level breakdown
   */
  const calculateLevelBreakdown = useCallback((data) => {
    const levels = {};
    for (let i = 1; i <= 5; i++) {
      levels[i] = data.filter(c => c.studentLevel === i).length;
    }
    return levels;
  }, []);

  /**
   * Process correspondence data for statistics
   */
  const processCorrespondenceData = useCallback((correspondenceData, stats) => {
    // Group by date ranges
    const now = new Date();
    const dateRanges = {
      today: filterByDateRange(correspondenceData, 'today', now),
      week: filterByDateRange(correspondenceData, 'week', now),
      month: filterByDateRange(correspondenceData, 'month', now),
      year: filterByDateRange(correspondenceData, 'year', now),
      all: correspondenceData
    };

    // Calculate statistics for each date range
    const processedRanges = {};
    Object.keys(dateRanges).forEach(range => {
      processedRanges[range] = calculateCorrespondenceStats(dateRanges[range]);
    });

    // Create breakdown data for visualization
    const breakdown = {
      byLevel: calculateLevelBreakdown(correspondenceData),
      byType: {
        // Use backend stats if available, otherwise calculate
        levelChange: stats.levelChanges?.total || correspondenceData.filter(c => c.isLevelChange === true).length,
        generalCorrespondence: stats.generalCommunications?.total || correspondenceData.filter(c => c.isLevelChange === false).length
      },
      byGender: {
        // Use backend breakdown if available
        male: stats.totalCommunications?.breakdown ? 
          Object.values(stats.totalCommunications.breakdown).reduce((sum, level) => sum + (level.boys || 0), 0) :
          correspondenceData.filter(c => c.studentId?.gender?.toLowerCase() === 'male').length,
        female: stats.totalCommunications?.breakdown ? 
          Object.values(stats.totalCommunications.breakdown).reduce((sum, level) => sum + (level.girls || 0), 0) :
          correspondenceData.filter(c => c.studentId?.gender?.toLowerCase() === 'female').length
      },
      byMonth: {}
    };

    // Calculate monthly breakdown
    correspondenceData.forEach(item => {
      const month = new Date(item.timestamp).toISOString().slice(0, 7); // YYYY-MM format
      breakdown.byMonth[month] = (breakdown.byMonth[month] || 0) + 1;
    });

    return {
      raw: correspondenceData,
      stats: {
        // Use backend-calculated stats when available
        total: stats.totalCommunications?.total || correspondenceData.length,
        uniqueStudents: stats.uniqueStudents?.total || stats.uniqueStudentsContacted || 0,
        levelChanges: stats.levelChanges?.total || breakdown.byType.levelChange,
        generalCorrespondence: stats.generalCommunications?.total || breakdown.byType.generalCorrespondence,
        recent: correspondenceData.filter(c => {
          const weekAgo = new Date();
          weekAgo.setDate(weekAgo.getDate() - 7);
          return new Date(c.timestamp) >= weekAgo;
        }).length,
        activeStaff: [...new Set(correspondenceData.map(c => c.staffMember?.name))].filter(Boolean).length,
        
        // Include backend stats structure for detailed views
        backendStats: stats
      },
      dateRanges: processedRanges,
      breakdown,
      totalRecords: correspondenceData.length
    };
  }, [filterByDateRange, calculateCorrespondenceStats, calculateLevelBreakdown]);

  /**
   * Check if cache is valid
   */
  const isCacheValid = useCallback(() => {
    if (!cache.data || !cache.timestamp || !cache.isValid) return false;
    return Date.now() - cache.timestamp < CACHE_DURATION;
  }, [cache.data, cache.timestamp, cache.isValid, CACHE_DURATION]);

  /**
   * Get last updated time
   */
  const getLastUpdated = useCallback(() => {
    return cache.timestamp ? new Date(cache.timestamp) : null;
  }, [cache.timestamp]);

  /**
   * Fetch comprehensive correspondence data
   */
  const fetchComprehensiveData = useCallback(async (forceRefresh = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Check cache validity directly
    const cacheValid = cache.data && cache.timestamp && cache.isValid && 
                      (Date.now() - cache.timestamp < CACHE_DURATION);

    // Use cache if valid and not forcing refresh
    if (!forceRefresh && cacheValid) {
      console.log('Using cached correspondence data');
      return cache.data;
    }

    const loadingState = cache.data ? setIsRefreshing : setIsInitialLoading;
    loadingState(true);
    setError(null);

    let timeoutId;
    
    try {
      // Create new abort controller with timeout
      abortControllerRef.current = new AbortController();
      timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, REQUEST_TIMEOUT);
      
      // Fetch all correspondence data with statistics
      const response = await api.get('/correspondence', {
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      
      const correspondenceData = response.data?.data || [];
      const stats = response.data?.stats || {};

      // Process data for statistics
      const processedData = processCorrespondenceData(correspondenceData, stats);

      // Update cache
      setCache({
        data: processedData,
        timestamp: Date.now(),
        isValid: true
      });

      console.log('Correspondence data fetched and cached:', processedData);
      console.log('Cache updated with data structure:', { 
        hasStats: !!processedData.stats, 
        hasDateRanges: !!processedData.dateRanges,
        statsKeys: Object.keys(processedData.stats || {}),
        dateRangeKeys: Object.keys(processedData.dateRanges || {}),
        cacheIsValid: true,
        cacheTimestamp: Date.now()
      });
      console.log('Cache state after update will be:', {
        hasData: true,
        isValid: true,
        statsTotal: processedData.stats?.total
      });
      return processedData;

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Don't set error state for canceled requests
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Correspondence data request was canceled:', error.message);
        return cache.data; // Return cached data if available
      }
      
      if (error.name === 'AbortError') {
        const errorMsg = 'Correspondence data request timed out';
        console.log(errorMsg);
        setError(errorMsg);
        return cache.data;
      }

      console.error('Error fetching correspondence data:', error);
      setError(error.message || 'Failed to fetch correspondence data');
      
      // Return cached data if available, or a safe empty structure
      if (cache.data) {
        return cache.data;
      }
      
      // Return safe empty data structure
      return {
        raw: [],
        stats: {
          total: 0,
          uniqueStudents: 0,
          levelChanges: 0,
          generalCorrespondence: 0,
          recent: 0,
          activeStaff: 0
        },
        dateRanges: {
          today: { total: 0, uniqueStudents: 0 },
          week: { total: 0, uniqueStudents: 0 },
          month: { total: 0, uniqueStudents: 0 },
          year: { total: 0, uniqueStudents: 0 },
          all: { total: 0, uniqueStudents: 0 }
        },
        breakdown: {
          byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          byType: { levelChange: 0, generalCorrespondence: 0 },
          byGender: { male: 0, female: 0 },
          byMonth: {}
        },
        totalRecords: 0
      };
    } finally {
      setIsInitialLoading(false);
      setIsRefreshing(false);
      abortControllerRef.current = null;
    }
  }, [cache.data, cache.timestamp, cache.isValid, processCorrespondenceData, CACHE_DURATION]);

  // Store the fetch function in a ref for stable access
  fetchFunctionRef.current = fetchComprehensiveData;

  /**
   * Fetch custom date range data
   */
  const fetchCustomDateRange = useCallback(async (startDate, endDate) => {
    setIsCustomDateLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append('dateFilter', 'custom');
      params.append('startDate', startDate);
      params.append('endDate', endDate);

      const response = await api.get(`/correspondence?${params.toString()}`);
      const correspondenceData = response.data?.data || [];
      const stats = response.data?.stats || {};

      const processedData = processCorrespondenceData(correspondenceData, stats);
      
      console.log('Custom date range correspondence data:', processedData);
      return processedData;

    } catch (error) {
      // Don't set error state for canceled requests
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Custom date range correspondence request was canceled:', error.message);
        // Return safe empty data structure for canceled requests
        return {
          raw: [],
          stats: {
            total: 0,
            uniqueStudents: 0,
            levelChanges: 0,
            generalCorrespondence: 0,
            recent: 0,
            activeStaff: 0
          },
          dateRanges: {
            today: { total: 0, uniqueStudents: 0 },
            week: { total: 0, uniqueStudents: 0 },
            month: { total: 0, uniqueStudents: 0 },
            year: { total: 0, uniqueStudents: 0 }
          }
        };
      }
      
      console.error('Error fetching custom date range correspondence data:', error);
      setError(error.message || 'Failed to fetch custom date range data');
      
      // Return safe empty data structure instead of throwing
      return {
        raw: [],
        stats: {
          total: 0,
          uniqueStudents: 0,
          levelChanges: 0,
          generalCorrespondence: 0,
          recent: 0,
          activeStaff: 0
        },
        dateRanges: {
          today: { total: 0, uniqueStudents: 0 },
          week: { total: 0, uniqueStudents: 0 },
          month: { total: 0, uniqueStudents: 0 },
          year: { total: 0, uniqueStudents: 0 },
          all: { total: 0, uniqueStudents: 0 }
        },
        breakdown: {
          byLevel: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          byType: { levelChange: 0, generalCorrespondence: 0 },
          byGender: { male: 0, female: 0 },
          byMonth: {}
        },
        totalRecords: 0
      };
    } finally {
      setIsCustomDateLoading(false);
    }
  }, [processCorrespondenceData]);

  // Auto-fetch data on hook initialization (one-time only)
  useEffect(() => {
    const initializeData = async () => {
      // Only fetch if we don't have data and we're not already loading
      if (!cache.data && !isInitialLoading && !isRefreshing && fetchFunctionRef.current) {
        console.log('Auto-fetching correspondence data on hook initialization...');
        try {
          await fetchFunctionRef.current();
        } catch (error) {
          console.error('Auto-fetch failed:', error);
        }
      }
    };

    // Small delay to ensure the function ref is set
    const timeoutId = setTimeout(initializeData, 100);
    return () => clearTimeout(timeoutId);
  }, [cache.data, isInitialLoading, isRefreshing]); // Include dependencies but use cache.data check to prevent loops

  /**
   * Get filtered data based on current selections
   */
  const getFilteredData = useCallback((level, dateFilter, customData = null) => {
    const sourceData = customData || cache.data;
    console.log('getFilteredData called:', { level, dateFilter, hasCustomData: !!customData, hasSourceData: !!sourceData, cacheData: cache.data });
    
    if (!sourceData) {
      console.log('No source data available, returning null');
      return null;
    }

    if (dateFilter === 'custom' && customData) {
      return customData;
    }

    // Get the filtered data from dateRanges
    const rangeData = sourceData.dateRanges[dateFilter] || sourceData.dateRanges.all;
    
    // Convert the flat structure to the expected stats/breakdown structure
    if (rangeData) {
      return {
        stats: {
          total: rangeData.total || 0,
          uniqueStudents: rangeData.uniqueStudents || 0,
          levelChanges: rangeData.byType?.levelChange || 0,
          generalCorrespondence: rangeData.byType?.generalCorrespondence || 0,
          recent: sourceData.stats?.recent || 0, // Use overall recent count
          activeStaff: sourceData.stats?.activeStaff || 0 // Use overall staff count
        },
        breakdown: {
          byLevel: rangeData.byLevel || {},
          byType: rangeData.byType || {},
          byGender: sourceData.breakdown?.byGender || {}, // Use overall gender breakdown
          byMonth: sourceData.breakdown?.byMonth || {} // Use overall monthly breakdown
        }
      };
    }
    
    return null;
  }, [cache.data]);

  /**
   * Get level statistics
   */
  const getLevelStatistics = useCallback((dateFilter, customData = null) => {
    const sourceData = customData || cache.data;
    if (!sourceData) return {};

    // Get the appropriate data range
    let levelData = {};
    if (dateFilter === 'custom' && customData) {
      levelData = customData.breakdown?.byLevel || {};
    } else {
      const rangeData = sourceData.dateRanges[dateFilter] || sourceData.dateRanges.all;
      levelData = rangeData?.byLevel || {};
    }

    // Calculate total for 'all' levels
    const total = Object.values(levelData).reduce((sum, count) => sum + count, 0);
    
    // Return level stats with 'all' included
    return {
      all: total,
      1: levelData[1] || 0,
      2: levelData[2] || 0,
      3: levelData[3] || 0,
      4: levelData[4] || 0,
      5: levelData[5] || 0
    };
  }, [cache.data]);

  /**
   * Refresh data
   */
  const refreshData = useCallback(() => {
    return fetchComprehensiveData(true);
  }, [fetchComprehensiveData]);

  /**
   * Get last updated timestamp
   */
  const lastUpdated = getLastUpdated();

  return {
    // Data fetching
    fetchComprehensiveData,
    fetchCustomDateRange,
    refreshData,
    
    // Data access
    getFilteredData,
    getLevelStatistics,
    
    // Loading states
    isInitialLoading,
    isRefreshing,
    isCustomDateLoading,
    
    // Error state
    error,
    
    // Cache info
    lastUpdated,
    isCacheValid: isCacheValid()
  };
};

export default useCorrespondenceData;
