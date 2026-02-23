import React from 'react';
import { useDashboard } from '../../contexts/DashboardContext';
import { usePermissions } from '../../hooks/usePermissions';
import { getDashboardCardsForRole } from '../../config/dashboardCards';
import DashboardHeader from '../../components/dashboard/DashboardHeader';
import DashboardGrid from '../../components/dashboard/DashboardGrid';
import RecentActivities from '../../components/dashboard/RecentActivities';
import QuickInsights from '../../components/dashboard/QuickInsights';
import PrincipalDashboard from './PrincipalDashboard';

/**
 * Unified Dashboard Component
 * Replaces all role-specific dashboards with one intelligent component
 * Renders content based on user role and permissions
 */
const UnifiedDashboard = () => {
  // Get dashboard data and functions
  const { dashboardData, loading, refreshDashboard } = useDashboard();
  
  // Get user permissions and role
  const { userRole } = usePermissions();

  // Redirect Principal users to their dedicated dashboard
  if (userRole === 'Principal') {
    return <PrincipalDashboard />;
  }

  // Get role-specific configuration
  const dashboardCards = getDashboardCardsForRole(userRole);

  // Sample sliding items for attendance cards (same as before)
  const studentAbsentees = [
    'Ali Hassan (CS-2A) - Absent',
    'Sara Ahmed (BBA-1A) - Absent', 
    'Omar Khan (CS-3B) - Absent',
    'Fatima Ali (CS-2A) - Absent'
  ];

  const lectureAbsentees = [
    'Prof. Khan - Database Systems (Late)',
    'Dr. Sarah - Mathematics (Absent)',
    'Prof. Ahmed - Physics (Late)'
  ];

  // Map sliding items to card IDs
  const slidingItems = {
    'student-attendance': studentAbsentees,
    'lecture-attendance': lectureAbsentees
  };

  // Update cards with dynamic data from dashboard context
  const enhancedCards = dashboardCards.map(card => {
    const enhancedCard = { ...card };

    // Add dynamic recent activity for enquiry reports
    if (card.id === 'enquiry-reports' && dashboardData.recentEnquiry) {
      enhancedCard.recentActivity = `Latest: ${dashboardData.recentEnquiry.fullName?.firstName || ''} ${dashboardData.recentEnquiry.fullName?.lastName || ''}`;
    }

    return enhancedCard;
  });

  // Handle case where user has no role or invalid role
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.732 15.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">Access Denied</h3>
          <p className="text-sm text-gray-500">
            You don't have a valid role assigned. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  // Determine if user should see additional sections (only InstituteAdmin)
  const shouldShowAdditionalSections = userRole === 'InstituteAdmin';

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6 space-y-4 sm:space-y-6 lg:space-y-8">
      {/* Header */}
      <DashboardHeader
        dashboardData={dashboardData}
        loading={loading}
        onRefresh={refreshDashboard}
        userRole={userRole}
      />

      {/* Main Dashboard Grid */}
      <DashboardGrid
        cards={enhancedCards}
        dashboardData={dashboardData}
        loading={loading}
        slidingItems={slidingItems}
        userRole={userRole}
      />

      {/* Additional Sections for Admin Roles */}
      {shouldShowAdditionalSections && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">
          {/* Recent Activities */}
          <RecentActivities
            dashboardData={dashboardData}
            loading={loading}
          />

          {/* Quick Insights */}
          <QuickInsights
            dashboardData={dashboardData}
            loading={loading}
          />
        </div>
      )}

      {/* Role Debug Info (only in development) */}
      {import.meta.env.DEV && (
        <div className="bg-gray-100 p-3 sm:p-4 rounded-lg text-xs text-gray-600">
          <strong>Debug Info:</strong> Role: {userRole} | Cards: {enhancedCards.length} | Additional Sections: {shouldShowAdditionalSections}
        </div>
      )}
    </div>
  );
};

export default UnifiedDashboard;
