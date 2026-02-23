import React from 'react';
import { School, TrendingUp } from 'lucide-react';

/**
 * Dashboard Header Component
 * Reusable header for different dashboard types
 */
// Add Sora font for headings
if (typeof document !== 'undefined') {
  const sora = document.createElement('link');
  sora.rel = 'stylesheet';
  sora.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Sora:wght@700&display=swap';
  document.head.appendChild(sora);
}

const DashboardHeader = ({ 
  title = "Dashboard", 
  subtitle = "Manage operations and daily activities",
  dashboardData = {},
  loading = false,
  onRefresh = null,
  userRole = ""
}) => {
  // Role-specific customization
  const getRoleSpecificContent = () => {
    switch (userRole) {
      case 'InstituteAdmin':
        return {
          title: 'Institute Admin Dashboard',
          subtitle: 'Manage institute operations and daily activities'
        };
      case 'Principal':
        return {
          title: 'Principal Dashboard',
          subtitle: 'Statistical overview and institutional performance metrics'
        };
      case 'IT':
        return {
          title: 'IT Dashboard',
          subtitle: 'System management and technical operations'
        };
      case 'Receptionist':
        return {
          title: 'Receptionist Dashboard',
          subtitle: 'Student services and enquiry management'
        };
      default:
        return { title, subtitle };
    }
  };

  const { title: displayTitle, subtitle: displaySubtitle } = getRoleSpecificContent();

  return (
    <div className="relative bg-white/60 backdrop-blur-2xl rounded-2xl sm:rounded-3xl shadow-2xl border border-border p-4 sm:p-6 lg:p-8 transition-all duration-300 hover:shadow-[0_20px_64px_0_rgba(26,35,126,0.18)] group" 
         style={{boxShadow: '0 12px 48px 0 rgba(26,35,126,0.13)'}}>
      {/* Animated gradient bar at the top */}
      <span className="absolute top-0 left-4 right-4 sm:left-8 sm:right-8 h-1 rounded-b-xl bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
        <div className="flex items-center gap-3 sm:gap-6 min-w-0 flex-1">
          <div className="relative flex-shrink-0">
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-70" />
            <div className="relative inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-2xl">
              <School className="h-6 w-6 sm:h-8 sm:w-8 animate-float" />
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-2xl lg:text-3xl font-extrabold text-primary mb-1 tracking-tight font-[Sora,Inter,sans-serif] drop-shadow-sm truncate">
              {displayTitle}
            </h2>
            <p className="text-sm sm:text-base text-primary/80 font-[Inter,sans-serif] truncate">
              {displaySubtitle}
            </p>
            {dashboardData.lastUpdated && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-[Inter,sans-serif] truncate">
                Last updated: {dashboardData.lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        {onRefresh && (
          <div className="relative flex-shrink-0">
            <span className="absolute inset-0 rounded-lg sm:rounded-xl p-[2px] bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x blur-sm opacity-70 pointer-events-none" />
            <button
              onClick={onRefresh}
              disabled={loading}
              className="relative z-10 w-full sm:w-auto px-4 sm:px-5 py-2 sm:py-3 bg-gradient-to-r from-primary to-accent text-white rounded-lg sm:rounded-xl font-bold shadow-lg hover:from-accent hover:to-primary hover:scale-[1.04] active:scale-100 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 animate-float-btn text-sm sm:text-base"
              style={{boxShadow: '0 6px 32px 0 rgba(26,35,126,0.13)'}}
            >
              <TrendingUp className={`h-4 w-4 sm:h-5 sm:w-5 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{loading ? 'Refreshing...' : 'Refresh Data'}</span>
              <span className="sm:hidden">{loading ? 'Refreshing...' : 'Refresh'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardHeader;

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-4px); }
  }
  @keyframes float-btn {
    0%, 100% { transform: translateY(0) scale(1); }
    50% { transform: translateY(-2px) scale(1.01); }
  }
  @keyframes gradient-x {
    0%, 100% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
  }
  .animate-float { animation: float 3s ease-in-out infinite; }
  .animate-float-btn { animation: float-btn 3s ease-in-out infinite; }
  .animate-gradient-x { 
    background-size: 200% 200%; 
    animation: gradient-x 4s ease-in-out infinite; 
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(style);
}
