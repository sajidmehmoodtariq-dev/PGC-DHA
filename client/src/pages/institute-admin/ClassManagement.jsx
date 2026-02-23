import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, 
  Plus, 
  Edit3, 
  School, 
  Filter, 
  Search, 
  UserPlus,
  Save,
  X,
  CheckCircle
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import Card from '../../components/ui/card';
import { useToast } from '../../contexts/ToastContext';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';

const ClassManagement = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  const [filteredClasses, setFilteredClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    campus: '',
    grade: '',
    search: ''
  });
  
  // Modal states
  const [showCreateClass, setShowCreateClass] = useState(false);
  const [showEditClass, setShowEditClass] = useState(false);
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  
  // Form data
  const [classForm, setClassForm] = useState({
    name: '',
    campus: '',
    grade: '',
    program: '',
    maxStudents: 50
  });

  // Check permissions
  const hasClassManagementAccess = user?.role === 'InstituteAdmin' || user?.role === 'Principal';

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/classes');
      setClasses(response.data.classes || []);
    } catch (error) {
      toast.error('Failed to load classes');
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadStudents = useCallback(async () => {
    try {
      // Fetch students with class assignments (for student management)
      const response = await api.get('/students?includeAssigned=true');
      setStudents(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load students');
      console.error('Error loading students:', error);
    }
  }, [toast]);

  const filterClasses = useCallback(() => {
    let filtered = [...classes];
    
    if (filters.campus) {
      filtered = filtered.filter(cls => cls.campus === filters.campus);
    }
    
    if (filters.grade) {
      filtered = filtered.filter(cls => cls.grade === filters.grade);
    }
    
    if (filters.search) {
      filtered = filtered.filter(cls => 
        cls.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        cls.program.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    setFilteredClasses(filtered);
  }, [classes, filters]);

  useEffect(() => {
    if (hasClassManagementAccess) {
      loadClasses();
      loadStudents();
    }
  }, [hasClassManagementAccess, loadClasses, loadStudents]);

  useEffect(() => {
    filterClasses();
  }, [classes, filters, filterClasses]);

  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    if (!classForm.name || !classForm.campus || !classForm.grade || !classForm.program) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      await api.post('/classes', classForm);
      toast.success('Class created successfully');
      setShowCreateClass(false);
      setClassForm({ name: '', campus: '', grade: '', program: '', maxStudents: 50 });
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClass = async (e) => {
    e.preventDefault();
    
    if (!classForm.name) {
      toast.error('Class name is required');
      return;
    }

    try {
      setLoading(true);
      await api.put(`/classes/${selectedClass._id}`, {
        name: classForm.name,
        maxStudents: classForm.maxStudents,
        program: classForm.program
      });
      toast.success('Class updated successfully');
      setShowEditClass(false);
      setSelectedClass(null);
      loadClasses();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssignStudents = async () => {
    if (selectedStudents.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    if (!selectedClass) {
      toast.error('Please select a class');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/users/bulk-assign-class', {
        studentIds: selectedStudents,
        classId: selectedClass._id
      });
      
      toast.success(`Successfully assigned ${response.data.assignedCount} students to ${selectedClass.name}`);
      setShowBulkAssign(false);
      setSelectedStudents([]);
      setSelectedClass(null);
      loadStudents();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to assign students');
    } finally {
      setLoading(false);
    }
  };

  const openEditClass = (classItem) => {
    setSelectedClass(classItem);
    setClassForm({
      name: classItem.name,
      campus: classItem.campus,
      grade: classItem.grade,
      program: classItem.program,
      maxStudents: classItem.maxStudents
    });
    setShowEditClass(true);
  };

  const openBulkAssign = (classItem) => {
    setSelectedClass(classItem);
    setShowBulkAssign(true);
  };

  // Get available students for assignment (not already assigned to a class)
  const getAvailableStudents = () => {
    return students.filter(student => 
      !student.classId || student.classId === null
    );
  };

  if (!hasClassManagementAccess) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <School className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Only Institute Admins and Principals can manage classes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Class Management</h1>
          <p className="text-gray-600">Manage classes and assign students</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowCreateClass(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Class
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Campus</label>
            <select
              value={filters.campus}
              onChange={(e) => setFilters(prev => ({ ...prev, campus: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Campuses</option>
              <option value="Boys">Boys Campus</option>
              <option value="Girls">Girls Campus</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
            <select
              value={filters.grade}
              onChange={(e) => setFilters(prev => ({ ...prev, grade: e.target.value }))}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">All Grades</option>
              <option value="11th">11th Grade</option>
              <option value="12th">12th Grade</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                placeholder="Search classes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="flex items-end">
            <Button
              onClick={() => setFilters({ campus: '', grade: '', search: '' })}
              variant="outline"
              className="w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </div>
      </Card>

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((classItem) => (
          <Card key={classItem._id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{classItem.name}</h3>
                <p className="text-sm text-gray-600">{classItem.program}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => openEditClass(classItem)}
                  size="sm"
                  variant="outline"
                >
                  <Edit3 className="h-4 w-4" />
                </Button>
                <Button
                  onClick={() => openBulkAssign(classItem)}
                  size="sm"
                  variant="outline"
                >
                  <UserPlus className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Campus:</span>
                <span className="font-medium">{classItem.campus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grade:</span>
                <span className="font-medium">{classItem.grade}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Floor:</span>
                <span className="font-medium">{classItem.floor}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Capacity:</span>
                <span className="font-medium">{classItem.currentStudents || 0}/{classItem.maxStudents}</span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {filteredClasses.length === 0 && !loading && (
        <div className="text-center py-12">
          <School className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
          <p className="text-gray-600 mb-4">
            {filters.campus || filters.grade || filters.search
              ? 'Try adjusting your filters'
              : 'Create your first class to get started'
            }
          </p>
          {!filters.campus && !filters.grade && !filters.search && (
            <Button onClick={() => setShowCreateClass(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Class
            </Button>
          )}
        </div>
      )}

      {/* Create Class Modal */}
      {showCreateClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Create New Class</h2>
              <Button
                onClick={() => setShowCreateClass(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Morning A"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campus *
                </label>
                <select
                  value={classForm.campus}
                  onChange={(e) => setClassForm(prev => ({ ...prev, campus: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Campus</option>
                  <option value="Boys">Boys Campus</option>
                  <option value="Girls">Girls Campus</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grade *
                </label>
                <select
                  value={classForm.grade}
                  onChange={(e) => setClassForm(prev => ({ ...prev, grade: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Grade</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program *
                </label>
                <select
                  value={classForm.program}
                  onChange={(e) => setClassForm(prev => ({ ...prev, program: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Select Program</option>
                  <option value="ICS-PHY">ICS-PHY (Computer Science with Physics)</option>
                  <option value="ICS-STAT">ICS-STAT (Computer Science with Statistics)</option>
                  <option value="ICOM">ICOM (Commerce)</option>
                  <option value="Pre Engineering">Pre Engineering</option>
                  <option value="Pre Medical">Pre Medical</option>
                  <option value="FA">FA (Faculty of Arts)</option>
                  <option value="FA IT">FA IT (Faculty of Arts - Information Technology)</option>
                  <option value="General Science">General Science</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students
                </label>
                <input
                  type="number"
                  value={classForm.maxStudents}
                  onChange={(e) => setClassForm(prev => ({ ...prev, maxStudents: parseInt(e.target.value) }))}
                  min="1"
                  max="120"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateClass(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Class Modal */}
      {showEditClass && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Edit Class</h2>
              <Button
                onClick={() => setShowEditClass(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name *
                </label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => setClassForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Program
                </label>
                <select
                  value={classForm.program}
                  onChange={(e) => setClassForm(prev => ({ ...prev, program: e.target.value }))}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="ICS-PHY">ICS-PHY (Computer Science with Physics)</option>
                  <option value="ICS-STAT">ICS-STAT (Computer Science with Statistics)</option>
                  <option value="ICOM">ICOM (Commerce)</option>
                  <option value="Pre Engineering">Pre Engineering</option>
                  <option value="Pre Medical">Pre Medical</option>
                  <option value="FA">FA (Faculty of Arts)</option>
                  <option value="FA IT">FA IT (Faculty of Arts - Information Technology)</option>
                  <option value="General Science">General Science</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Students
                </label>
                <input
                  type="number"
                  value={classForm.maxStudents}
                  onChange={(e) => setClassForm(prev => ({ ...prev, maxStudents: parseInt(e.target.value) }))}
                  min="1"
                  max="120"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Campus:</strong> {selectedClass.campus} <br />
                  <strong>Grade:</strong> {selectedClass.grade} <br />
                  <strong>Floor:</strong> {selectedClass.floor}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Campus, grade, and floor cannot be changed after creation.
                </p>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  onClick={() => setShowEditClass(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Update Class
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Assign Students Modal */}
      {showBulkAssign && selectedClass && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">Assign Students to {selectedClass.name}</h2>
                <p className="text-sm text-gray-600">
                  {selectedClass.campus} Campus - {selectedClass.grade} - {selectedClass.program}
                </p>
              </div>
              <Button
                onClick={() => setShowBulkAssign(false)}
                variant="ghost"
                size="sm"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Available Students: {getAvailableStudents().length} | 
                Selected: {selectedStudents.length} | 
                Class Capacity: {selectedClass.currentStudents || 0}/{selectedClass.maxStudents}
              </p>
            </div>
            
            <div className="border rounded-lg max-h-64 overflow-y-auto mb-4">
              {getAvailableStudents().length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                  <p>No available students to assign</p>
                  <p className="text-sm">All Level 5 students are already assigned to classes</p>
                </div>
              ) : (
                <div className="divide-y">
                  {getAvailableStudents().map((student) => (
                    <div key={student._id} className="p-3 hover:bg-gray-50">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedStudents(prev => [...prev, student._id]);
                            } else {
                              setSelectedStudents(prev => prev.filter(id => id !== student._id));
                            }
                          }}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div className="flex-1">
                          <p className="font-medium">{student.fullName?.firstName} {student.fullName?.lastName}</p>
                          <p className="text-sm text-gray-600">
                            {student.program} | {student.admissionInfo?.studentId || 'No ID'}
                          </p>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex gap-3">
              <Button
                type="button"
                onClick={() => setShowBulkAssign(false)}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleBulkAssignStudents}
                disabled={loading || selectedStudents.length === 0}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Assign {selectedStudents.length} Students
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassManagement;
