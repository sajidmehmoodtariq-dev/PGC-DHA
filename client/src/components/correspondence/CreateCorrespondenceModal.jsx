import React, { useState, useEffect } from 'react';
import { X, Phone, Users, Clock, MessageSquare, Send } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const CreateCorrespondenceModal = ({ isOpen, onClose, onCorrespondenceCreated }) => {
  const [formData, setFormData] = useState({
    studentId: '',
    type: 'enquiry',
    subject: '',
    message: '',
    toWhom: 'student', // For admitted students with class
    communicationCategory: 'general' // For admitted students with class
  });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentDropdown, setShowStudentDropdown] = useState(false);
  const { showToast } = useToast();

  // Fallback function for toast if context is not available
  const safeShowToast = (message, type = 'info') => {
    if (showToast && typeof showToast === 'function') {
      showToast(message, type);
    } else {
      console.log(`Toast (${type}): ${message}`);
      // You could also use a different toast library or alert as fallback
      alert(`${type.toUpperCase()}: ${message}`);
    }
  };

  // Communication types with icons and descriptions - for non-admitted students
  const communicationTypes = [
    { 
      value: 'enquiry', 
      label: 'Enquiry Communication',
      icon: MessageSquare,
      description: 'General enquiry or information exchange',
      color: 'text-teal-600 bg-teal-50 border-teal-200'
    },
    { 
      value: 'call', 
      label: 'Phone Call',
      icon: Phone,
      description: 'Telephone conversation record',
      color: 'text-blue-600 bg-blue-50 border-blue-200'
    },
    { 
      value: 'meeting', 
      label: 'Meeting',
      icon: Users,
      description: 'In-person or virtual meeting',
      color: 'text-green-600 bg-green-50 border-green-200'
    },
    { 
      value: 'follow-up', 
      label: 'Follow-up',
      icon: Clock,
      description: 'Follow-up communication or check-in',
      color: 'text-orange-600 bg-orange-50 border-orange-200'
    },
    { 
      value: 'student', 
      label: 'Student Communication',
      icon: MessageSquare,
      description: 'Communication with admitted students',
      color: 'text-purple-600 bg-purple-50 border-purple-200'
    }
  ];

  // To Whom options for admitted students with class
  const toWhomOptions = [
    { value: 'parent', label: 'Parent', icon: Users },
    { value: 'sibling', label: 'Sibling', icon: Users },
    { value: 'student', label: 'Student', icon: MessageSquare }
  ];

  // Communication categories for admitted students with class
  const communicationCategories = [
    { value: 'appreciation', label: 'Appreciation', icon: '👏', color: 'text-green-600 bg-green-50 border-green-200' },
    { value: 'results', label: 'Results', icon: '📊', color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'discipline', label: 'Discipline', icon: '⚠️', color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'attendance', label: 'Attendance', icon: '📅', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'fee', label: 'Fee', icon: '💰', color: 'text-purple-600 bg-purple-50 border-purple-200' }
  ];

  // Fetch students for dropdown
  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      
      // Try multiple approaches to get students
      let response;
      try {
        response = await api.get('/users', {
          params: {
            role: 'Student',
            limit: 500,
            sortBy: 'fullName.firstName',
            sortOrder: 'asc'
          }
        });
      } catch (error) {
        console.log('First attempt failed, trying basic params...');
        response = await api.get('/users', {
          params: {
            role: 'Student'
          }
        });
      }
      
      if (response.data?.success) {
        // Server returns { success, data: { users, pagination, statistics } }
        const payload = response.data;
        let allStudents = [];
        if (Array.isArray(payload?.data?.users)) {
          allStudents = payload.data.users;
        } else if (Array.isArray(payload?.users)) {
          allStudents = payload.users;
        } else if (Array.isArray(payload?.data)) {
          allStudents = payload.data;
        }
        
        // If still empty, fallback to all-students endpoint
        if (!allStudents.length) {
          try {
            const fallbackRes = await api.get('/users/all-students');
            const fbPayload = fallbackRes.data;
            if (Array.isArray(fbPayload?.data?.students)) {
              allStudents = fbPayload.data.students;
            }
          } catch (fbErr) {
            console.error('Fallback fetch /users/all-students failed:', fbErr);
          }
        }
        
        // Sort students by name
        const sortedStudents = (allStudents || []).sort((a, b) => {
          const aName = `${a.fullName?.firstName || ''} ${a.fullName?.lastName || ''}`;
          const bName = `${b.fullName?.firstName || ''} ${b.fullName?.lastName || ''}`;
          return aName.localeCompare(bName);
        });
        
        setStudents(sortedStudents);
              } else {
          console.error('Invalid response structure:', response.data);
          setStudents([]);
          safeShowToast('Failed to load students', 'error');
        }
      } catch (error) {
        console.error('Error fetching students:', error);
        setStudents([]);
        safeShowToast('Failed to load students', 'error');
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStudents();
    } else {
      // Reset form when modal closes
      setFormData({
        studentId: '',
        type: 'enquiry',
        subject: '',
        message: '',
        toWhom: 'student',
        communicationCategory: 'general'
      });
      setSelectedStudent(null);
      setStudentSearch('');
      setShowStudentDropdown(false);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.studentId || !formData.subject.trim() || !formData.message.trim()) {
      safeShowToast('Please fill in all required fields', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Prepare request data based on student status
      const requestData = {
        studentId: formData.studentId,
        subject: formData.subject.trim(),
        message: formData.message.trim()
      };

      // Add additional fields based on student status
      if (isStudentAdmittedWithClass()) {
        requestData.type = 'student'; // For admitted students with class
        requestData.toWhom = formData.toWhom;
        requestData.communicationCategory = formData.communicationCategory;
      } else {
        requestData.type = formData.type;
      }

      const response = await api.post('/correspondence', requestData);

      if (response.data.success) {
        safeShowToast('Communication created successfully', 'success');
        setFormData({
          studentId: '',
          type: 'enquiry',
          subject: '',
          message: '',
          toWhom: 'student',
          communicationCategory: 'general'
        });
        setSelectedStudent(null);
        setStudentSearch('');
        setShowStudentDropdown(false);
        if (onCorrespondenceCreated) {
          onCorrespondenceCreated();
        }
        onClose();
      } else {
        safeShowToast('Failed to create communication', 'error');
      }
    } catch (error) {
      console.error('Error creating correspondence:', error);
      safeShowToast(error.response?.data?.message || 'Failed to create communication', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // If student is selected, find the student details and update selectedStudent
    if (field === 'studentId') {
      const student = students.find(s => s._id === value);
      setSelectedStudent(student || null);
      
      // Reset form fields when student changes
      if (student) {
        setFormData(prev => ({
          ...prev,
          type: 'enquiry',
          toWhom: 'student',
          communicationCategory: 'general',
          subject: '',
          message: ''
        }));
      }
    }
  };

  // Check if selected student is admitted and has class assigned
  const isStudentAdmittedWithClass = () => {
    if (!selectedStudent) return false;
    const isAdmitted = selectedStudent.prospectusStage === 5 || selectedStudent.enquiryLevel === 5;
    const hasClass = selectedStudent.classId && selectedStudent.classId !== null;
    return isAdmitted && hasClass;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Send className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-xl font-bold">New Communication</h3>
                <p className="text-blue-100">Record a new student communication</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Form Container with Scroll */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Student Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Student <span className="text-red-500">*</span>
            </label>
            {studentsLoading ? (
              <div className="flex items-center justify-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
                Loading students...
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value);
                    setShowStudentDropdown(true);
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  placeholder="Search for a student by name or email..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required
                />
                
                {showStudentDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {students
                      .filter(student => {
                        const searchLower = studentSearch.toLowerCase();
                        const studentName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase();
                        const studentEmail = student.email?.toLowerCase() || '';
                        return studentName.includes(searchLower) || studentEmail.includes(searchLower) || searchLower === '';
                      })
                      .slice(0, 50) // Limit to 50 results for performance
                      .map((student) => {
                        const studentName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim();
                        const level = student.prospectusStage || student.enquiryLevel || 1;
                        const isAdmitted = level === 5;
                        const hasClass = student.classId && student.classId !== null;
                        const classInfo = hasClass ? ` - Class Assigned` : '';
                        const statusInfo = isAdmitted ? (hasClass ? ' (Admitted + Class)' : ' (Admitted)') : ` (Level ${level})`;
                        
                        return (
                          <div
                            key={student._id}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, studentId: student._id }));
                              setSelectedStudent(student);
                              setStudentSearch(studentName + statusInfo + classInfo);
                              setShowStudentDropdown(false);
                            }}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="font-medium text-gray-900">{studentName}</div>
                            <div className="text-sm text-gray-600">
                              {statusInfo}{classInfo}
                              {student.email && ` • ${student.email}`}
                              {student.phoneNumber && ` • ${student.phoneNumber}`}
                            </div>
                          </div>
                        );
                      })}
                    
                    {students.filter(student => {
                      const searchLower = studentSearch.toLowerCase();
                      const studentName = `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.toLowerCase();
                      const studentEmail = student.email?.toLowerCase() || '';
                      return studentName.includes(searchLower) || studentEmail.includes(searchLower) || searchLower === '';
                    }).length === 0 && (
                      <div className="px-3 py-2 text-gray-500 text-center">
                        No students found matching your search
                      </div>
                    )}
                  </div>
                )}
                
                {/* Click outside to close dropdown */}
                {showStudentDropdown && (
                  <div
                    className="fixed inset-0 z-5"
                    onClick={() => setShowStudentDropdown(false)}
                  ></div>
                )}
              </div>
            )}
            
            {/* Student Status Info */}
            {selectedStudent && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                <div className="text-sm">
                  <div className="font-medium text-gray-900 mb-1">
                    Selected: {selectedStudent.fullName?.firstName} {selectedStudent.fullName?.lastName}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <span>Level: {selectedStudent.prospectusStage || selectedStudent.enquiryLevel || 1}</span>
                    <span>Status: {isStudentAdmittedWithClass() ? 'Admitted with Class' : (selectedStudent.prospectusStage === 5 || selectedStudent.enquiryLevel === 5) ? 'Admitted (No Class)' : 'Enquiry Stage'}</span>
                    {selectedStudent.classId && <span>Has Class Assignment</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Conditional Form Sections Based on Student Status */}
          {isStudentAdmittedWithClass() ? (
            <>
              {/* To Whom - For admitted students with class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  To Whom <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {toWhomOptions.map((option) => {
                    const Icon = option.icon;
                    const isSelected = formData.toWhom === option.value;
                    
                    return (
                      <div
                        key={option.value}
                        onClick={() => handleInputChange('toWhom', option.value)}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{option.label}</h4>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Communication Category - For admitted students with class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Communication Category <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {communicationCategories.map((category) => {
                    const isSelected = formData.communicationCategory === category.value;
                    
                    return (
                      <div
                        key={category.value}
                        onClick={() => handleInputChange('communicationCategory', category.value)}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${category.color}`}>
                            <span className="text-lg">{category.icon}</span>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{category.label}</h4>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Communication Type - For non-admitted students or students without class */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Communication Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {communicationTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.type === type.value;
                    
                    return (
                      <div
                        key={type.value}
                        onClick={() => handleInputChange('type', type.value)}
                        className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${type.color}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{type.label}</h4>
                            <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subject <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Brief subject or title for this communication"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Detailed description of the communication..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              required
            />
          </div>

          {/* Summary Information */}
          {selectedStudent && (
            <div className="p-4 rounded-lg border bg-gray-50">
              <div className="text-sm">
                <div className="font-medium text-gray-900 mb-2">Communication Summary</div>
                <div className="space-y-1 text-gray-700">
                  <div>Student: {selectedStudent.fullName?.firstName} {selectedStudent.fullName?.lastName}</div>
                  {isStudentAdmittedWithClass() ? (
                    <>
                      <div>To: {toWhomOptions.find(opt => opt.value === formData.toWhom)?.label || 'Student'}</div>
                      <div>Category: {communicationCategories.find(cat => cat.value === formData.communicationCategory)?.label || 'General'}</div>
                      <div>Type: Student Communication (Admitted with Class)</div>
                    </>
                  ) : (
                    <>
                      <div>Type: {communicationTypes.find(type => type.value === formData.type)?.label || 'Enquiry Communication'}</div>
                      <div>Status: {selectedStudent.prospectusStage === 5 || selectedStudent.enquiryLevel === 5 ? 'Admitted Student' : 'Enquiry Student'}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

            {/* Form Actions */}
            <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
              <Button
                type="button"
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Communication'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCorrespondenceModal;
