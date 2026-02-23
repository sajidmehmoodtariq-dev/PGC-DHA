import React from 'react';
import { Button } from '../ui/button';
import { Calendar, RefreshCw, Save } from 'lucide-react';

const TimetableControls = ({
  selectedDate,
  onDateChange,
  onRefresh,
  onSave,
  hasPendingChanges,
  saving,
  userRole
}) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-4 sm:mb-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="w-full sm:w-auto">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm sm:text-base"
            />
          </div>
          
          <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
            <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
            <span className="truncate">Today: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <Button
            onClick={onRefresh}
            variant="outline"
            size="sm"
            className="border-gray-300 hover:bg-gray-50 text-xs sm:text-sm w-full sm:w-auto"
          >
            <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="truncate">Refresh</span>
          </Button>
          
          {userRole === 'Coordinator' && (
            <Button
              onClick={onSave}
              disabled={saving || !hasPendingChanges}
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm w-full sm:w-auto"
            >
              <Save className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" />
              <span className="truncate">{saving ? 'Saving...' : 'Save Attendance'}</span>
            </Button>
          )}
        </div>
      </div>
      
      {userRole === 'Coordinator' && hasPendingChanges && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-800">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">
              You have {Object.keys(hasPendingChanges).length} unsaved attendance changes
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimetableControls;
