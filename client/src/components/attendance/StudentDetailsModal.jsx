import React, { useState, useEffect, useCallback } from 'react';
import { X, User, Mail, Calendar, BookOpen, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';

const StudentDetailsModal = ({ student, onClose }) => {
  const [attendanceData, setAttendanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStudentAttendance = useCallback(async () => {
    if (!student?._id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/attendance/student/${student._id}/summary`);
      
      if (response.data.success) {
        setAttendanceData(response.data.data);
      } else {
        setError('Failed to fetch attendance data');
      }
    } catch (err) {
      console.error('Error fetching student attendance:', err);
      setError('Error loading attendance data');
    } finally {
      setLoading(false);
    }
  }, [student?._id]);

  useEffect(() => {
    fetchStudentAttendance();
  }, [fetchStudentAttendance]);

  if (!student) return null;

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 rounded-full p-3">
              <User className="h-8 w-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {student.fullName?.firstName} {student.fullName?.lastName}
              </h2>
              <p className="text-gray-600">{student.email}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6">
          {/* Student Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {/* Basic Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-blue-600" />
                Basic Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Full Name:</span>
                  <span className="font-medium">
                    {student.fullName?.firstName} {student.fullName?.lastName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium">{student.email || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Username:</span>
                  <span className="font-medium">{student.username || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    student.status === 1 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {student.status === 1 ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Academic Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <BookOpen className="h-5 w-5 mr-2 text-green-600" />
                Academic Information
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Class:</span>
                  <span className="font-medium">
                    {student.academicInfo?.currentClass || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Session:</span>
                  <span className="font-medium">
                    {student.academicInfo?.session || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Roll Number:</span>
                  <span className="font-medium">
                    {student.academicInfo?.rollNumber || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Registration Date:</span>
                  <span className="font-medium">
                    {formatDate(student.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-purple-600" />
              Attendance Summary
            </h3>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3">Loading attendance data...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchStudentAttendance} variant="outline" size="sm">
                  Try Again
                </Button>
              </div>
            ) : attendanceData ? (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-blue-800">
                    {attendanceData.totalDays || 0}
                  </p>
                  <p className="text-sm text-blue-600">Total Days</p>
                </div>
                
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <TrendingUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-800">
                    {attendanceData.presentDays || 0}
                  </p>
                  <p className="text-sm text-green-600">Present Days</p>
                </div>
                
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <TrendingDown className="h-8 w-8 text-red-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-800">
                    {attendanceData.absentDays || 0}
                  </p>
                  <p className="text-sm text-red-600">Absent Days</p>
                </div>
                
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-purple-800">
                    {attendanceData.attendancePercentage ? 
                      `${attendanceData.attendancePercentage.toFixed(1)}%` : '0%'
                    }
                  </p>
                  <p className="text-sm text-purple-600">Attendance Rate</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No attendance data found for this student</p>
              </div>
            )}
          </div>

          {/* Additional Academic Details */}
          {student.academicInfo && (
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Additional Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {student.academicInfo.fatherName && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Father's Name:</span>
                    <span className="font-medium">{student.academicInfo.fatherName}</span>
                  </div>
                )}
                {student.academicInfo.dateOfBirth && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date of Birth:</span>
                    <span className="font-medium">{formatDate(student.academicInfo.dateOfBirth)}</span>
                  </div>
                )}
                {student.academicInfo.address && (
                  <div className="flex justify-between col-span-2">
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-right">{student.academicInfo.address}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsModal;
