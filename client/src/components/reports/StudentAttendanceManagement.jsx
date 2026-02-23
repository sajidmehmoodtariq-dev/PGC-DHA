import React, { useState, useEffect, useCallback } from 'react';
import { usePermissions } from '../../hooks/usePermissions';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';

// Import sub-components
import AttendanceOverview from './attendance/AttendanceOverview';
import AttendanceDetails from './attendance/AttendanceDetails';
import LoadingSpinner from '../ui/LoadingSpinner';

/**
 * Main Student Attendance Management Component
 * Shows different views based on user role:
 * - Principal: Overview with stats, campus tabs, floor/program breakdowns
 * - IT/Institute Admin: Student records with filters, no stats
 */
const StudentAttendanceManagement = () => {
  const { userRole, canViewAttendanceReports } = usePermissions();
  const { addToast } = useToast();
  
  // State management
  const [loading, setLoading] = useState(true);
  const [filterLoading, setFilterLoading] = useState(false);
  const [attendanceData, setAttendanceData] = useState(null);
  const [classesData, setClassesData] = useState([]);
  const [selectedCampus, setSelectedCampus] = useState('all'); // all, boys, girls
  const [selectedFloor, setSelectedFloor] = useState('all'); // all, 1st, 2nd
  const [selectedProgram, setSelectedProgram] = useState('all'); // all, pre-medical, pre-engineering, etc.
  const [selectedClass, setSelectedClass] = useState('all');
  const [dateRange, setDateRange] = useState({
    startDate: '', // Empty - let backend default to all time
    endDate: ''    // Empty - let backend default to all time  
  });
  const [error, setError] = useState(null);

  // Check if user is principal (gets overview) or IT/admin (gets details)
  const isPrincipal = userRole === 'Principal';
  const isAuthorized = canViewAttendanceReports();

  // Fetch attendance data
  const fetchAttendanceData = useCallback(async (isFilterChange = false) => {
    if (!isAuthorized) return;
    
    try {
      if (isFilterChange) {
        setFilterLoading(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const params = new URLSearchParams();
      
      // Only add date parameters if they're set
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      // Add other filters
      if (selectedCampus !== 'all') {
        params.append('campus', selectedCampus);
      }
      if (selectedFloor !== 'all') {
        params.append('floor', selectedFloor);
      }
      if (selectedProgram !== 'all') {
        params.append('program', selectedProgram);
      }
      if (selectedClass !== 'all') {
        params.append('classId', selectedClass);
      }

      // Different endpoints for different roles
      const endpoint = isPrincipal 
        ? `/attendance/overview?${params}`
        : `/attendance/detailed?${params}`;
      
      const response = await api.get(endpoint);
      
      if (response.data && response.data.success) {
        setAttendanceData(response.data.data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      setError(error.message || 'Failed to load attendance data');
      if (addToast) {
        addToast({ 
          type: 'error', 
          message: `Failed to load attendance data: ${error.message || 'Unknown error'}` 
        });
      }
    } finally {
      setLoading(false);
      setFilterLoading(false);
    }
  }, [dateRange, selectedCampus, selectedFloor, selectedProgram, selectedClass, isPrincipal, isAuthorized, addToast]);

  // Fetch classes data for filters
  const fetchClassesData = useCallback(async () => {
    try {
      const response = await api.get('/classes');
      if (response.data && response.data.success) {
        const classes = response.data.data || response.data.classes || [];
        setClassesData(classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    if (isAuthorized) {
      fetchClassesData();
      fetchAttendanceData();
    }
  }, [isAuthorized, fetchClassesData, fetchAttendanceData]);

  // Handle filter changes
  const handleFilterChange = useCallback((filterType, value) => {
    switch (filterType) {
      case 'campus':
        setSelectedCampus(value);
        // Reset dependent filters
        setSelectedFloor('all');
        setSelectedProgram('all');
        setSelectedClass('all');
        break;
      case 'floor':
        setSelectedFloor(value);
        // Reset dependent filters
        setSelectedProgram('all');
        setSelectedClass('all');
        break;
      case 'program':
        setSelectedProgram(value);
        setSelectedClass('all');
        break;
      case 'class':
        setSelectedClass(value);
        break;
      case 'dateRange':
        setDateRange(value);
        break;
      default:
        break;
    }
    
    // Trigger data fetch after filter change with filter loading state
    fetchAttendanceData(true);
  }, [fetchAttendanceData]);

  // Refresh data
  const refreshData = useCallback(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">🚫</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">You don't have permission to view attendance reports.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="Loading attendance data..." />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={refreshData}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter Loading Indicator */}
      {filterLoading && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-blue-700 text-sm">Applying filters...</span>
        </div>
      )}
      
      {isPrincipal ? (
        <AttendanceOverview
          attendanceData={attendanceData}
          classesData={classesData}
          selectedCampus={selectedCampus}
          selectedFloor={selectedFloor}
          selectedProgram={selectedProgram}
          selectedClass={selectedClass}
          dateRange={dateRange}
          onFilterChange={handleFilterChange}
          onRefresh={refreshData}
          loading={loading || filterLoading}
        />
      ) : (
        <AttendanceDetails
          attendanceData={attendanceData}
          classesData={classesData}
          selectedCampus={selectedCampus}
          selectedFloor={selectedFloor}
          selectedProgram={selectedProgram}
          selectedClass={selectedClass}
          dateRange={dateRange}
          onFilterChange={handleFilterChange}
          onRefresh={refreshData}
          loading={loading || filterLoading}
        />
      )}
    </div>
  );
};

export default StudentAttendanceManagement;
