import React from 'react';

const TestStudentAttendance = () => {
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Student Attendance Management</h1>
        <p className="text-gray-600 mb-4">
          This is a test page to verify the route is working correctly.
        </p>
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          ✅ Route is working! The Student Attendance Management component should load here.
        </div>
      </div>
    </div>
  );
};

export default TestStudentAttendance;
