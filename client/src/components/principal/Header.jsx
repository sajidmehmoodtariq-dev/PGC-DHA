import React from 'react';
import { RefreshCw } from 'lucide-react';

const Header = ({ 
  error, 
  isRefreshing, 
  isInitialLoading, 
  onRefresh, 
  lastUpdated 
}) => {
  return (
    <div className="bg-white rounded-lg sm:rounded-xl shadow-lg mb-4 sm:mb-6 lg:mb-8 overflow-hidden">
      <div className="p-3 sm:p-4 lg:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 sm:mb-2 leading-tight">
              Principal Enquiry Management
            </h1>
            <p className="text-sm sm:text-base text-gray-600 leading-tight">
              Monitor and analyze student enquiry data across all levels and time periods
            </p>
            {lastUpdated && (
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                Last updated: {lastUpdated.toLocaleString()}
              </p>
            )}
          </div>
          
          <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-3 sm:gap-6 flex-shrink-0">
            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isInitialLoading || isRefreshing}
              className={`flex items-center justify-center sm:justify-start gap-2 px-3 sm:px-4 py-2 ${error ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'} disabled:bg-gray-400 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:cursor-not-allowed`}
              title={error ? `Error: ${error}. Click to retry.` : "Refresh data from server"}
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">
                {isRefreshing ? 'Refreshing...' : error ? 'Retry' : 'Refresh'}
              </span>
              <span className="sm:hidden">
                {isRefreshing ? 'Refreshing...' : error ? 'Retry' : 'Refresh'}
              </span>
              {error && !isRefreshing && (
                <span className="text-xs opacity-75">⚠️</span>
              )}
            </button>
            
            <div className="text-center sm:text-right">
              <p className="text-xs sm:text-sm text-gray-500">Welcome</p>
              <p className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                Syed Awais Bukhari
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;
