import React from 'react';
import StudentExaminationReportPage from './pages/principal/StudentExaminationReportPage';
import NotFound from './pages/NotFound';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { DashboardProvider } from './contexts/DashboardContext';
import ToastContainer from './components/ui/ToastContainer';
import AuthenticatedRoute from './components/AuthenticatedRoute';
import ProtectedRoute from './components/auth/ProtectedRoute';
import StudentApprovalGuard from './components/StudentApprovalGuard';
import Layout from './components/layout/Layout';
import { PERMISSIONS } from './utils/rolePermissions';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import ProfilePage from './pages/auth/ProfilePage';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Admin pages
import StudentReport from './pages/admin/StudentReport';
import AdvancedStatistics from './pages/admin/AdvancedStatistics';
import UserManagementContainer from './components/user-management/UserManagementContainer';

// Institute Admin pages
import EnquiryManagementContainer from './components/enquiry/EnquiryManagementContainer';
import ClassManagement from './components/class-management/ClassManagement';
import StudentAssignment from './components/class-management/StudentAssignment';
import PrincipalEnquiryManagement from './components/principal/PrincipalEnquiryManagement';
import PrincipalAttendanceReports from './components/principal/PrincipalAttendanceReports';
import PrincipalTimetablePage from './pages/timetable/PrincipalTimetablePage';
import TeachersDashboard from './components/principal/TeachersDashboard';
import StudentProfile from './pages/principal/StudentProfile';

// Attendance Management
import AttendanceManagement from './components/attendance/AttendanceManagement';
import AttendanceDashboard from './components/attendance/AttendanceDashboard';
import TeacherAttendanceManagement from './components/coordinator/TeacherAttendanceManagement';
import CoordinatorTimetablePage from './pages/coordinator/CoordinatorTimetablePage';
import TeacherDashboard from './components/dashboard/TeacherDashboard';

// Reports
import ReportsContainer from './components/reports/ReportsContainer';
import StudentAttendanceManagement from './components/reports/StudentAttendanceManagement';

// Correspondence Management
import { CorrespondenceManagement } from './components/correspondence';

// Timetable Management
import TimetableManagement from './pages/timetable/TimetableManagement';

// Examination Management
import ExaminationPage from './pages/examinations/ExaminationPage';

