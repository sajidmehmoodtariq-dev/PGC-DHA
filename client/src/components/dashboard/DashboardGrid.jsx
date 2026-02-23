import React from 'react';
import DashboardCard from './DashboardCard';
import PermissionGuard from '../PermissionGuard';

/**
 * Dashboard Grid Component
 * Renders a grid of dashboard cards based on user permissions
 */
const DashboardGrid = ({ 
  cards = [], 
  dashboardData = {}, 
  loading = false,
  slidingItems = {}, // Object with card.id as key and array of items as value
  userRole = null
}) => {
  if (loading) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-border/50 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <span className="text-primary font-medium text-sm sm:text-base">Loading dashboard data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!cards.length) {
    return (
      <div className="bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-border/50 p-4 sm:p-6 lg:p-8">
        <div className="text-center py-8 sm:py-12">
          <div className="text-gray-400 mb-4">
            <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base sm:text-lg font-medium text-gray-600 mb-2">No Dashboard Items Available</h3>
          <p className="text-sm text-gray-500">
            Your role doesn't have access to any dashboard items, or none are configured.
          </p>
        </div>
      </div>
    );
  }

  // Determine the title based on user role
  const getGridTitle = () => {
    switch (userRole) {
      case 'Principal':
        return 'Principal Dashboard';
      case 'InstituteAdmin':
        return 'Institute Management';
      case 'IT':
        return 'IT Management';
      case 'Teacher':
        return 'Teacher Dashboard';
      case 'Receptionist':
        return 'Reception Desk';
      case 'Coordinator':
        return 'Coordination Center';
      default:
        return 'Dashboard';
    }
  };

  return (
    <div className="bg-white/60 backdrop-blur-xl rounded-xl sm:rounded-2xl shadow-xl border border-border/50 p-4 sm:p-6 lg:p-8 2xl:p-10 transition-all duration-300 hover:shadow-2xl hover:bg-white/70" 
         style={{boxShadow: '0 12px 48px 0 rgba(26,35,126,0.12)'}}>
      
      <h3 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl font-bold text-primary mb-4 sm:mb-6 lg:mb-8 2xl:mb-10 font-[Sora,Inter,sans-serif] flex items-center gap-2 sm:gap-3">
        <div className="w-1 sm:w-1.5 2xl:w-2 h-6 sm:h-8 lg:h-10 2xl:h-12 bg-gradient-to-b from-primary to-accent rounded-full flex-shrink-0"></div>
        <span className="truncate">{getGridTitle()}</span>
      </h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 2xl:gap-10">
        {cards.map((card) => (
          <PermissionGuard key={card.id} permission={card.permission}>
            <DashboardCard
              card={card}
              dashboardData={dashboardData}
              slidingItems={slidingItems[card.id] || []}
              userRole={userRole}
            />
          </PermissionGuard>
        ))}
      </div>
      
      {/* Show message if no cards are visible due to permissions */}
      {cards.every(card => !card.permission) && (
        <div className="text-center py-6 sm:py-8">
          <p className="text-gray-500 text-sm lg:text-base xl:text-lg">
            Loading dashboard items...
          </p>
        </div>
      )}
    </div>
  );
};

export default React.memo(DashboardGrid);
