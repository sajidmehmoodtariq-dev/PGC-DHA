import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';

/**
 * Simple hook for managing enquiry data with client-side filtering and caching
 * ONE STRATEGY: Optimized endpoint with timeout → success/error → refresh button
 */
const useEnquiryData = () => {
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
  const REQUEST_TIMEOUT = 10000; // 10 seconds
  
  // Abort controller
  const abortControllerRef = useRef(null);

  // Cleanup function to abort ongoing requests
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

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
   * Fetch comprehensive data using the same APIs as AdvancedStatsTable for consistency
   */
  const fetchComprehensiveData = useCallback(async (forceRefresh = false, silent = false) => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Return cached data if valid and not forcing refresh
    if (!forceRefresh && isCacheValid()) {
      return cache.data;
    }

    // Create abort controller with timeout
    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, REQUEST_TIMEOUT);

    try {
      // Set loading state only if not silent
      if (!silent) {
        if (forceRefresh) {
          setIsRefreshing(true);
        } else {
          setIsInitialLoading(true);
        }
        setError(null);
      }

      console.log('Fetching comprehensive enquiry data...', silent ? '(silent)' : '');
      
      // Use the comprehensive-data endpoint that includes today's level achievements
      const response = await api.get('/enquiries/comprehensive-data', {
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      
      if (response.data.success) {
        const comprehensiveData = response.data.data;
        console.log('Comprehensive data fetched successfully:', comprehensiveData);
        
        // Extract monthly data for backward compatibility
        const monthlyData = comprehensiveData.monthlyBreakdown || [];
        console.log('Monthly data from comprehensive response:', monthlyData);

        // Use all-time data from comprehensive response
        const allTimeData = comprehensiveData.allTime || {};
        const levelTotals = {
          level1: allTimeData.level1 || 0,
          level2: allTimeData.level2 || 0,
          level3: allTimeData.level3 || 0,
          level4: allTimeData.level4 || 0,
          level5: allTimeData.level5 || 0
        };
        
        console.log('Level totals from comprehensive data:', levelTotals);

        // Extract date ranges (includes today's data!)
        const dateRanges = comprehensiveData.dateRanges || {};
        console.log('Date ranges from comprehensive data:', dateRanges);
        
        // Today's data is now available!
        if (dateRanges.today) {
          console.log('Today\'s level achievements found:', dateRanges.today);
        }
        
        // Return the comprehensive data structure directly
        const processedData = {
          allTime: comprehensiveData.allTime || {},
          dateRanges: comprehensiveData.dateRanges || {},
          monthlyBreakdown: comprehensiveData.monthlyBreakdown || monthlyData
        };

        console.log('Processed data structure:', processedData);
        console.log('Level totals calculated:', levelTotals);

        // Update cache
        setCache({
          data: processedData,
          timestamp: Date.now(),
          isValid: true
        });

        return processedData;
      } else {
        throw new Error('Failed to fetch monthly breakdown data');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Don't set error state for canceled requests
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Request was canceled:', error.message);
        return cache.data; // Return cached data if available
      }
      
      if (error.name === 'AbortError') {
        const errorMsg = 'Request timed out after 10 seconds';
        console.log(errorMsg);
        if (!silent) setError(errorMsg);
      } else {
        console.error('Error fetching data:', error);
        if (!silent) setError(error.response?.data?.message || error.message || 'Failed to load data');
      }
      
      // Return cached data if available, even if stale
      if (cache.data) {
        console.log('Returning stale cached data due to error');
        return cache.data;
      }
      
      throw error;
    } finally {
      if (!silent) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
      abortControllerRef.current = null;
    }
  }, [cache.data, isCacheValid]);

  /**
   * Fetch custom date range data using the same monthly-breakdown API as AdvancedStatsTable
   */
  const fetchCustomDateRange = useCallback(async (startDate, endDate, selectedLevel = '1') => {
    // Cancel any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const timeoutId = setTimeout(() => {
      abortControllerRef.current?.abort();
    }, REQUEST_TIMEOUT);

    try {
      setIsCustomDateLoading(true);
      setError(null);

      console.log('Fetching monthly breakdown for custom date range:', startDate, 'to', endDate, 'level:', selectedLevel);
      
      const currentYear = new Date().getFullYear();
      
      // Use the same monthly-breakdown API as AdvancedStatsTable
      const response = await api.get(`/enquiries/monthly-breakdown/${currentYear}`, {
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      
      if (response.data.success) {
        const monthlyData = response.data.data.months || [];
        console.log('Monthly data received for custom filtering:', monthlyData);
        
        // For custom date range, we'll use a subset of the monthly data
        // Since we're getting yearly data anyway, we'll apply a percentage based on the date range
        const start = new Date(startDate);
        const end = new Date(endDate);
        const rangeDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        const yearDays = 365; // Approximate
        const rangePercentage = Math.min(rangeDays / yearDays, 1);
        
        console.log(`Custom date range: ${rangeDays} days out of ${yearDays} (${(rangePercentage * 100).toFixed(1)}%)`);
        
        // Calculate totals from monthly data (same as AdvancedStatsTable)
        const levelTotals = { level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 };
        
        monthlyData.forEach(monthData => {
          levelTotals.level1 += monthData.level1 || 0;
          levelTotals.level2 += monthData.level2 || 0;
          levelTotals.level3 += monthData.level3 || 0;
          levelTotals.level4 += monthData.level4 || 0;
          levelTotals.level5 += monthData.level5 || 0;
        });
        
        // Apply range percentage to get estimated data for custom range
        const customLevel1 = Math.floor(levelTotals.level1 * rangePercentage);
        const customLevel2 = Math.floor(levelTotals.level2 * rangePercentage);
        const customLevel3 = Math.floor(levelTotals.level3 * rangePercentage);
        const customLevel4 = Math.floor(levelTotals.level4 * rangePercentage);
        const customLevel5 = Math.floor(levelTotals.level5 * rangePercentage);
        
        console.log('Calculated custom range totals:', {
          level1: customLevel1,
          level2: customLevel2,
          level3: customLevel3,
          level4: customLevel4,
          level5: customLevel5
        });
        
        // For custom date ranges, fetch actual gender data from the API
        console.log('Fetching actual gender data for custom date range...');
        
        let realGenderData;
        try {
          const genderResponse = await api.get('/enquiries/principal-stats', {
            params: {
              dateFilter: 'custom',
              startDate: startDate,
              endDate: endDate,
              minLevel: 'all'
            }
          });
          
          if (genderResponse.data.success) {
            realGenderData = genderResponse.data;
            console.log('Real gender data fetched:', realGenderData);
          }
        } catch (genderError) {
          console.warn('Failed to fetch real gender data, falling back to estimations:', genderError.message);
        }
        
        // Apply level filtering if specified
        const levelInt = parseInt(selectedLevel);
        let filteredData;
        
        if (levelInt >= 1 && levelInt <= 5) {
          const levelTotalsArray = [customLevel1, customLevel2, customLevel3, customLevel4, customLevel5];
          const levelTotal = levelTotalsArray[levelInt - 1];
          
          // Use real gender data if available, otherwise estimate
          let boysCount, girlsCount;
          if (realGenderData && realGenderData.genderLevelProgression) {
            // Use actual boys/girls data from API for the specific level
            boysCount = realGenderData.genderLevelProgression.boys[levelInt]?.current || Math.floor(levelTotal * 0.6);
            girlsCount = realGenderData.genderLevelProgression.girls[levelInt]?.current || Math.floor(levelTotal * 0.4);
          } else {
            // Calculate proportional distribution based on overall gender breakdown if available
            if (realGenderData && (realGenderData.boys + realGenderData.girls) > 0) {
              const totalGenderCount = realGenderData.boys + realGenderData.girls;
              const boysRatio = realGenderData.boys / totalGenderCount;
              const girlsRatio = realGenderData.girls / totalGenderCount;
              boysCount = Math.floor(levelTotal * boysRatio);
              girlsCount = Math.floor(levelTotal * girlsRatio);
            } else {
              // Fallback to default distribution
              boysCount = Math.floor(levelTotal * 0.6);
              girlsCount = Math.floor(levelTotal * 0.4);
            }
          }
          
          filteredData = {
            total: levelTotal,
            boys: boysCount,
            girls: girlsCount,
            programs: { boys: {}, girls: {} },
            levelProgression: {
              1: { current: customLevel1, previous: customLevel1, change: 0 },
              2: { current: customLevel2, previous: customLevel2, change: 0 },
              3: { current: customLevel3, previous: customLevel3, change: 0 },
              4: { current: customLevel4, previous: customLevel4, change: 0 },
              5: { current: customLevel5, previous: customLevel5, change: 0 }
            },
            genderLevelProgression: {
              boys: {
                1: { current: Math.floor(customLevel1 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel1 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                2: { current: Math.floor(customLevel2 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel2 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                3: { current: Math.floor(customLevel3 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel3 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                4: { current: Math.floor(customLevel4 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel4 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                5: { current: Math.floor(customLevel5 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel5 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 }
              },
              girls: {
                1: { current: Math.floor(customLevel1 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel1 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                2: { current: Math.floor(customLevel2 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel2 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                3: { current: Math.floor(customLevel3 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel3 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                4: { current: Math.floor(customLevel4 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel4 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                5: { current: Math.floor(customLevel5 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel5 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 }
              }
            }
          };
        } else {
          // Return aggregated data for all levels
          const grandTotal = customLevel1 + customLevel2 + customLevel3 + customLevel4 + customLevel5;
          
          // Use real gender data if available
          let boysTotal, girlsTotal;
          if (realGenderData) {
            boysTotal = realGenderData.boys || Math.floor(grandTotal * 0.6);
            girlsTotal = realGenderData.girls || Math.floor(grandTotal * 0.4);
          } else {
            boysTotal = Math.floor(grandTotal * 0.6);
            girlsTotal = Math.floor(grandTotal * 0.4);
          }
          
          filteredData = {
            total: grandTotal,
            boys: boysTotal,
            girls: girlsTotal,
            programs: { boys: {}, girls: {} },
            levelProgression: {
              1: { current: customLevel1, previous: customLevel1, change: 0 },
              2: { current: customLevel2, previous: customLevel2, change: 0 },
              3: { current: customLevel3, previous: customLevel3, change: 0 },
              4: { current: customLevel4, previous: customLevel4, change: 0 },
              5: { current: customLevel5, previous: customLevel5, change: 0 }
            },
            genderLevelProgression: {
              boys: {
                1: { current: Math.floor(customLevel1 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel1 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                2: { current: Math.floor(customLevel2 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel2 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                3: { current: Math.floor(customLevel3 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel3 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                4: { current: Math.floor(customLevel4 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel4 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 },
                5: { current: Math.floor(customLevel5 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), previous: Math.floor(customLevel5 * (realGenderData?.boys / (realGenderData?.boys + realGenderData?.girls) || 0.6)), change: 0 }
              },
              girls: {
                1: { current: Math.floor(customLevel1 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel1 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                2: { current: Math.floor(customLevel2 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel2 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                3: { current: Math.floor(customLevel3 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel3 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                4: { current: Math.floor(customLevel4 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel4 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 },
                5: { current: Math.floor(customLevel5 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), previous: Math.floor(customLevel5 * (realGenderData?.girls / (realGenderData?.boys + realGenderData?.girls) || 0.4)), change: 0 }
              }
            }
          };
        }
        
        console.log('Final filtered data for custom range:', filteredData);
        return { data: filteredData };
      } else {
        throw new Error('Failed to fetch monthly breakdown data');
      }

    } catch (error) {
      clearTimeout(timeoutId);
      
      // Don't set error state for canceled requests
      if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
        console.log('Custom date request was canceled:', error.message);
        throw error; // Re-throw to let caller handle
      }
      
      if (error.name === 'AbortError') {
        const errorMsg = 'Custom date request timed out';
        console.log(errorMsg);
        setError(errorMsg);
      } else {
        console.error('Error fetching custom date range:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load custom date range');
      }
      throw error;
    } finally {
      setIsCustomDateLoading(false);
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Manual refresh - clears cache and fetches fresh data
   */
  const refreshData = useCallback(async () => {
    console.log('Manual refresh triggered');
    // Clear cache
    setCache({
      data: null,
      timestamp: null,
      isValid: false
    });
    setError(null);
    
    // Fetch fresh data
    return await fetchComprehensiveData(true);
  }, [fetchComprehensiveData]);

  /**
   * Get filtered data using comprehensive data that we already have
   */
  const getFilteredData = useCallback(async (selectedLevel, selectedDate, customData = null) => {
    // If custom data is provided, use it instead of API calls
    if (customData) {
      return {
        total: customData.total || 0,
        boys: customData.boys || 0,
        girls: customData.girls || 0,
        programs: customData.programs || { boys: {}, girls: {} },
        levelProgression: customData.levelProgression || null,
        genderLevelProgression: customData.genderLevelProgression || null
      };
    }

    const level = parseInt(selectedLevel);
    console.log('getFilteredData - Using comprehensive data approach');
    console.log('getFilteredData - Date filter:', selectedDate, 'Level:', level);

    // Check if we have cached comprehensive data
    if (!cache.data || !cache.data.dateRanges) {
      console.log('getFilteredData - No cached comprehensive data, fetching...');
      await fetchComprehensiveData();
    }

    // Use the comprehensive data that contains pre-calculated date ranges
    const comprehensiveData = cache.data;
    
    if (!comprehensiveData || !comprehensiveData.dateRanges) {
      console.error('getFilteredData - No comprehensive data available');
      return {
        total: 0,
        boys: 0,
        girls: 0,
        programs: { boys: {}, girls: {} },
        levelProgression: null,
        genderLevelProgression: null
      };
    }

    console.log('getFilteredData - Available date ranges:', Object.keys(comprehensiveData.dateRanges));

    // Get data for the selected date filter from comprehensive data
    let dateRangeData = null;
    
    if (selectedDate === 'today') {
      dateRangeData = comprehensiveData.dateRanges.today;
    } else if (selectedDate === 'week') {
      dateRangeData = comprehensiveData.dateRanges.week;
    } else if (selectedDate === 'month') {
      dateRangeData = comprehensiveData.dateRanges.month;
    } else if (selectedDate === 'year') {
      dateRangeData = comprehensiveData.dateRanges.year;
    } else if (selectedDate === 'all') {
      // For "all time", use the allTime data
      dateRangeData = {
        levelData: comprehensiveData.allTime?.levelData || {},
        genderLevelProgression: comprehensiveData.allTime?.genderLevelProgression || null
      };
    }

    if (!dateRangeData) {
      console.error('getFilteredData - No data found for date filter:', selectedDate);
      return {
        total: 0,
        boys: 0,
        girls: 0,
        programs: { boys: {}, girls: {} },
        levelProgression: null,
        genderLevelProgression: null
      };
    }

    console.log('getFilteredData - Date range data found:', dateRangeData);

    // Extract level data
    let levelCount = 0;
    let boysCount = 0;
    let girlsCount = 0;
    let programsData = { boys: {}, girls: {} };

    if (dateRangeData.levelData && dateRangeData.levelData[level]) {
      levelCount = dateRangeData.levelData[level].total || 0;
      boysCount = dateRangeData.levelData[level].boys || 0;
      girlsCount = dateRangeData.levelData[level].girls || 0;
      
      // Extract program data
      if (dateRangeData.levelData[level].programs) {
        programsData = {
          boys: dateRangeData.levelData[level].programs.boys || {},
          girls: dateRangeData.levelData[level].programs.girls || {}
        };
      }
    }

    console.log('getFilteredData - Level', level, 'data extracted:', {
      total: levelCount,
      boys: boysCount,
      girls: girlsCount,
      programs: programsData
    });

    // Create progression data
    const progressionData = {
      1: { current: 0, previous: 0, change: 0 },
      2: { current: 0, previous: 0, change: 0 },
      3: { current: 0, previous: 0, change: 0 },
      4: { current: 0, previous: 0, change: 0 },
      5: { current: 0, previous: 0, change: 0 }
    };
    progressionData[level] = { current: levelCount, previous: levelCount, change: 0 };

    const genderProgressionData = {
      boys: {
        1: { current: 0, previous: 0, change: 0 },
        2: { current: 0, previous: 0, change: 0 },
        3: { current: 0, previous: 0, change: 0 },
        4: { current: 0, previous: 0, change: 0 },
        5: { current: 0, previous: 0, change: 0 }
      },
      girls: {
        1: { current: 0, previous: 0, change: 0 },
        2: { current: 0, previous: 0, change: 0 },
        3: { current: 0, previous: 0, change: 0 },
        4: { current: 0, previous: 0, change: 0 },
        5: { current: 0, previous: 0, change: 0 }
      }
    };
    genderProgressionData.boys[level] = { current: boysCount, previous: boysCount, change: 0 };
    genderProgressionData.girls[level] = { current: girlsCount, previous: girlsCount, change: 0 };

    const result = {
      total: levelCount,
      boys: boysCount,
      girls: girlsCount,
      programs: programsData,
      levelProgression: progressionData,
      genderLevelProgression: genderProgressionData
    };
    
    console.log('getFilteredData - Final result:', result);
    return result;
  }, [cache.data, fetchComprehensiveData]);

  /**
   * Get level statistics using comprehensive data (for tab counts)
   */
  const getLevelStatistics = useCallback(async (selectedDate, customData = null) => {
    // If custom data is provided, extract level stats from levelProgression
    if (customData && customData.levelProgression) {
      const stats = {};
      for (let level = 1; level <= 5; level++) {
        stats[level] = customData.levelProgression[level]?.current || 0;
      }
      console.log('getLevelStatistics - Using custom data:', stats);
      return stats;
    }

    console.log('getLevelStatistics - Using comprehensive data for date filter:', selectedDate);

    // Check if we have cached comprehensive data
    if (!cache.data || !cache.data.dateRanges) {
      console.log('getLevelStatistics - No cached comprehensive data, fetching...');
      await fetchComprehensiveData();
    }

    // Use the comprehensive data that contains pre-calculated date ranges
    const comprehensiveData = cache.data;
    
    if (!comprehensiveData || !comprehensiveData.dateRanges) {
      console.error('getLevelStatistics - No comprehensive data available');
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }

    console.log('getLevelStatistics - Available date ranges:', Object.keys(comprehensiveData.dateRanges));
    console.log('getLevelStatistics - AllTime data structure:', comprehensiveData.allTime);

    // Get data for the selected date filter from comprehensive data
    let dateRangeData = null;
    
    if (selectedDate === 'today') {
      dateRangeData = comprehensiveData.dateRanges.today;
    } else if (selectedDate === 'week') {
      dateRangeData = comprehensiveData.dateRanges.week;
    } else if (selectedDate === 'month') {
      dateRangeData = comprehensiveData.dateRanges.month;
    } else if (selectedDate === 'year') {
      dateRangeData = comprehensiveData.dateRanges.year;
    } else if (selectedDate === 'all') {
      // For "all time", use the allTime data
      dateRangeData = {
        levelData: comprehensiveData.allTime?.levelData || {}
      };
    }

    if (!dateRangeData || !dateRangeData.levelData) {
      console.error('getLevelStatistics - No level data found for date filter:', selectedDate);
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }

    console.log('getLevelStatistics - Level data found:', dateRangeData.levelData);

    try {
      let stats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

      // Extract level statistics from the levelData
      for (let level = 1; level <= 5; level++) {
        if (dateRangeData.levelData[level]) {
          stats[level] = dateRangeData.levelData[level].total || 0;
        }
      }
      
      console.log('getLevelStatistics - Stats calculated from comprehensive data:', stats);
      return stats;

    } catch (error) {
      console.error('Error in getLevelStatistics:', error);
      return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    }
  }, [cache.data, fetchComprehensiveData]);

  return {
    // Data methods
    fetchComprehensiveData,
    fetchCustomDateRange,
    refreshData,
    getFilteredData,
    getLevelStatistics,
    
    // State
    isInitialLoading,
    isRefreshing,
    isCustomDateLoading,
    error,
    lastUpdated: getLastUpdated(),
    isCacheValid: isCacheValid(),
    
    // Utility
    clearError: () => setError(null)
  };
};

export default useEnquiryData;
