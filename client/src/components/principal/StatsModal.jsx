import React from 'react';
import { X } from 'lucide-react';
import LoadingOverlay from './LoadingOverlay';
import AdvancedStatsTable from './AdvancedStatsTable';

const StatsModal = ({
  showStatsModal,
  onCloseModal,
  loading,
  lastUpdated
}) => {
  if (!showStatsModal) return null;

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={onCloseModal}
      ></div>
      
      {/* Modal */}
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto relative border border-white/20">
        
        {/* Header */}
        <div className="sticky top-0 bg-white/90 backdrop-blur-md border-b border-gray-200/50 px-4 py-3 rounded-t-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Enquiry Statistics</h2>
              {lastUpdated && (
                <p className="text-sm text-gray-500 mt-1">
                  Last updated: {lastUpdated.toLocaleString()}
                </p>
              )}
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={onCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="p-4 relative">
          {/* Loading Overlay */}
          {loading && <LoadingOverlay />}
          
          {/* Advanced Statistics Table */}
          <AdvancedStatsTable 
            loading={loading}
          />
        </div>
      </div>
    </div>
  );
};

export default StatsModal;
