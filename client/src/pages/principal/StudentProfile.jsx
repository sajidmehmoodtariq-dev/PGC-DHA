import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Users, Phone, GraduationCap, Eye, X, ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../../components/ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import StudentDetailsModal from '../../components/student-profile/StudentDetailsModal';

const StudentProfile = () => {
  const [allStudents, setAllStudents] = useState([]); // Store all students for filtering
  const [students, setStudents] = useState([]); // Current page students
  const [loading, setLoading] = useState(true);
  const [dataFullyLoaded, setDataFullyLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [studentsPerPage] = useState(20); // Fixed page size
  const [totalPages, setTotalPages] = useState(1);
  
  // Filter states
  const [filters, setFilters] = useState({
    campus: 'all',
    program: 'all',
    grade: 'all',
    class: 'all'
  });

  // Available filter options
  const [filterOptions, setFilterOptions] = useState({
    campuses: [],
    programs: [],
    grades: [],
    classes: []
  });

  // Safe toast hook usage
  let showToast;
  try {
    const toastContext = useToast();
    showToast = toastContext.showToast;
  } catch (error) {
    console.warn('ToastContext not available:', error);
    showToast = (message, type) => {
      console.log(`Toast (${type}):`, message);
      if (type === 'error') {
        alert(message);
      }
    };
  }

  // Load all student data using optimized endpoint - similar to examination report approach
  const loadAllStudentData = async () => {
    if (dataFullyLoaded) {
      return; // Prevent multiple calls
    }

    try {
      setLoading(true);
      
      // Use new optimized endpoint specifically for student profiles
      const response = await api.get('/student-profiles/optimized', {
        params: {
          page: 1,
          limit: 2000, // Load all students with classes at once
        },
        timeout: 60000 // 1 minute timeout should be enough for optimized query
      });

      if (response?.data?.success) {
        const payload = response.data.data || {};
        const allStudentsData = payload.students || [];
        
        console.log('Students data from optimized student profiles endpoint:', {
          totalStudents: allStudentsData.length,
          pagination: payload.pagination,
          sample: allStudentsData[0]
        });
        
        // Cache all students data
        setAllStudents(allStudentsData);
        setDataFullyLoaded(true);
        
        // Extract filter options
        extractFilterOptions(allStudentsData);
        
        if (showToast && typeof showToast === 'function') {
          showToast(`Loaded ${allStudentsData.length} student profiles for instant filtering`, 'success');
        }
      } else {
        console.warn('API response indicates failure or unexpected structure:', response.data);
        setAllStudents([]);
      }
    } catch (error) {
      console.error('Error loading all student data:', error);
      
      if (showToast && typeof showToast === 'function') {
        showToast('Failed to load students. Please check your connection and try again.', 'error');
      } else {
        alert('Failed to load students. Please refresh the page and try again.');
      }
      
      setAllStudents([]);
    } finally {
      setLoading(false);
    }
  };

  // Extract unique filter options from students data
  const extractFilterOptions = (studentsData) => {
    const campuses = [...new Set(studentsData.map(s => s.campus).filter(Boolean))];
    const programs = [...new Set(studentsData.map(s => s.program || s.admissionInfo?.program).filter(Boolean))];
    const grades = [...new Set(studentsData.map(s => s.admissionInfo?.grade).filter(Boolean))];
    
    // For classes, we'll need to fetch class data
    fetchClassOptions();
    
    setFilterOptions({
      campuses: campuses.sort(),
      programs: programs.sort(),
      grades: grades.sort(),
      classes: [] // Will be populated by fetchClassOptions
    });
  };

  // Fetch class options
  const fetchClassOptions = async () => {
    try {
      const response = await api.get('/classes', {
        timeout: 10000 // 10 second timeout
      });
      if (response?.data?.success) {
        const classes = response.data.data.map(cls => ({
          id: cls._id,
          name: cls.name,
          campus: cls.campus,
          program: cls.program,
          grade: cls.grade
        }));
        
        setFilterOptions(prev => ({
          ...prev,
          classes: classes.sort((a, b) => a.name.localeCompare(b.name))
        }));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      // Don't show error for classes as it's not critical
      setFilterOptions(prev => ({
        ...prev,
        classes: []
      }));
    }
  };

  // Memoized filtered students with client-side pagination
  const filteredStudents = useMemo(() => {
    if (!allStudents.length || !dataFullyLoaded) return [];

    let filtered = allStudents.filter(student => {
      // Search filter
      if (searchTerm.trim()) {
        const searchLower = searchTerm.toLowerCase();
        const fullName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase();
        const phone = student.phoneNumber?.toLowerCase() || '';
        const email = student.email?.toLowerCase() || '';
        const rollNumber = student.rollNumber?.toLowerCase() || '';
        
        if (!fullName.includes(searchLower) && 
            !phone.includes(searchLower) && 
            !email.includes(searchLower) &&
            !rollNumber.includes(searchLower)) {
          return false;
        }
      }

      // Campus filter
      if (filters.campus !== 'all' && student.campus !== filters.campus) {
        return false;
      }

      // Program filter
      if (filters.program !== 'all') {
        const studentProgram = student.program || student.admissionInfo?.program;
        if (studentProgram !== filters.program) {
          return false;
        }
      }

      // Grade filter
      if (filters.grade !== 'all' && student.admissionInfo?.grade !== filters.grade) {
        return false;
      }

      // Class filter
      if (filters.class !== 'all' && student.classId !== filters.class) {
        return false;
      }

      return true;
    });

    return filtered;
  }, [allStudents, dataFullyLoaded, searchTerm, filters]);

  // Memoized paginated students
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * studentsPerPage;
    const endIndex = startIndex + studentsPerPage;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, currentPage, studentsPerPage]);

  // Update pagination when filtered results change
  useEffect(() => {
    const totalPagesCalc = Math.ceil(filteredStudents.length / studentsPerPage);
    setTotalPages(totalPagesCalc);
    
    // Reset to page 1 if current page is beyond total pages
    if (currentPage > totalPagesCalc && totalPagesCalc > 0) {
      setCurrentPage(1);
    }
    
    // Update students for rendering
    setStudents(paginatedStudents);
  }, [filteredStudents, currentPage, studentsPerPage, paginatedStudents]);

  // Reset to page 1 when filters change
  useEffect(() => {
    if (dataFullyLoaded) {
      setCurrentPage(1);
    }
  }, [searchTerm, filters, dataFullyLoaded]);

  // Load all data on component mount
  useEffect(() => {
    loadAllStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      campus: 'all',
      program: 'all',
      grade: 'all',
      class: 'all'
    });
    setSearchTerm('');
  };

  // Open student details modal
  const handleViewStudent = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  // Close student details modal
  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  };

  // Get class name for student
  const getClassName = (classId) => {
    const classInfo = filterOptions.classes.find(cls => cls.id === classId);
    return classInfo?.name || 'Unknown Class';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Student Profiles</h1>
              <p className="text-gray-600">Comprehensive view of all admitted students with class assignments</p>
            </div>
          </div>
          
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-blue-600">{filteredStudents.length}</div>
              <div className="text-sm text-gray-600">Students Found</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-green-600">{students.length}</div>
              <div className="text-sm text-gray-600">Total with Classes</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-purple-600">
                {[...new Set(students.map(s => s.campus))].length}
              </div>
              <div className="text-sm text-gray-600">Campuses</div>
            </div>
            <div className="bg-white p-4 rounded-lg border shadow-sm">
              <div className="text-2xl font-bold text-orange-600">
                {filterOptions.classes.length}
              </div>
              <div className="text-sm text-gray-600">Active Classes</div>
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-2xl shadow-lg border p-6 mb-6">
          {/* Search Bar */}
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name, phone number, or email..."
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowFilters(!showFilters)}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              {(searchTerm || Object.values(filters).some(f => f !== 'all')) && (
                <Button onClick={clearFilters} variant="outline">
                  Clear All
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="border-t pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Campus Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
                  <select
                    value={filters.campus}
                    onChange={(e) => handleFilterChange('campus', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Campuses</option>
                    {filterOptions.campuses.map(campus => (
                      <option key={campus} value={campus}>{campus}</option>
                    ))}
                  </select>
                </div>

                {/* Program Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
                  <select
                    value={filters.program}
                    onChange={(e) => handleFilterChange('program', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Programs</option>
                    {filterOptions.programs.map(program => (
                      <option key={program} value={program}>{program}</option>
                    ))}
                  </select>
                </div>

                {/* Grade Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <select
                    value={filters.grade}
                    onChange={(e) => handleFilterChange('grade', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Grades</option>
                    {filterOptions.grades.map(grade => (
                      <option key={grade} value={grade}>{grade}</option>
                    ))}
                  </select>
                </div>

                {/* Class Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    value={filters.class}
                    onChange={(e) => handleFilterChange('class', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Classes</option>
                    {filterOptions.classes.map(cls => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} - {cls.campus} ({cls.program})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Active Filters Display */}
              {Object.values(filters).some((value) => value !== 'all') && (
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700">Active Filters:</span>
                    {Object.entries(filters).map(([key, value]) => {
                      if (value === 'all') return null;
                      let displayValue = value;
                      if (key === 'class') {
                        const classInfo = filterOptions.classes.find(cls => cls.id === value);
                        displayValue = classInfo?.name || value;
                      }
                      return (
                        <span
                          key={key}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                        >
                          {key}: {displayValue}
                          <button
                            onClick={() => handleFilterChange(key, 'all')}
                            className="ml-1 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Students Grid */}
        <div className="space-y-4">
          {filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg p-8 text-center">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">
                {searchTerm || Object.values(filters).some(f => f !== 'all')
                  ? 'Try adjusting your search criteria or filters'
                  : 'No students with class assignments found'
                }
              </p>
            </div>
          ) : (
            <>
              <div className="grid gap-4">
                {paginatedStudents.map((student) => (
                  <StudentRecord
                    key={student._id}
                    student={student}
                    className={getClassName(student.classId)}
                    onViewDetails={() => handleViewStudent(student)}
                  />
                ))}
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white rounded-lg p-4 mt-4">
                  <div className="text-sm text-gray-600">
                    Showing {((currentPage - 1) * studentsPerPage) + 1} to {Math.min(currentPage * studentsPerPage, filteredStudents.length)} of {filteredStudents.length} students
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center gap-1">
                      {/* Show page numbers */}
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        
                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === currentPage ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Student Details Modal */}
        <StudentDetailsModal
          isOpen={showDetailsModal}
          onClose={closeDetailsModal}
          student={selectedStudent}
          className={selectedStudent ? getClassName(selectedStudent.classId) : ''}
        />
      </div>
    </div>
  );
};

// Student Record Component
const StudentRecord = ({ student, className, onViewDetails }) => {
  const initials = `${student.fullName?.firstName?.[0] || ''}${student.fullName?.lastName?.[0] || ''}`;
  
  return (
    <div className="bg-white rounded-lg border shadow-sm hover:shadow-md transition-shadow p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          {/* Avatar */}
          <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-medium text-sm">{initials}</span>
          </div>
          
          {/* Student Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900 truncate">
                  {student.fullName?.firstName} {student.fullName?.lastName}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    <span>{student.phoneNumber || 'No phone'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <GraduationCap className="h-4 w-4" />
                    <span>{className}</span>
                  </div>
                </div>
              </div>
              
              {/* Student Details */}
              <div className="text-right text-sm text-gray-500 ml-4">
                <div className="font-medium">{student.campus}</div>
                <div>{student.program || student.admissionInfo?.program}</div>
                <div>{student.admissionInfo?.grade}</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Action Button */}
        <Button
          onClick={onViewDetails}
          variant="outline"
          size="sm"
          className="ml-4 flex items-center gap-1"
        >
          <Eye className="h-4 w-4" />
          View Details
        </Button>
      </div>
    </div>
  );
};

export default StudentProfile;