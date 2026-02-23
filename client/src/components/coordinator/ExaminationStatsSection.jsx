import React, { useState, useEffect } from 'react';
import { 
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Target,
  AlertCircle,
  BarChart3
} from 'lucide-react';
import { Button } from '../ui/button';
import api from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

const ExaminationStatsSection = ({ 
  campus = null, 
  grade = null, 
  classId = null,
  title = "Examination Performance Overview",
  filters = {}
}) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    zoneCounts: {},
    totalStudents: 0,
    examMetrics: {
      totalExams: 0,
      averagePerformance: 0,
      passRate: 0,
      improvementRate: 0
    },
    subjectPerformance: [],
    recentTrends: {
      trend: 'stable',
      value: '0%',
      color: 'gray'
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchExaminationStats();
  }, [campus, grade, classId, filters.subjectName, filters.statisticType]);

  const fetchExaminationStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build endpoint based on level
      let endpoint = '/analytics/overview';
      let examEndpoint = '/examinations/stats';
      
      if (classId) {
        endpoint = `/analytics/class/${classId}`;
        examEndpoint = `/examinations/stats?classId=${classId}`;
      } else if (campus && grade) {
        endpoint = `/analytics/campus/${campus}/grade/${grade}`;
        examEndpoint = `/examinations/stats?campus=${campus}&grade=${grade}`;
      } else if (campus) {
        endpoint = `/analytics/campus/${campus}`;
        examEndpoint = `/examinations/stats?campus=${campus}`;
      }

      // Add subject filter if specified
      if (filters.subjectName) {
        const separator = examEndpoint.includes('?') ? '&' : '?';
        examEndpoint += `${separator}subjectName=${encodeURIComponent(filters.subjectName)}`;
      }

      // Add statistic type filter
      if (filters.statisticType) {
        const separator = examEndpoint.includes('?') ? '&' : '?';
        examEndpoint += `${separator}statisticType=${encodeURIComponent(filters.statisticType)}`;
      }

      // Fetch both analytics data and examination stats
      const [analyticsResponse, examResponse] = await Promise.allSettled([
        api.get(endpoint),
        api.get(examEndpoint)
      ]);

      let zoneCounts = {};
      let totalStudents = 0;
      let examMetrics = {
        totalExams: 0,
        averagePerformance: 0,
        passRate: 0,
        improvementRate: 0
      };
      let subjectPerformance = [];
      let recentTrends = { trend: 'stable', value: '0%', color: 'gray' };

      // Process analytics data
      if (analyticsResponse.status === 'fulfilled' && analyticsResponse.value.data.success) {
        const data = analyticsResponse.value.data.data;
        const stats = data.collegeWideStats || data.campusZoneDistribution || data.gradeZoneDistribution || data.classZoneDistribution || {};
        
        zoneCounts = {
          green: stats.green || 0,
          blue: stats.blue || 0,
          yellow: stats.yellow || 0,
          red: stats.red || 0,
          gray: stats.unassigned || 0
        };
        totalStudents = stats.total || 0;
      }

      // Process examination data
      if (examResponse.status === 'fulfilled' && examResponse.value.data.success) {
        const examData = examResponse.value.data.data;
        examMetrics = {
          totalExams: examData.totalExams || 0,
          averagePerformance: examData.averagePerformance || 0,
          passRate: examData.passRate || 0,
          improvementRate: examData.improvementRate || 0
        };
        subjectPerformance = examData.subjectPerformance || [];
        recentTrends = examData.recentTrends || { trend: 'stable', value: '0%', color: 'gray' };
      }

      setStats({
        zoneCounts,
        totalStudents,
        examMetrics,
        subjectPerformance,
        recentTrends
      });

    } catch (err) {
      console.error('Error fetching examination stats:', err);
      setError('Failed to load examination statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Stats</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={fetchExaminationStats} variant="outline">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-600">
              Zone-based performance analysis and examination metrics
              {campus && ` • ${campus} Campus`}
              {grade && ` • ${grade} Grade`}
              {filters.subjectName && ` • ${filters.subjectName} Subject`}
              {filters.statisticType === 'subject' && ' • Subject-wise Analysis'}
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-4 w-4" />
            <span>{stats.totalStudents} Students</span>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Zone Performance Overview */}
        <div className="mb-6">
          <h3 className="text-base font-medium text-gray-900 mb-3">Zone Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['green', 'blue', 'yellow', 'red'].map(zoneKey => {
              const colorClass = zoneKey === 'green' ? 'bg-green-500' : 
                               zoneKey === 'blue' ? 'bg-blue-500' : 
                               zoneKey === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
              const bgClass = zoneKey === 'green' ? 'bg-green-50' : 
                            zoneKey === 'blue' ? 'bg-blue-50' : 
                            zoneKey === 'yellow' ? 'bg-yellow-50' : 'bg-red-50';
              const count = stats.zoneCounts[zoneKey] || 0;
              const percentage = stats.totalStudents > 0 ? Math.round((count / stats.totalStudents) * 100) : 0;
              
              return (
                <div key={zoneKey} className={`p-4 rounded-lg border ${bgClass} transition-all hover:shadow-md`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full ${colorClass}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-700 capitalize">{zoneKey} Zone</div>
                      <div className="text-2xl font-bold text-gray-900">{count}</div>
                      <div className="text-xs text-gray-500">{percentage}%</div>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {/* Unassigned */}
            <div className="p-4 rounded-lg border bg-gray-50 transition-all hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="h-4 w-4 rounded-full bg-gray-400" />
                <div>
                  <div className="text-sm font-medium text-gray-700">Unassigned</div>
                  <div className="text-2xl font-bold text-gray-900">{stats.zoneCounts.gray || 0}</div>
                  <div className="text-xs text-gray-500">
                    {stats.totalStudents > 0 ? Math.round(((stats.zoneCounts.gray || 0) / stats.totalStudents) * 100) : 0}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Examination Metrics */}
        <div className="mb-6">
          <h3 className="text-base font-medium text-gray-900 mb-3">Examination Metrics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700">Total Exams</p>
                  <p className="text-2xl font-bold text-blue-900">{stats.examMetrics.totalExams}</p>
                </div>
                <BookOpen className="h-8 w-8 text-blue-500" />
              </div>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700">Average Performance</p>
                  <p className="text-2xl font-bold text-purple-900">{stats.examMetrics.averagePerformance}%</p>
                </div>
                <Target className="h-8 w-8 text-purple-500" />
              </div>
            </div>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700">Pass Rate</p>
                  <p className="text-2xl font-bold text-green-900">{stats.examMetrics.passRate}%</p>
                </div>
                <Award className="h-8 w-8 text-green-500" />
              </div>
            </div>
            
            <div className={`border rounded-lg p-4 ${
              stats.recentTrends.trend === 'up' ? 'bg-green-50 border-green-200' :
              stats.recentTrends.trend === 'down' ? 'bg-red-50 border-red-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${
                    stats.recentTrends.trend === 'up' ? 'text-green-700' :
                    stats.recentTrends.trend === 'down' ? 'text-red-700' :
                    'text-gray-700'
                  }`}>
                    Recent Trend
                  </p>
                  <p className={`text-2xl font-bold ${
                    stats.recentTrends.trend === 'up' ? 'text-green-900' :
                    stats.recentTrends.trend === 'down' ? 'text-red-900' :
                    'text-gray-900'
                  }`}>
                    {stats.recentTrends.value}
                  </p>
                </div>
                {stats.recentTrends.trend === 'up' ? (
                  <TrendingUp className="h-8 w-8 text-green-500" />
                ) : stats.recentTrends.trend === 'down' ? (
                  <TrendingDown className="h-8 w-8 text-red-500" />
                ) : (
                  <BarChart3 className="h-8 w-8 text-gray-500" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Subject Performance Summary */}
        {stats.subjectPerformance.length > 0 && (
          <div className="mb-6">
            <h3 className="text-base font-medium text-gray-900 mb-3">Subject Performance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.subjectPerformance.slice(0, 6).map((subject, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{subject.name}</h4>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      subject.average >= 80 ? 'bg-green-100 text-green-800' :
                      subject.average >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {subject.average}%
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Tests: {subject.testCount}</span>
                      <span>Students: {subject.studentCount}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          subject.average >= 80 ? 'bg-green-500' :
                          subject.average >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${subject.average}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => window.open(`/analytics/examination-report?campus=${campus}&grade=${grade}`, '_blank')}
          >
            <BookOpen className="h-4 w-4 mr-2" />
            View Detailed Report
          </Button>
          
          {(user?.role === 'Coordinator' || user?.role === 'Principal') && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open(`/examinations/analysis?campus=${campus}&grade=${grade}`, '_blank')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Analysis Dashboard
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExaminationStatsSection;