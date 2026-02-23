import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Edit,
  Trash2,
  Eye,
  Calendar,
  Clock,
  Users,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  Save,
  Copy,
  BookOpen,
  User,
  MapPin
} from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const TestManagementComponent = () => {
  const [tests, setTests] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to safely render teachers
  const renderTeacherOptions = () => {
    if (!Array.isArray(teachers)) {
      console.warn('Teachers is not an array:', teachers);
      return null;
    }
    if (teachers.length === 0) {
      console.log('No teachers found - this might be normal if no teachers exist in the system');
      return null;
    }
    return teachers.map(teacher => (
      <option key={teacher._id} value={teacher._id}>
        {teacher.name || `${teacher.fullName?.firstName} ${teacher.fullName?.lastName}` || 'Unknown Teacher'}
      </option>
    ));
  };
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTest, setSelectedTest] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    classId: '',
    testType: 'Quiz',
    testDate: '',
    duration: 120,
    totalMarks: 100,
    passingMarks: 40,
    syllabusCoverage: '',
    difficulty: 'Medium',
    instructions: '',
    assignedTeacher: '',
    marksEntryDeadline: '',
    allowLateSubmission: false,
    autoCalculateGrades: true
  });

  const { toast } = useToast();

  const subjects = [
    'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Computer Science',
    'English', 'Urdu', 'Islamiat', 'Pakistan Studies', 'Economics'
  ];

  const testTypes = ['Quiz', 'Monthly', 'Mid Term', 'Final Term'];
  const difficulties = ['Easy', 'Medium', 'Hard'];

  useEffect(() => {
    fetchTests();
    fetchClasses();
    fetchTeachers();
  }, [selectedClass, selectedSubject, selectedStatus, searchTerm]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchTests = async () => {
    setLoading(true);
    try {
      const params = {
        search: searchTerm,
        classId: selectedClass !== 'all' ? selectedClass : undefined,
        subject: selectedSubject !== 'all' ? selectedSubject : undefined,
        status: selectedStatus !== 'all' ? selectedStatus : undefined
      };

      const response = await api.get('/examinations/tests', { params });
      console.log('Fetched tests response:', response.data);
      const testsData = response.data?.data || [];
      console.log('Tests data:', testsData);
      if (testsData.length > 0) {
        console.log('Sample test assignedTeacher:', testsData[0].assignedTeacher);
      }
      setTests(testsData);
    } catch (error) {
      console.error('Error fetching tests:', error);
      toast.error('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      console.log('Fetching classes...');
      const response = await api.get('/classes?limit=100');
      console.log('Classes API response:', response.data);
      
      // Classes API returns data directly in classes key
      const classesData = response.data?.classes || [];
      console.log('Raw classes data:', classesData);
      
      if (Array.isArray(classesData)) {
        console.log('Found classes:', classesData.length);
        console.log('First few classes:', classesData.slice(0, 3));
        setClasses(classesData);
      } else {
        console.log('Classes data is not an array:', typeof classesData, classesData);
        setClasses([]);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      console.error('Error details:', error.response?.data);
      setClasses([]); // Ensure it's always an array
    }
  };

  const fetchTeachers = async () => {
    try {
      console.log('Fetching teachers...');
      
      // First, let's try to get all users to see what's available
      const allUsersResponse = await api.get('/users?limit=100');
      console.log('All users API response:', allUsersResponse.data);
      
      // Then try to get teachers specifically
      const response = await api.get('/users?role=Teacher&limit=100');
      console.log('Teachers API response:', response.data);
      
      // Users API returns data in nested structure: data.users
      const usersData = response.data?.data?.users || [];
      console.log('Raw users data:', usersData);
      
      if (Array.isArray(usersData)) {
        console.log('Found users:', usersData.length);
        console.log('First few users:', usersData.slice(0, 3));
        setTeachers(usersData);
      } else {
        console.log('Users data is not an array:', typeof usersData, usersData);
        setTeachers([]);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      console.error('Error details:', error.response?.data);
      setTeachers([]); // Ensure it's always an array
    }
  };

  const handleCreateTest = async (e) => {
    e.preventDefault();
    try {
      // Clean up formData before sending
      const cleanedFormData = {
        ...formData,
        assignedTeacher: formData.assignedTeacher || undefined // Convert empty string to undefined
      };
      console.log('Creating test with formData:', cleanedFormData);
      const response = await api.post('/examinations/tests', cleanedFormData);
      console.log('Test creation response:', response.data);
      toast.success('Test created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchTests();
    } catch (error) {
      console.error('Error creating test:', error);
      toast.error(error.response?.data?.message || 'Failed to create test');
    }
  };

  const handleUpdateTest = async (e) => {
    e.preventDefault();
    try {
      // Clean up formData before sending
      const cleanedFormData = {
        ...formData,
        assignedTeacher: formData.assignedTeacher || undefined // Convert empty string to undefined
      };
      await api.put(`/examinations/tests/${selectedTest._id}`, cleanedFormData);
      toast.success('Test updated successfully');
      setShowEditModal(false);
      resetForm();
      fetchTests();
    } catch (error) {
      console.error('Error updating test:', error);
      toast.error(error.response?.data?.message || 'Failed to update test');
    }
  };

  const handleDeleteTest = async (testId) => {
    if (!window.confirm('Are you sure you want to delete this test?')) return;
    
    try {
      await api.delete(`/examinations/tests/${testId}`);
      toast.success('Test deleted successfully');
      fetchTests();
    } catch (error) {
      console.error('Error deleting test:', error);
      toast.error(error.response?.data?.message || 'Failed to delete test');
    }
  };

  const handleDuplicateTest = async (test) => {
    const duplicateData = {
      ...test,
      title: `${test.title} (Copy)`,
      testDate: '',
      marksEntryDeadline: ''
    };
    delete duplicateData._id;
    delete duplicateData.__v;
    delete duplicateData.createdAt;
    delete duplicateData.updatedAt;

    setFormData(duplicateData);
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      subject: '',
      classId: '',
      testType: 'Quiz',
      testDate: '',
      duration: 120,
      totalMarks: 100,
      passingMarks: 40,
      syllabusCoverage: '',
      difficulty: 'Medium',
      instructions: '',
      assignedTeacher: '',
      marksEntryDeadline: '',
      allowLateSubmission: false,
      autoCalculateGrades: true
    });
    setSelectedTest(null);
  };

  const openEditModal = (test) => {
    setSelectedTest(test);
    setFormData({
      title: test.title,
      subject: test.subject,
      classId: test.classId._id,
      testType: test.testType,
      testDate: test.testDate ? new Date(test.testDate).toISOString().split('T')[0] : '',
      duration: test.duration,
      totalMarks: test.totalMarks,
      passingMarks: test.passingMarks,
      syllabusCoverage: test.syllabusCoverage || '',
      difficulty: test.difficulty || 'Medium',
      instructions: test.instructions || '',
      assignedTeacher: test.assignedTeacher?._id || '',
      marksEntryDeadline: test.marksEntryDeadline ? new Date(test.marksEntryDeadline).toISOString().split('T')[0] : '',
      allowLateSubmission: test.allowLateSubmission || false,
      autoCalculateGrades: test.autoCalculateGrades !== false
    });
    setShowEditModal(true);
  };

  const getTestStatus = (test) => {
    const now = new Date();
    const testDate = new Date(test.testDate);
    const deadline = new Date(test.marksEntryDeadline);

    if (testDate > now) return 'Upcoming';
    if (deadline < now && !test.marksEntered) return 'Overdue';
    if (test.marksEntered) return 'Completed';
    return 'Active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Upcoming': return 'bg-blue-100 text-blue-800';
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      case 'Overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Test Management</h2>
            <p className="text-gray-600 mt-1">
              Create, manage, and monitor all examination activities
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Test
          </Button>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search tests..."
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Classes</option>
            {classes.map(cls => (
              <option key={cls._id} value={cls._id}>
                {cls.name} - {cls.program}
              </option>
            ))}
          </select>

          <select
            value={selectedSubject}
            onChange={(e) => setSelectedSubject(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Subjects</option>
            {subjects.map(subject => (
              <option key={subject} value={subject}>{subject}</option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>
      </div>

      {/* Tests Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {tests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Test Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Class & Subject
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teacher
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tests.map((test, index) => {
                  const status = getTestStatus(test);
                  return (
                    <tr key={test._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{test.title}</div>
                          <div className="text-sm text-gray-500">
                            {test.testType} • {test.totalMarks} marks • {test.duration} min
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{test.classId?.name}</div>
                          <div className="text-sm text-gray-500">{test.subject}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900 flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            {new Date(test.testDate).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-500 flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            Entry by: {new Date(test.marksEntryDeadline).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <User className="h-4 w-4 mr-1" />
                          {test.assignedTeacher?.fullName 
                            ? `${test.assignedTeacher.fullName.firstName} ${test.assignedTeacher.fullName.lastName}` 
                            : 'Not assigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                          {status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEditModal(test)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDuplicateTest(test)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDeleteTest(test._id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">No tests found</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Test
            </Button>
          </div>
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Create New Test</h3>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }}>
                <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTest} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name} - {cls.program}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.testType}
                    onChange={(e) => setFormData({...formData, testType: e.target.value})}
                  >
                    {testTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.testDate}
                    onChange={(e) => setFormData({...formData, testDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    required
                    min="30"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({...formData, totalMarks: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={formData.totalMarks}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.passingMarks}
                    onChange={(e) => setFormData({...formData, passingMarks: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Teacher</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.assignedTeacher}
                    onChange={(e) => setFormData({...formData, assignedTeacher: e.target.value})}
                  >
                    <option value="">Select Teacher</option>
                    {renderTeacherOptions()}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marks Entry Deadline</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.marksEntryDeadline}
                    onChange={(e) => setFormData({...formData, marksEntryDeadline: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                  >
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus Coverage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.syllabusCoverage}
                    onChange={(e) => setFormData({...formData, syllabusCoverage: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  placeholder="Enter test instructions..."
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={formData.allowLateSubmission}
                    onChange={(e) => setFormData({...formData, allowLateSubmission: e.target.checked})}
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow Late Submission</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={formData.autoCalculateGrades}
                    onChange={(e) => setFormData({...formData, autoCalculateGrades: e.target.checked})}
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto Calculate Grades</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Test Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Edit Test</h3>
              <button onClick={() => { setShowEditModal(false); resetForm(); }}>
                <X className="h-6 w-6 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            
            <form onSubmit={handleUpdateTest} className="p-6 space-y-6">
              {/* Same form fields as create modal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Title</label>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.subject}
                    onChange={(e) => setFormData({...formData, subject: e.target.value})}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map(subject => (
                      <option key={subject} value={subject}>{subject}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class</label>
                  <select
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.classId}
                    onChange={(e) => setFormData({...formData, classId: e.target.value})}
                  >
                    <option value="">Select Class</option>
                    {classes.map(cls => (
                      <option key={cls._id} value={cls._id}>
                        {cls.name} - {cls.program}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Type</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.testType}
                    onChange={(e) => setFormData({...formData, testType: e.target.value})}
                  >
                    {testTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Test Date</label>
                  <input
                    type="date"
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.testDate}
                    onChange={(e) => setFormData({...formData, testDate: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Duration (minutes)</label>
                  <input
                    type="number"
                    required
                    min="30"
                    max="300"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.totalMarks}
                    onChange={(e) => setFormData({...formData, totalMarks: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Passing Marks</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={formData.totalMarks}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.passingMarks}
                    onChange={(e) => setFormData({...formData, passingMarks: parseInt(e.target.value)})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assigned Teacher</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.assignedTeacher}
                    onChange={(e) => setFormData({...formData, assignedTeacher: e.target.value})}
                  >
                    <option value="">Select Teacher</option>
                    {renderTeacherOptions()}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Marks Entry Deadline</label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.marksEntryDeadline}
                    onChange={(e) => setFormData({...formData, marksEntryDeadline: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty</label>
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({...formData, difficulty: e.target.value})}
                  >
                    {difficulties.map(difficulty => (
                      <option key={difficulty} value={difficulty}>{difficulty}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Syllabus Coverage (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={formData.syllabusCoverage}
                    onChange={(e) => setFormData({...formData, syllabusCoverage: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                <textarea
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={formData.instructions}
                  onChange={(e) => setFormData({...formData, instructions: e.target.value})}
                  placeholder="Enter test instructions..."
                />
              </div>

              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={formData.allowLateSubmission}
                    onChange={(e) => setFormData({...formData, allowLateSubmission: e.target.checked})}
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow Late Submission</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    checked={formData.autoCalculateGrades}
                    onChange={(e) => setFormData({...formData, autoCalculateGrades: e.target.checked})}
                  />
                  <span className="ml-2 text-sm text-gray-700">Auto Calculate Grades</span>
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowEditModal(false); resetForm(); }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Save className="h-4 w-4 mr-2" />
                  Update Test
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TestManagementComponent;
