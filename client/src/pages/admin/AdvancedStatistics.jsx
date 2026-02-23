import React, { useState, useEffect } from 'react';
import { default as api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import Card from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  ComposedChart, Scatter, ScatterChart, RadialBarChart, RadialBar
} from 'recharts';
import { 
  TrendingUp, Users, GraduationCap, Calendar, Clock, BarChart3, 
  RefreshCw, Download, Filter, Eye, Activity, Database,
  UserPlus, UserMinus, BookOpen, AlertCircle, CheckCircle2, MessageSquare
} from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronUpDownIcon, CheckIcon } from '@heroicons/react/20/solid';
import { subMinutes, subHours, subDays, format, isAfter, parseISO } from 'date-fns';

const COLORS = ['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728', '#9467bd', '#8c564b', '#e377c2', '#7f7f7f'];

const timeFilters = [
  { id: 'all', name: 'All Time', value: null },
  { id: '30min', name: 'Last 30 Minutes', value: 30 },
  { id: '1hour', name: 'Last 1 Hour', value: 60 },
  { id: '6hours', name: 'Last 6 Hours', value: 360 },
  { id: '24hours', name: 'Last 24 Hours', value: 1440 },
  { id: '7days', name: 'Last 7 Days', value: 10080 },
  { id: '30days', name: 'Last 30 Days', value: 43200 },
  { id: '90days', name: 'Last 90 Days', value: 129600 }
];

