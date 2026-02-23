import React, { useState } from 'react';
import { Search, Filter, Download, Users, Phone, Mail, Building } from 'lucide-react';
import { Button } from '../../ui/button';
import DateRangeSelector from './DateRangeSelector';
import StudentSearchPage from '../../attendance/StudentSearchPage';
import StudentDetailsModal from '../../attendance/StudentDetailsModal';

/**
 * Attendance Details Component for IT/Admin roles
 * Shows student records with filters, no statistics
 */
const AttendanceDetails = ({
  attendanceData,
  classesData,
  selectedCampus,
  selectedFloor,
  selectedProgram,
  selectedClass,
  dateRange,
  onFilterChange,
  onRefresh,
  loading
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, present, absent
  const [currentPage, setCurrentPage] = useState(1);
  const [recordsPerPage] = useState(50);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);

  // Get student records from attendance data
  const getStudentRecords = () => {
    if (!attendanceData?.studentRecords) return [];
    return attendanceData.studentRecords;
  };

  // Filter student records
  const getFilteredRecords = () => {
    let records = getStudentRecords();
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      records = records.filter(record => 
        record.student.fullName?.firstName?.toLowerCase().includes(query) ||
        record.student.fullName?.lastName?.toLowerCase().includes(query) ||
        record.student.phoneNumber?.includes(query) ||
        record.student.email?.toLowerCase().includes(query) ||
        record.className?.toLowerCase().includes(query)
      );
    }
    
    // Filter by attendance status
    if (statusFilter !== 'all') {
      records = records.filter(record => record.status === statusFilter);
    }
    
    return records;
  };

  const filteredRecords = getFilteredRecords();
  
  // Pagination
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
  const startIndex = (currentPage - 1) * recordsPerPage;
  const endIndex = startIndex + recordsPerPage;
  const currentRecords = filteredRecords.slice(startIndex, endIndex);

  // Filter classes for dropdown
  const getFilteredClasses = () => {
    return classesData.filter(cls => {
      if (selectedCampus && selectedCampus !== 'all' && cls.campus !== selectedCampus) return false;
      if (selectedFloor && selectedFloor !== 'all' && cls.floor !== selectedFloor) return false;
      if (selectedProgram && selectedProgram !== 'all' && cls.program !== selectedProgram) return false;
      return true;
    });
  };

  const filteredClasses = getFilteredClasses();

  const exportToCSV = () => {
    if (filteredRecords.length === 0) return;
    
    const headers = ['Date', 'Student Name', 'Phone', 'Email', 'Class', 'Campus', 'Floor', 'Program', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(record => [
        record.date,
        `"${record.student.fullName?.firstName || ''} ${record.student.fullName?.lastName || ''}"`,
        record.student.phoneNumber || '',
        record.student.email || '',
        `"${record.className || ''}"`,
        record.campus || '',
        record.floor || '',
        record.program || '',
        record.status
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `student-attendance-${dateRange.startDate}-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    const badges = {
      present: 'bg-green-100 text-green-700 border-green-200',
      absent: 'bg-red-100 text-red-700 border-red-200',
      leave: 'bg-yellow-100 text-yellow-700 border-yellow-200'
    };
    
    return badges[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Users className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Student Attendance Records</h1>
              <p className="text-sm text-gray-600">
                Detailed student attendance records with contact information
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={(range) => onFilterChange('dateRange', range)}
            />
            <Button 
              onClick={() => setShowStudentSearch(true)}
              variant="outline"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Student
            </Button>
            <Button 
              onClick={onRefresh} 
              disabled={loading}
              variant="outline"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="h-5 w-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Campus Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
            <select 
              value={selectedCampus}
              onChange={(e) => onFilterChange('campus', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Campuses</option>
              <option value="Boys">Boys Campus</option>
              <option value="Girls">Girls Campus</option>
            </select>
          </div>

          {/* Floor Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Floor</label>
            <select 
              value={selectedFloor}
              onChange={(e) => onFilterChange('floor', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Floors</option>
              <option value="1st">1st Floor (11th Grade)</option>
              <option value="2nd">2nd Floor (12th Grade)</option>
            </select>
          </div>

          {/* Program Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
            <select 
              value={selectedProgram}
              onChange={(e) => onFilterChange('program', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Programs</option>
              <option value="pre-medical">Pre-Medical</option>
              <option value="pre-engineering">Pre-Engineering</option>
              <option value="computer-science">Computer Science</option>
              <option value="general">General Studies</option>
            </select>
          </div>

          {/* Class Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
            <select 
              value={selectedClass}
              onChange={(e) => onFilterChange('class', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Classes</option>
              {filteredClasses.map(cls => (
                <option key={cls._id} value={cls._id}>
                  {cls.className} - Floor {cls.floor}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">All Status</option>
              <option value="present">Present</option>
              <option value="absent">Absent</option>
              <option value="leave">Leave</option>
            </select>
          </div>

          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Name, phone, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Summary and Export */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-sm text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">{filteredRecords.length}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {filteredRecords.filter(r => r.status === 'Present').length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">
                {filteredRecords.filter(r => r.status === 'Absent').length}
              </p>
            </div>
          </div>
          
          <Button
            onClick={exportToCSV}
            disabled={filteredRecords.length === 0}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        {currentRecords.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Details</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentRecords.map((record, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {record.student.fullName?.firstName?.charAt(0) || 'S'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {record.student.fullName?.firstName} {record.student.fullName?.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            ID: {record.student.studentId || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Phone className="h-4 w-4 text-gray-400" />
                          {record.student.phoneNumber || 'N/A'}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Mail className="h-4 w-4 text-gray-400" />
                          {record.student.email || 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-gray-900">{record.className}</div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <Building className="h-4 w-4 text-gray-400" />
                          {record.campus} - Floor {record.floor}
                        </div>
                        {record.program && (
                          <div className="text-xs text-gray-500">{record.program}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(record.date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getStatusBadge(record.status)}`}>
                        {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Records Found</h3>
            <p className="text-gray-600">
              No student attendance records match the current filters.
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-gray-50 px-6 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing {startIndex + 1} to {Math.min(endIndex, filteredRecords.length)} of {filteredRecords.length} results
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                Previous
              </Button>
              
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              
              <Button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Student Search Modal */}
      {showStudentSearch && (
        <StudentSearchPage 
          onClose={() => setShowStudentSearch(false)}
          onStudentSelect={(student) => {
            setSelectedStudent(student);
            setShowStudentDetails(true);
            setShowStudentSearch(false);
          }}
        />
      )}

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <StudentDetailsModal 
          student={selectedStudent}
          onClose={() => {
            setShowStudentDetails(false);
            setSelectedStudent(null);
          }}
        />
      )}
    </div>
  );
};

export default AttendanceDetails;
