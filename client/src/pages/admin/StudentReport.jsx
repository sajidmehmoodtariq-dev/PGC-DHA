import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '../../components/ui/button';
import Card from '../../components/ui/card';
import { default as api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import { FileDown, FileSpreadsheet, FileText, CalendarDays, AlertTriangle } from 'lucide-react';
import DateFilter from '../../components/enquiry/DateFilter';
import CustomDateRange from '../../components/enquiry/CustomDateRange';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useDebounce } from '../../hooks/usePerformance';

const STAGE_LABELS = [
  'Not Purchased',
  'Purchased',
  'Returned',
  'Admission Fee Submitted',
  '1st Installment Submitted'
];

// Helper function to extract notes from remark text
const extractNotesFromRemark = (remark) => {
  if (!remark) return 'No notes';
  
  // Check if this is a level change remark
  const notesMatch = remark.match(/Notes:\s*(.+)$/);
  if (notesMatch && notesMatch[1]) {
    return notesMatch[1].trim();
  }
  
  // If it's not a level change remark, return the full remark
  return remark;
};

const StudentReport = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Simple data states without pagination
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [statistics, setStatistics] = useState(null);
  
  const [error, setError] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [cnicFilter, setCnicFilter] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  
  // Date filter states
  const [selectedDate, setSelectedDate] = useState('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [customDatesApplied, setCustomDatesApplied] = useState(false);
  const [isCustomDateLoading, setIsCustomDateLoading] = useState(false);
  
  // Non-progression filter states
  const [showNonProgression, setShowNonProgression] = useState(false);
  const [progressionLevel, setProgressionLevel] = useState('');

  const debouncedSearchTerm = useDebounce(nameFilter, 400);

  // Non-progression filter handlers
  const handleNonProgressionToggle = () => {
    const newShowNonProgression = !showNonProgression;
    setShowNonProgression(newShowNonProgression);
    
    if (newShowNonProgression) {
      // When enabling non-progression filter, reset stage filter to avoid confusion
      setStageFilter('');
      if (!progressionLevel) {
        setProgressionLevel('2'); // Default to Level 2
      }
    } else {
      // When disabling non-progression filter, reset stage filter to show cumulative data clearly
      setStageFilter('');
    }
  };

  const handleProgressionLevelChange = (level) => {
    setProgressionLevel(level);
  };

  const dateFilters = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Build immutable fetch params based on current filters
  const queryParams = useMemo(() => {
    const p = {};
    
    // Always include role parameter for consistent API calls
    p.role = 'Student';
    
    // Date filter
    if (selectedDate !== 'all' && selectedDate !== 'custom') {
      p.dateFilter = selectedDate;
    } else if (selectedDate === 'custom' && customStartDate && customEndDate && customDatesApplied) {
      p.dateFilter = 'custom';
      p.startDate = customStartDate;
      p.endDate = customEndDate;
    }
    
    // Non-progression
    if (showNonProgression && progressionLevel) {
      p.nonProgression = 'true';
      p.progressionLevel = progressionLevel;
    } else {
      // Stage/Level filters (cumulative in normal mode)
      if (stageFilter) {
        p.minLevel = stageFilter;
      }
    }
    
    // Gender filter (apply regardless of progression mode)
    if (genderFilter) {
      p.gender = genderFilter;
    }
    
    // Search (name, cnic)
    if (debouncedSearchTerm?.trim() || cnicFilter?.trim()) {
      let searchTerms = [];
      if (debouncedSearchTerm?.trim()) searchTerms.push(debouncedSearchTerm.trim());
      if (cnicFilter?.trim()) searchTerms.push(cnicFilter.trim());
      p.search = searchTerms.join(' ');
    }
    
    // Exclude students with class assignments for IT role users
    if (user?.role === 'IT') {
      p.excludeClassAssigned = 'true';
    }
    
    return p;
  }, [selectedDate, customStartDate, customEndDate, customDatesApplied, showNonProgression, progressionLevel, stageFilter, genderFilter, debouncedSearchTerm, cnicFilter, user?.role]);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const params = {
        ...queryParams,
        limit: 10000, // High limit to get all students
        sortBy: 'createdOn',
        sortOrder: 'desc'
      };
      
      params.role = 'Student';
      
      const response = await api.get('/users', { params });
      const data = response.data?.data?.users || response.data?.data || [];
      const pagination = response.data?.pagination;
      
      setStudents(data);
      setTotalStudents(pagination?.totalDocs || pagination?.totalUsers || data.length);
      
      // Update statistics if available
      if (response.data?.statistics) {
        setStatistics(response.data.statistics);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      setStudents([]);
      setError('Failed to fetch students');
    } finally {
      setLoading(false);
    }
  }, [queryParams]);

  // Initial and filter-driven load
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Manual refresh handler
  const refreshStudents = useCallback(async () => {
    await fetchStudents();
  }, [fetchStudents]);

  // Date filter handlers
  const handleDateChange = (dateValue) => {
    setSelectedDate(dateValue);
    if (dateValue !== 'custom') {
      setCustomDatesApplied(false);
      // Reset custom dates when switching away from custom
      setCustomStartDate('');
      setCustomEndDate('');
    }
  };

  const handleStartDateChange = (date) => {
    setCustomStartDate(date);
    // Don't trigger API call on date input changes
  };

  const handleEndDateChange = (date) => {
    setCustomEndDate(date);
    // Don't trigger API call on date input changes
  };

  const handleApplyCustomDates = async () => {
    if (!customStartDate || !customEndDate) {
      toast.error('Please select both start and end dates');
      return;
    }
    
    setIsCustomDateLoading(true);
    setCustomDatesApplied(true);
    // The useEffect will trigger fetchStudents when customDatesApplied changes
    setTimeout(() => {
      setIsCustomDateLoading(false);
    }, 500);
  };

  // Export functions
  const exportToPDF = () => {
    const doc = new jsPDF('l', 'pt', 'a4');
    
    const headers = [['Name', 'CNIC', 'Phone', 'Gender', 'Level', 'Program', 'Created On']];
    const data = students.map(student => [
      student.fullName?.firstName + ' ' + student.fullName?.lastName || '',
      student.cnic || '',
      student.phoneNumber || '',
      student.gender || '',
      student.prospectusStage || student.enquiryLevel || '1',
      student.program || '',
      new Date(student.createdOn).toLocaleDateString()
    ]);

    autoTable(doc, {
      head: headers,
      body: data,
      startY: 60,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [66, 139, 202] }
    });

    doc.text('Student Report', 40, 40);
    doc.text(`Total Students: ${totalStudents}`, 40, 55);
    doc.save('student-report.pdf');
    toast.success('PDF exported successfully');
  };

  const exportToExcel = () => {
    const worksheetData = students.map(student => ({
      'Full Name': student.fullName?.firstName + ' ' + student.fullName?.lastName || '',
      'CNIC': student.cnic || '',
      'Phone Number': student.phoneNumber || '',
      'Secondary Phone': student.secondaryPhone || '',
      'Gender': student.gender || '',
      'Date of Birth': student.dob ? new Date(student.dob).toLocaleDateString() : '',
      'Level': student.prospectusStage || student.enquiryLevel || '1',
      'Program': student.program || '',
      'Address': student.address || '',
      'Reference': student.reference || '',
      'Previous School': student.previousSchool || '',
      'Father Name': student.fatherName || '',
      'Created On': new Date(student.createdOn).toLocaleDateString(),
      'Updated On': new Date(student.updatedOn).toLocaleDateString(),
      'Latest Notes': extractNotesFromRemark(student.latestRemark?.remark)
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    XLSX.writeFile(workbook, 'student-report.xlsx');
    toast.success('Excel file exported successfully');
  };

  const exportToCSV = () => {
    const csvData = students.map(student => ({
      'Full Name': student.fullName?.firstName + ' ' + student.fullName?.lastName || '',
      'CNIC': student.cnic || '',
      'Phone Number': student.phoneNumber || '',
      'Secondary Phone': student.secondaryPhone || '',
      'Gender': student.gender || '',
      'Date of Birth': student.dob ? new Date(student.dob).toLocaleDateString() : '',
      'Level': student.prospectusStage || student.enquiryLevel || '1',
      'Program': student.program || '',
      'Address': student.address || '',
      'Reference': student.reference || '',
      'Previous School': student.previousSchool || '',
      'Father Name': student.fatherName || '',
      'Created On': new Date(student.createdOn).toLocaleDateString(),
      'Updated On': new Date(student.updatedOn).toLocaleDateString(),
      'Latest Notes': extractNotesFromRemark(student.latestRemark?.remark)
    }));

    const worksheet = XLSX.utils.json_to_sheet(csvData);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'student-report.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV file exported successfully');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Student Report</h1>
          <div className="flex gap-2">
            <Button
              onClick={refreshStudents}
              variant="outline"
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              onClick={exportToPDF}
              variant="outline"
              disabled={students.length === 0}
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              disabled={students.length === 0}
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Excel
            </Button>
            <Button
              onClick={exportToCSV}
              variant="outline"
              disabled={students.length === 0}
            >
              <FileDown className="w-4 h-4 mr-2" />
              CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name Search
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by name..."
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNIC Search
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Search by CNIC..."
                value={cnicFilter}
                onChange={(e) => setCnicFilter(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gender
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={genderFilter}
                onChange={(e) => setGenderFilter(e.target.value)}
              >
                <option value="">All Genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum Level
              </label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={stageFilter}
                onChange={(e) => setStageFilter(e.target.value)}
              >
                <option value="">All Levels</option>
                <option value="1">Level 1+</option>
                <option value="2">Level 2+</option>
                <option value="3">Level 3+</option>
                <option value="4">Level 4+</option>
                <option value="5">Level 5 (Admitted)</option>
              </select>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 items-center">
            <DateFilter
              selectedDate={selectedDate}
              dateFilters={dateFilters}
              onDateChange={handleDateChange}
            />

            {selectedDate === 'custom' && (
              <CustomDateRange
                startDate={customStartDate}
                endDate={customEndDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onApply={handleApplyCustomDates}
                isLoading={isCustomDateLoading}
              />
            )}

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="nonProgression"
                checked={showNonProgression}
                onChange={handleNonProgressionToggle}
                className="w-4 h-4 text-orange-600 bg-gray-100 border-gray-300 rounded focus:ring-orange-500 focus:ring-2"
              />
              <label htmlFor="nonProgression" className="flex items-center space-x-2 text-sm font-medium text-gray-700">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span>Show Non-Progressed Students</span>
              </label>
            </div>

            {showNonProgression && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">From Level:</span>
                <select
                  value={progressionLevel}
                  onChange={(e) => handleProgressionLevelChange(e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="">Select Level</option>
                  <option value="2">Level 2 (didn't progress from Level 1)</option>
                  <option value="3">Level 3 (didn't progress from Level 2)</option>
                  <option value="4">Level 4 (didn't progress from Level 3)</option>
                  <option value="5">Level 5 (didn't progress from Level 4)</option>
                </select>
              </div>
            )}
          </div>
          
          {showNonProgression && progressionLevel && (
            <div className="mt-2 text-sm text-orange-600 bg-orange-50 p-2 rounded-lg">
              <AlertTriangle className="w-4 h-4 inline mr-1" />
              Showing students who did not progress to Level {progressionLevel}
            </div>
          )}
        </Card>

        {/* Summary Statistics */}
        <Card className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">Total Students:</span>
              <span className="text-2xl font-bold text-blue-600">{totalStudents}</span>
            </div>
            {statistics && (
              <div className="flex gap-6 text-sm text-gray-600">
                <span>Level 1: {statistics.level1 || 0}</span>
                <span>Level 2: {statistics.level2 || 0}</span>
                <span>Level 3: {statistics.level3 || 0}</span>
                <span>Level 4: {statistics.level4 || 0}</span>
                <span>Level 5: {statistics.level5 || 0}</span>
              </div>
            )}
          </div>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="p-4 bg-red-50 border border-red-200">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          </Card>
        )}

        {/* Students Table */}
        <Card className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CNIC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Phone
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Gender
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Level
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Program
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created On
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Latest Notes
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {students.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center text-gray-500">
                        No students found
                      </td>
                    </tr>
                  ) : (
                    students.map((student) => (
                      <tr key={student._id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.fullName?.firstName} {student.fullName?.lastName}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.cnic}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.phoneNumber}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.gender}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            student.prospectusStage === 5 || student.enquiryLevel === 5 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            Level {student.prospectusStage || student.enquiryLevel || 1}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {student.program}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(student.createdOn).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900 max-w-xs truncate">
                          {extractNotesFromRemark(student.latestRemark?.remark)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default StudentReport;
