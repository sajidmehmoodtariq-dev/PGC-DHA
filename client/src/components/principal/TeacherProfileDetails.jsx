import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
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
  Mail,
  ArrowLeft,
  BarChart3,
  Users,
  Target
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import api from '../../services/api';

const TeacherProfileDetails = ({ teacherId, onBack }) => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [activeTab, setActiveTab] = useState('attendance');
  const [testsTab, setTestsTab] = useState('overall');

  useEffect(() => {
    fetchTeacherProfile();
    setActiveTab('attendance');
    setTestsTab('overall');
  }, [teacherId]);

  const [range, setRange] = useState('week');

  const fetchTeacherProfile = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/teacher-analytics/teacher-profile/${teacherId}`);
        setProfileData(data);
    } catch (error) {
      console.error('Error fetching teacher profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTestClick = async (testId) => {
    try {
      const { data } = await api.get(`/teacher-analytics/test-analytics/${testId}`);
      setSelectedTest(data);
    } catch (error) {
      console.error('Error fetching test analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!profileData) {
    return <div className="text-center text-gray-500">No data available</div>;
  }

  const { teacher, weeklyStats, attendanceRecords, weeklyTimetable, lateInstances, tests, summaries } = profileData;
  
  const attendanceRate = weeklyStats.totalLectures > 0 
    ? ((weeklyStats.attendedLectures / weeklyStats.totalLectures) * 100).toFixed(1)
    : 0;

  // Prepare attendance chart data
  const attendanceChartData = (() => {
    // Create a map of attendance records by date for quick lookup
    const attendanceByDate = new Map();
    attendanceRecords.forEach(record => {
      const dateKey = new Date(record.date).toDateString();
      attendanceByDate.set(dateKey, record);
    });



    // Ensure at least a zero baseline if no data
    if (!weeklyTimetable || weeklyTimetable.length === 0) {
      return [
        { day: 'Mon', present: 0, late: 0, absent: 0 },
        { day: 'Tue', present: 0, late: 0, absent: 0 },
        { day: 'Wed', present: 0, late: 0, absent: 0 },
        { day: 'Thu', present: 0, late: 0, absent: 0 },
        { day: 'Fri', present: 0, late: 0, absent: 0 },
        { day: 'Sat', present: 0, late: 0, absent: 0 }
      ];
    }

    // Group timetable slots by day of week to avoid duplicates
    const slotsByDay = new Map();
    weeklyTimetable.forEach(slot => {
      const dayKey = new Date(slot.date).getDay(); // 0 = Sunday, 1 = Monday, etc.
      if (!slotsByDay.has(dayKey)) {
        slotsByDay.set(dayKey, slot);
      }
    });

    // Create chart data for each day of the week (Monday = 1 to Saturday = 6)
    const chartData = [];
    for (let day = 1; day <= 6; day++) { // Monday to Saturday
      const slot = slotsByDay.get(day);
      let attendance = null;
      
      if (slot) {
        const dateKey = new Date(slot.date).toDateString();
        attendance = attendanceByDate.get(dateKey);
      }
      
      const dataPoint = {
        day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][day - 1],
        present: attendance && (attendance.status === 'On Time' || attendance.status === 'Present') ? 1 : 0,
        late: attendance && (attendance.status === 'Late' || (attendance.lateMinutes && attendance.lateMinutes > 10)) ? 1 : 0,
      absent: !attendance || attendance.status === 'Absent' ? 1 : 0
    };
      

      chartData.push(dataPoint);
    }


    return chartData;
  })();

  if (selectedTest) {
    return <TestAnalyticsView testData={selectedTest} onBack={() => setSelectedTest(null)} />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Teachers
        </Button>
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="w-8 h-8 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {teacher.fullName.firstName} {teacher.fullName.lastName}
            </h1>
            <p className="text-gray-500">{teacher.employeeId}</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Weekly Attendance</p>
                <p className="text-2xl font-bold">{weeklyStats.attendedLectures}/{weeklyStats.totalLectures}</p>
                <p className="text-sm text-green-600">{attendanceRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm text-gray-500">Late Instances</p>
                <p className="text-2xl font-bold">{weeklyStats.lateCount}</p>
                <p className="text-sm text-red-600">This week</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BookOpen className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Total Tests</p>
                <p className="text-2xl font-bold">{weeklyStats.totalTests}</p>
                <p className="text-sm text-green-600">Created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="text-sm font-medium">{teacher.email}</p>
                <p className="text-sm">{teacher.phoneNumber}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="attendance">Attendance Details</TabsTrigger>
          <TabsTrigger value="tests">Tests & Exams</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Attendance Overview</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Range</span>
                  <Select defaultValue="week" onValueChange={() => fetchTeacherProfile()}>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={attendanceChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="day" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} name="Present" />
                    <Line type="monotone" dataKey="late" stroke="#f59e0b" strokeWidth={2} name="Late" />
                    <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} name="Absent" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Late Instances */}
          {lateInstances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span>Late Instances This Week</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {lateInstances.map((instance, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <p className="font-medium">{new Date(instance.date).toLocaleDateString()}</p>
                        <p className="text-sm text-gray-600">
                          {instance.minutesLate} minutes late
                        </p>
                      </div>
                      <Badge variant="destructive">Late</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tests" className="space-y-4">
          {/* Build per-class tabs plus Overall */}
          {(() => {
            const classesMap = new Map();
            (tests || []).forEach(t => {
              const id = t.classId?._id || 'unknown';
              const name = t.classId?.name || 'Unknown Class';
              if (!classesMap.has(id)) classesMap.set(id, { id, name, tests: [] });
              classesMap.get(id).tests.push(t);
            });
            const classList = Array.from(classesMap.values());
            const perClass = summaries?.perClass || {};
            let overall = summaries?.overall || { totalStudents: 0, zones: { green: 0, average: 0, red: 0 } };
            if ((overall.totalStudents || 0) === 0 && Object.keys(perClass).length > 0) {
              overall = Object.values(perClass).reduce((acc, cs) => {
                acc.totalStudents += cs.totalStudents || 0;
                acc.zones.green += cs.zones?.green || 0;
                acc.zones.average += cs.zones?.average || 0;
                acc.zones.red += cs.zones?.red || 0;
                return acc;
              }, { totalStudents: 0, zones: { green: 0, average: 0, red: 0 } });
            }
            return (
              <Tabs value={testsTab} onValueChange={setTestsTab} className="w-full">
                <TabsList className="flex flex-wrap gap-2">
                  <TabsTrigger value="overall">Overall</TabsTrigger>
                  {classList.map(cls => (
                    <TabsTrigger key={cls.id} value={cls.id}>{cls.name}</TabsTrigger>
                  ))}
                </TabsList>

                {/* Overall summary (placeholders for now) */}
                <TabsContent value="overall" className="space-y-4">
          <Card>
            <CardHeader>
                      <CardTitle>Overall Summary</CardTitle>
            </CardHeader>
            <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Students</div><div className="text-2xl font-bold">{overall.totalStudents || 0}</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="text-sm text-green-600">Green Zone</div><div className="text-2xl font-bold">{overall.zones?.green || 0}</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="text-sm text-yellow-600">Average Zone</div><div className="text-2xl font-bold">{overall.zones?.average || 0}</div></CardContent></Card>
                        <Card><CardContent className="p-4"><div className="text-sm text-red-600">Needs Attention</div><div className="text-2xl font-bold">{overall.zones?.red || 0}</div></CardContent></Card>
                      </div>
                      <p className="text-xs text-gray-500 mt-3">Click a class tab to view its breakdown. You can wire real counts here.</p>
            </CardContent>
          </Card>
        </TabsContent>

                {classList.map(cls => (
                  <TabsContent key={cls.id} value={cls.id} className="space-y-4">
                    {(() => { const cs = summaries?.perClass?.[cls.id] || { totalStudents: 0, zones: { green: 0, average: 0, red: 0 } }; return (
          <Card>
            <CardHeader>
                        <CardTitle>{cls.name} — Summary</CardTitle>
            </CardHeader>
            <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <Card><CardContent className="p-4"><div className="text-sm text-gray-500">Total Students</div><div className="text-2xl font-bold">{cs.totalStudents || 0}</div></CardContent></Card>
                          <Card><CardContent className="p-4"><div className="text-sm text-green-600">Green Zone</div><div className="text-2xl font-bold">{cs.zones?.green || 0}</div></CardContent></Card>
                          <Card><CardContent className="p-4"><div className="text-sm text-yellow-600">Average Zone</div><div className="text-2xl font-bold">{cs.zones?.average || 0}</div></CardContent></Card>
                          <Card><CardContent className="p-4"><div className="text-sm text-red-600">Needs Attention</div><div className="text-2xl font-bold">{cs.zones?.red || 0}</div></CardContent></Card>
                        </div>
                        <div className="mt-6">
                          <h4 className="font-semibold mb-2">Tests for this class</h4>
                          <div className="grid gap-3">
                            {cls.tests.map(test => (
                              <div key={test._id} className="p-3 border rounded hover:bg-gray-50 cursor-pointer" onClick={() => handleTestClick(test._id)}>
                                <div className="flex items-center justify-between">
                      <div>
                                    <div className="font-medium">{test.title}</div>
                                    <div className="text-xs text-gray-500">{test.subject} • {test.totalMarks} marks • {new Date(test.createdAt).toLocaleDateString()}</div>
                      </div>
                                  <Badge variant="outline">{test.testType}</Badge>
                      </div>
                    </div>
                            ))}
                          </div>
              </div>
            </CardContent>
                    </Card> );})()}
                  </TabsContent>
                ))}
              </Tabs>
            );
          })()}
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Test Analytics Component
const TestAnalyticsView = ({ testData, onBack }) => {
  const { test, zones, zoneStats, trendData, summary } = testData;

  // Zone colors
  const zoneColors = {
    excellent: '#10b981',
    good: '#3b82f6', 
    average: '#f59e0b',
    poor: '#f97316',
    failing: '#ef4444'
  };

  const pieData = zoneStats.map(stat => ({
    name: stat.zone.charAt(0).toUpperCase() + stat.zone.slice(1),
    value: stat.count,
    color: zoneColors[stat.zone]
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Profile
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="text-gray-500">
            {test.classId?.name} • {test.subject} • {test.totalMarks} marks
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm text-gray-500">Total Students</p>
                <p className="text-2xl font-bold">{summary.totalStudents}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm text-gray-500">Average Score</p>
                <p className="text-2xl font-bold">{summary.averageScore}</p>
                <p className="text-sm text-green-600">{summary.averagePercentage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-sm text-gray-500">Pass Rate</p>
                <p className="text-2xl font-bold">{summary.passRate}%</p>
                <p className="text-sm text-purple-600">≥50% marks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-sm text-gray-500">Test Date</p>
                <p className="text-lg font-bold">
                  {new Date(test.testDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Zone Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Zones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {zoneStats.map((stat) => (
                <div key={stat.zone} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: zoneColors[stat.zone] }}
                    ></div>
                    <span className="capitalize">{stat.zone}</span>
                  </div>
                  <span>{stat.count} students ({stat.percentage}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="testName" 
                    tick={{ fontSize: 10 }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="averagePercentage" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Average %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Zone Details */}
      <div className="grid gap-4">
        {Object.entries(zones).map(([zoneName, students]) => {
          if (students.length === 0) return null;
          
          return (
            <Card key={zoneName}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: zoneColors[zoneName] }}
                  ></div>
                  <span className="capitalize">{zoneName} Zone ({students.length} students)</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {students.map((student) => (
                    <div key={student._id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">
                          {student.studentId.fullName.firstName} {student.studentId.fullName.lastName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Roll: {student.studentId.rollNumber}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{student.obtainedMarks}/{test.totalMarks}</p>
                        <p className="text-sm text-gray-600">{student.percentage.toFixed(1)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default TeacherProfileDetails;