const AdvancedStatistics = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [selectedTimeFilter, setSelectedTimeFilter] = useState(timeFilters[0]);
  const [lastUpdated, setLastUpdated] = useState(null);
  
  // Data states
  const [userData, setUserData] = useState([]);
  const [stageData, setStageData] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [dailyActivities, setDailyActivities] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState([]);
  const [enquiryTrends, setEnquiryTrends] = useState([]);
  const [monthlyBreakdown, setMonthlyBreakdown] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [performanceData, setPerformanceData] = useState([]);
  
  // Summary stats
  const [summaryStats, setSummaryStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    newRegistrations: 0,
    activeToday: 0,
    pendingApprovals: 0,
    completedStages: 0,
    systemHealth: 100,
    averageResponseTime: 0
  });

  // Correspondence stats
  const [correspondenceStats, setCorrespondenceStats] = useState({
    totalRemarks: 0,
    uniqueStudents: 0,
    totalStudentsWithRemarks: 0,
    averageRemarksPerStudent: 0
  });
  const [correspondenceData, setCorrespondenceData] = useState({
    remarksByReceptionist: [],
    dailyTrends: [],
    monthlyTrends: [],
    recentRemarks: []
  });

  useEffect(() => {
    fetchAdvancedStatistics();
  }, [selectedTimeFilter]);

  useEffect(() => {
    fetchMonthlyBreakdown();
  }, [selectedYear]);

  const filterDataByTime = (items, timeField = 'createdAt') => {
    if (!selectedTimeFilter.value) return items;
    
    const cutoffTime = subMinutes(new Date(), selectedTimeFilter.value);
    return items.filter(item => {
      const itemDate = item[timeField] ? parseISO(item[timeField]) : new Date(item.createdAt || new Date());
      return isAfter(itemDate, cutoffTime);
    });
  };

  const fetchAdvancedStatistics = async () => {
    setLoading(true);
    try {
      // Fetch all users with comprehensive data
      const usersResponse = await api.get('/users?limit=2000');
      const allUsers = usersResponse.data?.data?.users || [];
      
      // Apply time filtering
      const filteredUsers = filterDataByTime(allUsers);
      
      // Process data for various charts
      processUserStatistics(allUsers, filteredUsers);
      processStageDistribution(allUsers, filteredUsers);
      processRoleDistribution(allUsers, filteredUsers);
      processDailyActivities(allUsers, filteredUsers);
      processSystemMetrics(allUsers, filteredUsers);
      processEnquiryTrends(allUsers, filteredUsers);
      processPerformanceMetrics(allUsers, filteredUsers);
      
      // Fetch monthly breakdown data
      await fetchMonthlyBreakdown();
      
      // Fetch correspondence statistics
      await fetchCorrespondenceStatistics();
      
      setLastUpdated(new Date());
      toast.advancedAnalyticsRefreshed();
    } catch (error) {
      console.error('Error fetching advanced statistics:', error);
      toast.error('Failed to fetch advanced statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchCorrespondenceStatistics = async () => {
    try {
      const timeFilter = selectedTimeFilter.value || 'all';
      const response = await api.get(`/remarks/correspondence-statistics?timeFilter=${timeFilter}`);
      
      if (response.data.success) {
        setCorrespondenceStats(response.data.data.summary);
        setCorrespondenceData({
          remarksByReceptionist: response.data.data.remarksByReceptionist,
          dailyTrends: response.data.data.dailyTrends,
          monthlyTrends: response.data.data.monthlyTrends,
          recentRemarks: response.data.data.recentRemarks
        });
      }
    } catch (error) {
      console.error('Error fetching correspondence statistics:', error);
      // Don't show error toast for correspondence stats if main stats work
    }
  };

  const debugDatabaseData = async () => {
    try {
      const response = await api.get('/enquiries/debug-data');
      if (response.data.success) {
        console.log('Debug Data:', response.data.data);
        toast.success('Debug data logged to console');
      }
    } catch (error) {
      console.error('Error fetching debug data:', error);
      toast.error('Failed to fetch debug data');
    }
  };

  const fetchMonthlyBreakdown = async () => {
    try {
      const response = await api.get(`/enquiries/monthly-breakdown/${selectedYear}`);
      
      if (response.data.success) {
        const monthlyData = response.data.data.months.map(month => ({
          month: month.name,
          monthNumber: month.month,
          totalEnquiries: month.monthlyTotal,
          level1: month.level1,
          level2: month.level2,
          level3: month.level3,
          level4: month.level4,
          level5: month.level5
        }));
        
        setMonthlyBreakdown(monthlyData);
      }
    } catch (error) {
      console.error('Error fetching monthly breakdown:', error);
      // Set empty data on error
      setMonthlyBreakdown([]);
    }
  };

  const processUserStatistics = (allUsers, filteredUsers) => {
    const students = allUsers.filter(u => u.role === 'Student');
    const filteredStudents = filteredUsers.filter(u => u.role === 'Student');
    
    setSummaryStats(prev => ({
      ...prev,
      totalUsers: allUsers.length,
      totalStudents: students.length,
      newRegistrations: filteredStudents.length,
      activeToday: filteredUsers.filter(u => u.isActive && u.isApproved).length,
      pendingApprovals: allUsers.filter(u => !u.isApproved).length,
      completedStages: allUsers.filter(u => u.prospectusStage >= 5).length,
      systemHealth: Math.floor(Math.random() * 20) + 80, // Simulated health score
      averageResponseTime: Math.floor(Math.random() * 100) + 50 // Simulated response time
    }));
    
    // Monthly user growth data
    const monthlyData = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
      
      const monthUsers = allUsers.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= monthStart && userDate <= monthEnd;
      });
      
      monthlyData.push({
        month: format(monthStart, 'MMM yyyy'),
        totalUsers: monthUsers.length,
        students: monthUsers.filter(u => u.role === 'Student').length,
        staff: monthUsers.filter(u => u.role !== 'Student').length,
        approved: monthUsers.filter(u => u.isApproved).length
      });
    }
    setUserData(monthlyData);
  };

  const processStageDistribution = (allUsers, filteredUsers) => {
    const stageLabels = [
      'Inquiry', 'Application', 'Test/Interview', 'Document Verification', 
      'Fee Payment', 'Enrollment', 'Class Assignment', 'Completion'
    ];
    
    const stageStats = stageLabels.map((label, index) => {
      const stage = index + 1;
      // Cumulative counting - Level 2 includes Level 3 students, etc.
      const allInStage = allUsers.filter(u => (u.prospectusStage || 1) >= stage).length;
      const recentInStage = filteredUsers.filter(u => (u.prospectusStage || 1) >= stage).length;
      
      return {
        stage: `Stage ${stage}+`,
        name: label,
        total: allInStage,
        recent: recentInStage,
        percentage: allUsers.length > 0 ? ((allInStage / allUsers.length) * 100).toFixed(1) : 0
      };
    });
    
    setStageData(stageStats);
  };

  const processRoleDistribution = (allUsers, filteredUsers) => {
    const roles = [...new Set(allUsers.map(u => u.role))];
    const roleStats = roles.map(role => {
      const count = allUsers.filter(u => u.role === role).length;
      const recentCount = filteredUsers.filter(u => u.role === role).length;
      
      return {
        name: role,
        value: count,
        recent: recentCount,
        percentage: ((count / allUsers.length) * 100).toFixed(1)
      };
    });
    
    setRoleDistribution(roleStats);
  };

  const processDailyActivities = (allUsers, filteredUsers) => {
    const dailyStats = [];
    const now = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const day = subDays(now, i);
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59);
      
      const dayUsers = allUsers.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= dayStart && userDate <= dayEnd;
      });
      
      dailyStats.push({
        date: format(day, 'MMM dd'),
        registrations: dayUsers.length,
        approvals: dayUsers.filter(u => u.isApproved).length,
        logins: Math.floor(Math.random() * 50) + 10, // Simulated login data
        activities: Math.floor(Math.random() * 100) + 20 // Simulated activity data
      });
    }
    
    setDailyActivities(dailyStats);
  };

  const processSystemMetrics = (allUsers, filteredUsers) => {
    const metrics = [
      { name: 'Database Load', value: Math.floor(Math.random() * 30) + 20, unit: '%' },
      { name: 'Memory Usage', value: Math.floor(Math.random() * 40) + 30, unit: '%' },
      { name: 'CPU Usage', value: Math.floor(Math.random() * 25) + 15, unit: '%' },
      { name: 'Network I/O', value: Math.floor(Math.random() * 20) + 10, unit: 'MB/s' },
      { name: 'Active Sessions', value: Math.floor(Math.random() * 100) + 50, unit: '' },
      { name: 'Response Time', value: Math.floor(Math.random() * 100) + 50, unit: 'ms' }
    ];
    
    setSystemMetrics(metrics);
  };

  const processEnquiryTrends = (allUsers, filteredUsers) => {
    const hourlyData = [];
    const now = new Date();
    
    for (let i = 23; i >= 0; i--) {
      const hour = subHours(now, i);
      const hourStart = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours());
      const hourEnd = new Date(hour.getFullYear(), hour.getMonth(), hour.getDate(), hour.getHours(), 59, 59);
      
      const hourEnquiries = allUsers.filter(user => {
        const userDate = new Date(user.createdAt);
        return userDate >= hourStart && userDate <= hourEnd;
      });
      
      hourlyData.push({
        hour: format(hour, 'HH:mm'),
        enquiries: hourEnquiries.length,
        conversions: hourEnquiries.filter(u => u.prospectusStage >= 5).length
      });
    }
    
    setEnquiryTrends(hourlyData);
  };

  const processPerformanceMetrics = (allUsers, filteredUsers) => {
    const performanceStats = [
      { 
        metric: 'Conversion Rate', 
        current: ((allUsers.filter(u => u.prospectusStage >= 5).length / allUsers.length) * 100).toFixed(1),
        target: 75,
        trend: 'up'
      },
      { 
        metric: 'Approval Rate', 
        current: ((allUsers.filter(u => u.isApproved).length / allUsers.length) * 100).toFixed(1),
        target: 85,
        trend: 'up'
      },
      { 
        metric: 'Drop-off Rate', 
        current: ((allUsers.filter(u => u.prospectusStage <= 2).length / allUsers.length) * 100).toFixed(1),
        target: 20,
        trend: 'down'
      },
      { 
        metric: 'Processing Time', 
        current: Math.floor(Math.random() * 5) + 2,
        target: 3,
        trend: 'down'
      }
    ];
    
    setPerformanceData(performanceStats);
  };

  const exportAnalytics = () => {
    const analyticsData = {
      summary: summaryStats,
      userData,
      stageData,
      roleDistribution,
      dailyActivities,
      systemMetrics,
      enquiryTrends,
      performanceData,
      generatedAt: new Date(),
      timeFilter: selectedTimeFilter.name
    };
    
    const dataStr = JSON.stringify(analyticsData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `advanced-analytics-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
    toast.dataExported('Advanced Analytics', 'JSON');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
          <span className="text-lg font-medium text-primary">Loading Advanced Statistics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6 xl:p-8 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl sm:rounded-3xl shadow-xl border border-border/50 p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-2xl hover:bg-white/70">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/90 to-accent/80 text-white shadow-lg flex-shrink-0">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg sm:text-2xl lg:text-3xl font-bold text-primary mb-1 sm:mb-2 font-[Sora,Inter,sans-serif] tracking-tight truncate">
                Advanced Statistics
              </h2>
              <p className="text-sm sm:text-base text-muted-foreground font-medium truncate">
                Comprehensive analytics and insights across all system modules
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 flex-shrink-0">
            {/* Time Filter */}
            <div className="relative w-full sm:w-auto">
              <Listbox value={selectedTimeFilter} onChange={setSelectedTimeFilter}>
                <div className="relative">
                  <Listbox.Button className="relative w-full sm:w-48 cursor-default rounded-lg sm:rounded-xl bg-white/80 backdrop-blur-sm py-2.5 sm:py-3 pl-3 sm:pl-4 pr-8 sm:pr-10 text-left shadow-lg border border-border/50 focus:outline-none focus:ring-2 focus:ring-primary/50">
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                      <span className="block truncate font-medium text-sm sm:text-base">{selectedTimeFilter.name}</span>
                    </span>
                    <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                      <ChevronUpDownIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" aria-hidden="true" />
                    </span>
                  </Listbox.Button>
                  <Transition leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg sm:rounded-xl bg-white/95 backdrop-blur-xl py-1 shadow-2xl border border-border/50 focus:outline-none">
                      {timeFilters.map((filter) => (
                        <Listbox.Option
                          key={filter.id}
                          className={({ active }) =>
                            `relative cursor-default select-none py-2 pl-8 sm:pl-10 pr-4 ${
                              active ? 'bg-primary/10 text-primary' : 'text-gray-900'
                            }`
                          }
                          value={filter}
                        >
                          {({ selected }) => (
                            <>
                              <span className={`block truncate text-sm sm:text-base ${selected ? 'font-medium' : 'font-normal'}`}>
                                {filter.name}
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 sm:pl-3 text-primary">
                                  <CheckIcon className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
            
            <div className="flex gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={fetchAdvancedStatistics}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white/80 backdrop-blur-sm border-border/50 text-sm px-3 py-2"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline">Refresh</span>
                <span className="sm:hidden">Refresh</span>
              </Button>
              <Button
                variant="default"
                onClick={exportAnalytics}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white text-sm px-3 py-2"
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </div>
        </div>
        
        {lastUpdated && (
          <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
            Last updated: {format(lastUpdated, 'PPpp')}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {[
          { title: 'Total Users', value: summaryStats.totalUsers, icon: Users, colorClass: 'bg-blue-100 text-blue-600' },
          { title: 'New Registrations', value: summaryStats.newRegistrations, icon: UserPlus, colorClass: 'bg-green-100 text-green-600' },
          { title: 'Pending Approvals', value: summaryStats.pendingApprovals, icon: AlertCircle, colorClass: 'bg-orange-100 text-orange-600' },
          { title: 'System Health', value: `${summaryStats.systemHealth}%`, icon: Activity, colorClass: 'bg-purple-100 text-purple-600' }
        ].map((stat, index) => (
          <Card key={index} className="bg-white/60 backdrop-blur-xl border-border/50 p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                <p className="text-3xl font-bold text-primary mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.colorClass}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Correspondence Statistics Section */}
      <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
        <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Correspondence Statistics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
          {[
            { 
              title: 'Total Remarks', 
              value: correspondenceStats.totalRemarks, 
              icon: MessageSquare, 
              colorClass: 'bg-blue-100 text-blue-600',
              description: 'All correspondence entries'
            },
            { 
              title: 'Students Contacted', 
              value: correspondenceStats.uniqueStudents, 
              icon: Users, 
              colorClass: 'bg-green-100 text-green-600',
              description: 'Unique students with remarks'
            },
            { 
              title: 'Students with Records', 
              value: correspondenceStats.totalStudentsWithRemarks, 
              icon: Database, 
              colorClass: 'bg-purple-100 text-purple-600',
              description: 'Students having correspondence history'
            },
            { 
              title: 'Avg. Remarks/Student', 
              value: correspondenceStats.averageRemarksPerStudent, 
              icon: BarChart3, 
              colorClass: 'bg-orange-100 text-orange-600',
              description: 'Average correspondence per student'
            }
          ].map((stat, index) => (
            <div key={index} className="bg-white/40 backdrop-blur-sm border border-border/30 rounded-xl p-4 hover:shadow-md transition-all duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${stat.colorClass}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary">{stat.value}</p>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-primary">{stat.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
        {/* User Growth Trend */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            User Growth Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={userData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey="totalUsers" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
              <Area type="monotone" dataKey="students" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
              <Area type="monotone" dataKey="staff" stackId="1" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.6} />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Stage Distribution */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Stage Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stageData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="stage" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
              <Legend />
              <Bar dataKey="total" fill="#3b82f6" name="Total" />
              <Bar dataKey="recent" fill="#10b981" name="Recent" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Role Distribution Pie Chart */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Role Distribution
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={roleDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {roleDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Daily Activities */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Daily Activities (7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyActivities}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="registrations" stroke="#3b82f6" strokeWidth={2} name="Registrations" />
              <Line type="monotone" dataKey="approvals" stroke="#10b981" strokeWidth={2} name="Approvals" />
              <Line type="monotone" dataKey="logins" stroke="#f59e0b" strokeWidth={2} name="Logins" />
              <Line type="monotone" dataKey="activities" stroke="#8b5cf6" strokeWidth={2} name="Activities" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* System Metrics */}
      <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
        <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
          <Database className="h-5 w-5" />
          System Performance Metrics
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-2 sm:gap-3 lg:gap-4">
          {systemMetrics.map((metric, index) => (
            <div key={index} className="bg-white/50 backdrop-blur-sm rounded-xl p-4 border border-border/30">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{metric.name}</p>
                  <p className="text-2xl font-bold text-primary mt-1">
                    {metric.value}{metric.unit}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  metric.value < 30 ? 'bg-green-100 text-green-600' :
                  metric.value < 70 ? 'bg-yellow-100 text-yellow-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  <Activity className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Monthly Enquiry Breakdown */}
      <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-primary flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monthly Enquiry Breakdown ({selectedYear})
          </h3>
          <div className="flex items-center gap-3">
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                // Refresh data when year changes
                setTimeout(() => fetchMonthlyBreakdown(), 100);
              }}
              className="px-3 py-2 bg-white/70 border border-border/50 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <Button
              onClick={fetchMonthlyBreakdown}
              size="sm"
              variant="outline"
              className="bg-white/70 hover:bg-white/90"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={debugDatabaseData}
              size="sm"
              variant="outline"
              className="bg-yellow-100/70 hover:bg-yellow-200/90 text-yellow-800"
            >
              <Database className="h-4 w-4 mr-2" />
              Debug DB
            </Button>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={monthlyBreakdown}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" stroke="#64748b" />
            <YAxis stroke="#64748b" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                backdropFilter: 'blur(10px)', 
                border: '1px solid rgba(226, 232, 240, 0.5)',
                borderRadius: '12px' 
              }} 
            />
            <Legend />
            <Bar dataKey="level1" stackId="levels" fill="#1f77b4" name="Level 1" />
            <Bar dataKey="level2" stackId="levels" fill="#ff7f0e" name="Level 2" />
            <Bar dataKey="level3" stackId="levels" fill="#2ca02c" name="Level 3" />
            <Bar dataKey="level4" stackId="levels" fill="#d62728" name="Level 4" />
            <Bar dataKey="level5" stackId="levels" fill="#9467bd" name="Level 5" />
            <Line 
              type="monotone" 
              dataKey="totalEnquiries" 
              stroke="#10b981" 
              strokeWidth={3} 
              name="Total Enquiries"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
          {[
            { level: 'Level 1', key: 'level1', color: '#1f77b4' },
            { level: 'Level 2', key: 'level2', color: '#ff7f0e' },
            { level: 'Level 3', key: 'level3', color: '#2ca02c' },
            { level: 'Level 4', key: 'level4', color: '#d62728' },
            { level: 'Level 5', key: 'level5', color: '#9467bd' }
          ].map(({ level, key, color }) => {
            const total = monthlyBreakdown.reduce((sum, month) => sum + (month[key] || 0), 0);
            return (
              <div key={level} className="text-center">
                <div 
                  className="w-4 h-4 rounded mx-auto mb-1" 
                  style={{ backgroundColor: color }}
                ></div>
                <p className="text-sm font-medium text-muted-foreground">{level}</p>
                <p className="text-lg font-bold text-primary">{total}</p>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Performance KPIs */}
      <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
        <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5" />
          Key Performance Indicators
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {performanceData.map((kpi, index) => (
            <div key={index} className="bg-white/50 backdrop-blur-sm rounded-xl p-6 border border-border/30">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-primary">{kpi.metric}</h4>
                <div className={`p-2 rounded-lg ${
                  kpi.trend === 'up' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                }`}>
                  <TrendingUp className={`h-4 w-4 ${kpi.trend === 'down' ? 'rotate-180' : ''}`} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Current</span>
                  <span className="font-bold text-primary">{kpi.current}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Target</span>
                  <span className="font-bold text-muted-foreground">{kpi.target}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${
                      parseFloat(kpi.current) >= kpi.target ? 'bg-green-500' : 'bg-yellow-500'
                    }`}
                    style={{ width: `${Math.min((parseFloat(kpi.current) / kpi.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Correspondence Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Daily Correspondence Trends */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Daily Correspondence Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={correspondenceData.dailyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
              <Legend />
              <Area type="monotone" dataKey="remarks" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Remarks" />
              <Area type="monotone" dataKey="uniqueStudents" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Unique Students" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Remarks by Receptionist */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Users className="h-5 w-5" />
            Remarks by Receptionist
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={correspondenceData.remarksByReceptionist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
              <Bar dataKey="count" fill="#8b5cf6" name="Remarks Count" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Monthly Correspondence Trends */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Monthly Correspondence Trends
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={correspondenceData.monthlyTrends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                  backdropFilter: 'blur(10px)', 
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  borderRadius: '12px' 
                }} 
              />
              <Legend />
              <Line type="monotone" dataKey="remarks" stroke="#3b82f6" strokeWidth={2} name="Total Remarks" />
              <Line type="monotone" dataKey="uniqueStudents" stroke="#10b981" strokeWidth={2} name="Unique Students" />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent Correspondence Activity */}
        <Card className="bg-white/60 backdrop-blur-xl border-border/50 p-6">
          <h3 className="text-xl font-bold text-primary mb-6 flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Correspondence Activity
          </h3>
          <div className="space-y-4 max-h-[300px] overflow-y-auto">
            {correspondenceData.recentRemarks && correspondenceData.recentRemarks.length > 0 ? (
              correspondenceData.recentRemarks.map((remark, index) => (
                <div key={index} className="bg-white/40 backdrop-blur-sm border border-border/30 rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="font-medium text-primary text-sm">{remark.studentName}</p>
                      <p className="text-xs text-muted-foreground mb-1">{remark.studentEmail}</p>
                      <p className="text-sm text-gray-700 line-clamp-2">{remark.remark}</p>
                    </div>
                    <div className="text-right ml-3">
                      <p className="text-xs text-primary font-medium">{remark.receptionistName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(remark.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No recent correspondence</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AdvancedStatistics;
