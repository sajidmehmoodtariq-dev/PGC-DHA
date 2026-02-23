import React from 'react';
import UnifiedDashboard from './UnifiedDashboard';

/**
 * Dashboard Page Component
 * Now uses the unified dashboard system that adapts to user roles
 */
const DashboardPage = () => {
  return (
    <div className="min-h-screen max-w-[100vw] mx-auto bg-gray-50 rounded-2xl">
      <div className="p-6">
        <UnifiedDashboard />
      </div>
    </div>
  );
};

export default DashboardPage;
