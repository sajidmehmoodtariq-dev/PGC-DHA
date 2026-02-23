import React from 'react';
import { BarChart3 } from 'lucide-react';

/**
 * Floating Attendance Glimpse Button
 * Only visible to Principal users
 * Similar to the correspondence glimpse button
 */
const AttendanceGlimpseButton = ({ onClick, loading = false }) => {
  return (
    <div className="fixed bottom-6 left-6 z-50">
      <button
        onClick={onClick}
        disabled={loading}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-full shadow-lg transition-all duration-300 hover:scale-105 flex items-center gap-2"
        title="View Attendance Statistics Overview"
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-sm font-medium">
          {loading ? 'Loading...' : 'Attendance Glimpse'}
        </span>
      </button>
    </div>
  );
};

export default AttendanceGlimpseButton;
