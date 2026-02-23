import React, { useState, useEffect } from 'react';
import { MessageSquare, Phone, User, Calendar, Filter, Eye, Mail, Users, Heart, Award, AlertTriangle, DollarSign, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const CorrespondenceTab = ({ studentId, studentName }) => {
  const [correspondenceData, setCorrespondenceData] = useState([]);
  const [stats, setStats] = useState({
    totalCorrespondence: 0,
    byTeacher: 0,
    byType: {},
    byCommunicationCategory: {},
    byToWhom: {},
    recentActivity: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCorrespondence, setSelectedCorrespondence] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const { showToast } = useToast();

  // Communication type icons
  const getCommunicationIcon = (type) => {
    switch (type) {
      case 'phone_call':
        return <Phone className="h-4 w-4" />;
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'in_person':
        return <User className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

  // Communication category icons
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Appreciation':
        return <Heart className="h-4 w-4 text-pink-500" />;
      case 'Results':
        return <Award className="h-4 w-4 text-yellow-500" />;
      case 'Discipline':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'Attendance':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'Fee':
        return <DollarSign className="h-4 w-4 text-green-500" />;
      default:
        return <MessageSquare className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get category color
  const getCategoryColor = (category) => {
    switch (category) {
      case 'Appreciation':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Results':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Discipline':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Attendance':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Fee':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Fetch correspondence data
  const fetchCorrespondenceData = async () => {
    try {
      setLoading(true);
      
      // Filter correspondence by specific student ID - only after admission
      const response = await api.get(`/correspondence/student/${studentId}`, {
        params: {
          limit: 100,
          sortBy: 'timestamp',
          sortOrder: 'desc',
          type: 'student' // Only get correspondence for admitted students
        }
      });

      if (response.data.success) {
        const data = response.data.data || [];
        // Filter only correspondence that happened after student admission
        const admittedStudentCorrespondence = data.filter(item => 
          item.type === 'student' && 
          (item.toWhom || item.communicationCategory) // Has admitted student fields
        );
        setCorrespondenceData(admittedStudentCorrespondence);
        calculateStats(admittedStudentCorrespondence);
      } else {
        // Fallback to general correspondence endpoint with studentId filter
        const fallbackResponse = await api.get('/correspondence', {
          params: {
            studentId: studentId,
            limit: 100,
            sortBy: 'timestamp',
            sortOrder: 'desc',
            type: 'student'
          }
        });
        
        if (fallbackResponse.data.success) {
          const data = fallbackResponse.data.data || [];
          // Filter only correspondence that happened after student admission
          const admittedStudentCorrespondence = data.filter(item => 
            item.type === 'student' && 
            (item.toWhom || item.communicationCategory) // Has admitted student fields
          );
          setCorrespondenceData(admittedStudentCorrespondence);
          calculateStats(admittedStudentCorrespondence);
        }
      }

    } catch (error) {
      console.error('Error fetching correspondence data:', error);
      // Use safe toast call
      if (typeof showToast === 'function') {
        showToast('Failed to load correspondence data', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate correspondence statistics
  const calculateStats = (data) => {
    const totalCorrespondence = data.length;
    const byTeacher = data.filter(item => item.createdBy?.role === 'Teacher' || item.staffMember?.role === 'Teacher').length;
    
    // Group by communication type
    const byType = {};
    data.forEach(item => {
      const type = item.communicationType || 'other';
      byType[type] = (byType[type] || 0) + 1;
    });

    // Group by communication category (for admitted students)
    const byCommunicationCategory = {};
    data.forEach(item => {
      if (item.communicationCategory) {
        const category = item.communicationCategory;
        byCommunicationCategory[category] = (byCommunicationCategory[category] || 0) + 1;
      }
    });

    // Group by toWhom (for admitted students)
    const byToWhom = {};
    data.forEach(item => {
      if (item.toWhom) {
        const whom = item.toWhom;
        byToWhom[whom] = (byToWhom[whom] || 0) + 1;
      }
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = data.filter(item => 
      new Date(item.createdAt) >= sevenDaysAgo
    ).length;

    setStats({
      totalCorrespondence,
      byTeacher,
      byType,
      byCommunicationCategory,
      byToWhom,
      recentActivity
    });
  };

  useEffect(() => {
    if (studentId) {
      fetchCorrespondenceData();
    }
  }, [studentId]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateRelative = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Filter correspondence based on selected filters
  const filteredCorrespondence = correspondenceData.filter(item => {
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'teacher' && item.createdBy?.role !== 'Teacher') return false;
      if (selectedFilter === 'admin' && item.createdBy?.role !== 'Admin') return false;
      if (selectedFilter === 'principal' && item.createdBy?.role !== 'Principal') return false;
    }
    
    if (selectedCategory !== 'all' && item.communicationCategory !== selectedCategory) {
      return false;
    }
    
    return true;
  });

  const handleViewDetails = (correspondence) => {
    setSelectedCorrespondence(correspondence);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-500" />
            Student Correspondence
          </h3>
          <p className="text-gray-600 text-sm">Communication history and teacher interactions</p>
        </div>
        
        <div className="flex gap-2">
          <select
            value={selectedFilter}
            onChange={(e) => setSelectedFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Staff</option>
            <option value="teacher">Teachers Only</option>
            <option value="admin">Admin Only</option>
            <option value="principal">Principal Only</option>
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="Appreciation">Appreciation</option>
            <option value="Results">Results</option>
            <option value="Discipline">Discipline</option>
            <option value="Attendance">Attendance</option>
            <option value="Fee">Fee</option>
          </select>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Communications</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCorrespondence}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Teacher Interactions</p>
              <p className="text-2xl font-bold text-green-600">{stats.byTeacher}</p>
            </div>
            <Users className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recent Activity</p>
              <p className="text-2xl font-bold text-purple-600">{stats.recentActivity}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-xs text-gray-500 mt-1">Last 7 days</p>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Communication Types</p>
              <p className="text-2xl font-bold text-orange-600">{Object.keys(stats.byType).length}</p>
            </div>
            <Phone className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Communication Categories Overview */}
      {Object.keys(stats.byCommunicationCategory).length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Communication Categories</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(stats.byCommunicationCategory).map(([category, count]) => (
              <div key={category} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                {getCategoryIcon(category)}
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{category}</div>
                  <div className="text-sm text-gray-600">{count} communication(s)</div>
                </div>
                <div className="text-lg font-bold text-gray-700">{count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Communication History */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Communication History</h4>
        
        {filteredCorrespondence.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Correspondence Found</h3>
            <p className="text-gray-600">
              {correspondenceData.length === 0 
                ? 'No communication records found for this student.'
                : 'No communications match the selected filters.'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCorrespondence.map((item, index) => (
              <div key={index} className="border rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-1">
                      {getCommunicationIcon(item.communicationType)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-medium text-gray-900 truncate">
                          {item.subject || 'Communication'}
                        </h5>
                        
                        {/* Communication Category Badge */}
                        {item.communicationCategory && (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getCategoryColor(item.communicationCategory)}`}>
                            {getCategoryIcon(item.communicationCategory)}
                            <span className="ml-1">{item.communicationCategory}</span>
                          </span>
                        )}
                        
                        {/* To Whom Badge */}
                        {item.toWhom && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            To: {item.toWhom}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-gray-600 text-sm mb-2 line-clamp-2">
                        {item.message || item.description || 'No description available'}
                      </p>
                      
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          <span>
                            {item.createdBy?.fullName?.firstName} {item.createdBy?.fullName?.lastName} 
                            {item.createdBy?.role && ` (${item.createdBy.role})`}
                            {!item.createdBy && item.staffMember && (
                              <>
                                {item.staffMember.name} ({item.staffMember.role})
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(item.createdAt || item.timestamp)}</span>
                        </div>
                        {item.communicationType && (
                          <div className="flex items-center gap-1">
                            {getCommunicationIcon(item.communicationType)}
                            <span className="capitalize">{item.communicationType.replace('_', ' ')}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-xs text-gray-500">
                      {formatDateRelative(item.createdAt)}
                    </span>
                    <Button
                      onClick={() => handleViewDetails(item)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Communication Summary */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Communication Summary</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* By Communication Type */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">By Communication Method</h5>
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getCommunicationIcon(type)}
                    <span className="text-sm text-gray-700 capitalize">
                      {type.replace('_', ' ')}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* By Recipient (if available) */}
          {Object.keys(stats.byToWhom).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-3">Communications To</h5>
              <div className="space-y-2">
                {Object.entries(stats.byToWhom).map(([whom, count]) => (
                  <div key={whom} className="flex items-center justify-between">
                    <span className="text-sm text-gray-700">{whom}</span>
                    <span className="text-sm font-medium text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedCorrespondence && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Communication Details</h3>
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Subject</label>
                  <p className="text-gray-900">{selectedCorrespondence.subject || 'No subject'}</p>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-gray-500">Message</label>
                  <p className="text-gray-900 whitespace-pre-wrap">
                    {selectedCorrespondence.message || selectedCorrespondence.description || 'No message content'}
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Communication Type</label>
                    <p className="text-gray-900 capitalize">
                      {selectedCorrespondence.communicationType?.replace('_', ' ') || 'Not specified'}
                    </p>
                  </div>
                  
                  {selectedCorrespondence.communicationCategory && (
                    <div>
                      <label className="text-sm font-medium text-gray-500">Category</label>
                      <p className="text-gray-900">{selectedCorrespondence.communicationCategory}</p>
                    </div>
                  )}
                </div>
                
                {selectedCorrespondence.toWhom && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Communicated To</label>
                    <p className="text-gray-900">{selectedCorrespondence.toWhom}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Created By</label>
                    <p className="text-gray-900">
                      {selectedCorrespondence.createdBy?.fullName?.firstName} {selectedCorrespondence.createdBy?.fullName?.lastName}
                      {selectedCorrespondence.createdBy?.role && ` (${selectedCorrespondence.createdBy.role})`}
                      {!selectedCorrespondence.createdBy && selectedCorrespondence.staffMember && (
                        <>
                          {selectedCorrespondence.staffMember.name} ({selectedCorrespondence.staffMember.role})
                        </>
                      )}
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date & Time</label>
                    <p className="text-gray-900">{formatDate(selectedCorrespondence.createdAt || selectedCorrespondence.timestamp)}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <Button onClick={() => setShowDetailsModal(false)} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrespondenceTab;