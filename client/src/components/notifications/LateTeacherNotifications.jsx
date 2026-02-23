import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Clock, 
  User, 
  Building, 
  BookOpen, 
  AlertTriangle, 
  Phone, 
  Check, 
  X, 
  RefreshCw,
  MessageSquare 
} from 'lucide-react';
import api from '../../services/api';

const LateTeacherNotifications = ({ compact = false }) => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!compact);

  useEffect(() => {
    fetchNotifications();
    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await api.get('/notifications/late-teacher-notifications');
      if (response.data.success) {
        setNotifications(response.data.data.notifications || []);
      }
    } catch (error) {
      console.error('Error fetching late teacher notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (attendanceId, action, additionalData = {}) => {
    try {
      const response = await api.post(
        `/notifications/late-teacher-notifications/${attendanceId}/action`,
        { action, ...additionalData }
      );

      if (response.data.success) {
        // Remove notification from list after action
        setNotifications(prev => prev.filter(n => n.id !== attendanceId));
        setShowModal(false);
        setSelectedNotification(null);
      }
    } catch (error) {
      console.error('Error taking action on notification:', error);
    }
  };

  const handleDismiss = (attendanceId) => {
    handleAction(attendanceId, 'mark_resolved');
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-50';
      case 'high': return 'border-orange-500 bg-orange-50';
      case 'medium': return 'border-yellow-500 bg-yellow-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  };

  const getSeverityTextColor = (severity) => {
    switch (severity) {
      case 'critical': return 'text-red-800';
      case 'high': return 'text-orange-800';
      case 'medium': return 'text-yellow-800';
      default: return 'text-gray-800';
    }
  };

  const getSeverityBadgeColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Compact mode: show a collapsible card with count-only summary by default
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
                {notifications.length} {notifications.length === 1 ? 'teacher late' : 'teachers late'}
              </h3>
            </button>
            <button
              onClick={fetchNotifications}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>
          {isExpanded && (
            <div className="mt-4">
              {loading ? (
                <div className="flex items-center gap-3">
          <div className="animate-spin">
                    <RefreshCw className="w-5 h-5 text-gray-400" />
                  </div>
                  <span className="text-sm text-gray-600">Loading Teacher Alerts...</span>
                </div>
              ) : notifications.length === 0 ? (
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-gray-600">All teachers are on time for their classes today.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`border-l-4 rounded-lg p-4 ${getSeverityColor(notification.severity)}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-sm font-medium px-2 py-1 rounded-full ${getSeverityBadgeColor(notification.severity)}`}>
                              {notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)}
                            </span>
                            <span className={`font-semibold ${getSeverityTextColor(notification.severity)}`}>
                              {notification.teacherName}
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              <span>Teacher: {notification.teacherUserName}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              <span>Class: {notification.className}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-4 h-4" />
                              <span>Subject: {notification.subject}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              <span>Class Time: {notification.classStartTime} - {notification.classEndTime}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4" />
                              <span className="font-medium text-red-600">
                                {notification.lateDurationText}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Building className="w-4 h-4" />
                              <span>Floor: {notification.floor}</span>
                            </div>
                          </div>
                          {notification.remarks && (
                            <div className="text-sm text-gray-600 mb-3">
                              <strong>Remarks:</strong> {notification.remarks}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2 ml-4">
                          <button
                            onClick={() => {
                              setSelectedNotification(notification);
                              setShowModal(true);
                            }}
                            className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Take Action
                          </button>
                          <button
                            onClick={() => handleDismiss(notification.id)}
                            className="px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
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
          />
        )}
      </>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-800">Late Teacher Alerts</h3>
            <span className="bg-red-100 text-red-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
              {notifications.length}
            </span>
          </div>
          <button
            onClick={fetchNotifications}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`border-l-4 rounded-lg p-4 ${getSeverityColor(notification.severity)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`text-sm font-medium px-2 py-1 rounded-full ${getSeverityBadgeColor(notification.severity)}`}>
                      {notification.severity.charAt(0).toUpperCase() + notification.severity.slice(1)}
                    </span>
                    <span className={`font-semibold ${getSeverityTextColor(notification.severity)}`}>
                      {notification.teacherName}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Teacher: {notification.teacherUserName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span>Class: {notification.className}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      <span>Subject: {notification.subject}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>Class Time: {notification.classStartTime} - {notification.classEndTime}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="font-medium text-red-600">
                        {notification.lateDurationText}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4" />
                      <span>Floor: {notification.floor}</span>
                    </div>
                  </div>

                  {notification.remarks && (
                    <div className="text-sm text-gray-600 mb-3">
                      <strong>Remarks:</strong> {notification.remarks}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <button
                    onClick={() => {
                      setSelectedNotification(notification);
                      setShowModal(true);
                    }}
                    className="px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Take Action
                  </button>
                  <button
                    onClick={() => handleDismiss(notification.id)}
                    className="px-3 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
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
        />
      )}
    </>
  );
};

// Action Modal Component
const ActionModal = ({ notification, onAction, onDismiss, onClose }) => {
  const [selectedAction, setSelectedAction] = useState('');
  const [notes, setNotes] = useState('');

  const actions = [
    { 
      value: 'contact_coordinator', 
      label: 'Contact Floor Coordinator', 
      icon: Phone, 
      color: 'green',
      description: 'Alert the floor coordinator to check on the teacher'
    },
    { 
      value: 'escalate', 
      label: 'Escalate to Administration', 
      icon: AlertTriangle, 
      color: 'orange',
      description: 'Forward this issue to higher administration'
    },
    { 
      value: 'mark_resolved', 
      label: 'Mark as Resolved', 
      icon: Check, 
      color: 'purple',
      description: 'Mark this notification as resolved'
    }
  ];

  const handleSubmit = () => {
    if (!selectedAction) return;

    onAction(notification.id, selectedAction, { notes: notes.trim() });
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
            <h4 className="font-medium text-gray-900">{notification.teacherName}</h4>
            <p className="text-sm text-gray-600">
              Class: {notification.className} | Subject: {notification.subject}
            </p>
            <p className="text-sm text-red-600 font-medium">
              {notification.lateDurationText}
            </p>
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Select Action:</h4>
            {actions.map((action) => {
              const IconComponent = action.icon;
              return (
                <label
                  key={action.value}
                  className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors mb-2 ${
                    selectedAction === action.value
                      ? `border-${action.color}-500 bg-${action.color}-50`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    value={action.value}
                    checked={selectedAction === action.value}
                    onChange={(e) => setSelectedAction(e.target.value)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <IconComponent className={`w-4 h-4 text-${action.color}-600`} />
                      <span className="font-medium text-gray-900">{action.label}</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                  </div>
                </label>
              );
            })}
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes (optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              placeholder="Add any additional notes about this action..."
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={!selectedAction}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Execute Action
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LateTeacherNotifications;
