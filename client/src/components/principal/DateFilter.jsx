import React from 'react';

const DateFilter = ({ 
  selectedDate, 
  dateFilters, 
  onDateChange, 
  loading 
}) => {
  const handleDateChange = (e) => {
    const newDate = e.target.value;
    console.log('DateFilter - Date changed from', selectedDate, 'to', newDate);
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center space-x-2">
      <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
        Time Filter:
      </label>
      <select
        value={selectedDate}
        onChange={handleDateChange}
        disabled={loading}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {dateFilters.map((filter) => (
          <option key={filter.value} value={filter.value}>
            {filter.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default DateFilter;
