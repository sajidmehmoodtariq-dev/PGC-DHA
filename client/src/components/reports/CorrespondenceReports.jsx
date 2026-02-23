import React, { useState, useEffect } from 'react';
import { Mail, GraduationCap, MessageSquare, Download, Search, Filter, Eye } from 'lucide-react';
import PermissionGuard from '../PermissionGuard';
import api from '../../services/api';
import { Button } from '../ui/button';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { PERMISSIONS } from '../../utils/rolePermissions';

const CorrespondenceReports = ({ config }) => {
  const [activeCorrespondenceType, setActiveCorrespondenceType] = useState('enquiry');

  const correspondenceTypes = [
    { 
      id: 'enquiry', 
      name: 'Enquiry Correspondence', 
      description: 'Communication with prospective students and families during enquiry stage',
      icon: MessageSquare,
      color: 'from-blue-500 to-blue-600'
    },
    { 
      id: 'student', 
      name: 'Student Correspondence', 
      description: 'Communication with enrolled students regarding attendance, exams, behavior, etc.',
      icon: GraduationCap,
      color: 'from-green-500 to-green-600'
    }
  ];

  const renderCorrespondenceContent = () => {
    switch (activeCorrespondenceType) {
      case 'enquiry':
        return <EnquiryCorrespondenceReport config={config} />;
      case 'student':
        return <StudentCorrespondenceReport config={config} />;
      default:
        return <EnquiryCorrespondenceReport config={config} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <Mail className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Correspondence Reports</h2>
            <p className="text-sm text-gray-600">
              Track and analyze all communication activities
            </p>
          </div>
        </div>

        {/* Correspondence Type Navigation */}
        <div className="flex flex-wrap gap-2">
          {correspondenceTypes.map((type) => {
            const Icon = type.icon;
            const isActive = activeCorrespondenceType === type.id;
            
            return (
              <button
                key={type.id}
                onClick={() => setActiveCorrespondenceType(type.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  isActive 
                    ? `bg-gradient-to-r ${type.color} text-white shadow-md` 
                    : 'text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                {type.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      {renderCorrespondenceContent()}
    </div>
  );
};

// Enquiry Correspondence Report Component
const EnquiryCorrespondenceReport = ({ config }) => {
  const [correspondenceData, setCorrespondenceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    stage: 'all',
    gender: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

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

  useEffect(() => {
    fetchEnquiryCorrespondence();
  }, []);

  const fetchEnquiryCorrespondence = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/students/remarks');
      if (response && response.data) {
        const studentsWithCorrespondence = response.data
          .filter(student => 
            student.receptionistRemarks && 
            student.receptionistRemarks.length > 0
          )
          .map(student => ({
            ...student,
            totalRemarks: student.receptionistRemarks.length,
            latestRemark: student.receptionistRemarks[student.receptionistRemarks.length - 1],
            firstContact: student.receptionistRemarks[0],
            lastContact: student.receptionistRemarks[student.receptionistRemarks.length - 1]
          }));
        
        setCorrespondenceData(studentsWithCorrespondence);
      }
    } catch (err) {
      console.error('Failed to fetch enquiry correspondence:', err);
      setError('Failed to load correspondence data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  };

  // Filter correspondence data (cumulative approach)
  const filteredData = correspondenceData.filter(student => {
    // Cumulative level match - Level 2 includes Level 3 students, etc.
    const currentLevel = student.prospectusStage || 1;
    const matchesStage = filters.stage === 'all' || currentLevel >= parseInt(filters.stage);
    const matchesGender = filters.gender === 'all' || (student.gender && student.gender.toLowerCase() === filters.gender.toLowerCase());
    const matchesSearch = !filters.searchTerm || 
      `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(filters.searchTerm.toLowerCase()));
    
    // Date range filtering
    if (filters.dateRange !== 'all') {
      const daysAgo = parseInt(filters.dateRange);
      let cutoffDate = new Date();
      
      if (daysAgo === 1) {
        cutoffDate.setHours(0, 0, 0, 0);
      } else {
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      }
      
      const hasRecentContact = student.receptionistRemarks.some(remark => 
        new Date(remark.timestamp) >= cutoffDate
      );
      
      if (!hasRecentContact) return false;
    }
    
    return matchesStage && matchesGender && matchesSearch;
  });

  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Enquiry Correspondence Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Records: ${filteredData.length}`, 14, 36);

    const tableData = filteredData.map(student => [
      `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
      student.email || 'N/A',
      student.totalRemarks.toString(),
      student.firstContact ? new Date(student.firstContact.timestamp).toLocaleDateString() : 'N/A',
      student.lastContact ? new Date(student.lastContact.timestamp).toLocaleDateString() : 'N/A',
      student.lastContact ? extractNotesFromRemark(student.lastContact.remark).substring(0, 50) + '...' : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Student Name', 'Email', 'Total Contacts', 'First Contact', 'Last Contact', 'Latest Remark']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save('enquiry-correspondence-report.pdf');
  };

  const exportExcel = () => {
    const excelData = filteredData.map(student => ({
      'Student Name': `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
      'Email': student.email || 'N/A',
      'Phone': student.phone || 'N/A',
      'Course': student.course || 'N/A',
      'Gender': student.gender || 'N/A',
      'Total Contacts': student.totalRemarks,
      'First Contact Date': student.firstContact ? new Date(student.firstContact.timestamp).toLocaleDateString() : 'N/A',
      'Last Contact Date': student.lastContact ? new Date(student.lastContact.timestamp).toLocaleDateString() : 'N/A',
      'Latest Remark': student.lastContact ? extractNotesFromRemark(student.lastContact.remark) : 'N/A',
      'Receptionist': student.lastContact ? student.lastContact.receptionistName : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Enquiry Correspondence');
    XLSX.writeFile(workbook, 'enquiry-correspondence-report.xlsx');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading correspondence data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchEnquiryCorrespondence} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Filters */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filters.stage}
                onChange={(e) => setFilters(prev => ({ ...prev, stage: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Stages</option>
                <option value="1">Stage 1</option>
                <option value="2">Stage 2</option>
                <option value="3">Stage 3</option>
                <option value="4">Stage 4</option>
                <option value="5">Stage 5</option>
              </select>
            </div>
          </div>
          <div className="lg:w-48">
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Time</option>
              <option value="1">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>

        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Showing {filteredData.length} of {correspondenceData.length} records
          </p>
          <PermissionGuard permission={PERMISSIONS.REPORTS.EXPORT_REPORTS}>
            {config?.canExport && (
              <div className="flex gap-2">
                <Button onClick={exportExcel} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Excel
                </Button>
                <Button onClick={exportPDF} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </div>
            )}
          </PermissionGuard>
        </div>
      </div>

      {/* Results Table */}
      {filteredData.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-gray-600">No correspondence records found matching your criteria.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Remark</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredData.map((student, index) => (
                <tr key={student.id || index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {`${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim() || 'N/A'}
                      </div>
                      <div className="text-sm text-gray-500">{student.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {student.totalRemarks} contacts
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.firstContact ? new Date(student.firstContact.timestamp).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.lastContact ? new Date(student.lastContact.timestamp).toLocaleDateString() : 'N/A'}
                    {student.lastContact && (
                      <div className="text-xs text-gray-500 mt-1">
                        by {student.lastContact.receptionistName || 'Unknown'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 max-w-xs truncate">
                      {student.lastContact ? extractNotesFromRemark(student.lastContact.remark) : 'No remarks'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={() => handleViewDetails(student)}
                      className="text-blue-600 hover:text-blue-900 flex items-center gap-1 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl flex-shrink-0">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-bold">
                    Complete Correspondence History
                  </h3>
                  <p className="text-blue-100 mt-1">
                    {selectedStudent.fullName?.firstName} {selectedStudent.fullName?.lastName}
                  </p>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content with Scroll */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                  <div>
                    <span className="text-sm font-medium text-gray-600">Email:</span>
                    <p className="text-sm text-gray-900">{selectedStudent.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Phone:</span>
                    <p className="text-sm text-gray-900">{selectedStudent.phoneNumber || 'Not provided'}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-600">Stage:</span>
                    <p className="text-sm text-gray-900">Stage {selectedStudent.prospectusStage || 1}</p>
                  </div>
                </div>
              </div>

              {/* Correspondence Timeline */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 text-lg border-b pb-2">
                  Correspondence Timeline ({selectedStudent.receptionistRemarks?.length || 0} records)
                </h4>
                
                {selectedStudent.receptionistRemarks && selectedStudent.receptionistRemarks.length > 0 ? (
                  <div className="space-y-3">
                    {selectedStudent.receptionistRemarks
                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                      .map((remark, index) => (
                        <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                              <span className="font-medium text-gray-900">
                                {remark.receptionistName || 'Unknown Staff'}
                              </span>
                            </div>
                            <span className="text-sm text-gray-500">
                              {remark.timestamp ? new Date(remark.timestamp).toLocaleString() : 'No date'}
                            </span>
                          </div>
                          <div className="ml-4">
                            <p className="text-gray-700 whitespace-pre-wrap">
                              {extractNotesFromRemark(remark.remark)}
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>No correspondence records found</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end rounded-b-2xl flex-shrink-0">
              <Button onClick={closeDetailsModal} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Student Correspondence Report Component
const StudentCorrespondenceReport = ({ config }) => {
  const [correspondenceData, setCorrespondenceData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [filters, setFilters] = useState({
    grade: 'all',
    campus: 'all',
    dateRange: 'all',
    searchTerm: ''
  });

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

  useEffect(() => {
    fetchStudentCorrespondence();
  }, []);

  const fetchStudentCorrespondence = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/students/remarks');
      if (response && response.data) {
        // Filter for admitted students (enquiry level 5) with correspondence
        const admittedStudentsWithCorrespondence = response.data
          .filter(student => 
            (student.enquiryLevel || student.prospectusStage || student.level || 1) >= 5 &&
            student.receptionistRemarks && 
            student.receptionistRemarks.length > 0
          )
          .map(student => ({
            ...student,
            totalRemarks: student.receptionistRemarks.length,
            latestRemark: student.receptionistRemarks[student.receptionistRemarks.length - 1],
            firstContact: student.receptionistRemarks[0],
            lastContact: student.receptionistRemarks[student.receptionistRemarks.length - 1]
          }));
        
        setCorrespondenceData(admittedStudentsWithCorrespondence);
      }
    } catch (err) {
      console.error('Failed to fetch student correspondence:', err);
      setError('Failed to load correspondence data');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (student) => {
    setSelectedStudent(student);
    setShowDetailsModal(true);
  };

  const closeDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedStudent(null);
  };

  // Filter correspondence data
  const filteredData = correspondenceData.filter(student => {
    const matchesGrade = filters.grade === 'all' || (student.admissionInfo?.grade === filters.grade);
    const matchesCampus = filters.campus === 'all' || (student.campus === filters.campus);
    const matchesSearch = !filters.searchTerm || 
      `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(filters.searchTerm.toLowerCase()));
    
    // Date range filtering
    if (filters.dateRange !== 'all') {
      const daysAgo = parseInt(filters.dateRange);
      let cutoffDate = new Date();
      
      if (daysAgo === 1) {
        cutoffDate.setHours(0, 0, 0, 0);
      } else {
        cutoffDate.setDate(cutoffDate.getDate() - daysAgo);
      }
      
      const hasRecentContact = student.receptionistRemarks.some(remark => 
        new Date(remark.timestamp) >= cutoffDate
      );
      
      if (!hasRecentContact) return false;
    }
    
    return matchesGrade && matchesCampus && matchesSearch;
  });

  // Export functions
  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Student Correspondence Report', 14, 22);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);
    doc.text(`Total Records: ${filteredData.length}`, 14, 36);

    const tableData = filteredData.map(student => [
      `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
      student.email || 'N/A',
      student.admissionInfo?.grade || 'N/A',
      student.campus || 'N/A',
      student.totalRemarks.toString(),
      student.firstContact ? new Date(student.firstContact.timestamp).toLocaleDateString() : 'N/A',
      student.lastContact ? new Date(student.lastContact.timestamp).toLocaleDateString() : 'N/A',
      student.lastContact ? extractNotesFromRemark(student.lastContact.remark).substring(0, 40) + '...' : 'N/A'
    ]);

    autoTable(doc, {
      head: [['Student Name', 'Email', 'Grade', 'Campus', 'Total Contacts', 'First Contact', 'Last Contact', 'Latest Remark']],
      body: tableData,
      startY: 45,
      styles: { fontSize: 7 },
      headStyles: { fillColor: [34, 197, 94] }
    });

    doc.save('student-correspondence-report.pdf');
  };

  const exportExcel = () => {
    const excelData = filteredData.map(student => ({
      'Student Name': `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
      'Email': student.email || 'N/A',
      'Phone': student.phoneNumber || 'N/A',
      'Grade': student.admissionInfo?.grade || 'N/A',
      'Campus': student.campus || 'N/A',
      'Class': student.admissionInfo?.className || 'N/A',
      'Gender': student.gender || 'N/A',
      'Total Contacts': student.totalRemarks,
      'First Contact Date': student.firstContact ? new Date(student.firstContact.timestamp).toLocaleDateString() : 'N/A',
      'Last Contact Date': student.lastContact ? new Date(student.lastContact.timestamp).toLocaleDateString() : 'N/A',
      'Latest Remark': student.lastContact ? extractNotesFromRemark(student.lastContact.remark) : 'N/A',
      'Receptionist': student.lastContact ? student.lastContact.receptionistName : 'N/A'
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Correspondence');
    XLSX.writeFile(workbook, 'student-correspondence-report.xlsx');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading student correspondence data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Data</h3>
        <p className="text-gray-600 mb-4">{error}</p>
        <Button onClick={fetchStudentCorrespondence} variant="outline">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <GraduationCap className="h-6 w-6 text-green-500" />
            <div>
              <h3 className="text-xl font-bold text-gray-900">Student Correspondence Report</h3>
              <p className="text-sm text-gray-600">Communication records for enrolled students</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={exportPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={exportExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={filters.searchTerm}
                onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="lg:w-48">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <select
                value={filters.grade}
                onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              >
                <option value="all">All Grades</option>
                <option value="11th">11th Grade</option>
                <option value="12th">12th Grade</option>
              </select>
            </div>
          </div>
          <div className="lg:w-48">
            <select
              value={filters.campus}
              onChange={(e) => setFilters(prev => ({ ...prev, campus: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Campus</option>
              <option value="Boys">Boys Campus</option>
              <option value="Girls">Girls Campus</option>
            </select>
          </div>
          <div className="lg:w-48">
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
            >
              <option value="all">All Time</option>
              <option value="1">Today</option>
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-500 rounded-lg flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-green-600 font-medium">Total Students</p>
                <p className="text-2xl font-bold text-green-900">{filteredData.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-500 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Contacts</p>
                <p className="text-2xl font-bold text-blue-900">
                  {filteredData.reduce((acc, student) => acc + student.totalRemarks, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-500 rounded-lg flex items-center justify-center">
                <Calendar className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-orange-600 font-medium">Avg. Contacts</p>
                <p className="text-2xl font-bold text-orange-900">
                  {filteredData.length > 0 ? 
                    Math.round(filteredData.reduce((acc, student) => acc + student.totalRemarks, 0) / filteredData.length) 
                    : 0}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-500 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-purple-600 font-medium">Recent Activity</p>
                <p className="text-2xl font-bold text-purple-900">
                  {filteredData.filter(student => {
                    if (!student.lastContact) return false;
                    const lastContactDate = new Date(student.lastContact.timestamp);
                    const sevenDaysAgo = new Date();
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return lastContactDate >= sevenDaysAgo;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Student</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Grade & Campus</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Contact Info</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Correspondence</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Latest Activity</th>
              <th className="text-left py-3 px-6 font-medium text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredData.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-gray-500">
                  <GraduationCap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-lg font-medium">No student correspondence found</p>
                  <p className="text-sm">Students with correspondence records will appear here</p>
                </td>
              </tr>
            ) : (
              filteredData.map((student) => (
                <tr key={student._id} className="hover:bg-gray-50">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <span className="text-white font-medium text-sm">
                          {(student.fullName?.firstName?.[0] || '') + (student.fullName?.lastName?.[0] || '')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {`${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim()}
                        </p>
                        <p className="text-sm text-gray-500">ID: {student._id?.slice(-6) || 'N/A'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        {student.admissionInfo?.grade || 'N/A'}
                      </span>
                      <p className="text-sm text-gray-600 mt-1">{student.campus || 'N/A'}</p>
                      {student.admissionInfo?.className && (
                        <p className="text-xs text-gray-500">{student.admissionInfo.className}</p>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm">
                      <p className="text-gray-900">{student.email || 'No email'}</p>
                      <p className="text-gray-500">{student.phoneNumber || 'No phone'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {student.totalRemarks} contact{student.totalRemarks !== 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-gray-500">
                        First: {student.firstContact ? new Date(student.firstContact.timestamp).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="text-sm text-gray-900">
                        {student.lastContact ? new Date(student.lastContact.timestamp).toLocaleDateString() : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-xs">
                        {student.lastContact ? extractNotesFromRemark(student.lastContact.remark) : 'No recent activity'}
                      </p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <Button
                      onClick={() => handleViewDetails(student)}
                      variant="outline"
                      size="sm"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-medium">
                      {(selectedStudent.fullName?.firstName?.[0] || '') + (selectedStudent.fullName?.lastName?.[0] || '')}
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      {`${selectedStudent.fullName?.firstName || ''} ${selectedStudent.fullName?.lastName || ''}`.trim()}
                    </h3>
                    <p className="text-sm text-gray-600">Student Correspondence History</p>
                  </div>
                </div>
                <button
                  onClick={closeDetailsModal}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-4">
                {selectedStudent.receptionistRemarks.map((remark, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {remark.receptionistName || 'Unknown Staff'}
                        </span>
                        <span className="text-xs text-gray-500">
                          #{selectedStudent.receptionistRemarks.length - index}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(remark.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-gray-700">
                      {extractNotesFromRemark(remark.remark)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CorrespondenceReports;
