import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import api from '../../services/api';

const TotalEnquiriesCard = ({ loading }) => {
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTotalCount = async () => {
      try {
        setIsLoading(true);
        // Use the same API as StudentReport to get consistent count
        const response = await api.get('/users', {
          params: {
            role: 'Student',
            page: 1,
            limit: 1 // Only need count, not actual data
          }
        });
        
        if (response.data.success) {
          setTotalCount(response.data.pagination?.totalDocs || 0);
        }
      } catch (error) {
        console.error('Error fetching total count:', error);
        setTotalCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTotalCount();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-lg mb-8 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold opacity-90">Total Enquiries</h2>
            <p className="text-3xl font-bold">
              {(loading || isLoading) ? (
                <span className="animate-pulse">Loading...</span>
              ) : (
                totalCount.toLocaleString()
              )}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              All students across all levels
            </p>
          </div>
          <Users className="w-12 h-12 opacity-80" />
        </div>
      </div>
      <div className="p-4 bg-gray-50">
        <div className="text-sm text-gray-600">
          This count matches the total in Enquiry Management for data consistency
        </div>
      </div>
    </div>
  );
};

export default TotalEnquiriesCard;
