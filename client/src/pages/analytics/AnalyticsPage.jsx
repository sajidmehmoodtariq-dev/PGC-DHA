import React from 'react';
import ZoneAnalyticsComponent from '../../components/analytics/ZoneAnalyticsComponent';
import { AnalyticsAccessProvider } from '../../components/analytics/AnalyticsAccessProvider';

const AnalyticsPage = () => {
  return (
    <AnalyticsAccessProvider>
      <div className="min-h-screen bg-gray-50">
        <div className="p-6">
          <ZoneAnalyticsComponent />
        </div>
      </div>
    </AnalyticsAccessProvider>
  );
};

export default AnalyticsPage;
