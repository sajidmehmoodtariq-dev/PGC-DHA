import React from 'react';
import { GraduationCap, Users, MessageSquare, Calendar, ClipboardList } from 'lucide-react';

/**
 * Recent Activities Component
 * Shows recent activities based on dashboard data
 */
const RecentActivities = ({ dashboardData, loading }) => {
  // Generate recent activities from dashboard data
  const generateRecentActivities = () => {
    const activities = [];
    
    if (dashboardData.recentEnquiry) {
      activities.push({
        icon: MessageSquare,
        title: 'New Enquiry Received',
        description: `${dashboardData.recentEnquiry.fullName?.firstName || ''} ${dashboardData.recentEnquiry.fullName?.lastName || ''} submitted an enquiry`,
        time: 'Just now',
        color: 'text-blue-600 bg-blue-100'
      });
    }
    
    if (dashboardData.recentCorrespondence) {
      activities.push({
        icon: MessageSquare,
        title: 'Correspondence Added',
        description: `New correspondence for ${dashboardData.recentCorrespondence.studentName}`,
        time: '5 minutes ago',
        color: 'text-green-600 bg-green-100'
      });
    }
    
    // Add some default activities if no data
    if (activities.length === 0) {
      activities.push(
        {
          icon: Users,
          title: 'Staff Meeting',
          description: 'Weekly staff meeting completed',
          time: '2 hours ago',
          color: 'text-purple-600 bg-purple-100'
        },
        {
          icon: ClipboardList,
          title: 'Exam Schedule',
          description: 'Mid-term exam schedule published',
          time: '4 hours ago',
          color: 'text-orange-600 bg-orange-100'
        },
        {
          icon: Calendar,
          title: 'Event Planning',
          description: 'Annual sports day planning meeting',
          time: '1 day ago',
          color: 'text-indigo-600 bg-indigo-100'
        }
      );
    }
    
    return activities;
  };

  const recentActivities = generateRecentActivities();

  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-2xl shadow-xl border border-border/50 p-6">
        <h3 className="text-xl font-bold text-primary mb-6 font-[Sora,Inter,sans-serif] flex items-center gap-3">
          <div className="w-1 h-6 bg-gradient-to-b from-primary to-accent rounded-full"></div>
          Recent Activities
        </h3>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
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
        Recent Activities
      </h3>
      <div className="space-y-4">
        {recentActivities.length > 0 ? (
          recentActivities.map((activity, index) => {
            const IconComponent = activity.icon;
            return (
              <div key={index} className="flex items-start gap-4 p-3 rounded-xl hover:bg-white/50 transition-colors">
                <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${activity.color}`}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground truncate">{activity.title}</p>
                  <p className="text-sm text-muted-foreground font-medium">{activity.description}</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">{activity.time}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-gray-500">
            <GraduationCap className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No recent activities</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(RecentActivities);
