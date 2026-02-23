import React from 'react';
import { useLocation } from 'react-router-dom';
import ExaminationDashboard from '../../components/examinations/ExaminationDashboard';
import PermissionGuard from '../../components/PermissionGuard';
import { PERMISSIONS } from '../../utils/rolePermissions';

const ExaminationPage = () => {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const view = searchParams.get('view'); // teacher, admin, principal

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {view === 'teacher' ? 'My Tests & Marks Entry' : 
               view === 'principal' ? 'Examination Management' : 
               'Examination Management'}
            </h1>
            <p className="text-gray-600 mt-1">
              {view === 'teacher' ? 'Enter marks for your assigned tests and view student performance' :
               view === 'principal' ? 'Manage academic records and view student examination reports' :
               'Manage tests, academic records, and examination system'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {view === 'teacher' ? 'Teacher View' :
               view === 'principal' ? 'Principal View' :
               'Management View'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <PermissionGuard
        requiredPermission={PERMISSIONS.EXAMINATION.VIEW_EXAMINATIONS}
        fallback={
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
              <p className="text-gray-600">You don't have permission to access the examination module.</p>
            </div>
          </div>
        }
      >
        <ExaminationDashboard initialView={view} />
      </PermissionGuard>
    </div>
  );
};

export default ExaminationPage;
