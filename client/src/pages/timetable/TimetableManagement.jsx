import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Download, Upload, Filter, Search, Clock, User, School, BookOpen } from 'lucide-react';
import { useToast } from '../../contexts/ToastContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission, PERMISSIONS } from '../../utils/rolePermissions';
import api from '../../services/api';
import EnhancedTimetableForm from '../../components/timetable/EnhancedTimetableForm';
import TimetableForm from '../../components/timetable/TimetableForm';
import TimetableBlockView from '../../components/timetable/TimetableBlockView';
import TimetableFilters from '../../components/timetable/TimetableFilters';

const TimetableManagement = () => {
  const { user } = useAuth();
  const toastContext = useToast();
  const { addToast } = toastContext || {};
  
  const [timetableData, setTimetableData] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedDay, setSelectedDay] = useState('all');
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [viewMode, setViewMode] = useState('grouped'); // Default to grouped view
  const [showForm, setShowForm] = useState(false);
  const [editingTimetable, setEditingTimetable] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false); // Track delete operations

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const floors = [
    { value: '1', label: '1st Floor - 11th Boys' },
    { value: '2', label: '2nd Floor - 12th Boys' },
    { value: '3', label: '3rd Floor - 11th Girls' },
    { value: '4', label: '4th Floor - 12th Girls' }
  ];

  const canManage = hasPermission(user?.role, PERMISSIONS.TIMETABLE.CREATE_TIMETABLE);
  const canView = hasPermission(user?.role, PERMISSIONS.TIMETABLE.VIEW_TIMETABLE);

  useEffect(() => {
    console.log('TimetableManagement mounted:', {
      canView: canView,
      user: user,
      userRole: user?.role,
      hasToken: !!localStorage.getItem('access_token')
    });
    
    if (canView) {
      fetchInitialData();
    }
  }, [canView]);

  // Auto-refresh timetable when filters change
  useEffect(() => {
    if (canView && !loading && !isDeleting && timetableData.length >= 0) {
      fetchTimetable();
    }
  }, [selectedClass, selectedTeacher, selectedDay, selectedFloor]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [timetableResponse, classesResponse, teachersResponse] = await Promise.all([
        api.get('/timetable'),
        api.get('/classes'),
        api.get('/users', { params: { role: 'Teacher', limit: 100 } })
      ]);

      // Handle timetable data
      const timetables = timetableResponse.data?.timetable || timetableResponse.data || [];
      console.log('Setting timetable data:', timetables);
      setTimetableData(Array.isArray(timetables) ? timetables : []);

      // Handle classes data
      const classesData = classesResponse.data?.classes || classesResponse.data || [];
      setClasses(Array.isArray(classesData) ? classesData : []);

      // Handle teachers data
      const teachersData = teachersResponse.data?.data?.users || teachersResponse.data?.users || teachersResponse.data || [];
      setTeachers(Array.isArray(teachersData) ? teachersData : []);
      
      console.log('=== TIMETABLE DATA LOADING ===');
      console.log('API Responses:', {
        timetableResponse: timetableResponse.data,
        classesResponse: classesResponse.data,
        teachersResponse: teachersResponse.data
      });
      console.log('Processed Data:', {
        timetables: timetables,
        classes: classesData,
        teachers: teachersData
      });
      console.log('Final State Will Be:', {
        timetableCount: Array.isArray(timetables) ? timetables.length : 0,
        classesCount: Array.isArray(classesData) ? classesData.length : 0,
        teachersCount: Array.isArray(teachersData) ? teachersData.length : 0
      });
      console.log('=== END TIMETABLE DATA LOADING ===');
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        url: error.config?.url
      });
      
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message: `Failed to load timetable data: ${error.response?.data?.message || error.message}` });
      }
      
      // Set default empty arrays on error
      setTimetableData([]);
      setClasses([]);
      setTeachers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTimetable = async (filters = {}) => {
    try {
      const params = {};
      if (selectedClass && selectedClass !== 'all') params.classId = selectedClass;
      if (selectedTeacher && selectedTeacher !== 'all') params.teacherId = selectedTeacher;
      if (selectedDay && selectedDay !== 'all') params.dayOfWeek = selectedDay;
      if (selectedFloor && selectedFloor !== 'all') {
        // Get classes for the selected floor and fetch their timetables
        const floorClasses = classes.filter(cls => cls.floor.toString() === selectedFloor);
        const classIds = floorClasses.map(cls => cls._id);
        if (classIds.length > 0) {
          params.classIds = classIds.join(',');
        }
      }

      const response = await api.get('/timetable', { params });
      setTimetableData(response.data.timetable || []);
    } catch (error) {
      console.error('Error fetching filtered timetable:', error);
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message: 'Failed to load timetable data' });
      }
    }
  };

  const handleCreateTimetable = () => {
    setEditingTimetable(null);
    setShowForm(true);
  };

  const handleEditTimetable = (timetable) => {
    setEditingTimetable(timetable);
    setShowForm(true);
  };

  const handleDeleteTimetable = async (timetableId) => {
    if (!window.confirm('Are you sure you want to delete this timetable entry?')) {
      return;
    }

    try {
      console.log('Deleting timetable entry:', timetableId);
      setIsDeleting(true); // Prevent auto-refresh during delete
      
      await api.delete(`/timetable/${timetableId}`);
      console.log('Delete successful, updating UI...');
      
      // Immediately remove from local state for instant UI update
      setTimetableData(prevData => prevData.filter(item => item._id !== timetableId));
      
      if (typeof addToast === 'function') {
        addToast({ type: 'success', message: 'Timetable entry deleted successfully' });
      }
      
      // Then refresh all data in background to ensure consistency
      await fetchInitialData();
      
      console.log('Data refresh completed');
    } catch (error) {
      console.error('Error deleting timetable:', error);
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message: 'Failed to delete timetable entry' });
      }
    } finally {
      setIsDeleting(false); // Re-enable auto-refresh
    }
  };

  const handleDeleteClass = async (classId, className) => {
    if (!window.confirm(`Are you sure you want to delete ALL timetable entries for class "${className}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setIsDeleting(true);
      
      console.log(`Deleting all timetable entries for class ${className} (ID: ${classId})`);
      
      // Use the bulk delete endpoint
      const response = await api.delete(`/timetable/class/${classId}`);
      
      // Remove all entries for this class from local state (defensive for null classId)
      setTimetableData(prevData => prevData.filter(item => {
        const id = item?.classId?._id || item?.classId; // handle populated or raw id
        return String(id) !== String(classId) ? true : false;
      }));
      
      if (typeof addToast === 'function') {
        addToast({ 
          type: 'success', 
          message: response.data.message || `Successfully deleted all timetable entries for class ${className}` 
        });
      }
      
      // Refresh data to ensure consistency
      await fetchInitialData();
      
    } catch (error) {
      console.error('Error deleting class timetable:', error);
      const errorMessage = error.response?.data?.message || `Failed to delete timetable for class ${className}`;
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message: errorMessage });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      // Transform the formData to create/update individual timetable entries for each lecture
      const { classId, lectures } = formData;

      // Build an index of existing entries by day and start time to avoid conflicts (e.g., Monday duplicates)
      const daysToUpdate = Array.from(new Set(lectures.map(l => l.dayOfWeek)));
      const existingByDay = {};
      const existingIndex = {};

      for (const day of daysToUpdate) {
        try {
          const res = await api.get(`/timetable/class/${classId}?dayOfWeek=${encodeURIComponent(day)}`);
          const existing = Array.isArray(res.data?.timetable) ? res.data.timetable : [];
          existingByDay[day] = existing;
          existing.forEach(item => {
            const key = `${day}|${item.startTime}`;
            if (!existingIndex[key]) existingIndex[key] = [];
            existingIndex[key].push(item);
          });
        } catch (e) {
          // If fetch fails, proceed with creation; conflicts will be handled by server
          console.log(e);
          
          existingByDay[day] = [];
        }
      }

      // For each lecture: if an entry exists at same day/startTime, update it; otherwise create
      const results = await Promise.allSettled(lectures.map(async (lecture) => {
        const lectureData = {
          title: lecture.lectureName,
          classId,
          dayOfWeek: lecture.dayOfWeek,
          startTime: lecture.startTime,
          endTime: lecture.endTime,
          teacherId: lecture.teacherId,
          subject: lecture.subject,
          lectureType: lecture.type,
          duration: lecture.duration,
          academicYear: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
        };

        const key = `${lecture.dayOfWeek}|${lecture.startTime}`;
        const existing = existingIndex[key]?.[0];

        if (existing && existing._id) {
          // Update in place to avoid time conflict
          return api.put(`/timetable/${existing._id}`, lectureData);
        }
        // Create new entry
        return api.post('/timetable', lectureData);
      }));

      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length > 0 && typeof addToast === 'function') {
        addToast({ type: 'warning', message: `${failed.length} lecture(s) had conflicts or failed to save. Others were saved.` });
      }
      
      if (typeof addToast === 'function') {
        addToast({ type: 'success', message: `Timetable saved. ${lectures.length - failed.length} saved, ${failed.length} failed.` });
      } else {
        console.log(`Timetable saved. ${lectures.length - failed.length} saved, ${failed.length} failed.`);
      }
      
      // Don't close the form or refresh data for day-wise saving
      // The form will handle its own state management
      
    } catch (error) {
      console.error('Error saving timetable:', error);
      const message = error.response?.data?.message || 'Failed to save timetable';
      
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message });
        
        // If there are conflicts, show them
        if (error.response?.data?.conflicts) {
          const conflicts = error.response.data.conflicts;
          const conflictMessages = conflicts.map(c => 
            `${c.type === 'teacher' ? 'Teacher' : 'Class'} conflict: ${c.teacher || c.class} at ${c.time}`
          );
          addToast({ 
            type: 'error', 
            message: `Conflicts detected: ${conflictMessages.join(', ')}` 
          });
        }
      } else {
        console.error('addToast function not available:', message);
        alert(message); // Fallback to alert
      }
    }
  };

  const handleIndividualEntrySubmit = async (formData) => {
    try {
      const lectureData = {
        title: formData.title,
        classId: formData.classId,
        dayOfWeek: formData.dayOfWeek,
        startTime: formData.startTime,
        endTime: formData.endTime,
        teacherId: formData.teacherId,
        subject: formData.subject,
        lectureType: formData.lectureType,
        academicYear: formData.academicYear
      };

      if (editingTimetable && editingTimetable._id) {
        // Update existing entry
        await api.put(`/timetable/${editingTimetable._id}`, lectureData);
        if (typeof addToast === 'function') {
          addToast({ type: 'success', message: 'Timetable entry updated successfully' });
        }
      } else {
        // Create new entry
        await api.post('/timetable', lectureData);
        if (typeof addToast === 'function') {
          addToast({ type: 'success', message: 'Timetable entry created successfully' });
        }
      }
      
      setShowForm(false);
      setEditingTimetable(null);
      // Refresh data
      await fetchInitialData();
    } catch (error) {
      console.error('Error saving timetable entry:', error);
      const message = error.response?.data?.message || 'Failed to save timetable entry';
      
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message });
        
        // If there are conflicts, show them
        if (error.response?.data?.conflicts) {
          const conflicts = error.response.data.conflicts;
          const conflictMessages = conflicts.map(c => 
            `${c.type === 'teacher' ? 'Teacher' : 'Class'} conflict: ${c.teacher || c.class} at ${c.time}`
          );
          addToast({ 
            type: 'error', 
            message: `Conflicts detected: ${conflictMessages.join(', ')}` 
          });
        }
      }
    }
  };

  const exportTimetable = async () => {
    try {
      // Create CSV content grouped by classes
      let csvContent = '';
      
      // Add header information
      csvContent += 'Timetable Export Report\n';
      csvContent += `Export Date:,${new Date().toLocaleDateString()}\n`;
      csvContent += `Export Time:,${new Date().toLocaleTimeString()}\n`;
      csvContent += `Total Classes:,${Object.keys(groupedByClass).length}\n`;
      csvContent += `Total Lectures:,${filteredTimetable.length}\n`;
      csvContent += '\n'; // Empty line
      
      // Add summary table
      csvContent += 'SUMMARY BY CLASS\n';
      csvContent += 'Class Name,Grade,Campus,Floor,Total Lectures,Days Covered\n';
      
      Object.entries(groupedByClass).forEach(([classId, group]) => {
        const uniqueDays = [...new Set(group.entries.map(entry => entry.dayOfWeek))];
        csvContent += `"${group.classInfo.name}","${group.classInfo.grade}","${group.classInfo.campus}","${group.classInfo.floor}","${group.entries.length}","${uniqueDays.join(', ')}"\n`;
      });
      
      csvContent += '\n\n'; // Empty lines
      
      // Add detailed data for each class
      Object.entries(groupedByClass).forEach(([classId, group], index) => {
        if (index > 0) csvContent += '\n'; // Space between classes
        
        // Class header
        csvContent += `CLASS: ${group.classInfo.name}\n`;
        csvContent += `Details: ${group.classInfo.grade} ${group.classInfo.campus} - Floor ${group.classInfo.floor}\n`;
        csvContent += `Total Lectures: ${group.entries.length}\n`;
        csvContent += '\n';
        
        // Column headers for this class
        csvContent += 'Subject/Title,Teacher Name,Teacher Username,Day,Start Time,End Time,Lecture Type,Duration (mins)\n';
        
        // Add each lecture entry
        group.entries.forEach(entry => {
          const teacherName = entry.teacherId?.fullName ? 
            `${entry.teacherId.fullName.firstName || ''} ${entry.teacherId.fullName.lastName || ''}`.trim() 
            : entry.teacherId?.name || entry.teacherId?.email || 'No teacher assigned';
          
          const teacherUsername = entry.teacherId?.userName || '';
          const duration = entry.duration || '60';
          
          csvContent += `"${entry.title || entry.subject || ''}","${teacherName}","${teacherUsername}","${entry.dayOfWeek}","${entry.startTime}","${entry.endTime}","${entry.lectureType}","${duration}"\n`;
        });
        
        csvContent += '\n'; // Empty line after each class
      });
      
      // Create and download the file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `timetable-grouped-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      if (typeof addToast === 'function') {
        addToast({ type: 'success', message: 'Timetable exported successfully as CSV! You can open it in Excel.' });
      }
    } catch (error) {
      console.error('Error exporting timetable:', error);
      if (typeof addToast === 'function') {
        addToast({ type: 'error', message: 'Failed to export timetable' });
      }
    }
  };

  const filteredTimetable = timetableData.filter(entry => {
    const searchLower = searchTerm.toLowerCase();
    
    // Get teacher full name as string
    const teacherName = entry.teacherId?.fullName ? 
      `${entry.teacherId.fullName.firstName || ''} ${entry.teacherId.fullName.lastName || ''}`.trim() 
      : entry.teacherId?.name || entry.teacherId?.email || '';
    
    return (
      entry.title?.toLowerCase().includes(searchLower) ||
      entry.subject?.toLowerCase().includes(searchLower) ||
      teacherName.toLowerCase().includes(searchLower) ||
      entry.classId?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Group timetable entries by class
  const groupedByClass = filteredTimetable.reduce((groups, entry) => {
    const classKey = entry.classId?._id || 'unassigned';
    const className = entry.classId?.name || 'Unassigned Class';
    const classInfo = {
      name: className,
      grade: entry.classId?.grade,
      campus: entry.classId?.campus,
      floor: entry.classId?.floor
    };
    
    if (!groups[classKey]) {
      groups[classKey] = {
        classInfo,
        entries: []
      };
    }
    groups[classKey].entries.push(entry);
    return groups;
  }, {});

  // Sort entries within each class by day and time
  Object.values(groupedByClass).forEach(group => {
    group.entries.sort((a, b) => {
      const dayOrder = { 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6 };
      const dayDiff = dayOrder[a.dayOfWeek] - dayOrder[b.dayOfWeek];
      if (dayDiff !== 0) return dayDiff;
      
      // If same day, sort by start time
      return a.startTime.localeCompare(b.startTime);
    });
  });

  const getTimetableStats = () => {
    const totalEntries = filteredTimetable.length;
    const uniqueClasses = new Set(filteredTimetable.map(t => t.classId?._id)).size;
    const uniqueTeachers = new Set(filteredTimetable.map(t => t.teacherId?._id)).size;
    const todayEntries = filteredTimetable.filter(t => t.dayOfWeek === new Date().toLocaleDateString('en-US', { weekday: 'long' })).length;

    return { totalEntries, uniqueClasses, uniqueTeachers, todayEntries };
  };

  const stats = getTimetableStats();

  if (!canView) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-500">You don't have permission to view timetables.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Timetable Management</h1>
          <p className="text-gray-600 mt-1">Manage class schedules and teacher assignments</p>
        </div>
        <div className="flex flex-wrap gap-3">
          {canManage && (
            <>
              <Button variant="outline" onClick={exportTimetable}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button onClick={handleCreateTimetable}>
                <Plus className="h-4 w-4 mr-2" />
                Add Timetable Entry
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Entries</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <School className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Classes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueClasses}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <User className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Teachers</p>
                <p className="text-2xl font-bold text-gray-900">{stats.uniqueTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Today's Classes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.todayEntries}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="sm:col-span-2">
              <Input
                placeholder="Search timetables..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {Array.isArray(classes) && classes.map(cls => (
                  <SelectItem key={cls._id} value={cls._id}>
                    {cls.name} - {cls.grade} {cls.campus}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
              <SelectTrigger>
                <SelectValue placeholder="Select Teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {Array.isArray(teachers) && teachers.map(teacher => (
                  <SelectItem key={teacher._id} value={teacher._id}>
                    {`${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim() || teacher.name || teacher.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedDay} onValueChange={setSelectedDay}>
              <SelectTrigger>
                <SelectValue placeholder="Select Day" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Days</SelectItem>
                {days.map(day => (
                  <SelectItem key={day} value={day}>
                    {day}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedFloor} onValueChange={setSelectedFloor}>
              <SelectTrigger>
                <SelectValue placeholder="Select Floor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Floors</SelectItem>
                {floors.map(floor => (
                  <SelectItem key={floor.value} value={floor.value}>
                    {floor.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex justify-between items-center mt-4">
            <div className="flex gap-2">
              <Button
                variant="default"
                size="sm"
                disabled
              >
                <School className="h-4 w-4 mr-1" />
                Block View
              </Button>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => fetchInitialData()}>
              <Search className="h-4 w-4 mr-1" />
              Refresh Data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timetable Content */}
      {loading ? (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading timetable data...</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Enhanced Block View (Default and Only View)
        <TimetableBlockView
          groupedByClass={groupedByClass}
          canManage={canManage}
          onEdit={handleEditTimetable}
          onDelete={handleDeleteTimetable}
          onDeleteClass={handleDeleteClass}
        />
      )}

      {/* Timetable Form Modal */}
      {showForm && !editingTimetable && (
        <EnhancedTimetableForm
          classes={classes}
          teachers={teachers}
          onSubmit={handleFormSubmit}
          onClose={() => {
            setShowForm(false);
            setEditingTimetable(null);
          }}
          editingTimetable={editingTimetable}
        />
      )}

      {/* Individual Entry Edit Form */}
      {showForm && editingTimetable && (
        <TimetableForm
          timetable={editingTimetable}
          classes={classes}
          teachers={teachers}
          onSubmit={handleIndividualEntrySubmit}
          onClose={() => {
            setShowForm(false);
            setEditingTimetable(null);
          }}
        />
      )}
    </div>
  );
};

export default TimetableManagement;
