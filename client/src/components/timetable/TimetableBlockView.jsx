import React, { useState } from 'react';
import { Clock, User, BookOpen, Calendar, Edit, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const TimetableBlockView = ({ groupedByClass, canManage, onEdit, onDelete, onDeleteClass }) => {
  const [collapsedClasses, setCollapsedClasses] = useState(new Set());
  
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00'
  ];

  const toggleClassCollapse = (classId) => {
    setCollapsedClasses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(classId)) {
        newSet.delete(classId);
      } else {
        newSet.add(classId);
      }
      return newSet;
    });
  };

  const createTimeGrid = (entries) => {
    // Group entries by day and time
    const grid = {};
    daysOfWeek.forEach(day => {
      grid[day] = {};
    });

    entries.forEach(entry => {
      if (grid[entry.dayOfWeek]) {
        grid[entry.dayOfWeek][entry.startTime] = entry;
      }
    });

    return grid;
  };

  const getTimeSlotDuration = (startTime, endTime) => {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    return Math.ceil((endMinutes - startMinutes) / 30); // 30-minute slots
  };

  const getUsedTimeSlots = (entries) => {
    const usedSlots = new Set();
    entries.forEach(entry => {
      usedSlots.add(entry.startTime);
    });
    return Array.from(usedSlots).sort();
  };

  if (Object.keys(groupedByClass).length === 0) {
    return (
      <Card>
        <CardContent className="p-12">
          <div className="text-center">
            <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No timetable entries found</h3>
            <p className="text-gray-500">Create a new timetable to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {Object.entries(groupedByClass).map(([classId, group]) => {
        const timeGrid = createTimeGrid(group.entries);
        const usedTimeSlots = getUsedTimeSlots(group.entries);
        const activeDays = daysOfWeek.filter(day => 
          group.entries.some(entry => entry.dayOfWeek === day)
        );
        const isCollapsed = collapsedClasses.has(classId);

        return (
          <Card key={classId} className="overflow-hidden shadow-lg">
            {/* Class Header */}
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-3 text-xl">
                    <BookOpen className="h-6 w-6 text-blue-600" />
                    {group.classInfo.name}
                  </CardTitle>
                  <p className="text-gray-600 mt-1">
                    {group.classInfo.grade} {group.classInfo.campus} - Floor {group.classInfo.floor}
                  </p>
                  <div className="flex gap-4 mt-2">
                    <Badge variant="secondary" className="text-sm">
                      {group.entries.length} lectures
                    </Badge>
                    <Badge variant="outline" className="text-sm">
                      {activeDays.length} days active
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {canManage && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onDeleteClass && onDeleteClass(classId, group.classInfo.name)}
                      className="text-xs px-3 py-1 text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete All
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleClassCollapse(classId)}
                    className="ml-2"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-5 w-5" />
                    ) : (
                      <ChevronUp className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>

            {/* Collapsible Timetable Grid */}
            {!isCollapsed && (
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 p-3 text-left font-semibold text-gray-700 w-20">
                            Time
                          </th>
                          {daysOfWeek.map(day => (
                            <th key={day} className="border border-gray-200 p-3 text-center font-semibold text-gray-700 min-w-[180px]">
                              {day}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {usedTimeSlots.map(timeSlot => (
                          <tr key={timeSlot} className="hover:bg-gray-50">
                            <td className="border border-gray-200 p-2 font-medium text-gray-600 bg-gray-50 text-sm">
                              {timeSlot}
                            </td>
                            {daysOfWeek.map(day => {
                              const entry = timeGrid[day][timeSlot];
                              
                              if (entry) {
                                const teacherName = entry.teacherId?.fullName ? 
                                  `${entry.teacherId.fullName.firstName || ''} ${entry.teacherId.fullName.lastName || ''}`.trim() 
                                  : entry.teacherId?.name || entry.teacherId?.email || 'No teacher';

                                return (
                                  <td key={day} className="border border-gray-200 p-1">
                                    <div className="p-2 h-full">
                                      <div className="bg-white border border-gray-300 rounded-lg p-2 shadow-sm hover:shadow-md transition-shadow min-h-[80px]">
                                        {/* Lecture Header */}
                                        <div className="flex justify-between items-start mb-1">
                                          <div className="flex-1">
                                            <h4 className="font-semibold text-gray-900 text-xs leading-tight">
                                              {entry.title}
                                            </h4>
                                            {entry.subject && (
                                              <p className="text-xs text-gray-600 mt-1">
                                                {entry.subject}
                                              </p>
                                            )}
                                          </div>
                                          <Badge 
                                            variant={entry.lectureType === 'Theory' ? 'default' : 'secondary'}
                                            className="text-xs ml-1"
                                          >
                                            {entry.lectureType}
                                          </Badge>
                                        </div>

                                        {/* Teacher Info */}
                                        <div className="flex items-center gap-1 mb-1">
                                          <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                          <span className="text-xs text-gray-700 truncate">
                                            {teacherName}
                                          </span>
                                        </div>

                                        {/* Time Info */}
                                        <div className="flex items-center gap-1 mb-2">
                                          <Clock className="h-3 w-3 text-gray-500 flex-shrink-0" />
                                          <span className="text-xs text-gray-600">
                                            {entry.startTime} - {entry.endTime}
                                          </span>
                                        </div>

                                        {/* Actions */}
                                        {canManage && (
                                          <div className="flex gap-1">
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0"
                                              onClick={() => onEdit(entry)}
                                            >
                                              <Edit className="h-3 w-3" />
                                            </Button>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="h-5 w-5 p-0 text-red-600 hover:text-red-700"
                                              onClick={() => onDelete(entry._id)}
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                );
                              }

                              return (
                                <td key={day} className="border border-gray-200 p-2">
                                  <div className="text-center text-gray-400 text-sm min-h-[80px] flex items-center justify-center">
                                    -
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Class Summary */}
                <div className="bg-gray-50 p-4 border-t">
                  <div className="flex flex-wrap gap-6 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>Active Days: {activeDays.join(', ')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      <span>Time Range: {usedTimeSlots[0]} - {usedTimeSlots[usedTimeSlots.length - 1]}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>Total Lectures: {group.entries.length}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
};

export default TimetableBlockView;
