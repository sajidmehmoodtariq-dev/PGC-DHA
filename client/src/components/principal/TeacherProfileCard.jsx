import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  User, 
  Clock, 
  BookOpen, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
  Phone,
  Mail
} from 'lucide-react';

const TeacherProfileCard = ({ teacher, onViewDetails }) => {
  const { weeklyStats } = teacher;
  const attendanceRate = weeklyStats.totalLectures > 0 
    ? ((weeklyStats.attendedLectures / weeklyStats.totalLectures) * 100).toFixed(1)
    : 0;

  const getAttendanceColor = (rate) => {
    if (rate >= 90) return 'text-green-600 bg-green-100';
    if (rate >= 70) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getLateStatusColor = (lateCount) => {
    if (lateCount === 0) return 'text-green-600 bg-green-100';
    if (lateCount <= 2) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-lg font-semibold">
                {teacher.fullName.firstName} {teacher.fullName.lastName}
              </CardTitle>
              <p className="text-sm text-gray-500">{teacher.employeeId}</p>
            </div>
          </div>
          <Badge variant="outline" className="text-xs">
            {weeklyStats.totalTests} Tests
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Weekly Attendance */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">This Week</span>
          </div>
          <div className="text-right">
            <div className="text-lg font-bold">
              {weeklyStats.attendedLectures}/{weeklyStats.totalLectures}
            </div>
            <Badge className={`text-xs ${getAttendanceColor(attendanceRate)}`}>
              {attendanceRate}% Attendance
            </Badge>
          </div>
        </div>

        {/* Late Count */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-600" />
            <span className="text-sm font-medium">Late (&gt;10 min)</span>
          </div>
          <Badge className={`text-xs ${getLateStatusColor(weeklyStats.lateCount)}`}>
            {weeklyStats.lateCount} times
          </Badge>
        </div>

        {/* Contact Info */}
        <div className="pt-2 border-t">
          <div className="flex items-center space-x-2 text-xs text-gray-500 mb-1">
            <Mail className="w-3 h-3" />
            <span>{teacher.email}</span>
          </div>
          {teacher.phoneNumber && (
            <div className="flex items-center space-x-2 text-xs text-gray-500">
              <Phone className="w-3 h-3" />
              <span>{teacher.phoneNumber}</span>
            </div>
          )}
          <div className="mt-3 text-right">
            <Button size="sm" onClick={() => onViewDetails(teacher._id)}>
              View Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TeacherProfileCard;
