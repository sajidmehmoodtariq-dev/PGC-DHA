import React, { useState, useEffect, useMemo } from 'react';
import { Search, User, Eye, Users, Filter, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';

const StudentSearchPage = ({ onClose, onStudentSelect }) => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(20);

  // Fetch all students on component mount
  useEffect(() => {
    fetchAllStudents();
  }, []);

  const fetchAllStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get('/users/all-students');
      
      if (response.data.success) {
        setStudents(response.data.data.students || []);
      } else {
        setError('Failed to fetch students');
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Error loading students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Get unique classes for filter
  const uniqueClasses = useMemo(() => {
    const classes = students
      .map(student => student.academicInfo?.currentClass)
      .filter(Boolean)
      .filter((value, index, self) => self.indexOf(value) === index)
      .sort();
    return classes;
  }, [students]);

  // Filter students based on search query, class, and status
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const fullName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase();
      const email = (student.email || '').toLowerCase();
      const username = (student.username || '').toLowerCase();
      const query = searchQuery.toLowerCase();

      // Search filter
      const matchesSearch = 
        fullName.includes(query) ||
        email.includes(query) ||
        username.includes(query);

      // Class filter
      const matchesClass = selectedClass === 'all' || 
        student.academicInfo?.currentClass === selectedClass;

      // Status filter
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'active' && student.status === 1) ||
        (selectedStatus === 'inactive' && student.status !== 1);

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, selectedClass, selectedStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const startIndex = (currentPage - 1) * studentsPerPage;
  const endIndex = startIndex + studentsPerPage;
  const currentStudents = filteredStudents.slice(startIndex, endIndex);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedClass, selectedStatus]);

  const handleStudentDetails = (student) => {
    if (onStudentSelect) {
      onStudentSelect(student);
    }
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedClass('all');
    setSelectedStatus('all');
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-4 text-lg">Loading students...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-800">Student Directory</h2>
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
              {filteredStudents.length} students
            </span>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by name, email, or username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Class Filter */}
            <div>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Classes</option>
                {uniqueClasses.map(className => (
                  <option key={className} value={className}>{className}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center space-x-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              
              {/* Clear Filters Button */}
              {(searchQuery || selectedClass !== 'all' || selectedStatus !== 'all') && (
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="px-3 py-2"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <p className="text-red-700">{error}</p>
            <Button
              onClick={fetchAllStudents}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Students List */}
        <div className="flex-1 overflow-auto p-6">
          {currentStudents.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-500">
                {filteredStudents.length === 0 ? 
                  'Try adjusting your search criteria' : 
                  'No students match your current filters'
                }
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {currentStudents.map((student) => (
                <div
                  key={student._id}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-blue-100 rounded-full p-2">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {student.fullName?.firstName} {student.fullName?.lastName}
                        </h3>
                        <p className="text-xs text-gray-500 truncate">{student.email}</p>
                        {student.academicInfo?.currentClass && (
                          <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded mt-1">
                            {student.academicInfo.currentClass}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                        student.status === 1 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {student.status === 1 ? 'Active' : 'Inactive'}
                      </span>
                      <Button
                        onClick={() => handleStudentDetails(student)}
                        size="sm"
                        className="px-3 py-1 text-xs"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredStudents.length)} of {filteredStudents.length} students
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  variant="outline"
                  size="sm"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 7) {
                      pageNum = i + 1;
                    } else if (currentPage <= 4) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 3) {
                      pageNum = totalPages - 6 + i;
                    } else {
                      pageNum = currentPage - 3 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="px-3 py-1 text-xs"
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  variant="outline"
                  size="sm"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentSearchPage;
