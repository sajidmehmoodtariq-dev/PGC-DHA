import React, { useMemo } from 'react';
import { UserCheck, MessageSquare, Mail, ClipboardList } from 'lucide-react';

/**
 * Quick Insights Component
 * Shows key metrics and insights for the dashboard
 */
const QuickInsights = ({ dashboardData, loading }) => {
  const insights = useMemo(() => [
    {
      title: 'High Attendance Rate',
      description: '89% students present today',
      icon: UserCheck,
      gradient: 'from-green-50 to-green-100',
      border: 'border-green-200',
      textColor: 'text-green-800',
      descColor: 'text-green-600',
      iconColor: 'text-green-600'
    },
    {
      title: 'Active Enquiries',
      description: `${dashboardData?.todayEnquiries || 12} new enquiries today`,
      icon: MessageSquare,
      gradient: 'from-blue-50 to-blue-100',
      border: 'border-blue-200',
      textColor: 'text-blue-800',
      descColor: 'text-blue-600',
      iconColor: 'text-blue-600'
    },
    {
      title: 'Pending Tasks',
      description: `${dashboardData?.pendingCorrespondence || 8} correspondence items`,
      icon: Mail,
      gradient: 'from-amber-50 to-amber-100',
      border: 'border-amber-200',
      textColor: 'text-amber-800',
      descColor: 'text-amber-600',
      iconColor: 'text-amber-600'
    },
    {
      title: 'Upcoming Exams',
      description: '3 exams this week',
      icon: ClipboardList,
      gradient: 'from-purple-50 to-purple-100',
      border: 'border-purple-200',
      textColor: 'text-purple-800',
      descColor: 'text-purple-600',
      iconColor: 'text-purple-600'
    }
  ], [dashboardData]);

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6">
        <h3 className="text-xl font-bold text-primary mb-6 font-[Sora,Inter,sans-serif] flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Quick Insights
        </h3>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="p-4 bg-gray-100 rounded-xl animate-pulse">
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6 transition-all duration-300 hover:shadow-2xl hover:bg-white/70" style={{boxShadow: '0 12px 48px 0 rgba(26,35,126,0.12)'}}>
      <h3 className="text-xl font-bold text-primary mb-6 font-[Sora,Inter,sans-serif] flex items-center gap-3">
        <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
        Quick Insights
      </h3>
      <div className="space-y-4">
        {insights.map((insight, index) => {
          const IconComponent = insight.icon;
          return (
            <div key={index} className={`p-4 bg-gradient-to-r ${insight.gradient} rounded-xl border ${insight.border} hover:shadow-md transition-all duration-200`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`font-semibold ${insight.textColor}`}>{insight.title}</p>
                  <p className={`text-sm ${insight.descColor}`}>{insight.description}</p>
                </div>
                <IconComponent className={`h-8 w-8 ${insight.iconColor}`} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default React.memo(QuickInsights);
