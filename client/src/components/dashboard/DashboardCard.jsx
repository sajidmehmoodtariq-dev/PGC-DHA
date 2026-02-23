import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  MessageSquare, 
  UserX, 
  BookOpen, 
  ClipboardList, 
  Mail, 
  Users, 
  GraduationCap, 
  Calendar,
  BarChart3,
  UserPlus,
  UserCog,
  FileText,
  School
} from 'lucide-react';

// Icon mapping for dynamic icon rendering
const ICON_MAP = {
  MessageSquare,
  UserX,
  BookOpen,
  ClipboardList,
  Mail,
  Users,
  GraduationCap,
  Calendar,
  BarChart3,
  UserPlus,
  UserCog,
  FileText,
  School
};

/**
 * Reusable Dashboard Card Component
 * Supports both normal cards and sliding animation cards
 */
const DashboardCard = ({ 
  card, 
  dashboardData = {}, 
  slidingItems = [],
  userRole = null
}) => {
  const Icon = ICON_MAP[card.icon] || MessageSquare;

  // Sliding animation logic for cards with type 'sliding'
  const SlidingText = ({ items, className = "" }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
      if (items.length > 1) {
        const interval = setInterval(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
        }, 2500); // Change every 2.5 seconds

        return () => clearInterval(interval);
      }
    }, [items.length]);

    if (items.length === 0) {
      return <p className={className}>No issues today!</p>;
    }

    return (
      <div className="relative overflow-hidden h-6">
        <div 
          className="flex transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {items.map((item, index) => (
            <div key={index} className="w-full flex-shrink-0">
              <p className={`${className} text-red-600 font-medium`}>{item}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render recent activity based on card type
  const renderRecentActivity = () => {
    // Only show recent activity for InstituteAdmin
    if (userRole !== 'InstituteAdmin') {
      return null;
    }

    if (card.type === 'sliding') {
      return (
        <SlidingText 
          items={slidingItems} 
          className="text-sm text-gray-600"
        />
      );
    }

    // Normal card with dynamic recent activity
    let activityText = 'No recent activity';
    
    if (card.id === 'enquiry-management' || card.id === 'enquiry-reports') {
      if (dashboardData.recentEnquiry) {
        const fullName = `${dashboardData.recentEnquiry.fullName?.firstName || ''} ${dashboardData.recentEnquiry.fullName?.lastName || ''}`.trim();
        activityText = fullName ? `Latest: ${fullName}` : 'No recent activity';
      }
    } else if (card.id === 'correspondence-management' || card.id === 'correspondence') {
      if (dashboardData.recentCorrespondence) {
        const studentName = dashboardData.recentCorrespondence.studentName;
        activityText = studentName ? `Latest: ${studentName}` : 'No recent activity';
      }
    } else if (card.recentActivity) {
      activityText = card.recentActivity;
    }

    return (
      <p className="text-sm text-gray-600 mb-2">
        {activityText}
      </p>
    );
  };

  // Render today count with dynamic data
  const renderTodayCount = () => {
    let displayText = card.todayCount || '';

    // Replace dashboard data placeholders - enhanced for today's statistics
    if (card.id === 'enquiry-reports' || card.id === 'enquiry-management') {
      if (dashboardData.todayEnquiries !== undefined) {
        displayText = `${dashboardData.todayEnquiries} new today`;
      } else {
        displayText = '0 new today';
      }
    } else if (card.id === 'correspondence' || card.id === 'correspondence-management') {
      if (dashboardData.todayCorrespondence !== undefined) {
        displayText = `${dashboardData.todayCorrespondence || 0} today`;
      } else {
        displayText = '0 today';
      }
    } else if (card.id === 'examinations' && dashboardData.upcomingExams !== undefined) {
      displayText = `${dashboardData.upcomingExams} exams this week`;
    } else if (card.id === 'appointments' && dashboardData.scheduledAppointments !== undefined) {
      displayText = `${dashboardData.scheduledAppointments} scheduled`;
    } else if (card.id === 'staff-management' && dashboardData.totalStaff !== undefined) {
      displayText = `${dashboardData.totalStaff} staff members`;
    } else if (card.id === 'student-management' && dashboardData.totalStudents !== undefined) {
      displayText = `${dashboardData.totalStudents} students`;
    }

    // If no specific text is set, use a default
    if (!displayText) {
      displayText = 'View Details';
    }

    return (
      <p className="text-white text-sm font-medium">
        {displayText}
      </p>
    );
  };

  // If card is disabled, render a disabled version without Link
  if (card.disabled) {
    return (
      <div className="group bg-white/40 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-4 shadow-lg border border-border/30 opacity-60 cursor-not-allowed min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] xl:min-h-[280px] 2xl:min-h-[320px]">
        <div className="text-center h-full flex flex-col justify-between">
          <div>
            <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 xl:w-24 xl:h-24 2xl:w-28 2xl:h-28 rounded-xl sm:rounded-2xl bg-gradient-to-r ${card.bgGradient} text-white shadow-lg mb-3 sm:mb-4 lg:mb-6 xl:mb-8 opacity-50`}>
              <Icon className="h-6 w-6 sm:h-8 sm:w-8 xl:h-12 xl:w-12 2xl:h-14 2xl:w-14" />
            </div>
            <h4 className="text-base sm:text-lg xl:text-2xl 2xl:text-3xl font-semibold text-gray-400 mb-2 sm:mb-3 lg:mb-4 xl:mb-6 leading-tight">
              {card.title}
            </h4>
          </div>
          
          <div>
            {/* Description for disabled cards */}
            {card.description && (
              <div className="mb-3 sm:mb-4 lg:mb-6 min-h-[1.5rem]">
                <p className="text-xs sm:text-sm lg:text-base xl:text-lg 2xl:text-xl text-gray-500 leading-tight">{card.description}</p>
              </div>
            )}
            
            {/* Disabled status */}
            <div className="inline-block px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-3 2xl:px-8 2xl:py-4 rounded-lg bg-gray-400 shadow-md">
              <p className="text-white text-xs sm:text-sm lg:text-base 2xl:text-lg font-medium">
                Coming Soon
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={card.href}
      className="group bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 2xl:p-10 shadow-lg border border-border/30 transition-all duration-300 hover:shadow-xl hover:bg-white/80 hover:scale-[1.02] hover:border-primary/20 min-h-[180px] sm:min-h-[200px] lg:min-h-[240px] 2xl:min-h-[280px]"
    >
      <div className="text-center h-full flex flex-col justify-between">
        <div>
          <div className={`inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 2xl:w-24 2xl:h-24 rounded-xl sm:rounded-2xl bg-gradient-to-r ${card.bgGradient} text-white shadow-lg mb-3 sm:mb-4 lg:mb-6 2xl:mb-8 group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="h-6 w-6 sm:h-8 sm:w-8 lg:h-10 lg:w-10 2xl:h-12 2xl:w-12" />
          </div>
          <h4 className="text-base sm:text-lg lg:text-xl 2xl:text-2xl font-semibold text-primary mb-2 sm:mb-3 lg:mb-4 2xl:mb-6 group-hover:text-accent transition-colors duration-300 leading-tight">
            {card.title}
          </h4>
        </div>
        
        <div>
          {/* Description for normal cards */}
          {card.description && !renderRecentActivity() && (
            <div className="mb-3 sm:mb-4 lg:mb-6 min-h-[1.5rem]">
              <p className="text-xs sm:text-sm lg:text-base 2xl:text-lg text-gray-600 leading-tight">{card.description}</p>
            </div>
          )}
          
          {/* Recent Activity */}
          {renderRecentActivity() && (
            <div className="mb-3 sm:mb-4 lg:mb-6 min-h-[1.5rem]">
              {renderRecentActivity()}
            </div>
          )}
          
          {/* Today Count - with background */}
          <div className={`inline-block px-3 py-2 sm:px-4 sm:py-2 lg:px-6 lg:py-3 2xl:px-8 2xl:py-4 rounded-lg bg-gradient-to-r ${card.bgGradient} shadow-md group-hover:shadow-lg transition-shadow duration-300`}>
            {renderTodayCount()}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default React.memo(DashboardCard);