// Analytics
import AnalyticsPage from './pages/analytics/AnalyticsPage';

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <DashboardProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/register" element={<RegisterPage />} />
              <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/auth/reset-password/:token" element={<ResetPasswordPage />} />

              {/* Protected routes */}
              <Route path="/dashboard" element={
                <AuthenticatedRoute>
                  <Layout>
                    <StudentApprovalGuard>
                      <DashboardPage />
                    </StudentApprovalGuard>
                  </Layout>
                </AuthenticatedRoute>
              } />

              <Route path="/profile" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProfilePage />
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Principal Enquiry Management - Separate from InstituteAdmin */}
              <Route path="/principal/enquiries" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Principal']}
                    >
                      <PrincipalEnquiryManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Principal Attendance Reports */}
              <Route path="/principal/attendance-reports" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Principal']}
                      requiredPermission={PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS}
                    >
                      <PrincipalAttendanceReports />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Principal Timetable Overview */}
              <Route path="/principal/timetable" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Principal']}
                    >
                      <PrincipalTimetablePage />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Principal Teachers Dashboard */}
              <Route path="/principal/teachers" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Principal']}
                    >
                      <TeachersDashboard />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Principal Student Profiles */}
              <Route path="/principal/student-profiles" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Principal']}
                    >
                      <StudentProfile />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Principal Student Examination Report */}
              <Route path="/principal/student-examination-report" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Principal']}
                    >
                      <StudentExaminationReportPage />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Institute Admin routes with permission-based protection */}
              <Route path="/institute-admin/enquiries" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT}
                      allowedRoles={['InstituteAdmin', 'IT', 'Receptionist', 'Coordinator']}
                    >
                      <EnquiryManagementContainer />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Dedicated Student Attendance Management Route */}
              <Route path="/student-attendance" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS}
                      allowedRoles={['Principal', 'InstituteAdmin', 'IT']}
                    >
                      <StudentAttendanceManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Correspondence Management */}
              <Route path="/correspondence" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.CORRESPONDENCE.VIEW_CORRESPONDENCE}
                      allowedRoles={['InstituteAdmin', 'IT', 'Principal', 'Teacher', 'Receptionist', 'Coordinator']}
                    >
                      <CorrespondenceManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Class Management - Institute Admin and IT only */}
              <Route path="/institute-admin/classes" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASSES}
                      allowedRoles={['InstituteAdmin', 'IT']}
                    >
                      <ClassManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Student Assignment to Classes */}
              <Route path="/classes/assign-students" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.CLASS_MANAGEMENT.ASSIGN_STUDENTS}
                      allowedRoles={['InstituteAdmin', 'IT']}
                    >
                      <StudentAssignment />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* General Class Management for broader access */}
              <Route path="/classes" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASSES}
                      allowedRoles={['InstituteAdmin', 'IT', 'Teacher', 'Coordinator']}
                    >
                      <ClassManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Teacher Dashboard */}
              <Route path="/teacher/dashboard" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Teacher']}
                    >
                      <TeacherDashboard />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Coordinator Attendance Dashboard */}
              <Route path="/coordinator/attendance" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.ATTENDANCE.MARK_STUDENT_ATTENDANCE}
                      allowedRoles={['Coordinator']}
                    >
                      <AttendanceDashboard />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Coordinator Teacher Attendance */}
              <Route path="/coordinator/teacher-attendance" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Coordinator']}
                    >
                      <TeacherAttendanceManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Coordinator Timetable Management */}
              <Route path="/coordinator/timetable" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['Coordinator']}
                    >
                      <CoordinatorTimetablePage />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* General Attendance Dashboard */}
              <Route path="/attendance/dashboard" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermissions={[
                        PERMISSIONS.ATTENDANCE.MARK_STUDENT_ATTENDANCE,
                        PERMISSIONS.ATTENDANCE.VIEW_STUDENT_ATTENDANCE
                      ]}
                      requireAll={false}
                      allowedRoles={['InstituteAdmin', 'IT', 'Teacher', 'Coordinator']}
                    >
                      <AttendanceDashboard />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Attendance Management */}
              <Route path="/attendance" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['InstituteAdmin', 'IT', 'Teacher', 'Coordinator']}
                      customCheck={(user) => {
                        // Allow Institute Admin and IT full access
                        if (['InstituteAdmin', 'IT'].includes(user?.role)) return true;
                        // For Teachers, they need to be either class incharge or floor incharge
                        // This will be validated in the component level
                        if (user?.role === 'Teacher') return true;
                        // For Coordinators, allow access to mark student attendance
                        if (user?.role === 'Coordinator') return true;
                        return false;
                      }}
                    >
                      <AttendanceManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Timetable Management */}
              <Route path="/timetable" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.TIMETABLE.VIEW_TIMETABLE}
                      allowedRoles={['InstituteAdmin', 'IT', 'Teacher']}
                    >
                      <TimetableManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Timetable View (Read-only for Teachers) */}
              <Route path="/timetable/view" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.TIMETABLE.VIEW_TIMETABLE}
                      allowedRoles={['Teacher']}
                    >
                      <TimetableManagement />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Examination Management */}
              <Route path="/examinations" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.EXAMINATION.VIEW_EXAMINATIONS}
                      allowedRoles={['InstituteAdmin', 'IT', 'Teacher', 'Principal']}
                    >
                      <ExaminationPage />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Analytics */}
              <Route path="/analytics" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      allowedRoles={['InstituteAdmin', 'IT', 'Principal', 'Teacher', 'Coordinator']}
                    >
                      <AnalyticsPage />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Reports with proper permission checking */}
              <Route path="/reports" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermissions={[
                        PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS,
                        PERMISSIONS.REPORTS.VIEW_STUDENT_REPORTS,
                        PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS,
                        PERMISSIONS.REPORTS.VIEW_EXAMINATION_REPORTS,
                        PERMISSIONS.REPORTS.VIEW_APPOINTMENT_REPORTS
                      ]}
                      requireAll={false}
                      allowedRoles={['InstituteAdmin', 'Principal', 'IT', 'Receptionist', 'Coordinator']}
                    >
                      <ReportsContainer />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Advanced Statistics - Institute Admin only */}
              <Route path="/admin/advanced-statistics" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute allowedRoles={['InstituteAdmin']}>
                      <AdvancedStatistics />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* User Management routes */}
              <Route path="/admin/users" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.USER_MANAGEMENT.VIEW_USERS}
                      allowedRoles={['InstituteAdmin', 'IT', 'Receptionist', 'Coordinator']}
                    >
                      <UserManagementContainer />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              <Route path="/admin/add-student" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.USER_MANAGEMENT.ADD_STUDENT}
                      allowedRoles={['InstituteAdmin', 'IT', 'Receptionist', 'Coordinator']}
                    >
                      <UserManagementContainer userType="student" />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Legacy route - redirect to new user management */}
              <Route path="/institute-admin/staff" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.MANAGEMENT.STAFF_MANAGEMENT}
                      allowedRoles={['InstituteAdmin']}
                    >
                      <UserManagementContainer />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Future feature placeholders with proper protection */}
              <Route path="/institutes" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute allowedRoles={['InstituteAdmin']}>
                      <div className="p-6">
                        <h1 className="text-2xl font-bold">Institute Management</h1>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              <Route path="/users" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.USER_MANAGEMENT.VIEW_USERS}
                      allowedRoles={['InstituteAdmin', 'IT']}
                    >
                      <UserManagementContainer />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              <Route path="/students" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.USER_MANAGEMENT.VIEW_USERS}
                      allowedRoles={['InstituteAdmin', 'IT', 'Receptionist', 'Coordinator']}
                    >
                      <UserManagementContainer userType="student" />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              <Route path="/teachers" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute
                      requiredPermission={PERMISSIONS.MANAGEMENT.STAFF_MANAGEMENT}
                      allowedRoles={['InstituteAdmin']}
                    >
                      <UserManagementContainer userType="staff" />
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              <Route path="/courses" element={
                <AuthenticatedRoute>
                  <Layout>
                    <ProtectedRoute allowedRoles={['InstituteAdmin', 'Teacher']}>
                      <div className="p-6">
                        <h1 className="text-2xl font-bold">Course Management</h1>
                        <p className="text-gray-600">Coming soon...</p>
                      </div>
                    </ProtectedRoute>
                  </Layout>
                </AuthenticatedRoute>
              } />

              {/* Default redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            <ToastContainer />
          </DashboardProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
