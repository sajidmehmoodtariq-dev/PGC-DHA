import React from 'react';

const AttendanceLegend = () => {
  return (
    <div className="mb-4 sm:mb-6 bg-white p-3 sm:p-4 rounded-lg shadow border border-gray-200">
      <h3 className="text-base sm:text-lg font-semibold mb-2 sm:mb-3 text-gray-900">Attendance Legend</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 text-xs sm:text-sm">
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-100 border border-green-300 rounded flex-shrink-0"></div>
          <span className="text-gray-700 truncate">On Time</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-100 border border-yellow-300 rounded flex-shrink-0"></div>
          <span className="text-gray-700 truncate">5-9 Min Late</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-red-100 border border-red-300 rounded flex-shrink-0"></div>
          <span className="text-gray-700 truncate">10+ Min Late</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-100 border border-purple-300 rounded flex-shrink-0"></div>
          <span className="text-gray-700 truncate">Replaced</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-gray-100 border border-gray-300 rounded flex-shrink-0"></div>
          <span className="text-gray-700 truncate">Absent</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-100 border border-blue-300 rounded flex-shrink-0"></div>
          <span className="text-gray-700 truncate">Not Marked</span>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLegend;
