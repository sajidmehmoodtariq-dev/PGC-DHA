import React from 'react';
import { Link } from 'react-router-dom';
import { 
  GraduationCap, 
  Users, 
  ClipboardCheck, 
  BarChart3,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const ExaminationModuleSummary = () => {
  const roleFeatures = {
    'InstituteAdmin': {
      title: 'Institute Admin',
      color: 'blue',
      features: [
        'Complete Examination Management',
        'Academic Records Management', 
        'Student Assignment to Classes',
        'Test Creation & Management',
        'Performance Analytics',
        'Academic Data Import/Export'
      ],
      accessPath: '/examinations',
      dashboardCard: 'Examination Management'
    },
    'IT': {
      title: 'IT Admin', 
      color: 'purple',
      features: [
        'Test Management System',
        'Academic Records Entry',
        'System Configuration', 
        'Test Creation & Management',
        'Teacher Assignment Logic',
        'Calendar View Management'
      ],
      accessPath: '/examinations',
      dashboardCard: 'Test Management'
    },
    'Principal': {
      title: 'Principal',
      color: 'green', 
      features: [
        'Examination Analytics Dashboard',
        'Performance Comparison Reports',
        'Academic Progress Monitoring',
        'Matriculation vs Current Performance',
        'Class-wise Performance Analytics',
        'Student Progress Tracking'
      ],
      accessPath: '/examinations?view=principal',
      dashboardCard: 'Examination Analytics'
    },
    'Teacher': {
      title: 'Teacher',
      color: 'orange',
      features: [
        'My Tests & Marks Entry',
        'Assigned Test Management',
        'Student Performance View',
        'Marks Entry Interface',
        'Test Results Management',
        'Class Performance Reports'
      ],
      accessPath: '/examinations?view=teacher', 
      dashboardCard: 'My Tests & Marks Entry'
    }
  };

  const completedPhases = [
    {
      phase: 'Phase 1',
      title: 'Database Models & Basic Setup',
      status: 'Complete',
      items: [
        'Enhanced User model with academic records',
        'Test model with comprehensive validation',
        'TestResult model with grade calculation',
        'API routes with role-based permissions',
        'Basic examination dashboard setup'
      ]
    },
    {
      phase: 'Phase 2', 
      title: 'Academic Records Management',
      status: 'Complete',
      items: [
        'Academic records entry interface',
        'Matriculation marks with subject breakdown',
        '11th grade records for 12th graders',
        'Search and filter functionality',
        'Complete edit capabilities',
        'API integration for data persistence'
      ]
    },
    {
      phase: 'Phase 3',
      title: 'Enhanced Test Management System', 
      status: 'In Progress',
      items: [
        'Advanced test creation form',
        'Duplicate test detection',
        'Teacher auto-assignment',
        'Calendar view integration',
        'Enhanced statistics dashboard',
        'Phase 3 API enhancements'
      ]
    }
  ];

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <GraduationCap className="h-12 w-12 text-indigo-600 mr-3" />
          <h1 className="text-4xl font-bold text-gray-900">Examination Module</h1>
        </div>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          A comprehensive examination system integrated across all user roles with academic records management, 
          test creation, marks entry, and performance analytics.
        </p>
      </div>

      {/* Phase Progress */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
          Implementation Progress
        </h2>
        <div className="space-y-6">
          {completedPhases.map((phase, index) => (
            <div key={index} className="border-l-4 border-indigo-500 pl-6">
              <div className="flex items-center mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{phase.phase}: {phase.title}</h3>
                <span className={`ml-3 px-3 py-1 text-sm rounded-full ${
                  phase.status === 'Complete' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {phase.status}
                </span>
              </div>
              <ul className="space-y-1 text-gray-600">
                {phase.items.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Role-based Features */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
          <Users className="h-6 w-6 text-blue-600 mr-2" />
          Role-based Access & Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(roleFeatures).map(([role, data]) => (
            <div key={role} className={`border-2 border-${data.color}-200 rounded-lg p-6 hover:shadow-md transition-shadow`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`text-xl font-semibold text-${data.color}-800`}>{data.title}</h3>
                <Link 
                  to={data.accessPath}
                  className={`inline-flex items-center px-3 py-1 text-sm font-medium text-${data.color}-700 bg-${data.color}-100 rounded-full hover:bg-${data.color}-200 transition-colors`}
                >
                  Access <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </div>
              <div className="mb-4">
                <span className="text-sm font-medium text-gray-600">Dashboard Card:</span>
                <p className={`text-${data.color}-700 font-medium`}>{data.dashboardCard}</p>
              </div>
              <ul className="space-y-2">
                {data.features.map((feature, index) => (
                  <li key={index} className="flex items-start text-gray-600">
                    <CheckCircle className={`h-4 w-4 text-${data.color}-500 mr-2 mt-0.5 flex-shrink-0`} />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Access Links */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link 
            to="/examinations"
            className="flex items-center p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <GraduationCap className="h-6 w-6 mr-3" />
            <span className="font-medium">Examination Dashboard</span>
          </Link>
          <Link 
            to="/examinations?view=teacher"
            className="flex items-center p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <ClipboardCheck className="h-6 w-6 mr-3" />
            <span className="font-medium">Teacher View</span>
          </Link>
          <Link 
            to="/examinations?view=principal"
            className="flex items-center p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <BarChart3 className="h-6 w-6 mr-3" />
            <span className="font-medium">Analytics View</span>
          </Link>
          <Link 
            to="/classes/assign-students"
            className="flex items-center p-4 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
          >
            <Users className="h-6 w-6 mr-3" />
            <span className="font-medium">Student Assignment</span>
          </Link>
        </div>
      </div>

      {/* Next Steps */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h2 className="text-xl font-bold text-yellow-800 mb-3">Next Steps - Phase 4 & Beyond</h2>
        <ul className="space-y-2 text-yellow-700">
          <li>• Phase 4: Marks Entry System (Teachers enter marks for tests)</li>
          <li>• Phase 5: Analytics & Reporting (Performance comparison, progress tracking)</li>
          <li>• Phase 6: Advanced Features (Bulk operations, notifications, exports)</li>
        </ul>
      </div>
    </div>
  );
};

export default ExaminationModuleSummary;
