import React, { useState, useEffect } from 'react';
import { Bell, Clock, AlertTriangle, User, Calendar, FileText, X, Check, Plus } from 'lucide-react';
import api from '../../services/api';

const LateMarksheetNotifications = ({ compact = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);

  // Fetch notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/late-marksheet-notifications');
      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  // Take action on notification
  const handleAction = async (notificationId, action, additionalData = {}) => {
    try {
      setActionLoading(true);
      
      const response = await api.post(
        `/notifications/late-marksheet-notifications/${notificationId}/action`,
        {
          action,
          ...additionalData
        }
      );

      if (response.data.success) {
        // Remove the notification from the list or mark as resolved
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        );
        setShowModal(false);
        setSelectedNotification(null);
        
        // Show success message
        alert(`Action completed: ${response.data.data.actionTaken.message}`);
      }
    } catch (error) {
      console.error('Error taking action:', error);
      alert('Failed to complete action. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  // Dismiss notification
  const handleDismiss = async (notificationId, reason = '') => {
    try {
      setActionLoading(true);
      
      const response = await api.post(
        `/notifications/late-marksheet-notifications/${notificationId}/dismiss`,
        { reason }
      );

      if (response.data.success) {
        setNotifications(prev => 
          prev.filter(notif => notif.id !== notificationId)
        );
        setShowModal(false);
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Error dismissing notification:', error);
      alert('Failed to dismiss notification. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 border-red-500 text-red-800';
      case 'high': return 'bg-orange-100 border-orange-500 text-orange-800';
      default: return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high': return <Clock className="w-5 h-5 text-orange-600" />;
      default: return <Bell className="w-5 h-5 text-yellow-600" />;
    }
  };

  if (compact) {
    return (
      <>
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setIsExpanded((prev) => !prev)}
              className="flex items-center gap-3 group"
              title="Toggle details"
            >
              <Bell className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-800">
                {notifications.length} {notifications.length === 1 ? 'late marksheet' : 'late marksheets'}
              </h3>
            </button>
            <button
              onClick={fetchNotifications}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <Clock className="w-5 h-5" />
            </button>
          </div>
          {isExpanded && (
            <div className="mt-4">
              {loading ? (
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ) : error ? (
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-600">{error}</span>
                  </div>
                  <button onClick={fetchNotifications} className="mt-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg">Retry</button>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">All teachers have submitted marksheets on time.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 rounded-lg border-l-4 ${getSeverityColor(notification.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          {getSeverityIcon(notification.severity)}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-gray-900">
                                {notification.testTitle}
                              </h4>
                              <span className="text-sm text-gray-500">
                                ({notification.subject})
                              </span>
                            </div>
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User className="w-4 h-4" />
                                <span>Teacher: {notification.teacher?.name || 'Not assigned'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                <span>Class: {notification.class?.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                <span>
                                  Deadline: {new Date(notification.marksEntryDeadline).toLocaleString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-4 h-4" />
                                <span className="font-medium text-red-600">
                                  {notification.lateDurationText}
                                </span>
                              </div>
                              {notification.marksUploaded && (
                                <div className="text-xs text-gray-500">
                                  Marks were uploaded, but this alert persists until action is taken.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedNotification(notification);
                              setShowModal(true);
                            }}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Take Action
                          </button>
                          <button
                            onClick={() => handleDismiss(notification.id, 'Dismissed by principal')}
                            disabled={actionLoading}
                            className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {showModal && selectedNotification && (
          <ActionModal
            notification={selectedNotification}
            onAction={handleAction}
            onDismiss={handleDismiss}
            onClose={() => {
              setShowModal(false);
              setSelectedNotification(null);
            }}
            loading={actionLoading}
          />
        )}
      </>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-800">Error Loading Notifications</h3>
        </div>
        <p className="text-red-600">{error}</p>
        <button
          onClick={fetchNotifications}
          className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Check className="w-6 h-6 text-green-600" />
          <h3 className="text-lg font-semibold text-gray-800">No Late Submissions</h3>
        </div>
        <p className="text-gray-600">All teachers have submitted marksheets on time!</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-800">Late Marksheet Alerts</h3>
            <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </div>
          <button
            onClick={fetchNotifications}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <Clock className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border-l-4 ${getSeverityColor(notification.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {getSeverityIcon(notification.severity)}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">
                        {notification.testTitle}
                      </h4>
                      <span className="text-sm text-gray-500">
                        ({notification.subject})
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>Teacher: {notification.teacher?.name || 'Not assigned'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Class: {notification.class?.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>
                          Deadline: {new Date(notification.marksEntryDeadline).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium text-red-600">
                          {notification.lateDurationText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedNotification(notification);
                      setShowModal(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Take Action
                  </button>
                  <button
                    onClick={() => handleDismiss(notification.id, 'Dismissed by principal')}
                    disabled={actionLoading}
                    className="px-3 py-1.5 bg-gray-300 text-gray-700 text-sm rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Action Modal */}
      {showModal && selectedNotification && (
        <ActionModal
          notification={selectedNotification}
          onAction={handleAction}
          onDismiss={handleDismiss}
          onClose={() => {
            setShowModal(false);
            setSelectedNotification(null);
          }}
          loading={actionLoading}
        />
      )}
    </>
  );
};

// Action Modal Component
const ActionModal = ({ notification, onAction, onDismiss, onClose, loading }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [notes, setNotes] = useState('');

  const actions = [
    { value: 'extend_deadline', label: 'Extend Deadline', icon: Plus, color: 'green' },
    { value: 'mark_resolved', label: 'Mark as Resolved', icon: Check, color: 'purple' }
  ];

  const handleSubmit = () => {
    if (!selectedAction) return;

    const additionalData = {
      notes,
      ...(selectedAction === 'extend_deadline' && newDeadline ? { newDeadline } : {})
    };

    onAction(notification.id, selectedAction, additionalData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Take Action</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900">{notification.testTitle}</h4>
            <p className="text-sm text-gray-600">
              Teacher: {notification.teacher?.name} | Class: {notification.class?.name}
            </p>
            <p className="text-sm text-red-600 font-medium">
              {notification.lateDurationText}
            </p>
          </div>

          <div className="space-y-3 mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Select Action:
            </label>
            {actions.map((action) => {
              const IconComponent = action.icon;
              return (
                <label
                  key={action.value}
                  className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedAction === action.value
                      ? `border-${action.color}-500 bg-${action.color}-50`
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    value={action.value}
                    checked={selectedAction === action.value}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="sr-only"
                  />
                  <IconComponent className="w-5 h-5 text-gray-600" />
                  <span className="text-sm font-medium text-gray-900">
                    {action.label}
                  </span>
                </label>
              );
            })}
          </div>

          {selectedAction === 'extend_deadline' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Deadline:
              </label>
              <input
                type="datetime-local"
                value={newDeadline}
                onChange={(e) => setNewDeadline(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                min={new Date().toISOString().slice(0, 16)}
              />
            </div>
          )}

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Additional notes or comments..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!selectedAction || loading || (selectedAction === 'extend_deadline' && !newDeadline)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Execute Action'}
            </button>
            <button
              onClick={() => onDismiss(notification.id, notes || 'Dismissed from action modal')}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors disabled:opacity-50"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LateMarksheetNotifications;
