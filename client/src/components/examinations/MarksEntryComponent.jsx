import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Edit, 
  Save, 
  X, 
  CheckCircle,
  AlertCircle,
  Calendar,
  Clock,
  Users,
  FileText
} from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';

const MarksEntryComponent = () => {
  const [assignedTests, setAssignedTests] = useState([]);
  const [selectedTest, setSelectedTest] = useState(null);
  const [marksData, setMarksData] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const studentsPerPage = 20;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showMarksForm, setShowMarksForm] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchAssignedTests();
  }, []);

  const fetchAssignedTests = async () => {
    setLoading(true);
    try {
      const teacherId = user?._id || user?.id;
      
      if (!teacherId) {
        console.error('No teacher ID found in user object');
        setLoading(false);
        return;
      }
      
      // Fetch tests assigned to current teacher for marks entry
      const response = await api.get(`/examinations/tests?teacherId=${teacherId}&forMarksEntry=true`);
      const tests = response.data?.data || [];
      
      if (tests.length > 0) {
        console.log('Sample test:', tests[0]);
        console.log('Sample test assignedTeacher:', tests[0].assignedTeacher);
      }
      
      // Filter tests that are past their test date but within marks entry deadline
      const testsRequiringMarks = tests.filter(test => {
        const testDate = new Date(test.testDate);
        const marksDeadline = new Date(test.marksEntryDeadline || testDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        const now = new Date();
        const isPastTestDate = testDate < now;
        const isWithinDeadline = marksDeadline > now;
        
        console.log(`Test ${test.title}:`, {
          testDate: testDate.toISOString(),
          marksDeadline: marksDeadline.toISOString(),
          now: now.toISOString(),
          isPastTestDate,
          isWithinDeadline,
          shouldInclude: isPastTestDate && isWithinDeadline
        });
        
        return isPastTestDate && isWithinDeadline;
      });
      
      console.log('Tests requiring marks entry:', testsRequiringMarks.length);
      setAssignedTests(testsRequiringMarks);
    } catch (error) {
      console.error('Error fetching assigned tests:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied: You are not authorized to view tests');
      } else {
        toast.error('Failed to fetch assigned tests');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTestSelect = async (test) => {
    setSelectedTest(test);
    setLoading(true);
    
    try {
      // Fetch students in the test's class
      const studentsResponse = await api.get(`/students?classId=${test.classId._id}`);
      const classStudents = studentsResponse.data?.data || [];
      
      // Fetch existing test results
      const resultsResponse = await api.get(`/examinations/tests/${test._id}/results`);
      const existingResults = resultsResponse.data?.data || [];
      
      // Create marks data array
      const marksArray = classStudents.map(student => {
        const existingResult = existingResults.find(result => result.studentId._id === student._id);
        return {
          studentId: student._id,
          student: student,
          obtainedMarks: existingResult?.obtainedMarks || '',
          isAbsent: existingResult?.isAbsent || false,
          remarks: existingResult?.remarks || '',
          hasResult: !!existingResult
        };
      });
      
  setMarksData(marksArray);
  setCurrentPage(1);
  setShowMarksForm(true);
    } catch (error) {
      console.error('Error fetching test data:', error);
      if (error.response?.status === 403) {
        toast.error('Access denied: You are not authorized to access this test');
      } else {
        toast.error('Failed to fetch test data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMarksChange = (studentId, field, value) => {
    setMarksData(prev => prev.map(entry => 
      entry.studentId === studentId 
        ? { ...entry, [field]: value }
        : entry
    ));
  };

  const calculateGrade = (obtainedMarks, totalMarks) => {
    const percentage = (obtainedMarks / totalMarks) * 100;
    if (percentage >= 90) return 'A+';
    if (percentage >= 80) return 'A';
    if (percentage >= 70) return 'B+';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C+';
    if (percentage >= 40) return 'C';
    if (percentage >= 33) return 'D';
    return 'F';
  };

  const filteredStudents = marksData.filter(entry =>
    entry.student.fullName?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.student.fullName?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.student.rollNumber?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredStudents.length / studentsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * studentsPerPage, currentPage * studentsPerPage);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!showMarksForm ? (
        // Tests List View
        <div>
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Tests Requiring Marks Entry</h2>
            <p className="text-gray-600 mb-4">
              Select a test to enter marks. Only tests past their test date but within marks entry deadline are shown.
            </p>
            
            {assignedTests.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Tests Requiring Marks Entry</h3>
                <p className="text-gray-600">All assigned tests have been graded or are not yet ready for marking.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {assignedTests.map(test => (
                  <div
                    key={test._id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => handleTestSelect(test)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">{test.title}</h3>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center">
                            <FileText className="h-4 w-4 mr-1" />
                            {test.subject}
                          </span>
                          <span className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {test.classId.name}
                          </span>
                          <span className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(test.testDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Deadline: {new Date(test.marksEntryDeadline).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">
                          Total: {test.totalMarks} marks
                        </div>
                        <div className="text-sm text-blue-600 font-medium">
                          Click to enter marks →
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        // Marks Entry Form
        <div>
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Enter Marks: {selectedTest.title}
                </h2>
                <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                  <span>{selectedTest.subject}</span>
                  <span>{selectedTest.classId.name}</span>
                  <span>Total Marks: {selectedTest.totalMarks}</span>
                  <span>Students: {marksData.length}</span>
                </div>
              </div>
              <Button
                onClick={() => setShowMarksForm(false)}
                variant="outline"
              >
                <X className="h-4 w-4 mr-2" />
                Back to Tests
              </Button>
            </div>

            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Marks Entry Table */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Roll Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Obtained Marks
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Percentage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Grade
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedStudents.map((entry, index) => (
                    <tr key={entry.studentId} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {entry.student.fullName?.firstName} {entry.student.fullName?.lastName}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.student.rollNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="number"
                          min="0"
                          max={selectedTest.totalMarks}
                          value={entry.obtainedMarks}
                          onChange={(e) => handleMarksChange(entry.studentId, 'obtainedMarks', e.target.value)}
                          disabled={entry.isAbsent}
                          className="w-20 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                          placeholder="0"
                        />
                        <span className="text-xs text-gray-500 ml-1">/ {selectedTest.totalMarks}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {entry.isAbsent ? '0%' : 
                         entry.obtainedMarks ? `${((entry.obtainedMarks / selectedTest.totalMarks) * 100).toFixed(1)}%` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          entry.isAbsent ? 'bg-red-100 text-red-800' :
                          entry.obtainedMarks ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {entry.isAbsent ? 'Absent' : 
                           entry.obtainedMarks ? calculateGrade(entry.obtainedMarks, selectedTest.totalMarks) : '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={entry.isAbsent}
                            onChange={(e) => handleMarksChange(entry.studentId, 'isAbsent', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-600">Absent</span>
                        </label>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="text"
                          value={entry.remarks}
                          onChange={(e) => handleMarksChange(entry.studentId, 'remarks', e.target.value)}
                          className="w-32 px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Optional"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-between items-center mt-4">
              <div>
                Page {currentPage} of {totalPages}
              </div>
              <div className="space-x-2">
                <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} variant="outline">Previous</Button>
                <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} variant="outline">Next</Button>
              </div>
              <div>
                Showing {paginatedStudents.length} of {filteredStudents.length} students
              </div>
            </div>

            {/* Submit Button for current page */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={async () => {
                  // Only submit marks for students on current page
                  const pageMarks = paginatedStudents;
                  if (!selectedTest) return;
                  setSaving(true);
                  try {
                    const invalidEntries = pageMarks.filter(entry =>
                      !entry.isAbsent && (
                        entry.obtainedMarks === '' ||
                        entry.obtainedMarks < 0 ||
                        entry.obtainedMarks > selectedTest.totalMarks
                      )
                    );
                    if (invalidEntries.length > 0) {
                      toast.error('Please enter valid marks for all students or mark them as absent');
                      setSaving(false);
                      return;
                    }
                    const resultsToSubmit = pageMarks.map(entry => ({
                      testId: selectedTest._id,
                      studentId: entry.studentId,
                      obtainedMarks: entry.isAbsent ? 0 : parseFloat(entry.obtainedMarks),
                      percentage: entry.isAbsent ? 0 : ((parseFloat(entry.obtainedMarks) / selectedTest.totalMarks) * 100).toFixed(2),
                      isAbsent: entry.isAbsent,
                      remarks: entry.remarks,
                      grade: calculateGrade(entry.isAbsent ? 0 : parseFloat(entry.obtainedMarks), selectedTest.totalMarks)
                    }));
                    const response = await api.post(`/examinations/tests/${selectedTest._id}/results`, {
                      results: resultsToSubmit
                    });
                    if (response.data.success) {
                      toast.success('Marks for this page entered successfully!');
                      // Optionally, refresh marksData for this page
                      // await handleTestSelect(selectedTest);
                    }
                  } catch (error) {
                    console.error('Error submitting marks:', error);
                    toast.error('Failed to submit marks');
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
                className="flex items-center"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving Marks...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Submit Marks for This Page
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarksEntryComponent;
