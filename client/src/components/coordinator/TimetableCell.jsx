import React, { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ChevronDown } from 'lucide-react';

const TimetableCell = ({ cellData, pendingChange, onAttendanceChange, userRole, isMobile = false }) => {
  const [showLateOptions, setShowLateOptions] = useState(false);

  // Determine the effective status (pending change takes precedence)
  const effectiveStatus = pendingChange ? pendingChange.status : cellData.status;
  const effectiveLateMinutes = pendingChange ? pendingChange.lateMinutes : cellData.minutesLate;

  // Get cell styling based on status
  const getCellStyle = () => {
    const baseClasses = isMobile ? 'w-full' : 'h-full';
    
    if (cellData.isBreak) {
      return `${baseClasses} bg-gray-200 text-gray-600`;
    }

    if (cellData.isEmpty) {
      return `${baseClasses} bg-gray-50 text-gray-400`;
    }

    switch (effectiveStatus) {
      case 'on-time':
        return `${baseClasses} bg-green-100 border-green-300 text-green-800`;
      case 'late':
        if (effectiveLateMinutes >= 10) {
          return `${baseClasses} bg-red-100 border-red-300 text-red-800`; // 10+ minutes late
        } else {
          return `${baseClasses} bg-yellow-100 border-yellow-300 text-yellow-800`; // 5-9 minutes late
        }
      case 'replaced':
        return `${baseClasses} bg-purple-100 border-purple-300 text-purple-800`;
      case 'absent':
        return `${baseClasses} bg-gray-100 border-gray-300 text-gray-500`;
      case 'cancelled':
        return `${baseClasses} bg-orange-100 border-orange-300 text-orange-700`;
      case 'not-marked':
        return `${baseClasses} bg-blue-50 border-blue-200 text-blue-700`;
      default:
        return `${baseClasses} bg-white border-gray-200`;
    }
  };

  // Get cell content for view-only mode
  const getViewOnlyContent = () => {
    if (cellData.isBreak) {
      return <div className={`text-center font-semibold ${isMobile ? 'text-sm' : ''}`}>{cellData.label}</div>;
    }

    if (cellData.isEmpty) {
      return <div className={`text-center text-gray-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>No Class</div>;
    }

    return (
      <div className={`${isMobile ? 'p-2' : 'p-1'} ${isMobile ? 'text-sm' : 'text-xs'}`}>
        <div className="font-semibold text-gray-900 truncate">
          {cellData.teacher}
        </div>
        <div className="text-gray-600 truncate">{cellData.subject}</div>
        {effectiveStatus === 'late' && effectiveLateMinutes && (
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>
            {effectiveLateMinutes} min late
          </div>
        )}
        {effectiveStatus === 'absent' && (
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>Absent</div>
        )}
        {effectiveStatus === 'cancelled' && (
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>Cancelled</div>
        )}
        {effectiveStatus === 'not-marked' && (
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} font-medium`}>Not Marked</div>
        )}
        {cellData.remarks && (
          <div className={`${isMobile ? 'text-sm' : 'text-xs'} italic text-gray-500 truncate`} title={cellData.remarks}>
            {cellData.remarks}
          </div>
        )}
      </div>
    );
  };

  // Get editable content for coordinators
  const getEditableContent = () => {
    if (cellData.isBreak) {
      return <div className={`text-center font-semibold ${isMobile ? 'text-sm' : ''}`}>{cellData.label}</div>;
    }

    if (cellData.isEmpty) {
      return <div className={`text-center text-gray-400 ${isMobile ? 'text-sm' : 'text-xs'}`}>No Class</div>;
    }

    return (
      <div className={`${isMobile ? 'p-2' : 'p-1'} ${isMobile ? 'text-sm' : 'text-xs'}`}>
        <div className="font-semibold text-gray-900 truncate mb-1">
          {cellData.teacher}
        </div>
        <div className="text-gray-600 truncate mb-2">
          {cellData.subject}
        </div>
        
        {/* Status Selector */}
        <div className="space-y-1">
          <Select
            value={effectiveStatus}
            onValueChange={(value) => {
              if (value === 'late') {
                setShowLateOptions(true);
              } else {
                onAttendanceChange(value);
              }
            }}
          >
            <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'h-6 text-xs'}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="on-time">On Time</SelectItem>
              <SelectItem value="late">Late</SelectItem>
              <SelectItem value="absent">Absent</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Late Minutes Selector */}
          {effectiveStatus === 'late' && (
            <Select
              value={effectiveLateMinutes?.toString() || '5'}
              onValueChange={(value) => onAttendanceChange('late', parseInt(value))}
            >
              <SelectTrigger className={`${isMobile ? 'h-8 text-sm' : 'h-6 text-xs'}`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 min</SelectItem>
                <SelectItem value="10">10 min</SelectItem>
                <SelectItem value="15">15 min</SelectItem>
                <SelectItem value="20">20 min</SelectItem>
                <SelectItem value="30">30 min</SelectItem>
                <SelectItem value="45">45+ min</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        
        {/* Pending Change Indicator */}
        {pendingChange && (
          <div className={`mt-1 text-blue-600 font-medium ${isMobile ? 'text-sm' : 'text-xs'}`}>
            Pending
          </div>
        )}
      </div>
    );
  };

  // Render based on user role
  if (userRole === 'Coordinator') {
    return (
      <div className={`h-full ${getCellStyle()}`}>
        {getEditableContent()}
      </div>
    );
  }

  // View-only mode for principals
  return (
    <div className={`h-full ${getCellStyle()}`}>
      {getViewOnlyContent()}
    </div>
  );
};

export default TimetableCell;
