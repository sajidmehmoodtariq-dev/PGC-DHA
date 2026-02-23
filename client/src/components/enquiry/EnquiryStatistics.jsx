import React, { useState, useEffect } from 'react';
import { Users, TrendingUp, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import { ENQUIRY_LEVELS } from '../../constants/enquiryLevels';

const getIconComponent = (iconName) => {
  const iconMap = {
    AlertCircle,
    Clock,
    CheckCircle,
    XCircle
  };
  return iconMap[iconName] || Clock;
};

const EnquiryStatistics = ({ config }) => {
  const [statistics, setStatistics] = useState({
    total: 0,
    byLevel: {},
    recentTrend: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true);
      try {
        // Use level history API for accurate tracking
        const response = await api.get('/enquiries/level-history-data');
        
        if (response.data.success) {
          const data = response.data.data;
          
          // Calculate statistics from level history data
          const total = data.totalEnquiries;
          const byLevel = {};
          
          ENQUIRY_LEVELS.forEach(level => {
            if (!config.levelRestrictions || config.levelRestrictions.includes(level.id)) {
              byLevel[level.id] = data.levelBreakdown[`level${level.id}`] || 0;
            }
          });
          
          setStatistics({
            total,
            byLevel,
            recentTrend: data.recentTrend || 0
          });
        } else {
          // Fallback: if level history API fails, use students API
          const fallbackResponse = await api.get('/students');
          const enquiries = fallbackResponse.data?.data || fallbackResponse.data || [];
          
          // Apply role-based filtering if configured
          let filteredEnquiries = enquiries;
          if (config.levelRestrictions && config.levelRestrictions.length > 0) {
            filteredEnquiries = enquiries.filter(enquiry => 
              config.levelRestrictions.includes(enquiry.prospectusStage || enquiry.enquiryLevel)
            );
          }
          
          // Calculate statistics
          const total = filteredEnquiries.length;
          const byLevel = {};
          
          ENQUIRY_LEVELS.forEach(level => {
            if (!config.levelRestrictions || config.levelRestrictions.includes(level.id)) {
              byLevel[level.id] = filteredEnquiries.filter(enquiry => 
                (enquiry.prospectusStage || enquiry.enquiryLevel) === level.id
              ).length;
            }
          });
          
          // Calculate recent trend (last 7 days vs previous 7 days)
          const now = new Date();
          const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
          
          const recentEnquiries = filteredEnquiries.filter(enquiry => {
            const createdDate = new Date(enquiry.createdOn || enquiry.dateCreated);
            return createdDate >= sevenDaysAgo;
          }).length;
          
          const previousEnquiries = filteredEnquiries.filter(enquiry => {
            const createdDate = new Date(enquiry.createdOn || enquiry.dateCreated);
            return createdDate >= fourteenDaysAgo && createdDate < sevenDaysAgo;
          }).length;
          
          const recentTrend = previousEnquiries > 0 ? 
            ((recentEnquiries - previousEnquiries) / previousEnquiries) * 100 : 0;
          
          setStatistics({
            total,
            byLevel,
            recentTrend
          });
        }
      } catch (error) {
        console.error('Error fetching enquiry statistics:', error);
        // Try fallback to students API if level history fails
        try {
          const fallbackResponse = await api.get('/students');
          const enquiries = fallbackResponse.data?.data || fallbackResponse.data || [];
          
          // Apply role-based filtering if configured
          let filteredEnquiries = enquiries;
          if (config.levelRestrictions && config.levelRestrictions.length > 0) {
            filteredEnquiries = enquiries.filter(enquiry => 
              config.levelRestrictions.includes(enquiry.prospectusStage || enquiry.enquiryLevel)
            );
          }
          
          // Calculate statistics
          const total = filteredEnquiries.length;
          const byLevel = {};
          
          ENQUIRY_LEVELS.forEach(level => {
            if (!config.levelRestrictions || config.levelRestrictions.includes(level.id)) {
              byLevel[level.id] = filteredEnquiries.filter(enquiry => 
                (enquiry.prospectusStage || enquiry.enquiryLevel) === level.id
              ).length;
            }
          });
          
          setStatistics({
            total,
            byLevel,
            recentTrend: 0
          });
        } catch (fallbackError) {
          console.error('Fallback API also failed:', fallbackError);
          setStatistics({
            total: 0,
            byLevel: {},
            recentTrend: 0
          });
        }
      } finally {
        setLoading(false);
      }
    };

    if (config) {
      fetchStatistics();
    }
  }, [config]);

  const getVisibleLevels = () => {
    if (config.levelRestrictions && config.levelRestrictions.length > 0) {
      return ENQUIRY_LEVELS.filter(level => config.levelRestrictions.includes(level.id));
    }
    return ENQUIRY_LEVELS;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Enquiry Statistics</h2>
        <div className="flex items-center gap-2 text-sm">
          <TrendingUp className={`h-4 w-4 ${statistics.recentTrend >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          <span className={statistics.recentTrend >= 0 ? 'text-green-600' : 'text-red-600'}>
            {statistics.recentTrend >= 0 ? '+' : ''}{statistics.recentTrend.toFixed(1)}% (7 days)
          </span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Enquiries */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Enquiries</p>
              <p className="text-2xl font-bold text-blue-900">{statistics.total}</p>
            </div>
            <div className="h-12 w-12 bg-blue-500 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Level Statistics */}
        {getVisibleLevels().slice(0, 3).map((level) => {
          const IconComponent = getIconComponent(level.iconName);
          const count = statistics.byLevel[level.id] || 0;
          
          return (
            <div key={level.id} className={`${level.bgColor} rounded-xl p-4`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${level.textColor}`}>{level.name}</p>
                  <p className={`text-2xl font-bold ${level.textColor}`}>{count}</p>
                </div>
                <div className={`h-12 w-12 bg-${level.color}-500 rounded-lg flex items-center justify-center`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Additional Level Details */}
      {getVisibleLevels().length > 4 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {getVisibleLevels().slice(3).map((level) => {
            const count = statistics.byLevel[level.id] || 0;
            
            return (
              <div key={level.id} className={`${level.bgColor} rounded-lg p-3 text-center`}>
                <p className={`text-xs font-medium ${level.textColor} mb-1`}>{level.name}</p>
                <p className={`text-lg font-bold ${level.textColor}`}>{count}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default EnquiryStatistics;
