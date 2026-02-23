import React, { useState, useEffect } from 'react';
import { useAnalyticsAccess } from './AnalyticsAccessProvider';
import ZoneStatisticsCard from './ZoneStatisticsCard';
import StudentPerformanceMatrix from './StudentPerformanceMatrix';
import ExaminationStatsSection from '../coordinator/ExaminationStatsSection';
import api from '../../services/api';

const BaseAnalyticsView = ({ 
  dataLevel = 'college', // college, campus, grade, class, student
  initialFilters = {},
  allowedActions = ['view'],
  onDrillDown,
  children 
}) => {
  const { hasPermission, canAccessCampus, canAccessGrade, canAccessClass } = useAnalyticsAccess();
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    academicYear: '2024-2025',
    statisticType: 'overall',
    campus: '',
    floor: '',
    grade: '',
    classId: '',
    subjectName: '',
    ...initialFilters
  });

  // Keep local filters in sync with parent-provided filters (e.g., after drill-down)
  React.useEffect(() => {
    if (initialFilters) {
      setFilters(prev => ({ ...prev, ...initialFilters }));
    }
  }, [initialFilters]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [view, setView] = useState('overview'); // overview, students, matrix

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        let endpoint = '/analytics/overview';
        
        // Build endpoint based on data level
        switch (dataLevel) {
          case 'campus':
            if (filters.campus) {
              endpoint = `/analytics/campus/${filters.campus}`;
            }
            break;
          case 'floor':
            if (filters.campus && filters.floor) {
              endpoint = `/analytics/campus/${filters.campus}/grade/${filters.floor === '1st' ? '11th' : '12th'}`;
            }
            break;
          case 'grade':
            if (filters.campus && filters.grade) {
              endpoint = `/analytics/campus/${filters.campus}/grade/${filters.grade}`;
            }
            break;
          case 'class':
            if (filters.classId) {
              endpoint = `/analytics/class/${filters.classId}`;
            }
            break;
          case 'student':
            if (filters.studentId) {
              endpoint = `/analytics/student/${filters.studentId}`;
            }
            break;
          default:
            endpoint = '/analytics/overview';
        }

        // Build query parameters
        const queryParams = new URLSearchParams();
        Object.keys(filters).forEach(key => {
          if (filters[key] && key !== 'studentId' && key !== 'classId') {
            queryParams.append(key, filters[key]);
          }
        });

        if (queryParams.toString()) {
          endpoint += `?${queryParams.toString()}`;
        }

        const response = await api.get(endpoint);
        
        if (response.data.success) {
          setAnalyticsData(response.data.data);
        } else {
          setError(response.data.message);
        }
      } catch (err) {
        setError('Error fetching analytics data');
        console.error('Analytics fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dataLevel, filters]);

  const refreshData = () => {
    // Trigger a re-fetch by updating a dependency
    setFilters(prev => ({ ...prev }));
  };

  const updateFilters = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleDrillDown = (data, type) => {
    console.log('Drill down clicked:', { data, type });
    
    // Use external drill-down handler if provided
    if (onDrillDown) {
      onDrillDown(data, type);
      return;
    }
    
    // Fallback to internal logic
    if (!hasPermission('view')) return;

    switch (type) {
      case 'campus': {
        const campusName = data.campusName || data.campus;
        console.log('Campus drill down:', { campusName, canAccess: canAccessCampus(campusName) });
        if (canAccessCampus(campusName)) {
          updateFilters({ campus: campusName });
        }
        break;
      }
      case 'grade': {
        const gradeName = data.gradeName || data.grade;
        if (canAccessGrade(gradeName)) {
          updateFilters({ grade: gradeName });
        }
        break;
      }
      case 'class': {
        const classId = data.classId || data.id;
        if (canAccessClass(classId)) {
          updateFilters({ classId: classId });
        }
        break;
      }
    }
  };

  const renderOverview = () => {
    if (loading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <ZoneStatisticsCard key={i} isLoading={true} />
          ))}
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-12">
          <div className="text-red-400 text-6xl mb-4">⚠️</div>
          <p className="text-red-600 text-lg mb-4">{error}</p>
          <button 
            onClick={refreshData}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      );
    }

    if (!analyticsData) return null;

    // Render based on data level and structure
    switch (dataLevel) {
      case 'college':
        return (
          <div className="space-y-6">
            <ZoneStatisticsCard 
              data={analyticsData.collegeWideStats}
              title="College-Wide Performance"
              showPercentages={true}
            />
            
            {/* College-wide Examination Statistics */}
            <ExaminationStatsSection 
              title="College-Wide Examination Performance Overview"
              filters={filters}
            />
            
            {analyticsData.campusStats && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900">Campus-wise Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {analyticsData.campusStats.map(campus => (
                    <div key={campus.campusName || campus.campus} className="space-y-4">
                      <ZoneStatisticsCard
                        data={campus.campusZoneDistribution || campus.stats}
                        title={`${campus.campusName || campus.campus || 'Campus'} Campus`}
                        allowDrillDown={canAccessCampus(campus.campusName || campus.campus)}
                        onDrillDown={() => handleDrillDown(campus, 'campus')}
                      />
                      
                      {/* Campus-specific Examination Statistics */}
                      <ExaminationStatsSection 
                        campus={campus.campusName || campus.campus}
                        title={`${campus.campusName || campus.campus} Campus Examination Stats`}
                        filters={filters}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'campus':
        return (
          <div className="space-y-6">
            <ZoneStatisticsCard 
              data={analyticsData.campusZoneDistribution || analyticsData.stats}
              title={`${analyticsData.campusName || analyticsData.campus || 'Campus'} Overview`}
              showPercentages={true}
            />
            
            {/* Examination Performance Stats for Campus */}
            <ExaminationStatsSection 
              campus={analyticsData.campusName || analyticsData.campus || filters.campus}
              title={`${analyticsData.campusName || analyticsData.campus || 'Campus'} Examination Performance`}
              filters={filters}
            />
            
            {/* Floor distribution (11th/12th) reusing gradeStats */}
            {analyticsData.gradeStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {analyticsData.gradeStats.map(grade => {
                  const floorId = (grade.grade || grade.gradeName) === '11th' ? '1st' : '2nd';
                  return (
                    <ZoneStatisticsCard
                      key={grade.gradeName || grade.grade}
                      data={grade.gradeZoneDistribution || grade.stats}
                      title={`${floorId === '1st' ? '1st Floor (11th)' : '2nd Floor (12th)'} - ${analyticsData.campusName || analyticsData.campus || 'Campus'}`}
                      allowDrillDown={canAccessGrade(grade.gradeName || grade.grade)}
                      onDrillDown={() => handleDrillDown({ ...grade, floor: floorId }, 'grade')}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );

      case 'grade':
        return (
          <div className="space-y-6">
            <ZoneStatisticsCard 
              data={analyticsData.gradeZoneDistribution}
              title={`${analyticsData.gradeName || analyticsData.grade || 'Grade'} Overview`}
              showPercentages={true}
            />
            
            {/* Examination Performance Stats for Grade */}
            <ExaminationStatsSection 
              campus={analyticsData.campusName || filters.campus}
              grade={analyticsData.gradeName || analyticsData.grade || filters.grade}
              title={`${analyticsData.gradeName || analyticsData.grade || 'Grade'} Examination Performance`}
              filters={filters}
            />
            
            {analyticsData.classStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {analyticsData.classStats.map(classData => (
                  <ZoneStatisticsCard
                    key={classData.classId || classData.id}
                    data={classData.zoneDistribution || classData.stats}
                    title={classData.className || classData.name || 'Class'}
                    allowDrillDown={canAccessClass(classData.classId || classData.id)}
                    onDrillDown={() => handleDrillDown(classData, 'class')}
                  />
                ))}
                {/* Show a pseudo-class card for unassigned students so totals reconcile */}
                {(() => {
                  const unassigned = (analyticsData.gradeZoneDistribution?.unassigned) ?? (analyticsData.gradeStats?.unassigned) ?? 0;
                  if (unassigned > 0) {
                    const unassignedData = { green: 0, blue: 0, yellow: 0, red: 0, unassigned, total: unassigned };
                    return (
                      <ZoneStatisticsCard
                        key="unassigned"
                        data={unassignedData}
                        title="Unassigned Students"
                        allowDrillDown={false}
                      />
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        );

      case 'class':
        return (
          <div className="space-y-6">
            <ZoneStatisticsCard 
              data={analyticsData.zoneDistribution || analyticsData.stats}
              title={`${analyticsData.classInfo?.name || analyticsData.className || 'Class'} Performance`}
              showPercentages={true}
            />
            
            <div className="flex justify-center">
              <button
                onClick={() => setView('students')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                View Student List
              </button>
            </div>
          </div>
        );

      default:
        return <div>Invalid data level</div>;
    }
  };

  const renderStudentsList = () => {
    // This would be a separate component that fetches and displays student list
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold">Students List</h3>
          <button
            onClick={() => setView('overview')}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Overview
          </button>
        </div>
        <p className="text-gray-600">Student list component would be implemented here</p>
      </div>
    );
  };

  const renderStudentMatrix = () => {
    if (!selectedStudent) return null;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Student Performance Matrix</h2>
          <button
            onClick={() => {
              setSelectedStudent(null);
              setView('overview');
            }}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Back to Overview
          </button>
        </div>
        
        <StudentPerformanceMatrix 
          studentId={selectedStudent}
          showExportButton={hasPermission('export')}
          readOnly={!hasPermission('manage')}
        />
      </div>
    );
  };

  // Render filters
  const renderFilters = () => {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Academic Year
            </label>
            <select
              value={filters.academicYear}
              onChange={(e) => updateFilters({ academicYear: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="2024-2025">2024-2025</option>
              <option value="2023-2024">2023-2024</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Analysis Type
            </label>
            <select
              value={filters.statisticType}
              onChange={(e) => updateFilters({ statisticType: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="overall">Overall Performance</option>
              <option value="subject">Subject-wise</option>
            </select>
          </div>

          {filters.statisticType === 'subject' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject
              </label>
              <select
                value={filters.subjectName}
                onChange={(e) => updateFilters({ subjectName: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Subject</option>
                <option value="English">English</option>
                <option value="Math">Math</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="Computer">Computer</option>
                <option value="Urdu">Urdu</option>
                <option value="Pak Study">Pak Study</option>
              </select>
            </div>
          )}

          <div className="flex items-end">
            <button
              onClick={refreshData}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {allowedActions.includes('view') && renderFilters()}
      
      {view === 'overview' && renderOverview()}
      {view === 'students' && renderStudentsList()}
      {view === 'matrix' && renderStudentMatrix()}
      
      {children}
    </div>
  );
};

export default BaseAnalyticsView;
