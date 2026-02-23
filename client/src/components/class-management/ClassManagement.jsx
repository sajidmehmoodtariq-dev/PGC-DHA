import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Filter,
  Users,
  Edit,
  Trash2,
  Eye,
  Building,
  BookOpen,
  UserCheck,
  GraduationCap,
  MapPin,
  X,
  Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { Button } from '../ui/button';
import PermissionGuard from '../PermissionGuard';
import api from '../../services/api';
import { PERMISSIONS } from '../../utils/rolePermissions';

const ClassManagement = () => {
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCampus, setFilterCampus] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [classStudents, setClassStudents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);

  // Form state for creating/editing classes
  const [formData, setFormData] = useState({
    name: '',
    campus: '',
    grade: '',
    program: '',
    maxStudents: 100,
    classIncharge: '',
    floorIncharge: '',
    academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
  });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchTeachers(),
          fetchCoordinators()
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Set up periodic refresh for classes to update student counts
    const refreshInterval = setInterval(() => {
      fetchClasses(); // Refresh classes every 30 seconds to update student counts
    }, 30000);

    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, []);

  const fetchClasses = async () => {
    try {
      const response = await api.get('/classes');
      // API returns { success: true, classes: [...] }
      const classes = response.data?.classes || [];
      setClasses(classes);
    } catch (error) {
      console.error('Error fetching classes:', error);
      setClasses([]); // Ensure classes is always an array
    }
  };

  const fetchTeachers = async () => {
    try {
      const response = await api.get('/users?role=Teacher');
      console.log('Teachers API response:', response.data);
      // API returns { success: true, data: { users: [...] } }
      setTeachers(response.data?.data?.users || []);
    } catch (error) {
      console.error('Error fetching teachers:', error);
      setTeachers([]); // Ensure teachers is always an array
    }
  };

  const fetchCoordinators = async () => {
    try {
      const response = await api.get('/users?role=Coordinator');
      console.log('Coordinators API response:', response.data);
      // API returns { success: true, data: { users: [...] } }
      setCoordinators(response.data?.data?.users || []);
    } catch (error) {
      console.error('Error fetching coordinators:', error);
      setCoordinators([]); // Ensure coordinators is always an array
    }
  };

  const fetchClassStudents = async (classId) => {
    try {
      const response = await api.get(`/students/class/${classId}`);
      setClassStudents(response.data || []);
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudents([]);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const response = await api.post('/classes', formData);
      if (response.data.success) {
        setClasses([...classes, response.data.class]);
        setShowCreateModal(false);
        resetForm();
        alert('Class created successfully!');
      }
    } catch (error) {
      console.error('Error creating class:', error);
      alert('Failed to create class. Please try again.');
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm('Are you sure you want to delete this class?')) {
      try {
        const response = await api.delete(`/classes/${classId}`);
        if (response.data.success) {
          setClasses((prevClasses) => (prevClasses || []).filter(cls => cls._id !== classId));
          alert('Class deleted successfully!');
        } else {
          alert(response.data.message || 'Failed to delete class.');
        }
      } catch (error) {
        console.error('Error deleting class:', error);
        const errorMessage = error.response?.data?.message || 'Failed to delete class. Please try again.';
        alert(errorMessage);
      }
    }
  };

  const handleEditClass = (classData) => {
    setFormData({
      name: classData.name || '',
      campus: classData.campus || '',
      grade: classData.grade || '',
      program: classData.program || '',
      maxStudents: classData.maxStudents || 100,
      classIncharge: classData.classIncharge || '',
      floorIncharge: classData.floorIncharge || '',
      academicYear: classData.academicYear || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
    });
    setSelectedClass(classData);
    setIsEditing(true);
    setShowCreateModal(true);
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    try {
      const response = await api.put(`/classes/${selectedClass._id}`, formData);
      if (response.data.success) {
        setClasses(classes.map(cls => 
          cls._id === selectedClass._id ? response.data.class : cls
        ));
        setShowCreateModal(false);
        setIsEditing(false);
        resetForm();
        setSelectedClass(null);
        alert('Class updated successfully!');
      }
    } catch (error) {
      console.error('Error updating class:', error);
      alert('Failed to update class. Please try again.');
    }
  };

  const handleViewClassDetails = async (classData) => {
    setSelectedClass(classData);
    await fetchClassStudents(classData._id);
    setShowDetailsModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      campus: '',
      grade: '',
      program: '',
      maxStudents: 100,
      classIncharge: '',
      floorIncharge: '',
      academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
    });
    setIsEditing(false);
    setSelectedClass(null);
  };

  // Filter classes based on search and filters
  const filteredClasses = (classes || []).filter(cls => {
    const nameMatch = cls.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const campusMatch = !filterCampus || cls.campus === filterCampus;
    const gradeMatch = !filterGrade || cls.grade === filterGrade;
    const programMatch = !filterProgram || cls.program === filterProgram;

    return nameMatch && campusMatch && gradeMatch && programMatch;
  });

  const getFloorName = (floor) => {
    const floorNames = {
      1: '11th Boys Floor',
      2: '12th Boys Floor',
      3: '11th Girls Floor',
      4: '12th Girls Floor'
    };
    return floorNames[floor] || 'Unknown Floor';
  };

  const getTeacherName = (teacher) => {
    // If teacher is already a populated object
    if (teacher && typeof teacher === 'object' && teacher.fullName) {
      return `${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim();
    }
    
    // If teacher is just an ID, look it up in the teachers array
    if (typeof teacher === 'string' && Array.isArray(teachers)) {
      const foundTeacher = teachers.find(t => t._id === teacher);
      return foundTeacher ? `${foundTeacher.fullName?.firstName || ''} ${foundTeacher.fullName?.lastName || ''}`.trim() : 'Not Assigned';
    }
    
    return 'Not Assigned';
  };

  const getCoordinatorName = (coordinator) => {
    // If coordinator is already a populated object
    if (coordinator && typeof coordinator === 'object' && coordinator.fullName) {
      return `${coordinator.fullName?.firstName || ''} ${coordinator.fullName?.lastName || ''}`.trim();
    }
    
    // If coordinator is just an ID, look it up in the coordinators array
    if (typeof coordinator === 'string' && Array.isArray(coordinators)) {
      const foundCoordinator = coordinators.find(c => c._id === coordinator);
      return foundCoordinator ? `${foundCoordinator.fullName?.firstName || ''} ${foundCoordinator.fullName?.lastName || ''}`.trim() : 'Not Assigned';
    }
    
    return 'Not Assigned';
  };

  // Excel export function
  const exportStudentsToExcel = () => {
    if (!selectedClass || !classStudents || classStudents.length === 0) {
      alert('No students to export for this class.');
      return;
    }

    // Prepare data for Excel
    const excelData = classStudents.map((student, index) => ({
      'S.No': index + 1,
      'Roll Number': student.rollNumber || 'Not Assigned',
      'Student Name': `${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim(),
      'Father Name': student.fatherName || 'N/A',
      'Contact Number': student.contactInfo?.phoneNumber || 'N/A',
      'Email': student.email || 'N/A',
      'Campus': student.campus || 'N/A',
      'Grade': student.admissionInfo?.grade || 'N/A',
      'Program': student.admissionInfo?.program || 'N/A',
      'Admission Date': student.admissionInfo?.admissionDate ? 
        new Date(student.admissionInfo.admissionDate).toLocaleDateString() : 'N/A',
      'Status': student.status === 1 ? 'Active' : 
               student.status === 2 ? 'Inactive' : 
               student.status === 3 ? 'Deleted' : 'Unknown'
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Add class information as a header
    const classInfo = [
      ['Class Name', selectedClass.name],
      ['Grade', selectedClass.grade],
      ['Program', selectedClass.program],
      ['Campus', selectedClass.campus],
      ['Class Incharge', getTeacherName(selectedClass.classIncharge)],
      ['Floor Coordinator', getCoordinatorName(selectedClass.floorIncharge)],
      ['Total Students', classStudents.length],
      ['Max Capacity', selectedClass.maxStudents],
      ['Export Date', new Date().toLocaleString()],
      [''], // Empty row for spacing
    ];

    // Create a new worksheet with class info
    const headerWorksheet = XLSX.utils.aoa_to_sheet(classInfo.concat([
      // Add column headers
      ['S.No', 'Roll Number', 'Student Name', 'Father Name', 'Contact Number', 'Email', 'Campus', 'Grade', 'Program', 'Admission Date', 'Status'],
      // Add student data
      ...excelData.map(student => Object.values(student))
    ]));

    // Replace the first worksheet
    workbook.Sheets['Students'] = headerWorksheet;

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    
    // Create blob and download
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fileName = `${selectedClass.name}_Students_${new Date().toISOString().split('T')[0]}.xlsx`;
    
    saveAs(blob, fileName);
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Class Management</h1>
          <p className="text-gray-600">Manage classes, assign teachers and coordinators</p>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search classes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-2">
                <select
                  value={filterCampus}
                  onChange={(e) => setFilterCampus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Campus</option>
                  <option value="Boys">Boys Campus</option>
                  <option value="Girls">Girls Campus</option>
                </select>

                <select
                  value={filterGrade}
                  onChange={(e) => setFilterGrade(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Grades</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                </select>

                <select
                  value={filterProgram}
                  onChange={(e) => setFilterProgram(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Programs</option>
                  <option value="ICS-PHY">ICS-PHY</option>
                  <option value="ICS-STAT">ICS-STAT</option>
                  <option value="ICOM">ICOM</option>
                  <option value="Pre Engineering">Pre Engineering</option>
                  <option value="Pre Medical">Pre Medical</option>
                  <option value="FA">FA</option>
                  <option value="FA IT">FA IT</option>
                  <option value="General Science">General Science</option>
                </select>
              </div>
            </div>

            {/* Create Class Button */}
            <PermissionGuard permission={PERMISSIONS.CLASS_MANAGEMENT.CREATE_CLASS}>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="h-5 w-5 mr-2" />
                Create Class
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.length === 0 ? (
            <div className="col-span-full bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <Building className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Classes Found</h3>
              <p className="text-gray-500">Create your first class to get started</p>
            </div>
          ) : (
            filteredClasses.map((cls) => (
              <div key={cls._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {/* Class Header */}
                <div className={`p-4 ${cls.campus === 'Boys' ? 'bg-blue-50' : 'bg-pink-50'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{cls.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${cls.campus === 'Boys' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                      }`}>
                      {cls.campus}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <GraduationCap className="h-4 w-4" />
                      {cls.grade}
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {cls.program}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      Floor {cls.floor}
                    </div>
                  </div>
                </div>

                {/* Class Content */}
                <div className="p-4">
                  <div className="space-y-3">
                    {/* Student Count */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Students</span>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {cls.currentStudents || 0}/{cls.maxStudents}
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${(cls.currentStudents / cls.maxStudents) > 0.8 ? 'bg-red-500' :
                            (cls.currentStudents / cls.maxStudents) > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                        style={{ width: `${Math.min(100, (cls.currentStudents / cls.maxStudents) * 100)}%` }}
                      ></div>
                    </div>

                    {/* Class Incharge */}
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Class Incharge:</span> {getTeacherName(cls.classIncharge)}
                    </div>

                    {/* Coordinator */}
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Coordinator:</span> {getCoordinatorName(cls.floorIncharge)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-4 pt-4 border-t border-gray-100">
                    <PermissionGuard permission={PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASS_DETAILS}>
                      <button
                        onClick={() => handleViewClassDetails(cls)}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </button>
                    </PermissionGuard>

                    <PermissionGuard permission={PERMISSIONS.CLASS_MANAGEMENT.EDIT_CLASS}>
                      <button 
                        onClick={() => handleEditClass(cls)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                        Edit
                      </button>
                    </PermissionGuard>

                    <PermissionGuard permission={PERMISSIONS.CLASS_MANAGEMENT.DELETE_CLASS}>
                      <button
                        onClick={() => handleDeleteClass(cls._id)}
                        className="flex items-center justify-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </PermissionGuard>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create Class Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">
                    {isEditing ? 'Edit Class' : 'Create New Class'}
                  </h3>
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <form onSubmit={isEditing ? handleUpdateClass : handleCreateClass} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Class Name */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Computer Science A, Biology Advanced"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Campus */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Campus *
                    </label>
                    <select
                      required
                      value={formData.campus}
                      onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Campus</option>
                      <option value="Boys">Boys Campus</option>
                      <option value="Girls">Girls Campus</option>
                    </select>
                  </div>

                  {/* Grade */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Grade *
                    </label>
                    <select
                      required
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Grade</option>
                      <option value="11th">11th Grade</option>
                      <option value="12th">12th Grade</option>
                    </select>
                  </div>

                  {/* Program */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program *
                    </label>
                    <select
                      required
                      value={formData.program}
                      onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Program</option>
                      <option value="ICS-PHY">ICS-PHY</option>
                      <option value="ICS-STAT">ICS-STAT</option>
                      <option value="ICOM">ICOM</option>
                      <option value="Pre Engineering">Pre Engineering</option>
                      <option value="Pre Medical">Pre Medical</option>
                      <option value="FA">FA</option>
                      <option value="FA IT">FA IT</option>
                      <option value="General Science">General Science</option>
                    </select>
                  </div>

                  {/* Max Students */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Students
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={formData.maxStudents}
                      onChange={(e) => setFormData({ ...formData, maxStudents: parseInt(e.target.value) })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Class Incharge */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Class Incharge
                    </label>
                    <select
                      value={formData.classIncharge}
                      onChange={(e) => setFormData({ ...formData, classIncharge: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Teacher</option>
                      {Array.isArray(teachers) && teachers.map(teacher => (
                        <option key={teacher._id} value={teacher._id}>
                          {`${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim()}
                        </option>
                      ))}
                      {Array.isArray(coordinators) && coordinators.map(coordinator => (
                        <option key={coordinator._id} value={coordinator._id}>
                          {`${coordinator.fullName?.firstName || ''} ${coordinator.fullName?.lastName || ''}`.trim()} (Coordinator)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Floor Coordinator */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Floor Coordinator
                    </label>
                    <select
                      value={formData.floorIncharge}
                      onChange={(e) => setFormData({ ...formData, floorIncharge: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Coordinator</option>
                      {Array.isArray(coordinators) && coordinators.map(coordinator => (
                        <option key={coordinator._id} value={coordinator._id}>
                          {`${coordinator.fullName?.firstName || ''} ${coordinator.fullName?.lastName || ''}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Academic Year */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Academic Year
                    </label>
                    <input
                      type="text"
                      value={formData.academicYear}
                      onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                      placeholder="2024-2025"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
                  <Button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isEditing ? 'Update Class' : 'Create Class'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Class Details Modal */}
        {showDetailsModal && selectedClass && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className={`p-6 rounded-t-2xl text-white ${selectedClass.campus === 'Boys' ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-pink-500 to-pink-600'
                }`}>
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{selectedClass.name}</h3>
                    <p className="text-gray-100 mt-1">
                      {selectedClass.grade} {selectedClass.program} - {selectedClass.campus} Campus
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-white hover:text-gray-200 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {/* Class Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-500" />
                      <span className="font-medium">Students</span>
                    </div>
                    <p className="text-2xl font-bold">{classStudents.length}</p>
                    <p className="text-sm text-gray-500">out of {selectedClass.maxStudents}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-5 w-5 text-green-500" />
                      <span className="font-medium">Floor</span>
                    </div>
                    <p className="text-2xl font-bold">{selectedClass.floor}</p>
                    <p className="text-sm text-gray-500">{getFloorName(selectedClass.floor)}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-5 w-5 text-purple-500" />
                      <span className="font-medium">Class Incharge</span>
                    </div>
                    <p className="text-lg font-semibold">{getTeacherName(selectedClass.classIncharge)}</p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <GraduationCap className="h-5 w-5 text-orange-500" />
                      <span className="font-medium">Floor Coordinator</span>
                    </div>
                    <p className="text-lg font-semibold">{getCoordinatorName(selectedClass.floorIncharge)}</p>
                  </div>
                </div>

                {/* Students List */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="text-lg font-semibold">Students in Class</h4>
                    {classStudents.length > 0 && (
                      <Button
                        onClick={exportStudentsToExcel}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Export Excel
                      </Button>
                    )}
                  </div>

                  {classStudents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No students assigned to this class</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">#</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Student Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Roll Number</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Father Name</th>
                            <th className="px-4 py-3 text-left text-sm font-medium text-gray-900">Contact</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {classStudents.map((student, index) => (
                            <tr key={student._id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                              <td className="px-4 py-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {`${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`.trim()}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {student.rollNumber || 'Not Assigned'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {student.fatherName || 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900">
                                {student.phoneNumber || 'N/A'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-gray-50 px-6 py-4 rounded-b-2xl flex justify-end">
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassManagement;
