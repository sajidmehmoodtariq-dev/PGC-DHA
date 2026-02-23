import React, { useState } from 'react';
import { 
  BookOpen, 
  FileText,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import PermissionGuard from '../PermissionGuard';
import { PERMISSIONS } from '../../utils/rolePermissions';
import AcademicRecordsManagement from './AcademicRecordsManagement';
import TestManagementComponent from './TestManagementComponent';
import MarksEntryComponent from './MarksEntryComponent';

const ExaminationDashboard = ({ initialView = null }) => {
  // Set default active tab based on initial view
  const getInitialTab = () => {
    if (initialView === 'teacher') return 'marks-entry';
    if (initialView === 'principal') return 'academic-records';
    return 'tests';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-500 rounded-lg">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Examination Management</h1>
                <p className="text-sm text-gray-600">Advanced test management and academic records</p>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="border-t border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <PermissionGuard permission={PERMISSIONS.EXAMINATION.CREATE_TEST}>
                <button
                  onClick={() => setActiveTab('tests')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'tests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <FileText className="h-4 w-4" />
                    <span>Test Management</span>
                  </div>
                </button>
              </PermissionGuard>
              
              <PermissionGuard permission={PERMISSIONS.EXAMINATION.MANAGE_ACADEMIC_RECORDS}>
                <button
                  onClick={() => setActiveTab('academic-records')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'academic-records'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Academic Records</span>
                  </div>
                </button>
              </PermissionGuard>
              
              {/* Teacher Marks Entry Tab */}
              <PermissionGuard permission={PERMISSIONS.EXAMINATION.ENTER_MARKS}>
                <button
                  onClick={() => setActiveTab('marks-entry')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === 'marks-entry'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <UserCheck className="h-4 w-4" />
                    <span>Marks Entry</span>
                  </div>
                </button>
              </PermissionGuard>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tests Tab Content */}
        {activeTab === 'tests' && (
          <TestManagementComponent />
        )}
        
        {/* Academic Records Tab Content */}
        {activeTab === 'academic-records' && (
          <AcademicRecordsManagement />
        )}
        
        {/* Marks Entry Tab Content */}
        {activeTab === 'marks-entry' && (
          <MarksEntryComponent />
        )}
      </div>
    </div>
  );
};

export default ExaminationDashboard;
