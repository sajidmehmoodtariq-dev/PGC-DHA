import React, { useState, useEffect } from 'react';
import { X, Plus, Clock, User, BookOpen, Calendar, Trash2, GripVertical, Save, CheckCircle, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'
];

const EnhancedTimetableForm = ({ classes, teachers, onSubmit, onClose }) => {
  const [selectedClass, setSelectedClass] = useState('');
  const [weekSchedule, setWeekSchedule] = useState({});
  const [errors, setErrors] = useState({});
  const [savedDays, setSavedDays] = useState(new Set()); // Track which days have been saved
  const [savingDay, setSavingDay] = useState(null); // Track which day is currently being saved

  const daysOfWeek = DAYS_OF_WEEK;

  // Use native time input for minute-level precision

  const lectureTypes = ['Theory', 'Practical', 'Lab', 'Tutorial', 'Seminar'];
  
  // Standard subjects for consistency
  const subjects = [
    'Mathematics',
    'Physics', 
    'Chemistry',
    'Biology',
    'Computer Science',
    'English',
    'Urdu',
    'Islamic Studies',
    'Pakistan Studies',
    'Accounting',
    'Business Studies',
    'Economics',
    'Banking',
    'Commercial Geography',
    'Statistics',
    'Psychology', 
    'Sociology',
    'History',
    'Geography',
    'Physical Education',
    'Ethics'
  ];

  useEffect(() => {
    // Initialize empty schedule for all days
    const initialSchedule = {};
    DAYS_OF_WEEK.forEach(day => {
      initialSchedule[day] = [];
    });
    setWeekSchedule(initialSchedule);
  }, []);

  const addDayBlock = (day) => {
    setWeekSchedule(prev => ({
      ...prev,
      [day]: prev[day] || []
    }));
  };

  const copyFromPreviousDay = (targetDay, sourceDay) => {
    setWeekSchedule(prev => {
      const sourceLectures = prev[sourceDay] || [];
      const copiedLectures = sourceLectures.map(lecture => ({
        ...lecture,
        id: Date.now() + Math.random() // Generate new unique ID
      }));
      
      return {
        ...prev,
        [targetDay]: copiedLectures
      };
    });
  };

  const removeDayBlock = (day) => {
    setWeekSchedule(prev => {
      const updated = { ...prev };
      delete updated[day];
      return updated;
    });
  };

  const addLectureToDay = (day) => {
    const newLecture = {
      id: Date.now(),
      lectureName: '',
      subject: '',
      startTime: '',
      duration: 60,
      endTime: '',
      teacherId: '',
      type: 'Theory'
    };

    setWeekSchedule(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), newLecture]
    }));
  };

  const removeLectureFromDay = (day, lectureId) => {
    setWeekSchedule(prev => ({
      ...prev,
      [day]: prev[day].filter(lecture => lecture.id !== lectureId)
    }));
  };

  const updateLecture = (day, lectureId, field, value) => {
    setWeekSchedule(prev => ({
      ...prev,
      [day]: prev[day].map(lecture => {
        if (lecture.id === lectureId) {
          const updated = { ...lecture, [field]: value };
          
          // Auto-calculate end time when start time or duration changes
          if (field === 'startTime' || field === 'duration') {
            const startTime = field === 'startTime' ? value : lecture.startTime;
            const duration = field === 'duration' ? parseInt(value) : lecture.duration;
            
            if (startTime && duration) {
              const [hours, minutes] = startTime.split(':').map(Number);
              const startMinutes = hours * 60 + minutes;
              const endMinutes = startMinutes + duration;
              const endHours = Math.floor(endMinutes / 60);
              const endMins = endMinutes % 60;
              updated.endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
            }
          }
          
          return updated;
        }
        return lecture;
      })
    }));
  };

  const validateDay = (day) => {
    const newErrors = {};
    
    if (!selectedClass) {
      newErrors.class = 'Please select a class';
    }

    const lectures = weekSchedule[day] || [];
    if (lectures.length === 0) {
      newErrors[`${day}_schedule`] = 'Please add at least one lecture for this day';
    }

    // Validate each lecture for this day
    lectures.forEach((lecture) => {
      if (!lecture.lectureName.trim()) {
        newErrors[`${day}_${lecture.id}_name`] = 'Lecture name is required';
      }
      if (!lecture.startTime) {
        newErrors[`${day}_${lecture.id}_time`] = 'Start time is required';
      }
      if (!lecture.teacherId) {
        newErrors[`${day}_${lecture.id}_teacher`] = 'Teacher is required';
      }
    });

    return newErrors;
  };

  const handleDaySave = async (day) => {
    const dayErrors = validateDay(day);
    
    if (Object.keys(dayErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...dayErrors }));
      return;
    }

    // Clear errors for this day
    setErrors(prev => {
      const newErrors = { ...prev };
      Object.keys(newErrors).forEach(key => {
        if (key.startsWith(day)) {
          delete newErrors[key];
        }
      });
      return newErrors;
    });

    setSavingDay(day);

    try {
      // Transform the day's lectures to the expected format
      const dayLectures = weekSchedule[day].map(lecture => ({
        ...lecture,
        dayOfWeek: day
      }));

      const formData = {
        classId: selectedClass,
        lectures: dayLectures
      };

      await onSubmit(formData);
      
      // Mark this day as saved and disable its button
      setSavedDays(prev => new Set([...prev, day]));
      
      // Success - day was saved successfully
      console.log(`${day} saved successfully`);
      
    } catch (error) {
      console.error(`Error saving ${day}:`, error);
      // Only show error if it's a real error, not just form staying open
      if (error.message && !error.message.includes('form')) {
        // Handle actual save errors here if needed
      }
    } finally {
      setSavingDay(null);
    }
  };

  const handleEditDay = (day) => {
    // Remove day from saved list to allow editing again
    setSavedDays(prev => {
      const newSet = new Set(prev);
      newSet.delete(day);
      return newSet;
    });
  };

  const getTotalLectures = () => {
    return Object.values(weekSchedule).reduce((total, dayLectures) => total + dayLectures.length, 0);
  };

  const getActiveDays = () => {
    return Object.keys(weekSchedule).filter(day => weekSchedule[day].length > 0);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl my-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 sm:p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold">Create Class Timetable</h2>
              <p className="text-blue-100 mt-1 text-sm sm:text-base">Build a complete weekly schedule for your class</p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="text-white hover:bg-white/10">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="p-4 sm:p-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* Class Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Select Class
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Class *</Label>
                  <Select value={selectedClass} onValueChange={setSelectedClass}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a class for this timetable" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.isArray(classes) && classes.map(cls => (
                        <SelectItem key={cls._id} value={cls._id}>
                          {cls.name} - {cls.grade} {cls.campus} (Floor {cls.floor})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.class && <p className="text-sm text-red-500 mt-1">{errors.class}</p>}
                </div>
                
                {selectedClass && (
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-blue-900">Schedule Summary</h3>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                      <div>
                        <span className="text-blue-600">Active Days:</span>
                        <span className="ml-2 font-medium">{getActiveDays().length}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Total Lectures:</span>
                        <span className="ml-2 font-medium">{getTotalLectures()}</span>
                      </div>
                      <div>
                        <span className="text-blue-600">Days:</span>
                        <span className="ml-2 font-medium">{getActiveDays().join(', ') || 'None'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Days and Lectures */}
          {selectedClass && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weekly Schedule
                </CardTitle>
                <p className="text-sm text-gray-600">Add days and lectures to build your weekly timetable</p>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Available Days */}
                  <div>
                    <Label className="text-base font-semibold">Add Days</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                      {daysOfWeek.map(day => (
                        <Button
                          key={day}
                          variant={weekSchedule[day] ? "default" : "outline"}
                          size="sm"
                          onClick={() => weekSchedule[day] ? removeDayBlock(day) : addDayBlock(day)}
                          className="justify-start text-xs sm:text-sm"
                        >
                          {weekSchedule[day] ? (
                            <>
                              <Calendar className="h-4 w-4 mr-2" />
                              {day} ({weekSchedule[day].length})
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-2" />
                              {day}
                            </>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Day Blocks */}
                  <div className="space-y-4">
                    {daysOfWeek.map((day) => {
                      const lectures = weekSchedule[day];
                      if (!lectures) return null; // Only show if day is selected

                      // Find previous day with lectures for copy functionality
                      const dayIndex = daysOfWeek.indexOf(day);
                      const previousDaysWithLectures = daysOfWeek.slice(0, dayIndex).filter(d => 
                        weekSchedule[d] && weekSchedule[d].length > 0
                      );
                      const previousDay = previousDaysWithLectures[previousDaysWithLectures.length - 1];

                      return (
                        <Card key={day} className="border-l-4 border-l-blue-500">
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-center">
                              <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-blue-500" />
                                {day}
                                <Badge variant="secondary">{lectures.length} lectures</Badge>
                                {savedDays.has(day) && (
                                  <Badge variant="default" className="bg-green-500 text-white">
                                    Saved ✓
                                  </Badge>
                                )}
                              </CardTitle>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addLectureToDay(day)}
                                >
                                  <Plus className="h-4 w-4 mr-1" />
                                  Add Lecture
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDayBlock(day)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            {/* Copy from previous day option */}
                            {previousDay && (
                              <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        copyFromPreviousDay(day, previousDay);
                                        // If this day was saved, mark it as unsaved since we're changing it
                                        if (savedDays.has(day)) {
                                          handleEditDay(day);
                                        }
                                      }}
                                      className="text-blue-700 border-blue-300 hover:bg-blue-100"
                                    >
                                      <Clock className="h-4 w-4 mr-1" />
                                      Copy from {previousDay}
                                    </Button>
                                  </div>
                                  <Badge variant="outline" className="text-blue-700 border-blue-300">
                                    {weekSchedule[previousDay]?.length || 0} lectures
                                  </Badge>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                  Copy all lectures from {previousDay} to {day}, then edit as needed
                                </p>
                              </div>
                            )}
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-4">
                              {lectures.map((lecture, index) => (
                                <Card key={lecture.id} className="border border-gray-200">
                                  <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                      <h4 className="font-medium text-gray-900">Lecture {index + 1}</h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeLectureFromDay(day, lecture.id)}
                                        className="text-red-600 hover:text-red-700 h-8 w-8 p-0"
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                      {/* Lecture Name */}
                                      <div>
                                        <Label>Lecture Name *</Label>
                                        <Input
                                          value={lecture.lectureName}
                                          onChange={(e) => updateLecture(day, lecture.id, 'lectureName', e.target.value)}
                                          placeholder="e.g., Mathematics"
                                        />
                                        {errors[`${day}_${lecture.id}_name`] && (
                                          <p className="text-sm text-red-500 mt-1">{errors[`${day}_${lecture.id}_name`]}</p>
                                        )}
                                      </div>

                                      {/* Subject */}
                                      <div>
                                        <Label>Subject</Label>
                                        <Select 
                                          value={lecture.subject} 
                                          onValueChange={(value) => updateLecture(day, lecture.id, 'subject', value)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select subject" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {subjects.map(subject => (
                                              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      {/* Lecture Type */}
                                      <div>
                                        <Label>Type</Label>
                                        <Select 
                                          value={lecture.type} 
                                          onValueChange={(value) => updateLecture(day, lecture.id, 'type', value)}
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
                                      <div>
                                        <Label>Start Time *</Label>
                                        <input
                                          type="time"
                                          step="60"
                                          value={lecture.startTime}
                                          onChange={(e) => updateLecture(day, lecture.id, 'startTime', e.target.value)}
                                          className="w-full border border-gray-300 rounded-lg px-3 py-2"
                                        />
                                        {errors[`${day}_${lecture.id}_time`] && (
                                          <p className="text-sm text-red-500 mt-1">{errors[`${day}_${lecture.id}_time`]}</p>
                                        )}
                                      </div>

                                      {/* Duration */}
                                      <div>
                                        <Label>Duration (minutes)</Label>
                                        <Select 
                                          value={lecture.duration.toString()} 
                                          onValueChange={(value) => updateLecture(day, lecture.id, 'duration', parseInt(value))}
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

                                      {/* End Time */}
                                      <div>
                                        <Label>End Time</Label>
                                        <Input
                                          value={lecture.endTime}
                                          disabled
                                          className="bg-gray-50"
                                          placeholder="Auto-calculated"
                                        />
                                      </div>

                                      {/* Teacher */}
                                      <div className="md:col-span-2 lg:col-span-3">
                                        <Label>Assigned Teacher *</Label>
                                        <Select 
                                          value={lecture.teacherId} 
                                          onValueChange={(value) => updateLecture(day, lecture.id, 'teacherId', value)}
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
                                        {errors[`${day}_${lecture.id}_teacher`] && (
                                          <p className="text-sm text-red-500 mt-1">{errors[`${day}_${lecture.id}_teacher`]}</p>
                                        )}
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                              
                              {/* Day Save Button */}
                              {lectures.length > 0 && (
                                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                                  {savedDays.has(day) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleEditDay(day)}
                                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                                    >
                                      <Edit className="h-4 w-4 mr-2" />
                                      Edit {day}
                                    </Button>
                                  )}
                                  <Button
                                    onClick={() => handleDaySave(day)}
                                    disabled={savedDays.has(day) || savingDay === day || !selectedClass}
                                    className={`${
                                      savedDays.has(day) 
                                        ? 'bg-green-500 hover:bg-green-600 cursor-not-allowed' 
                                        : 'bg-blue-500 hover:bg-blue-600'
                                    } ${savedDays.has(day) ? '' : 'ml-auto'}`}
                                  >
                                    {savingDay === day ? (
                                      <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                        Saving...
                                      </>
                                    ) : savedDays.has(day) ? (
                                      <>
                                        <CheckCircle className="h-4 w-4 mr-2" />
                                        Saved ✓
                                      </>
                                    ) : (
                                      <>
                                        <Save className="h-4 w-4 mr-2" />
                                        Save {day}
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                              
                              {/* Error for this day */}
                              {errors[`${day}_schedule`] && (
                                <p className="text-sm text-red-500 mt-2">{errors[`${day}_schedule`]}</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
                {errors.schedule && <p className="text-sm text-red-500 mt-2">{errors.schedule}</p>}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-600 text-center sm:text-left">
            {getTotalLectures() > 0 && (
              <div className="space-y-1">
                <div>
                  {getTotalLectures()} lectures across {getActiveDays().length} days
                </div>
                {savedDays.size > 0 && (
                  <div className="text-green-600 font-medium">
                    {savedDays.size} day{savedDays.size !== 1 ? 's' : ''} saved: {Array.from(savedDays).join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="outline" onClick={onClose} className="flex-1 sm:flex-initial">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimetableForm;
