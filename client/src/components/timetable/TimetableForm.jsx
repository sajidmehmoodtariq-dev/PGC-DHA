import React, { useState, useEffect } from 'react';
import { X, Clock, User, School, BookOpen, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';

const TimetableForm = ({ timetable, classes, teachers, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    classId: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    teacherId: '',
    subject: '',
    lectureType: 'Theory',
    academicYear: ''
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const lectureTypes = ['Theory', 'Practical', 'Lab', 'Tutorial'];
  
  // Standard subjects for consistency
  const subjects = [
    // Core Subjects
    'Mathematics',
    'Physics', 
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
    'Urdu',
    'Islamic Studies',
    'Pakistan Studies',
    // Business/Commerce
    'Accounting',
    'Business Studies',
    'Economics',
    'Banking',
    'Commercial Geography',
    // ICS/FSc Additional
    'Statistics',
    // FA/Arts
    'Psychology', 
    'Sociology',
    'History',
    'Geography',
    // Other
    'Physical Education',
    'Ethics'
  ];

  // Use native time inputs to allow minute-level precision (e.g., 08:20, 08:45)

  useEffect(() => {
    if (timetable) {
      setFormData({
        title: timetable.title || '',
        classId: timetable.classId?._id || '',
        dayOfWeek: timetable.dayOfWeek || '',
        startTime: timetable.startTime || '',
        endTime: timetable.endTime || '',
        teacherId: timetable.teacherId?._id || '',
        subject: timetable.subject || '',
        lectureType: timetable.lectureType || 'Theory',
        academicYear: timetable.academicYear || ''
      });
    } else {
      // Set default academic year
      const currentYear = new Date().getFullYear();
      setFormData(prev => ({
        ...prev,
        academicYear: `${currentYear}-${currentYear + 1}`
      }));
    }
  }, [timetable]);

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

    // Auto-generate title when class and subject are selected
    if (field === 'classId' || field === 'subject') {
      const selectedClass = field === 'classId' ? 
        classes.find(c => c._id === value) : 
        classes.find(c => c._id === formData.classId);
      const subject = field === 'subject' ? value : formData.subject;
      
      if (selectedClass && subject) {
        setFormData(prev => ({
          ...prev,
          title: `${subject} - ${selectedClass.name}`
        }));
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.classId) newErrors.classId = 'Class is required';
    if (!formData.dayOfWeek) newErrors.dayOfWeek = 'Day is required';
    if (!formData.startTime) newErrors.startTime = 'Start time is required';
    if (!formData.endTime) newErrors.endTime = 'End time is required';
    if (!formData.teacherId) newErrors.teacherId = 'Teacher is required';
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required';

    // Validate time logic
    if (formData.startTime && formData.endTime) {
      const startMinutes = timeToMinutes(formData.startTime);
      const endMinutes = timeToMinutes(formData.endTime);
      
      if (endMinutes <= startMinutes) {
        newErrors.endTime = 'End time must be after start time';
      }
      
      if (endMinutes - startMinutes < 30) {
        newErrors.endTime = 'Minimum duration is 30 minutes';
      }
      
      if (endMinutes - startMinutes > 180) {
        newErrors.endTime = 'Maximum duration is 3 hours';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const timeToMinutes = (time) => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDuration = () => {
    if (formData.startTime && formData.endTime) {
      const startMinutes = timeToMinutes(formData.startTime);
      const endMinutes = timeToMinutes(formData.endTime);
      const duration = endMinutes - startMinutes;
      
      if (duration > 0) {
        const hours = Math.floor(duration / 60);
        const minutes = duration % 60;
        
        if (hours > 0 && minutes > 0) {
          return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
          return `${hours}h`;
        } else {
          return `${minutes}m`;
        }
      }
    }
    return '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {timetable ? 'Edit Timetable Entry' : 'Create Timetable Entry'}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Enter timetable entry title"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            {/* Class and Teacher Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="classId">Class *</Label>
                <Select 
                  value={formData.classId} 
                  onValueChange={(value) => handleInputChange('classId', value)}
                >
                  <SelectTrigger className={errors.classId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(cls => (
                      <SelectItem key={cls._id} value={cls._id}>
                        <div className="flex items-center gap-2">
                          <School className="h-4 w-4" />
                          <span>{cls.name} - {cls.grade} {cls.campus}</span>
                          <span className="text-xs text-gray-500">Floor {cls.floor}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.classId && <p className="text-sm text-red-500">{errors.classId}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="teacherId">Teacher *</Label>
                <Select 
                  value={formData.teacherId} 
                  onValueChange={(value) => handleInputChange('teacherId', value)}
                >
                  <SelectTrigger className={errors.teacherId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher._id} value={teacher._id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{`${teacher.fullName?.firstName || ''} ${teacher.fullName?.lastName || ''}`.trim() || teacher.name || teacher.email}</span>
                          <span className="text-xs text-gray-500">({teacher.userName})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.teacherId && <p className="text-sm text-red-500">{errors.teacherId}</p>}
              </div>
            </div>

            {/* Subject and Lecture Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Select 
                  value={formData.subject} 
                  onValueChange={(value) => handleInputChange('subject', value)}
                >
                  <SelectTrigger className={errors.subject ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(subject => (
                      <SelectItem key={subject} value={subject}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {subject}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.subject && <p className="text-sm text-red-500">{errors.subject}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lectureType">Lecture Type</Label>
                <Select 
                  value={formData.lectureType} 
                  onValueChange={(value) => handleInputChange('lectureType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {lectureTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          {type}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Day and Time */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dayOfWeek">Day *</Label>
                <Select 
                  value={formData.dayOfWeek} 
                  onValueChange={(value) => handleInputChange('dayOfWeek', value)}
                >
                  <SelectTrigger className={errors.dayOfWeek ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {days.map(day => (
                      <SelectItem key={day} value={day}>{day}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.dayOfWeek && <p className="text-sm text-red-500">{errors.dayOfWeek}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  step="60"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange('startTime', e.target.value)}
                  className={errors.startTime ? 'border-red-500' : ''}
                />
                {errors.startTime && <p className="text-sm text-red-500">{errors.startTime}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">End Time *</Label>
                <Input
                  id="endTime"
                  type="time"
                  step="60"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange('endTime', e.target.value)}
                  className={errors.endTime ? 'border-red-500' : ''}
                />
                {errors.endTime && <p className="text-sm text-red-500">{errors.endTime}</p>}
              </div>
            </div>

            {/* Duration Display */}
            {getDuration() && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-700">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm font-medium">Duration: {getDuration()}</span>
                </div>
              </div>
            )}

            {/* Academic Year */}
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <Input
                id="academicYear"
                value={formData.academicYear}
                onChange={(e) => handleInputChange('academicYear', e.target.value)}
                placeholder="e.g., 2024-2025"
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  timetable ? 'Update Entry' : 'Create Entry'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TimetableForm;
