import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { timetableAPI } from '../../services/timetableAPI';
import { classesAPI } from '../../services/classesAPI';
import { teacherAttendanceAPI } from '../../services/teacherAttendanceAPI';
import { useApiWithToast } from '../../hooks/useApiWithToast';
import TimetableGrid from '../../components/coordinator/TimetableGrid';
import TimetableControls from '../../components/coordinator/TimetableControls';
import TimetableStats from '../../components/coordinator/TimetableStats';
import AttendanceLegend from '../../components/coordinator/AttendanceLegend';

const CoordinatorTimetablePage = () => {
  const { user } = useAuth();
  const { handleApiResponse, toast } = useApiWithToast();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [timetableData, setTimetableData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [timeSlots, setTimeSlots] = useState([]);
  const [attendanceData, setAttendanceData] = useState({});
  const [pendingChanges, setPendingChanges] = useState({});
  const [saving, setSaving] = useState(false);

  // Get coordinator's assigned floor based on grade and campus
  const assignedFloor = useMemo(() => {
    if (!user || user.role !== 'Coordinator' || !user.coordinatorAssignment) {
      console.log('Coordinator assignment debug:', { user, role: user?.role, assignment: user?.coordinatorAssignment });
      return null;
    }
    
    const { grade, campus } = user.coordinatorAssignment;
    console.log('Coordinator assignment details:', { grade, campus });
    
    // Map grade and campus to floor number
    if (campus === 'Boys' && grade === '11th') return 1;
    if (campus === 'Boys' && grade === '12th') return 2;
    if (campus === 'Girls' && grade === '11th') return 3;
    if (campus === 'Girls' && grade === '12th') return 4;
    
    console.log('No floor mapping found for:', { grade, campus });
    return null;
  }, [user]);

  // Floor to section mapping
  const floorToSection = useMemo(() => ({
    1: '11-Boys',   // Floor 1: 11th Boys
    2: '12-Boys',   // Floor 2: 12th Boys  
    3: '11-Girls',  // Floor 3: 11th Girls
    4: '12-Girls'   // Floor 4: 12th Girls
  }), []);

  // Fetch timetable data for coordinator's assigned floor
  const fetchTimetableData = useCallback(async () => {
    console.log('Fetching timetable data for floor:', assignedFloor);
    if (!assignedFloor) {
      console.log('No assigned floor, skipping fetch');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Get day of week for the selected date
      const queryDate = new Date(selectedDate);
      const dayOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][queryDate.getDay()];
      
      // Get classes for the assigned floor
      const classesResponse = await classesAPI.getClasses();
      const allClasses = classesResponse.classes || classesResponse.data || [];
      
      // Filter classes by floor
      const floorClasses = allClasses.filter(cls => {
        let floor;
        if (cls.campus === 'Boys' && cls.grade === '11th') floor = 1;
        else if (cls.campus === 'Boys' && cls.grade === '12th') floor = 2;
        else if (cls.campus === 'Girls' && cls.grade === '11th') floor = 3;
        else if (cls.campus === 'Girls' && cls.grade === '12th') floor = 4;
        else floor = 1;
        
        return floor === assignedFloor;
      });
      
      setClasses(floorClasses);
      
      // Get timetable for the assigned floor
      const timetableResponse = await timetableAPI.getFloorTimetable(assignedFloor, dayOfWeek);
      const floorTimetable = timetableResponse.timetable || [];
      
      // Extract unique time slots
      const allTimeSlots = new Set();
      floorTimetable.forEach(entry => {
        if (entry.startTime && entry.endTime) {
          allTimeSlots.add(`${entry.startTime}-${entry.endTime}`);
        }
      });
      
      const timeSlotsList = Array.from(allTimeSlots)
        .map(slot => {
          const [start, end] = slot.split('-');
          return { start, end, label: `${start} - ${end}` };
        })
        .sort((a, b) => a.start.localeCompare(b.start));
      
      setTimeSlots(timeSlotsList);
      
      // Get attendance data for the selected date
      const attendanceResponse = await teacherAttendanceAPI.getAttendanceByDate(selectedDate).catch(() => ({ data: [] }));
      const attendanceMap = {};
      
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
      
      setAttendanceData(attendanceMap);
      
      // Process timetable data
      const processedData = {};
      floorClasses.forEach(cls => {
        processedData[cls.name] = {};
        
        timeSlotsList.forEach(slot => {
          // Check if this is break time
          if ((assignedFloor === 3 && slot.start === '11:20') || 
              (assignedFloor === 1 && slot.start === '12:00')) {
            processedData[cls.name][slot.start] = {
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
              status: 'not-marked'
            };
            
            if (attendance) {
              cellData.status = attendance.status === 'On Time' ? 'on-time' : 
                               attendance.status === 'Late' ? 'late' : 
                               attendance.status === 'Absent' ? 'absent' : 
                               attendance.status === 'Cancelled' ? 'cancelled' : 'not-marked';
              cellData.minutesLate = attendance.lateMinutes || 0;
              cellData.remarks = attendance.remarks;
            }
            
            processedData[cls.name][slot.start] = cellData;
          } else {
            processedData[cls.name][slot.start] = { isEmpty: true };
          }
        });
      });
      
      setTimetableData(processedData);
      
      console.log('=== COORDINATOR TIMETABLE DEBUG ===');
      console.log('Processed timetable data:', processedData);
      console.log('Classes found:', Object.keys(processedData));
      console.log('Selected date:', selectedDate);
      console.log('Assigned floor:', assignedFloor);
      console.log('=== END DEBUG ===');
      
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      setError('Failed to load timetable data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, assignedFloor, floorToSection]);

  useEffect(() => {
    if (user && user.role === 'Coordinator' && assignedFloor) {
      fetchTimetableData();
    } else if (!user) {
      setError('Please login to access this page');
    } else if (user.role !== 'Coordinator') {
      setError('Access denied. This page is only for Coordinator users.');
    }
  }, [selectedDate, user, assignedFloor, fetchTimetableData]);

  // Handle attendance status change
  const handleAttendanceChange = (classId, timeSlot, newStatus, lateMinutes = null) => {
    console.log('handleAttendanceChange called:', { classId, timeSlot, newStatus, lateMinutes });
    console.log('Current timetableData structure:', timetableData);
    
    const key = `${classId}_${timeSlot}`;
    setPendingChanges(prev => ({
      ...prev,
      [key]: {
        classId,
        timeSlot,
        status: newStatus,
        lateMinutes,
        timestamp: Date.now()
      }
    }));
  };

  // Save all pending changes
  const saveAttendanceChanges = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    
    try {
      setSaving(true);
      
      const attendanceRecords = Object.values(pendingChanges).map(change => {
        // Find the timetable data using the class name and time slot
        const cellData = timetableData[change.classId]?.[change.timeSlot];
        
        if (!cellData || !cellData.teacherId || !cellData.timetableId) {
          console.warn('Missing timetable data for attendance record:', change);
          return null;
        }
        
        return {
          teacherId: cellData.teacherId,
          timetableId: cellData.timetableId,
          status: change.status === 'on-time' ? 'On Time' : 
                  change.status === 'late' ? 'Late' : 
                  change.status === 'absent' ? 'Absent' : 
                  change.status === 'cancelled' ? 'Cancelled' : 'On Time',
          date: selectedDate,
          lateMinutes: change.lateMinutes || null,
          lateType: change.lateMinutes ? `${change.lateMinutes} min` : null,
          markedBy: user._id
        };
      }).filter(record => record !== null); // Remove null records
      
      console.log('Attendance records to save:', attendanceRecords);
      console.log('Individual record details:', JSON.stringify(attendanceRecords, null, 2));
      
      if (attendanceRecords.length === 0) {
        toast.error('No valid attendance records to save');
        return;
      }
      
      const response = await teacherAttendanceAPI.markBulkAttendance(attendanceRecords);
      
      if (response.success) {
        toast.success('Attendance saved successfully!');
        setPendingChanges({});
        // Refresh data
        await fetchTimetableData();
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance. Please try again.');
    } finally {
      setSaving(false);
    }
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

  if (!assignedFloor) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-yellow-500 mb-4">
            <svg className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <p className="text-yellow-600 mb-4">No floor assignment found</p>
          <p className="text-gray-600">
            Please contact an administrator to assign you to a grade and campus. 
            {user?.coordinatorAssignment && (
              <span className="block mt-2">
                Current assignment: {user.coordinatorAssignment.grade} {user.coordinatorAssignment.campus}
              </span>
            )}
          </p>
        </div>
      </div>
    );
  }

  const sectionTitle = floorToSection[assignedFloor];
  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
      <div className="max-w-full mx-auto">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-1 sm:mb-2">
            {sectionTitle} - Timetable Management
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            {user.role === 'Coordinator' ? 'Manage teacher attendance for your assigned floor' : 'View timetable and attendance status'}
          </p>
          
          {/* Floor Info */}
          <div className="mt-3 sm:mt-4 bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 sm:w-3 sm:h-3 bg-blue-500 rounded-full flex-shrink-0"></div>
                <span className="font-medium text-blue-900">
                  Assigned Floor: {assignedFloor} ({sectionTitle})
                </span>
              </div>
              <div className="text-blue-700">
                {user?.coordinatorAssignment && (
                  <span className="mr-2 sm:mr-4">
                    {user.coordinatorAssignment.grade} {user.coordinatorAssignment.campus}
                  </span>
                )}
                {classes.length} classe{classes.length !== 1 ? 's' : ''} assigned
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="mb-4 sm:mb-6 overflow-x-auto -mx-3 sm:mx-0">
          <TimetableControls
            selectedDate={selectedDate}
            onDateChange={setSelectedDate}
            onRefresh={fetchTimetableData}
            onSave={saveAttendanceChanges}
            hasPendingChanges={hasPendingChanges}
            saving={saving}
            userRole={user.role}
          />
        </div>

        {/* Legend */}
        <div className="mb-4 sm:mb-6">
          <AttendanceLegend />
        </div>

        {/* Timetable Grid */}
        <div className="mb-4 sm:mb-6 overflow-hidden">
          <TimetableGrid
            classes={classes}
            timeSlots={timeSlots}
            timetableData={timetableData}
            attendanceData={attendanceData}
            pendingChanges={pendingChanges}
            onAttendanceChange={handleAttendanceChange}
            userRole={user.role}
            assignedFloor={assignedFloor}
          />
        </div>

        {/* Statistics */}
        <div className="overflow-hidden">
          <TimetableStats
            timetableData={timetableData}
            pendingChanges={pendingChanges}
            classes={classes}
          />
        </div>
      </div>
    </div>
  );
};

export default CoordinatorTimetablePage;
