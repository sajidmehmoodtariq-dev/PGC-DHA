import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Clock, User, BookOpen, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

const ClassTimetableForm = ({ classes, teachers, onSubmit, onClose, editingTimetable = null }) => {
  console.log('ClassTimetableForm rendered with:', {
    classesCount: Array.isArray(classes) ? classes.length : 0,
    teachersCount: Array.isArray(teachers) ? teachers.length : 0,
    teachers: teachers
  });

  const [formData, setFormData] = useState({
    classId: '',
    dayOfWeek: '',
    lectures: [
      {
        id: Date.now(),
        lectureName: '',
        subject: '',
        type: 'Theory',
        startTime: '',
        endTime: '',
        teacherId: '',
        duration: 60 // in minutes
      }
    ]
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const lectureTypes = ['Theory', 'Practical', 'Lab', 'Tutorial'];

  // Use native time inputs to allow minute-level precision

  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime, duration) => {
    if (!startTime || !duration) return '';
    
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + parseInt(duration);
    
    const endHours = Math.floor(endMinutes / 60);
    const endMins = endMinutes % 60;
    
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (editingTimetable) {
      // If editing, populate form with existing data
      setFormData({
        classId: editingTimetable.classId,
        dayOfWeek: editingTimetable.dayOfWeek,
        lectures: editingTimetable.lectures || []
      });
    }
  }, [editingTimetable]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleLectureChange = (index, field, value) => {
    const updatedLectures = [...formData.lectures];
    updatedLectures[index] = {
      ...updatedLectures[index],
      [field]: value
    };

    // Auto-calculate end time when start time or duration changes
    if (field === 'startTime' || field === 'duration') {
      const lecture = updatedLectures[index];
      updatedLectures[index].endTime = calculateEndTime(
        field === 'startTime' ? value : lecture.startTime,
        field === 'duration' ? value : lecture.duration
      );
    }

    setFormData(prev => ({
      ...prev,
      lectures: updatedLectures
    }));
  };

  const addLecture = () => {
    const newLecture = {
      id: Date.now(),
      lectureName: '',
      subject: '',
      type: 'Theory',
      startTime: '',
      endTime: '',
      teacherId: '',
      duration: 60
    };

    setFormData(prev => ({
      ...prev,
      lectures: [...prev.lectures, newLecture]
    }));
  };

  const removeLecture = (index) => {
    if (formData.lectures.length > 1) {
      setFormData(prev => ({
        ...prev,
        lectures: prev.lectures.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.classId) {
      newErrors.classId = 'Please select a class';
    }

    if (!formData.dayOfWeek) {
      newErrors.dayOfWeek = 'Please select a day';
    }

    // Validate lectures
    formData.lectures.forEach((lecture, index) => {
      if (!lecture.lectureName.trim()) {
        newErrors[`lecture_${index}_name`] = 'Lecture name is required';
      }
      if (!lecture.subject.trim()) {
        newErrors[`lecture_${index}_subject`] = 'Subject is required';
      }
      if (!lecture.teacherId) {
        newErrors[`lecture_${index}_teacher`] = 'Please select a teacher';
      }
      if (!lecture.startTime) {
        newErrors[`lecture_${index}_startTime`] = 'Start time is required';
      }
    });

    // Check for time conflicts
    const sortedLectures = [...formData.lectures].sort((a, b) => a.startTime.localeCompare(b.startTime));
    for (let i = 0; i < sortedLectures.length - 1; i++) {
      const current = sortedLectures[i];
      const next = sortedLectures[i + 1];
      
      if (current.endTime && next.startTime && current.endTime > next.startTime) {
        newErrors.timeConflict = 'Lecture times overlap. Please adjust the schedule.';
        break;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Error submitting timetable:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedClass = classes.find(c => c._id === formData.classId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {editingTimetable ? 'Edit Class Timetable' : 'Create Class Timetable'}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Class and Day Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classId">Class *</Label>
                <Select 
                  value={formData.classId} 
                  onValueChange={(value) => handleInputChange('classId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls._id} value={cls._id}>
                        {cls.name} - {cls.grade} {cls.campus}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.classId && <p className="text-sm text-red-500">{errors.classId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day of Week *</Label>
                <Select 
                  value={formData.dayOfWeek} 
                  onValueChange={(value) => handleInputChange('dayOfWeek', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day} value={day}>
                        {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.dayOfWeek && <p className="text-sm text-red-500">{errors.dayOfWeek}</p>}
              </div>
            </div>

            {selectedClass && (
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700">
                  Creating timetable for: <strong>{selectedClass.name}</strong> - {selectedClass.grade} {selectedClass.campus}
                  {selectedClass.floor && ` (Floor ${selectedClass.floor})`}
                </p>
              </div>
            )}

            {/* Time Conflict Error */}
            {errors.timeConflict && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{errors.timeConflict}</p>
              </div>
            )}

            {/* Lectures Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">Lectures Schedule</h3>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addLecture}
                  className="flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Lecture
                </Button>
              </div>

              <div className="space-y-4">
                {formData.lectures.map((lecture, index) => (
                  <Card key={lecture.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Lecture {index + 1}</h4>
                      {formData.lectures.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLecture(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Lecture Name */}
                      <div className="space-y-2">
                        <Label>Lecture Name *</Label>
                        <Input
                          placeholder="e.g., Mathematics Class"
                          value={lecture.lectureName}
                          onChange={(e) => handleLectureChange(index, 'lectureName', e.target.value)}
                        />
                        {errors[`lecture_${index}_name`] && (
                          <p className="text-sm text-red-500">{errors[`lecture_${index}_name`]}</p>
                        )}
                      </div>

                      {/* Subject */}
                      <div className="space-y-2">
                        <Label>Subject *</Label>
                        <Input
                          placeholder="e.g., Mathematics"
                          value={lecture.subject}
                          onChange={(e) => handleLectureChange(index, 'subject', e.target.value)}
                        />
                        {errors[`lecture_${index}_subject`] && (
                          <p className="text-sm text-red-500">{errors[`lecture_${index}_subject`]}</p>
                        )}
                      </div>

                      {/* Lecture Type */}
                      <div className="space-y-2">
                        <Label>Type</Label>
                        <Select 
                          value={lecture.type} 
                          onValueChange={(value) => handleLectureChange(index, 'type', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {lectureTypes.map(type => (
                              <SelectItem key={type} value={type}>
                                {type}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Start Time */}
                      <div className="space-y-2">
                        <Label>Start Time *</Label>
                        <Input
                          type="time"
                          step="60"
                          value={lecture.startTime}
                          onChange={(e) => handleLectureChange(index, 'startTime', e.target.value)}
                        />
                        {errors[`lecture_${index}_startTime`] && (
                          <p className="text-sm text-red-500">{errors[`lecture_${index}_startTime`]}</p>
                        )}
                      </div>

                      {/* Duration */}
                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Select 
                          value={lecture.duration.toString()} 
                          onValueChange={(value) => handleLectureChange(index, 'duration', parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30 minutes</SelectItem>
                            <SelectItem value="45">45 minutes</SelectItem>
                            <SelectItem value="60">1 hour</SelectItem>
                            <SelectItem value="90">1.5 hours</SelectItem>
                            <SelectItem value="120">2 hours</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* End Time (auto-calculated) */}
                      <div className="space-y-2">
                        <Label>End Time</Label>
                        <Input
                          value={lecture.endTime}
                          disabled
                          className="bg-gray-50"
                          placeholder="Auto-calculated"
                        />
                      </div>

                      {/* Teacher */}
                      <div className="space-y-2 md:col-span-2 lg:col-span-3">
                        <Label>Assigned Teacher *</Label>
                        <Select 
                          value={lecture.teacherId} 
                          onValueChange={(value) => handleLectureChange(index, 'teacherId', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a teacher" />
                          </SelectTrigger>
                          <SelectContent>
                            {Array.isArray(teachers) && teachers.length > 0 ? (
                              teachers.map(teacher => (
                                <SelectItem key={teacher._id} value={teacher._id}>
                                  <div className="flex items-center gap-2">
                                    <User className="h-4 w-4" />
                                    <span>{`${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim() || teacher.name || teacher.email}</span>
                                  </div>
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-teachers" disabled>No teachers available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                        {errors[`lecture_${index}_teacher`] && (
                          <p className="text-sm text-red-500">{errors[`lecture_${index}_teacher`]}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Saving...' : editingTimetable ? 'Update Timetable' : 'Create Timetable'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassTimetableForm;
