import React, { useState, useEffect } from 'react';
import { useAnalyticsAccess } from './AnalyticsAccessProvider';
import api from '../../services/api';

const StudentPerformanceMatrix = ({ 
  studentId, 
  showExportButton = true, 
  readOnly = false,
  className = '',
  onExport
}) => {
  const { hasPermission, canAccessSubject } = useAnalyticsAccess();
  const [matrixData, setMatrixData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (studentId) {
      fetchMatrixData();
    }
  }, [studentId]);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/analytics/student/${studentId}/matrix`);
      
      if (response.data.success) {
        setMatrixData(response.data.data);
      } else {
        setError(response.data.message);
      }
    } catch (err) {
      setError('Error fetching performance matrix');
      console.error('Error fetching matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  const getZoneColor = (zone) => {
    const colors = {
      green: 'bg-green-100 text-green-800',
      blue: 'bg-blue-100 text-blue-800',
      yellow: 'bg-yellow-100 text-yellow-800',
      red: 'bg-red-100 text-red-800',
      unassigned: 'bg-gray-100 text-gray-800'
    };
    return colors[zone] || 'bg-gray-100 text-gray-800';
  };

  const getZoneEmoji = (zone) => {
    const emojis = {
      green: '🟢',
      blue: '🔵',
      yellow: '🟡',
      red: '🔴',
      unassigned: '⚪'
    };
    return emojis[zone] || '⚪';
  };

  const getTrendIcon = (trend) => {
    if (trend === 'N/A' || trend === null || trend === undefined) return '—';
    const numTrend = parseFloat(trend);
    if (numTrend > 0) return '⬆️';
    if (numTrend < 0) return '⬇️';
    return '➡️';
  };

  const handleExport = async (format = 'json') => {
    if (!hasPermission('export')) {
      alert('You do not have permission to export data');
      return;
    }

    try {
      const response = await api.post(`/analytics/export/student/${studentId}`, { format });

      if (format === 'csv') {
        const csvData = response.data;
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `student_${studentId}_performance_matrix.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        const result = await response.json();
        if (result.success) {
          if (onExport) {
            onExport(result.data, format);
          } else {
            // Default download behavior
            const blob = new Blob([JSON.stringify(result.data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `student_${studentId}_performance_matrix.json`;
            a.click();
            window.URL.revokeObjectURL(url);
          }
        }
      }
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export data');
    }
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-4 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-400 text-4xl mb-2">⚠️</div>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={fetchMatrixData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!matrixData) {
    return null;
  }

  const { studentInfo, performanceMatrix } = matrixData;
  const subjects = Object.keys(performanceMatrix.currentAverages.subjects);

  return (
    <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{studentInfo.name}</h3>
          <p className="text-gray-600">{studentInfo.class} • Roll: {studentInfo.rollNumber}</p>
        </div>
        
        {showExportButton && hasPermission('export') && (
          <div className="flex space-x-2">
            <button
              onClick={() => handleExport('csv')}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport('json')}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
            >
              Export JSON
            </button>
          </div>
        )}
      </div>

      {/* Performance Matrix Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                Test/Subject
              </th>
              {subjects.filter(subject => canAccessSubject(subject)).map(subject => (
                <th key={subject} className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">
                  {subject}
                </th>
              ))}
              <th className="border border-gray-300 px-4 py-3 text-center font-semibold text-gray-900">
                Overall
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Matriculation Row */}
            {performanceMatrix.matriculationBaseline.overall > 0 && (
              <tr className="bg-blue-50">
                <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">
                  Matriculation
                </td>
                {subjects.filter(subject => canAccessSubject(subject)).map(subject => {
                  const marks = performanceMatrix.matriculationBaseline.subjects[subject];
                  return (
                    <td key={subject} className="border border-gray-300 px-4 py-3 text-center">
                      {marks ? `${marks}%` : '—'}
                    </td>
                  );
                })}
                <td className="border border-gray-300 px-4 py-3 text-center font-semibold">
                  {performanceMatrix.matriculationBaseline.overall}%
                </td>
              </tr>
            )}

            {/* Test Results Rows */}
            {performanceMatrix.classTestResults.map((test, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">
                  {test.testName}
                </td>
                {subjects.filter(subject => canAccessSubject(subject)).map(subject => {
                  const subjectData = test.subjects[subject];
                  if (!subjectData) {
                    return (
                      <td key={subject} className="border border-gray-300 px-4 py-3 text-center text-gray-400">
                        —
                      </td>
                    );
                  }
                  return (
                    <td key={subject} className="border border-gray-300 px-4 py-3 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-medium">{subjectData.percentage}%</span>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getZoneColor(subjectData.zone)}`}>
                          {getZoneEmoji(subjectData.zone)}
                        </span>
                      </div>
                    </td>
                  );
                })}
                <td className="border border-gray-300 px-4 py-3 text-center">
                  <div className="flex flex-col items-center">
                    <span className="font-semibold">{Math.round(test.overall)}%</span>
                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getZoneColor(test.overallZone)}`}>
                      {getZoneEmoji(test.overallZone)}
                    </span>
                  </div>
                </td>
              </tr>
            ))}

            {/* Current Average Row */}
            <tr className="bg-yellow-50 font-semibold">
              <td className="border border-gray-300 px-4 py-3 text-gray-900">
                Current Average
              </td>
              {subjects.filter(subject => canAccessSubject(subject)).map(subject => {
                const subjectData = performanceMatrix.currentAverages.subjects[subject];
                if (!subjectData) {
                  return (
                    <td key={subject} className="border border-gray-300 px-4 py-3 text-center text-gray-400">
                      —
                    </td>
                  );
                }
                return (
                  <td key={subject} className="border border-gray-300 px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span>{subjectData.percentage}%</span>
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getZoneColor(subjectData.zone)}`}>
                        {getZoneEmoji(subjectData.zone)}
                      </span>
                    </div>
                  </td>
                );
              })}
              <td className="border border-gray-300 px-4 py-3 text-center">
                <div className="flex flex-col items-center">
                  <span>{performanceMatrix.currentAverages.overall}%</span>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getZoneColor(performanceMatrix.zones.overall)}`}>
                    {getZoneEmoji(performanceMatrix.zones.overall)}
                  </span>
                </div>
              </td>
            </tr>

            {/* Trend Analysis Row */}
            <tr className="bg-gray-100">
              <td className="border border-gray-300 px-4 py-3 font-semibold text-gray-900">
                Trend vs Matric
              </td>
              {subjects.filter(subject => canAccessSubject(subject)).map(subject => {
                const trend = performanceMatrix.trendAnalysis.subjects[subject];
                return (
                  <td key={subject} className="border border-gray-300 px-4 py-3 text-center">
                    <div className="flex flex-col items-center">
                      <span className={trend !== 'N/A' && parseFloat(trend) < 0 ? 'text-red-600' : 'text-gray-900'}>
                        {trend !== 'N/A' ? `${trend}%` : 'N/A'}
                      </span>
                      <span className="text-lg">{getTrendIcon(trend)}</span>
                    </div>
                  </td>
                );
              })}
              <td className="border border-gray-300 px-4 py-3 text-center">
                <div className="flex flex-col items-center">
                  <span className={performanceMatrix.trendAnalysis.overall < 0 ? 'text-red-600 font-semibold' : 'text-gray-900 font-semibold'}>
                    {performanceMatrix.trendAnalysis.overall}%
                  </span>
                  <span className="text-lg">{getTrendIcon(performanceMatrix.trendAnalysis.overall)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">🟢</span>
          <span className="text-sm text-gray-600">Green: 76-84%</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🔵</span>
          <span className="text-sm text-gray-600">Blue: 71-75%</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🟡</span>
          <span className="text-sm text-gray-600">Yellow: 66-70%</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-lg">🔴</span>
          <span className="text-sm text-gray-600">Red: Below 66%</span>
        </div>
      </div>
    </div>
  );
};

export default StudentPerformanceMatrix;
