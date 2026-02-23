import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import api from '../../services/api';
import { 
  Search, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import TeacherProfileCard from './TeacherProfileCard';
import TeacherProfileDetails from './TeacherProfileDetails';

const TeachersDashboard = () => {
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  useEffect(() => {
    fetchTeachersOverview();
  }, []);

  const [range, setRange] = useState('week');

  const fetchTeachersOverview = async () => {
    try {
      setLoading(true);
      const response = await api.get('/teacher-analytics/teachers-overview', { params: { range } });
      // This endpoint returns a raw array of teachers with stats
      setTeachers(response.data);
    } catch (error) {
      console.error('Error fetching teachers overview:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTeachers = teachers.filter(teacher =>
    `${teacher.fullName.firstName} ${teacher.fullName.lastName}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase()) ||
    teacher.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate overall statistics
  const totalTeachers = teachers.length;
  const totalLectures = teachers.reduce((sum, t) => sum + t.weeklyStats.totalLectures, 0);
  const attendedLectures = teachers.reduce((sum, t) => sum + t.weeklyStats.attendedLectures, 0);
  const overallAttendanceRate = totalLectures > 0 ? ((attendedLectures / totalLectures) * 100).toFixed(1) : 0;
  const teachersWithLateIssues = teachers.filter(t => t.weeklyStats.lateCount > 0).length;
  const excellentAttendance = teachers.filter(t => {
    const rate = t.weeklyStats.totalLectures > 0 ? (t.weeklyStats.attendedLectures / t.weeklyStats.totalLectures) * 100 : 0;
    return rate >= 90;
  }).length;

  if (selectedTeacherId) {
    return (
      <TeacherProfileDetails 
        teacherId={selectedTeacherId} 
        onBack={() => setSelectedTeacherId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Teachers Dashboard</h1>
        <p className="text-gray-600">Monitor teacher attendance, performance, and test analytics</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Teachers</p>
                <p className="text-2xl font-bold">{totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Overall Attendance</p>
                <p className="text-2xl font-bold">{overallAttendanceRate}%</p>
                <p className="text-sm text-green-600">{attendedLectures}/{totalLectures} lectures</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <div>
                <p className="text-sm text-gray-500">Excellent Attendance</p>
                <p className="text-2xl font-bold">{excellentAttendance}</p>
                <p className="text-sm text-emerald-600">≥90% attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Late Issues</p>
                <p className="text-2xl font-bold">{teachersWithLateIssues}</p>
                <p className="text-sm text-red-600">teachers with late marks</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search teachers by name, employee ID, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Range</span>
              <Select value={range} onValueChange={(v) => { setRange(v); fetchTeachersOverview(); }}>
                <SelectTrigger className="w-28 h-8">
                  <SelectValue placeholder="Week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">Week</SelectItem>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Badge variant="outline" className="whitespace-nowrap">
              {filteredTeachers.length} of {totalTeachers} teachers
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Teachers Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTeachers.map((teacher) => (
            <TeacherProfileCard
              key={teacher._id}
              teacher={teacher}
              onViewDetails={setSelectedTeacherId}
            />
          ))}
        </div>
      )}

      {filteredTeachers.length === 0 && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-600 mb-2">No Teachers Found</h3>
            <p className="text-gray-500">
              {searchTerm ? 'Try adjusting your search criteria.' : 'No teachers available.'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TeachersDashboard;
