import React, { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '../../ui/button';

/**
 * Date Range Selector Component
 * Provides quick date range options and custom date selection
 */
const DateRangeSelector = ({ dateRange, onDateRangeChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customMode, setCustomMode] = useState(false);

  // Quick date range options
  const quickRanges = [
    {
      label: 'All Time',
      getValue: () => {
        return { startDate: '', endDate: '' }; // Empty dates = all time
      }
    },
    {
      label: 'Today',
      getValue: () => {
        const today = new Date().toISOString().split('T')[0];
        return { startDate: today, endDate: today };
      }
    },
    {
      label: 'Yesterday',
      getValue: () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const dateStr = yesterday.toISOString().split('T')[0];
        return { startDate: dateStr, endDate: dateStr };
      }
    },
    {
      label: 'Last 7 Days',
      getValue: () => {
        const end = new Date().toISOString().split('T')[0];
        const start = new Date();
        start.setDate(start.getDate() - 6);
        return { startDate: start.toISOString().split('T')[0], endDate: end };
      }
    },
    {
      label: 'Last 30 Days',
      getValue: () => {
        const end = new Date().toISOString().split('T')[0];
        const start = new Date();
        start.setDate(start.getDate() - 29);
        return { startDate: start.toISOString().split('T')[0], endDate: end };
      }
    },
    {
      label: 'This Month',
      getValue: () => {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return { 
          startDate: start.toISOString().split('T')[0], 
          endDate: end.toISOString().split('T')[0] 
        };
      }
    },
    {
      label: 'Custom Range',
      getValue: () => null,
      isCustom: true
    }
  ];

  const handleQuickRangeSelect = (range) => {
    if (range.isCustom) {
      setCustomMode(true);
    } else {
      const newRange = range.getValue();
      onDateRangeChange(newRange);
      setCustomMode(false);
      setIsOpen(false);
    }
  };

  const handleCustomRangeApply = () => {
    setCustomMode(false);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!dateRange.startDate && !dateRange.endDate) return 'All Time';
    if (!dateRange.startDate || !dateRange.endDate) return 'Select Date Range';
    
    const start = new Date(dateRange.startDate);
    const end = new Date(dateRange.endDate);
    
    if (dateRange.startDate === dateRange.endDate) {
      return start.toLocaleDateString();
    }
    
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsOpen(!isOpen)}
        variant="outline"
        className="flex items-center gap-2 min-w-[200px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span className="text-sm">{formatDateRange()}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Select Date Range</h3>
            
            {!customMode ? (
              <div className="space-y-1">
                {quickRanges.map((range, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickRangeSelect(range)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {range.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => onDateRangeChange({
                      ...dateRange,
                      startDate: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => onDateRangeChange({
                      ...dateRange,
                      endDate: e.target.value
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button
                    onClick={handleCustomRangeApply}
                    size="sm"
                    className="flex-1"
                  >
                    Apply
                  </Button>
                  <Button
                    onClick={() => setCustomMode(false)}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setIsOpen(false);
            setCustomMode(false);
          }}
        />
      )}
    </div>
  );
};

export default DateRangeSelector;
