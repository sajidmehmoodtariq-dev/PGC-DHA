import React, { useState, useEffect } from 'react';
import { Users, GraduationCap, UserCheck, RefreshCw } from 'lucide-react';
import { userAPI } from '../../services/api';
import { Button } from '../ui/button';

/**
 * Student Statistics Component
 * Shows student-specific statistics like total registered, admitted, etc.
 */
const StudentStatistics = () => {
  const [statistics, setStatistics] = useState({
    totalStudents: 0,
    admittedStudents: 0,
    activeStudents: 0,
    loading: true
  });

  const loadStudentStatistics = async () => {
    try {
      setStatistics(prev => ({ ...prev, loading: true }));

      // Get students with pagination to get server-side statistics
      const params = {
        role: 'Student',
        page: 1,
        limit: 25 // Use pagination to trigger server-side statistics calculation
      };
      console.log('StudentStatistics: Loading with params:', params);
      
      const response = await userAPI.getUsers(params);
      console.log('StudentStatistics: API response:', response);

      if (response.success) {
        const pagination = response.data.pagination;
        const statistics = response.data.statistics;
        const students = response.data.users || [];
        
        console.log('StudentStatistics: Pagination info:', pagination);
        console.log('StudentStatistics: Server statistics:', statistics);
        console.log('StudentStatistics: Students in current page:', students.length);
        
        // Use server-provided statistics if available, otherwise fallback to pagination counts
        const totalStudents = pagination?.totalUsers || 0;
        
        // Calculate estimates based on the current page sample
        const sampleSize = Math.max(students.length, 1);
        
        // Admitted students are those at Level 5 (final stage)
        const admittedInSample = students.filter(student => 
          student.prospectusStage === 5 || student.enquiryLevel === 5
        ).length;
        const estimatedAdmitted = Math.round(admittedInSample * totalStudents / sampleSize);
        
        // Active students = Total - Admitted (students who are registered but not yet admitted)
        const activeStudents = Math.max(0, totalStudents - estimatedAdmitted);

        setStatistics({
          totalStudents,
          admittedStudents: estimatedAdmitted,
          activeStudents, // This is now Total - Admitted
          loading: false
        });
      } else {
        console.error('Failed to load student statistics:', response.message);
        setStatistics(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error loading student statistics:', error);
      setStatistics(prev => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    loadStudentStatistics();
  }, []);

  const statCards = [
    {
      title: 'Total Registered',
      value: statistics.totalStudents,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Admitted Students',
      value: statistics.admittedStudents,
      icon: GraduationCap,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Active Students',
      value: statistics.activeStudents,
      icon: UserCheck,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    }
  ];

  if (statistics.loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Refresh Button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-700">Student Statistics</h3>
        <Button
          onClick={loadStudentStatistics}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={statistics.loading}
        >
          <RefreshCw className={`h-4 w-4 ${statistics.loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat) => {
          const IconComponent = stat.icon;
          return (
            <div
              key={stat.title}
              className={`${stat.bgColor} rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-all duration-200 hover:scale-105`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">
                    {stat.title}
                  </p>
                  <p className={`text-3xl font-bold ${stat.textColor}`}>
                    {stat.value}
                  </p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <IconComponent className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentStatistics;
