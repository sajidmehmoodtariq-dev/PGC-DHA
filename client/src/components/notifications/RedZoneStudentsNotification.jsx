import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Eye, 
  Check, 
  X, 
  RefreshCw,
  TrendingDown,
  GraduationCap
} from 'lucide-react';
import api from '../../services/api';

const RedZoneStudentsNotification = ({ compact = false }) => {
  const navigate = useNavigate();
  const [redZoneData, setRedZoneData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch red zone students data
  const fetchRedZoneStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/notifications/red-zone-students');
      if (response.data.success) {
        setRedZoneData(response.data.data);
      } else {
        throw new Error(response.data.message || 'Failed to fetch data');
      }
    } catch (error) {
      console.error('Error fetching red zone students:', error);
      setError('Failed to load red zone students');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRedZoneStudents();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRedZoneStudents, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleTakeAction = () => {
    // Navigate to student examination report with red zone filter
    navigate('/principal/student-examination-report?filter=red-zone');
  };

  const handleDismiss = async () => {
    try {
      await api.post('/notifications/red-zone-students-notification/action', {
        action: 'dismiss',
        notes: 'Dismissed from notification panel'
      });
      // Optionally refresh the data or hide the notification
      fetchRedZoneStudents();
    } catch (error) {
      console.error('Error dismissing notification:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border-l-4 border-yellow-500 p-4 shadow-sm rounded-lg">
        <div className="flex items-center">
          <RefreshCw className="h-5 w-5 text-yellow-600 animate-spin mr-3" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">Loading...</h3>
            <p className="text-sm text-gray-600">Fetching red zone student data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border-l-4 border-red-500 p-4 shadow-sm rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-gray-900">Error</h3>
              <p className="text-sm text-gray-600">{error}</p>
            </div>
          </div>
          <button
            onClick={fetchRedZoneStudents}
            className="text-red-600 hover:text-red-800 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (!redZoneData || redZoneData.totalCount === 0) {
    return (
      <div className="bg-white border-l-4 border-green-500 p-4 shadow-sm rounded-lg">
        <div className="flex items-center">
          <Check className="h-5 w-5 text-green-600 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-gray-900">All Clear</h3>
            <p className="text-sm text-gray-600">No students currently in red zone</p>
          </div>
        </div>
      </div>
    );
  }

  const getSeverityColor = (count) => {
    if (count >= 50) return 'border-red-600 bg-red-50';
    if (count >= 20) return 'border-red-500 bg-red-50';
    if (count >= 10) return 'border-orange-500 bg-orange-50';
    return 'border-yellow-500 bg-yellow-50';
  };

  const getSeverityIcon = (count) => {
    if (count >= 20) return <AlertTriangle className="h-5 w-5 text-red-600" />;
    return <TrendingDown className="h-5 w-5 text-orange-600" />;
  };

  return (
    <div className={`bg-white border-l-4 ${getSeverityColor(redZoneData.totalCount)} p-4 shadow-sm rounded-lg`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          {getSeverityIcon(redZoneData.totalCount)}
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                Red Zone Students Alert
              </h3>
              <button
                onClick={fetchRedZoneStudents}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
            
            <p className="text-sm text-gray-600 mt-1">
              {redZoneData.totalCount} students requiring immediate attention
            </p>

            {/* Class-wise Statistics */}
            <div className="mt-3 space-y-2">
              {redZoneData.classGroups && redZoneData.classGroups.length > 0 ? (
                redZoneData.classGroups.slice(0, compact ? 3 : 5).map((classGroup) => (
                  <div key={classGroup.classInfo._id} className="flex items-center justify-between py-1.5 px-2 bg-gray-50 rounded-md">
                    <div className="flex items-center space-x-2">
                      <GraduationCap className="h-3 w-3 text-gray-500" />
                      <span className="text-xs font-medium text-gray-700">
                        {classGroup.classInfo.name}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                      {classGroup.students.length} students
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500 py-2">
                  No class breakdown available
                </div>
              )}
              
              {redZoneData.classGroups && redZoneData.classGroups.length > (compact ? 3 : 5) && (
                <div className="text-xs text-gray-500 text-center py-1">
                  +{redZoneData.classGroups.length - (compact ? 3 : 5)} more classes affected
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 mt-3">
              <button
                onClick={handleTakeAction}
                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <Eye className="h-3 w-3 mr-1" />
                Take Action
              </button>
              
              <button
                onClick={handleDismiss}
                className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                <X className="h-3 w-3 mr-1" />
                Dismiss
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Last Updated */}
      <div className="mt-3 text-xs text-gray-400">
        Last updated: {redZoneData.lastChecked ? new Date(redZoneData.lastChecked).toLocaleTimeString() : 'Unknown'}
      </div>
    </div>
  );
};

export default RedZoneStudentsNotification;
