import React, { useState, useEffect } from 'react';
import { MessageSquare, Users, Phone, Clock, RefreshCw, User, Plus, Search, X } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import CreateCorrespondenceModal from './CreateCorrespondenceModal';

const StaffCorrespondenceManagement = () => {
  const [correspondences, setCorrespondences] = useState([]);
  const [allCorrespondences, setAllCorrespondences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [levelStats, setLevelStats] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch correspondence data
  const fetchCorrespondences = async (searchQuery = '') => {
    try {
      setLoading(true);
      const userId = user?._id || user?.id;
      console.log('Fetching correspondences for user:', userId, 'search:', searchQuery);
      
      let url = '/correspondence';
      const params = new URLSearchParams();
      
      if (searchQuery.trim()) {
        // When searching, get all correspondence and filter on frontend
        setIsSearching(true);
        console.log('Searching mode: fetching all correspondence');
      } else {
        // Default: only show correspondence by this staff member
        params.append('staffMember', userId);
        setIsSearching(false);
        console.log('Default mode: fetching only user correspondence');
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      console.log('Making API call to:', url);
      const response = await api.get(url);
      console.log('API response:', response.data);
      
      if (response.data.success) {
        let allData = response.data.data || [];
        console.log('Received data count:', allData.length);
        
        // If searching, filter the results on frontend
        if (searchQuery.trim()) {
          const searchLower = searchQuery.toLowerCase();
          allData = allData.filter(item => {
            const studentName = `${item.studentId?.fullName?.firstName || ''} ${item.studentId?.fullName?.lastName || ''}`.toLowerCase();
            const subject = (item.subject || '').toLowerCase();
            const message = (item.message || '').toLowerCase();
            const staffName = (item.staffMember?.name || '').toLowerCase();
            
            return studentName.includes(searchLower) ||
                   subject.includes(searchLower) ||
                   message.includes(searchLower) ||
                   staffName.includes(searchLower);
          });
          console.log('Filtered data count:', allData.length);
        }
        
        setAllCorrespondences(allData);
        setCorrespondences(allData); // Initially show all
        
        // Calculate level-specific stats for the filtered data
        const levelBreakdown = {};
        for (let level = 1; level <= 5; level++) {
          const levelData = allData.filter(item => item.studentLevel === level);
          levelBreakdown[level] = {
            total: levelData.length,
            unique: new Set(levelData.map(item => item.studentId?._id)).size,
            levelChanges: levelData.filter(item => item.isLevelChange).length,
            general: levelData.filter(item => !item.isLevelChange).length
          };
        }
        setLevelStats(levelBreakdown);
        console.log('Level stats calculated:', levelBreakdown);
      } else {
        console.error('API response not successful:', response.data);
        toast.error('Failed to fetch correspondence data');
      }
    } catch (error) {
      console.error('Error fetching correspondences:', error);
      toast.error('Error loading correspondence data');
    } finally {
      console.log('Setting loading to false');
      setLoading(false);
    }
  };

  useEffect(() => {
    const userId = user?._id || user?.id;
    console.log('useEffect triggered - user._id:', user?._id, 'user.id:', user?.id, 'searchTerm:', searchTerm);
    if (userId) {
      fetchCorrespondences(searchTerm);
    }
  }, [user?._id, user?.id, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    fetchCorrespondences(searchTerm);
  };

  const handleSearch = (term) => {
    setSearchTerm(term);
    setSelectedLevel(null); // Reset level filter when searching
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setSelectedLevel(null);
  };

  const handleLevelFilter = (level) => {
    if (selectedLevel === level) {
      // If clicking the same level, show all
      setSelectedLevel(null);
      setCorrespondences(allCorrespondences);
    } else {
      // Filter by selected level
      setSelectedLevel(level);
      const filtered = allCorrespondences.filter(item => item.studentLevel === level);
      setCorrespondences(filtered);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'call': return <Phone className="h-4 w-4" />;
      case 'meeting': return <Users className="h-4 w-4" />;
      case 'follow-up': return <Clock className="h-4 w-4" />;
      case 'student': return <MessageSquare className="h-4 w-4" />;
      case 'enquiry': return <MessageSquare className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'call': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'meeting': return 'text-green-600 bg-green-50 border-green-200';
      case 'follow-up': return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'student': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'enquiry': return 'text-teal-600 bg-teal-50 border-teal-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading correspondence...</p>
            <p className="text-sm text-gray-500 mt-2">
              User: {user?.fullName?.firstName} {user?.fullName?.lastName} ({user?.role})
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!user?._id && !user?.id) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-600">User not loaded</p>
            <p className="text-sm text-gray-500 mt-2">Please check authentication</p>
            <p className="text-xs text-gray-400 mt-1">
              Debug: user._id={user?._id}, user.id={user?.id}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border p-6">
        <div className="flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-primary mb-1 tracking-tight">
              {isSearching ? 'Search Results' : 'My Correspondence'}
            </h1>
            <p className="text-primary/80">
              {isSearching 
                ? `Showing search results for "${searchTerm}"` 
                : `Your Communications - ${user?.fullName?.firstName} ${user?.fullName?.lastName} (${user?.role})`
              }
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
            >
              <Plus className="h-4 w-4" />
              Add New Communication
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mt-6">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search students, subjects, messages, or staff members..."
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Search Status */}
          {searchTerm && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {isSearching ? (
                  <span className="text-blue-600">
                    🔍 Searching all correspondence records
                  </span>
                ) : (
                  <span className="text-gray-600">
                    📋 Showing only your correspondence
                  </span>
                )}
              </div>
              <button
                onClick={handleClearSearch}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Clear Search
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Level Cards - Clickable filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            onClick={() => handleLevelFilter(level)}
            className={`cursor-pointer transition-all duration-200 ${
              selectedLevel === level
                ? 'bg-blue-100 border-blue-300 shadow-lg scale-105'
                : 'bg-white/60 border-border hover:shadow-lg hover:scale-102'
            } backdrop-blur-2xl rounded-2xl shadow-md border p-6 hover:shadow-xl`}
          >
            <div className="text-center">
              <h3 className={`text-lg font-bold mb-2 ${
                selectedLevel === level ? 'text-blue-700' : 'text-primary'
              }`}>
                Level {level}
              </h3>
              <p className="text-3xl font-extrabold text-primary mb-2">
                {levelStats[level]?.total || 0}
              </p>
              <p className="text-sm text-gray-600">My Communications</p>
              
              {/* Level Details - Show when selected */}
              {selectedLevel === level && levelStats[level]?.total > 0 && (
                <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
                  <div className="text-xs text-blue-700">
                    <div>Students: {levelStats[level]?.unique || 0}</div>
                    <div>Level Changes: {levelStats[level]?.levelChanges || 0}</div>
                    <div>General: {levelStats[level]?.general || 0}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Active Filter Indicator */}
      {selectedLevel && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-blue-700 font-medium">
                Showing My Level {selectedLevel} Communications
              </span>
              <span className="text-blue-600 text-sm">
                ({correspondences.length} {correspondences.length === 1 ? 'entry' : 'entries'})
              </span>
            </div>
            <button
              onClick={() => {
                setSelectedLevel(null);
                setCorrespondences(allCorrespondences);
              }}
              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              Show All My Communications
            </button>
          </div>
        </div>
      )}

      {/* Personal Stats - Context-aware */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/60 backdrop-blur-2xl rounded-2xl shadow-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isSearching ? 'Search Results' : 'My Communications'}
              </p>
              <p className="text-2xl font-bold text-primary">{correspondences.length}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-2xl rounded-2xl shadow-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isSearching ? 'Students Found' : 'Students Contacted'}
              </p>
              <p className="text-2xl font-bold text-primary">
                {new Set(correspondences.map(c => c.studentId?._id)).size}
              </p>
            </div>
            <User className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-2xl rounded-2xl shadow-lg border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">
                {isSearching ? 'Level Changes Found' : 'Level Changes Made'}
              </p>
              <p className="text-2xl font-bold text-primary">
                {correspondences.filter(c => c.isLevelChange).length}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Correspondence List */}
      <div className="bg-white/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-primary">
            {isSearching ? 'Search Results' : 'My Correspondence History'}
          </h2>
          <div className="text-sm text-gray-600">
            {correspondences.length} {correspondences.length === 1 ? 'entry' : 'entries'}
            {isSearching && (
              <span className="ml-2 text-blue-600">
                (All records searched)
              </span>
            )}
          </div>
        </div>

        {correspondences.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {isSearching ? (
              <>
                <p className="text-gray-600">No correspondence found for "{searchTerm}"</p>
                <p className="text-sm text-gray-500 mt-2">
                  Try searching with different keywords or clear your search to see your communications
                </p>
              </>
            ) : (
              <>
                <p className="text-gray-600">You haven't created any correspondence yet</p>
                <p className="text-sm text-gray-500 mt-2">
                  Your communications with students will appear here
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {correspondences.map((correspondence) => (
              <div
                key={correspondence._id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${getTypeColor(correspondence.type)}`}>
                        {getTypeIcon(correspondence.type)}
                        {correspondence.type}
                      </span>
                      {correspondence.isLevelChange && (
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-yellow-50 text-yellow-600 border border-yellow-200">
                          Level Change
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        Level {correspondence.studentLevel}
                      </span>
                    </div>
                    <h3 className="font-medium text-gray-900 mb-1">
                      {correspondence.studentId?.fullName?.firstName} {correspondence.studentId?.fullName?.lastName}
                    </h3>
                    <p className="text-sm text-gray-600 mb-2">
                      {correspondence.subject}
                    </p>
                    <p className="text-sm text-gray-700">
                      {correspondence.message}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>{formatDate(correspondence.timestamp)}</p>
                    <p className="mt-1 font-medium">
                      {isSearching ? (
                        <span className="text-gray-600">
                          by {correspondence.staffMember?.name || 'Unknown Staff'}
                        </span>
                      ) : (
                        <span className="text-blue-600">by me</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Correspondence Modal */}
      <CreateCorrespondenceModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          handleRefresh();
          setShowCreateModal(false);
        }}
      />
    </div>
  );
};

export default StaffCorrespondenceManagement;
