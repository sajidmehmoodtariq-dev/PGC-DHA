import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { timetableAPI } from '../../services/timetableAPI';
import { classesAPI } from '../../services/classesAPI';
import { teacherAttendanceAPI } from '../../services/teacherAttendanceAPI';

const PrincipalTimetablePage = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timetableData, setTimetableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState({});
  const [timeSlots, setTimeSlots] = useState([]);

  // Floor to section mapping
  const floorToSection = useMemo(() => ({
    1: '11-Boys',   // Floor 1: 11th Boys
    2: '12-Boys',   // Floor 2: 12th Boys  
    3: '11-Girls',  // Floor 3: 11th Girls
    4: '12-Girls'   // Floor 4: 12th Girls
  }), []);

  // Section to floor mapping (reverse) - for potential future use
  const _sectionToFloor = {
    '11-Boys': 1,
    '12-Boys': 2,
    '11-Girls': 3,
    '12-Girls': 4
  };

  // Fetch real timetable and attendance data
  const fetchTimetableData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching timetable data for date:', selectedDate);
      
      // Get day of week for the selected date
      const queryDate = new Date(selectedDate);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][queryDate.getDay()];
      console.log('Day of week:', dayOfWeek);
      
      // Get all classes first
      console.log('Fetching classes...');
      const classesResponse = await classesAPI.getClasses();
      console.log('Classes response:', classesResponse);
      const allClasses = classesResponse.classes || classesResponse.data || [];
      console.log('All classes:', allClasses);

      // Get timetable data for all floors to identify which classes have timetables
      const floors = [1, 2, 3, 4];
      console.log('Fetching timetable for floors:', floors);
      const timetablePromises = floors.map(floor => {
        console.log(`Fetching timetable for floor ${floor}, day: ${dayOfWeek}`);
        return timetableAPI.getFloorTimetable(floor, dayOfWeek);
      });
      
      const timetableResponses = await Promise.allSettled(timetablePromises);
      console.log('Timetable responses:', timetableResponses);

      // Collect all class IDs that have timetables from the timetable responses
      const classesWithTimetables = new Set();
      timetableResponses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          const floorTimetable = response.value.timetable || [];
          console.log(`Floor ${floors[index]} timetable entries:`, floorTimetable.length);
          floorTimetable.forEach(entry => {
            console.log(`Timetable entry:`, entry);
            if (entry.class && entry.class._id) {
              classesWithTimetables.add(entry.class._id);
              console.log(`Found class with timetable: ${entry.class.name} (ID: ${entry.class._id})`);
            } else {
              console.log('Timetable entry missing class or class._id:', entry);
            }
          });
        }
      });
      
      // Collect all unique time slots from the actual timetable data
      const allTimeSlots = new Set();
      timetableResponses.forEach((response) => {
        if (response.status === 'fulfilled') {
          const floorTimetable = response.value.timetable || [];
          floorTimetable.forEach(entry => {
            if (entry.startTime && entry.endTime) {
              allTimeSlots.add(`${entry.startTime}-${entry.endTime}`);
            }
          });
        }
      });
      
      // Convert to sorted array of time slot objects with correct 24-hour label
      const format24 = (t) => {
        // If t is '00:15', convert to '12:15' (midnight is rare, but just in case)
        if (t.startsWith('00:')) return '12:' + t.slice(3);
        return t;
      };
      const timeSlotsList = Array.from(allTimeSlots)
        .map(slot => {
          const [start, end] = slot.split('-');
          return { start, end, label: `${format24(start)} - ${format24(end)}` };
        })
        .sort((a, b) => a.start.localeCompare(b.start));
      
      console.log('Unique time slots from database:', timeSlotsList);
      setTimeSlots(timeSlotsList);

      // Filter classes to only those that have timetables
      const classesWithTimetableData = allClasses.filter(cls => {
        const hasTable = classesWithTimetables.has(cls._id);
        console.log(`Class ${cls.name} (ID: ${cls._id}) has timetable: ${hasTable}`);
        console.log(`Class object:`, cls);
        return hasTable;
      });
      console.log('Filtered classes with timetables:', classesWithTimetableData);
      console.log('All class IDs from classes API:', allClasses.map(c => c._id));
      console.log('Class IDs with timetables:', Array.from(classesWithTimetables));

      // Group classes by floor (only those with timetables)
      const classesByFloor = {};
      classesWithTimetableData.forEach(cls => {
        // Use the original numeric floor from database, not the transformed one
        let floor;
        
        // Calculate the actual floor based on campus and grade since API transforms it
        if (cls.campus === 'Boys' && cls.grade === '11th') floor = 1;
        else if (cls.campus === 'Boys' && cls.grade === '12th') floor = 2;
        else if (cls.campus === 'Girls' && cls.grade === '11th') floor = 3;
        else if (cls.campus === 'Girls' && cls.grade === '12th') floor = 4;
        else floor = 1; // fallback
        
        console.log(`Processing class: ${cls.name}, original floor: ${cls.floor}, calculated floor: ${floor}, campus: ${cls.campus}, grade: ${cls.grade}`);
        
        if (!classesByFloor[floor]) {
          classesByFloor[floor] = [];
        }
        classesByFloor[floor].push(cls);
      });
      console.log('Classes by floor (with timetables only):', classesByFloor);
      setClasses(classesByFloor);      // Get attendance data for the selected date
      console.log('Fetching attendance data for date:', selectedDate);
      const attendanceResponse = await teacherAttendanceAPI.getAttendanceByDate(selectedDate).catch((err) => {
        console.log('Attendance fetch failed (using empty data):', err);
        return { data: [] };
      });

      console.log('Attendance response:', attendanceResponse);

      // Process timetable data
      const processedData = {};
      const attendanceMap = {};
      
      // Create attendance lookup map
      if (attendanceResponse.data) {
        attendanceResponse.data.forEach(record => {
          const key = `${record.teacherId._id}_${record.timetableId}`;
          attendanceMap[key] = {
            status: record.status,
            lateMinutes: record.lateMinutes,
            lateType: record.lateType,
            remarks: record.coordinatorRemarks || record.remarks
          };
        });
      }
      console.log('Attendance map:', attendanceMap);

      // Process each floor's timetable using the already fetched responses
      floors.forEach((floor, index) => {
        const section = floorToSection[floor];
        processedData[section] = {};
        
        console.log(`Processing floor ${floor} (${section})`);
        
        if (timetableResponses[index].status === 'fulfilled') {
          const floorTimetable = timetableResponses[index].value.timetable || [];
          console.log(`Floor ${floor} timetable:`, floorTimetable);
          
          // Get classes for this floor (only those with timetables)
          const floorClasses = classesByFloor[floor] || [];
          console.log(`Floor ${floor} classes:`, floorClasses);
          
          floorClasses.forEach(cls => {
            processedData[section][cls.name] = {};
            
            // Get time slots - use dynamic time slots from database
            timeSlotsList.forEach(slot => {
              // Check if this is break time
              if ((section.includes('Girls') && slot.start === '11:20') || 
                  (section.includes('Boys') && slot.start === '12:00')) {
                processedData[section][cls.name][slot.start] = {
                  isBreak: true,
                  label: 'BREAK'
                };
                return;
              }

              // Find timetable entry for this class and time slot
              const timetableEntry = floorTimetable.find(entry => 
                entry.class && entry.class.name === cls.name && 
                entry.startTime === slot.start
              );

              if (timetableEntry) {
                console.log(`Found timetable entry for ${cls.name} at ${slot.start}:`, timetableEntry);
                const teacherId = timetableEntry.teacher._id;
                const timetableId = timetableEntry._id;
                const attendanceKey = `${teacherId}_${timetableId}`;
                const attendance = attendanceMap[attendanceKey];

                let cellData = {
                  teacher: `${timetableEntry.teacher.fullName.firstName} ${timetableEntry.teacher.fullName.lastName}`,
                  subject: timetableEntry.subject,
                  timeSlot: slot,
                  timetableId,
                  teacherId,
                  status: 'not-marked' // Default if no attendance record
                };

                // Add attendance information if available
                if (attendance) {
                  switch (attendance.status) {
                    case 'On Time':
                      cellData.status = 'on-time';
                      break;
                    case 'Late':
                      cellData.status = 'late';
                      cellData.minutesLate = attendance.lateMinutes || 0;
                      break;
                    case 'Absent':
                      cellData.status = 'absent';
                      break;
                    case 'Cancelled':
                      cellData.status = 'cancelled';
                      break;
                    default:
                      cellData.status = 'not-marked';
                  }
                  if (attendance.remarks) {
                    cellData.remarks = attendance.remarks;
                  }
                }

                processedData[section][cls.name][slot.start] = cellData;
              } else {
                // No scheduled class for this time slot
                processedData[section][cls.name][slot.start] = {
                  isEmpty: true
                };
              }
            });
          });
        } else {
          console.error(`Failed to fetch timetable for floor ${floor}:`, timetableResponses[index].reason);
        }
      });

      console.log('Final processed data:', processedData);
      setTimetableData(processedData);
      
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      
      // Check if it's an authentication error
      if (error.message && error.message.includes('token')) {
        setError('Authentication failed. Please login again.');
      } else if (error.message && error.message.includes('permission')) {
        setError('You do not have permission to access this data.');
      } else {
        setError('Failed to load timetable data. Please try again. ' + (error.message || ''));
      }
    } finally {
      setLoading(false);
    }
  }, [selectedDate, floorToSection]);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (user && user.role === 'Principal') {
      fetchTimetableData();
    } else if (!user) {
      setError('Please login to access this page');
    } else {
      setError('Access denied. This page is only for Principal users.');
    }
  }, [selectedDate, user, fetchTimetableData]);

  const getCellStyle = (cellData) => {
    if (cellData.isBreak) {
      return 'bg-gray-200 text-gray-600';
    }

    if (cellData.isEmpty) {
      return 'bg-gray-50 text-gray-400';
    }

    switch (cellData.status) {
      case 'on-time':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'late':
        if (cellData.minutesLate >= 10) {
          return 'bg-red-100 border-red-300 text-red-800'; // 10+ minutes late
        } else {
          return 'bg-yellow-100 border-yellow-300 text-yellow-800'; // 5-9 minutes late
        }
      case 'replaced':
        return 'bg-purple-100 border-purple-300 text-purple-800';
      case 'absent':
        return 'bg-gray-100 border-gray-300 text-gray-500';
      case 'cancelled':
        return 'bg-orange-100 border-orange-300 text-orange-700';
      case 'not-marked':
        return 'bg-blue-50 border-blue-200 text-blue-700';
      default:
        return 'bg-white border-gray-200';
    }
  };

  const getCellContent = (cellData) => {
    if (cellData.isBreak) {
      return <div className="text-center font-semibold">{cellData.label}</div>;
    }

    if (cellData.isEmpty) {
      return <div className="text-center text-xs text-gray-400">No Class</div>;
    }

    return (
      <div className="p-1 text-xs">
        <div className="font-semibold text-gray-900 truncate">
          {cellData.status === 'replaced' ? cellData.replacementTeacher : cellData.teacher}
        </div>
        <div className="text-gray-600 truncate">{cellData.subject}</div>
        {cellData.status === 'late' && (
          <div className="text-xs font-medium">
            {cellData.minutesLate} min late
          </div>
        )}
        {cellData.status === 'replaced' && (
          <div className="text-xs">
            Replaced {cellData.originalTeacher}
          </div>
        )}
        {cellData.status === 'absent' && (
          <div className="text-xs font-medium">Absent</div>
        )}
        {cellData.status === 'cancelled' && (
          <div className="text-xs font-medium">Cancelled</div>
        )}
        {cellData.status === 'not-marked' && (
          <div className="text-xs font-medium">Not Marked</div>
        )}
        {cellData.remarks && (
          <div className="text-xs italic text-gray-500 truncate" title={cellData.remarks}>
            {cellData.remarks}
          </div>
        )}
      </div>
    );
  };

  const renderTimetableSection = (section, title) => {
    // Use dynamic time slots from database instead of hardcoded ones
    const sectionTimeSlots = timeSlots;
    const floorNumber = section === '11-Girls' ? 3 : section === '11-Boys' ? 1 : section === '12-Girls' ? 4 : 2;
    const sectionClasses = classes[floorNumber] || [];
    const sectionData = timetableData[section] || {};

    if (sectionClasses.length === 0) {
      return (
        <div key={section} className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
          <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-gray-200">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
            </div>
            <p className="font-medium text-gray-600">No classes with timetables found</p>
            <p className="text-sm text-gray-500 mt-1">Classes will appear here once timetables are created for this section</p>
          </div>
        </div>
      );
    }

    return (
      <div key={section} className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <div className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
            {sectionClasses.length} classe{sectionClasses.length !== 1 ? 's' : ''} with timetables
          </div>
        </div>
        
        <div className="overflow-x-auto border border-gray-300 rounded-lg">
          <div className="min-w-max">
            <table className="w-full border-collapse">
              {/* Header with time slots */}
              <thead>
                <tr>
                  <th className="border border-gray-300 bg-gray-100 px-3 py-2 text-left font-semibold sticky left-0 z-10 min-w-[120px]">
                    Class
                  </th>
                  {sectionTimeSlots.map(slot => (
                    <th key={slot.start} className="border border-gray-300 bg-gray-100 px-3 py-2 text-center font-semibold min-w-[180px]">
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>
              
              {/* Timetable rows */}
              <tbody>
                {sectionClasses.map(cls => (
                  <tr key={cls._id}>
                    <td className="border border-gray-300 bg-gray-50 px-3 py-2 font-medium text-sm sticky left-0 z-10 min-w-[120px]">
                      {cls.name}
                    </td>
                    {sectionTimeSlots.map(slot => {
                      const cellData = sectionData[cls.name]?.[slot.start] || { isEmpty: true };
                      return (
                        <td 
                          key={`${cls.name}-${slot.start}`} 
                          className={`border border-gray-300 p-1 h-16 min-w-[180px] ${getCellStyle(cellData)}`}
                        >
                          {getCellContent(cellData)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Statistics for this section */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div className="bg-green-100 p-3 rounded text-center">
            <div className="font-semibold text-green-800">On Time</div>
            <div className="text-green-600">
              {Object.values(sectionData).reduce((acc, classData) => 
                acc + Object.values(classData).filter(cell => cell.status === 'on-time').length, 0
              )}
            </div>
          </div>
          <div className="bg-yellow-100 p-3 rounded text-center">
            <div className="font-semibold text-yellow-800">5+ Min Late</div>
            <div className="text-yellow-600">
              {Object.values(sectionData).reduce((acc, classData) => 
                acc + Object.values(classData).filter(cell => cell.status === 'late' && cell.minutesLate < 10).length, 0
              )}
            </div>
          </div>
          <div className="bg-red-100 p-3 rounded text-center">
            <div className="font-semibold text-red-800">10+ Min Late</div>
            <div className="text-red-600">
              {Object.values(sectionData).reduce((acc, classData) => 
                acc + Object.values(classData).filter(cell => cell.status === 'late' && cell.minutesLate >= 10).length, 0
              )}
            </div>
          </div>
          <div className="bg-purple-100 p-3 rounded text-center">
            <div className="font-semibold text-purple-800">Replaced</div>
            <div className="text-purple-600">
              {Object.values(sectionData).reduce((acc, classData) => 
                acc + Object.values(classData).filter(cell => cell.status === 'replaced').length, 0
              )}
            </div>
          </div>
          <div className="bg-gray-100 p-3 rounded text-center">
            <div className="font-semibold text-gray-800">Absent</div>
            <div className="text-gray-600">
              {Object.values(sectionData).reduce((acc, classData) => 
                acc + Object.values(classData).filter(cell => cell.status === 'absent').length, 0
              )}
            </div>
          </div>
          <div className="bg-blue-100 p-3 rounded text-center">
            <div className="font-semibold text-blue-800">Not Marked</div>
            <div className="text-blue-600">
              {Object.values(sectionData).reduce((acc, classData) => 
                acc + Object.values(classData).filter(cell => cell.status === 'not-marked').length, 0
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading timetable data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchTimetableData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchTimetableData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchTimetableData}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Principal Timetable Overview
          </h1>
          <p className="text-gray-600">
            Real-time attendance tracking for all classes and teachers
          </p>
          
          {/* Summary */}
          <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="font-medium text-blue-900">
                  Total Classes with Timetables: {Object.values(classes).reduce((total, floorClasses) => total + floorClasses.length, 0)}
                </span>
              </div>
              <div className="text-blue-700">
                {Object.entries(classes).map(([floor, floorClasses]) => 
                  floorClasses.length > 0 ? `Floor ${floor}: ${floorClasses.length}` : null
                ).filter(Boolean).join(', ')}
              </div>
            </div>
          </div>
          
          {/* Date selector */}
          <div className="mt-4 flex items-center gap-4">
            <label htmlFor="date" className="text-sm font-medium text-gray-700">
              Date:
            </label>
            <input
              type="date"
              id="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Legend */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3">Legend</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-100 border border-green-300 rounded"></div>
              <span>On Time</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-100 border border-yellow-300 rounded"></div>
              <span>5-9 Min Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
              <span>10+ Min Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-100 border border-purple-300 rounded"></div>
              <span>Replaced</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></div>
              <span>Not Marked</span>
            </div>
          </div>
        </div>

        {/* Debug information */}
        {import.meta.env.DEV && (
          <div className="mb-6 p-4 bg-gray-100 rounded-lg text-sm">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Selected Date:</strong> {selectedDate}</p>
                <p><strong>Total Classes with Timetables:</strong> {Object.values(classes).reduce((total, floorClasses) => total + floorClasses.length, 0)}</p>
                <p><strong>Sections with Data:</strong> {Object.keys(timetableData).join(', ')}</p>
              </div>
              <div>
                <p><strong>Classes by Floor:</strong></p>
                <ul className="ml-4">
                  {Object.entries(classes).map(([floor, classList]) => (
                    <li key={floor}>Floor {floor}: {classList.length} classes ({classList.map(c => c.name).join(', ')})</li>
                  ))}
                </ul>
              </div>
            </div>
            {error && <p className="text-red-600 mt-2"><strong>Error:</strong> {error}</p>}
          </div>
        )}

        {/* Timetable Sections */}
        <div className="space-y-8">
          {renderTimetableSection('11-Girls', '11th Grade - Girls Campus')}
          {renderTimetableSection('11-Boys', '11th Grade - Boys Campus')}
          {renderTimetableSection('12-Girls', '12th Grade - Girls Campus')}
          {renderTimetableSection('12-Boys', '12th Grade - Boys Campus')}
        </div>
      </div>
    </div>
  );
};

export default PrincipalTimetablePage;
