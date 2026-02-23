import React, { useState, useEffect } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../PermissionGuard';
import ReportsNavigation from './ReportsNavigation';
import EnquiryReports from './EnquiryReports';
import StudentAttendanceManagement from './StudentAttendanceManagement';
import LectureAttendanceReports from './LectureAttendanceReports';
import AttendanceReports from './AttendanceReports';
import ExaminationReports from './ExaminationReports';
import AppointmentReports from './AppointmentReports';
import { PERMISSIONS } from '../../utils/rolePermissions';
import { ROLE_COMPONENT_CONFIG } from '../../docs/ComponentArchitecturePlan';

const ReportsContainer = () => {
  const { userRole } = usePermissions();
  const [searchParams] = useSearchParams();
  const [activeSection, setActiveSection] = useState('enquiries');
  const [config, setConfig] = useState(null);

  useEffect(() => {
    if (userRole) {
      const roleConfig = ROLE_COMPONENT_CONFIG[userRole];
      if (roleConfig?.reports) {
        setConfig(roleConfig.reports);
      }
    }
  }, [userRole]);

  useEffect(() => {
    const section = searchParams.get('section');
    if (section && config?.allowedReports?.includes(section)) {
      setActiveSection(section);
    } else if (config?.allowedReports?.length > 0) {
      // Set to first allowed report if current section is not allowed
      setActiveSection(config.allowedReports[0]);
    }
  }, [searchParams, config]);

  const renderReportContent = () => {
    // Only render if user has permission for this report type
    if (!config?.allowedReports?.includes(activeSection)) {
      return (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-600">You don't have permission to view this report type.</p>
        </div>
      );
    }

    switch (activeSection) {
      case 'enquiries':
      case 'enquiry':
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS}>
            <EnquiryReports config={config} />
          </PermissionGuard>
        );
      case 'student-attendance':
      case 'attendance':
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS}>
            <StudentAttendanceManagement config={config} />
          </PermissionGuard>
        );
      case 'lecture-attendance':
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS}>
            <LectureAttendanceReports config={config} />
          </PermissionGuard>
        );
      case 'attendance-reports':
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS}>
            <AttendanceReports config={config} />
          </PermissionGuard>
        );
      case 'examinations':
      case 'examination':
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_EXAMINATION_REPORTS}>
            <ExaminationReports config={config} />
          </PermissionGuard>
        );
      case 'appointments':
      case 'appointment':
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_APPOINTMENT_REPORTS}>
            <AppointmentReports config={config} />
          </PermissionGuard>
        );
      default:
        return (
          <PermissionGuard permission={PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS}>
            <EnquiryReports config={config} />
          </PermissionGuard>
        );
    }
  };

  if (!config) {
    return (
      <div className="min-h-[16rem] flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-70" />
          <div className="relative p-3 rounded-xl">
            <div className="w-12 h-12 rounded-full border-2 border-primary/30 border-t-primary animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Section with Glassmorphic Effect */}
        <div className="mb-8">
          <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border p-6 transition-all duration-300 hover:shadow-[0_20px_64px_0_rgba(26,35,126,0.18)] group">
            {/* Animated gradient bar */}
            <span className="absolute top-0 left-8 right-8 h-1 rounded-b-xl bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
            
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                {/* Back button with glow effect */}
                <div className="relative">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 blur-xl opacity-70" />
                  <Link 
                    to="/dashboard" 
                    className="relative inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent text-white shadow-lg transition-transform duration-300 hover:scale-105 hover:shadow-2xl animate-float"
                  >
                    <ArrowLeft className="h-6 w-6" />
                  </Link>
                </div>
                {/* Title and Description */}
                <div>
                  <h1 className="text-3xl font-extrabold text-primary mb-1 tracking-tight font-[Sora,Inter,sans-serif] drop-shadow-sm">
                    Reports & Analytics
                  </h1>
                  <p className="text-primary/80 font-[Inter,sans-serif]">
                    {config.description || 'Comprehensive reporting and data analytics dashboard'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ReportsNavigation 
          config={config}
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />

        {/* Report Content */}
        {renderReportContent()}
      </div>
    </div>
  );
};

// Access Denied Component
const AccessDenied = () => (
  <div className="relative bg-white/60 backdrop-blur-2xl rounded-3xl shadow-2xl border border-border p-8 text-center transition-all duration-300 hover:shadow-[0_20px_64px_0_rgba(26,35,126,0.18)] group">
    <span className="absolute top-0 left-8 right-8 h-1 rounded-b-xl bg-gradient-to-r from-primary via-accent to-primary animate-gradient-x" />
    <div className="relative">
      <div className="absolute inset-0 rounded-full bg-accent/20 blur-2xl opacity-70 w-24 h-24 mx-auto" />
      <div className="relative text-accent mb-4">
        <svg className="w-16 h-16 mx-auto animate-float" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
    </div>
    <h3 className="text-2xl font-extrabold text-primary mb-2 tracking-tight font-[Sora,Inter,sans-serif] drop-shadow-sm">Access Denied</h3>
    <p className="text-primary/80 font-[Inter,sans-serif]">You don't have permission to view this section.</p>
  </div>
);

export default ReportsContainer;
