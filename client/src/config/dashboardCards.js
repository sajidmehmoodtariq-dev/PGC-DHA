import { PERMISSIONS } from '../utils/rolePermissions';

/**
 * Dashboard Cards Configuration for Different Roles
 * Each card defines what dashboard items should be visible for each role
 */

export const DASHBOARD_CARDS = {
  // Institute Admin - Gets access to all dashboard cards
  'InstituteAdmin': [
    {
      id: 'enquiry-management',
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageSquare',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'normal',
      permission: PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT,
      // Dynamic data will be populated by dashboard
      recentActivity: null, // Will be set dynamically
      todayCount: null // Will be set dynamically
    },
    {
      id: 'correspondence-management',
      title: 'Correspondence Management',
      href: '/correspondence',
      icon: 'Mail',
      bgGradient: 'from-green-500 to-green-600',
      type: 'normal',
      permission: PERMISSIONS.CORRESPONDENCE.VIEW_CORRESPONDENCE,
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'enquiry-reports',
      title: 'Enquiry Reports',
      href: '/reports?section=enquiries',
      icon: 'BarChart3',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS,
      // Dynamic data will be populated by dashboard
      recentActivity: null, // Will be set dynamically
      todayCount: null // Will be set dynamically
    },
    {
      id: 'attendance-management',
      title: 'Attendance Management',
      href: '/attendance',
      icon: 'UserCheck',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      permission: null // Available to Institute Admin, IT, and Teachers
    },
    {
      id: 'student-attendance',
      title: 'Student Attendance Reports',
      href: '/reports?section=student-attendance',
      icon: 'UserX',
      bgGradient: 'from-red-500 to-red-600',
      type: 'sliding',
      permission: PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS
    },
    {
      id: 'lecture-attendance',
      title: 'Lecture Attendance Reports',
      href: '/reports?section=lecture-attendance',
      icon: 'BookOpen',
      bgGradient: 'from-red-500 to-red-600',
      type: 'sliding',
      permission: PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS
    },
    {
      id: 'examinations',
      title: 'Examination Reports',
      href: '/analytics?view=examinations',
      icon: 'ClipboardList',
      bgGradient: 'from-orange-500 to-orange-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'appointments',
      title: 'Principal Appointments',
      href: '/reports?section=appointments',
      icon: 'Calendar',
      bgGradient: 'from-amber-500 to-amber-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_APPOINTMENT_REPORTS
    },
    {
      id: 'class-management',
      title: 'Class Management',
      href: '/classes',
      icon: 'School',
      bgGradient: 'from-cyan-500 to-cyan-600',
      type: 'normal',
      permission: PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASSES
    },
    {
      id: 'student-assignment',
      title: 'Student Assignment',
      href: '/classes/assign-students',
      icon: 'UserPlus',
      bgGradient: 'from-emerald-500 to-emerald-600',
      type: 'normal',
      permission: PERMISSIONS.CLASS_MANAGEMENT.BULK_ASSIGN_STUDENTS
    },
    {
      id: 'timetable-management',
      title: 'Timetable Management',
      href: '/timetable',
      icon: 'Calendar',
      bgGradient: 'from-amber-500 to-amber-600',
      type: 'normal',
      permission: PERMISSIONS.TIMETABLE.VIEW_TIMETABLE
    },
    {
      id: 'examination-management',
      title: 'Examination Management',
      href: '/examinations',
      icon: 'GraduationCap',
      bgGradient: 'from-indigo-500 to-indigo-600',
      type: 'normal',
      permission: PERMISSIONS.EXAMINATION.MANAGE_ACADEMIC_RECORDS,
      recentActivity: null,
      todayCount: null
    }
  ],

  // Principal - Statistics and reports only, no detailed management
  'Principal': [
    {
      id: 'enquiry-statistics',
      title: 'Enquiry Statistics',
      href: '/reports?section=enquiries',
      icon: 'BarChart3',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS
    },
    {
      id: 'student-statistics',
      title: 'Student Analytics',
      href: '/analytics?view=students',
      icon: 'Users',
      bgGradient: 'from-green-500 to-green-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'attendance-reports',
      title: 'Attendance Reports',
      href: '/principal/attendance-reports',
      icon: 'UserCheck',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS
    },
    {
      id: 'principal-timetable',
      title: 'Timetable Overview',
      href: '/principal/timetable',
      icon: 'Calendar',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'normal'
    },
    {
      id: 'examination-analytics',
      title: 'Examination Analytics',
      href: '/analytics?view=examinations',
      icon: 'GraduationCap',
      bgGradient: 'from-indigo-500 to-indigo-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'performance-analytics',
      title: 'Performance Analytics',
      href: '/analytics',
      icon: 'TrendingUp',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'zone-analytics',
      title: 'Zone-Based Analytics',
      href: '/analytics?tab=zones',
      icon: 'BarChart3',
      bgGradient: 'from-emerald-500 to-emerald-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'institutional-reports',
      title: 'Institutional Reports',
      href: '/reports',
      icon: 'FileText',
      bgGradient: 'from-gray-500 to-gray-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_APPOINTMENT_REPORTS
    }
  ],

  // IT Role - Limited access to specific areas
  'IT': [
    {
      id: 'user-management',
      title: 'User Management',
      href: '/admin/users',
      icon: 'Users',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'normal',
      permission: PERMISSIONS.USER_MANAGEMENT.VIEW_USERS
    },
    {
      id: 'student-info-edit',
      title: 'Student Information',
      href: '/students',
      icon: 'UserCheck',
      bgGradient: 'from-teal-500 to-teal-600',
      type: 'normal',
      permission: PERMISSIONS.USER_MANAGEMENT.EDIT_USERS
    },
    {
      id: 'enquiry-management',
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageSquare',
      bgGradient: 'from-green-500 to-green-600',
      type: 'normal',
      permission: PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT
    },
    {
      id: 'correspondence-management',
      title: 'Correspondence Management',
      href: '/correspondence',
      icon: 'Mail',
      bgGradient: 'from-indigo-500 to-indigo-600',
      type: 'normal',
      permission: PERMISSIONS.CORRESPONDENCE.VIEW_CORRESPONDENCE,
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'enquiry-reports',
      title: 'Enquiry Reports',
      href: '/reports?section=enquiries',
      icon: 'BarChart3',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS
    },
    {
      id: 'class-management',
      title: 'Class Management',
      href: '/classes',
      icon: 'School',
      bgGradient: 'from-cyan-500 to-cyan-600',
      type: 'normal',
      permission: PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASSES
    },
    {
      id: 'student-assignment',
      title: 'Bulk Student Assignment',
      href: '/classes/assign-students',
      icon: 'UserPlus',
      bgGradient: 'from-emerald-500 to-emerald-600',
      type: 'normal',
      permission: PERMISSIONS.CLASS_MANAGEMENT.BULK_ASSIGN_STUDENTS
    },
    {
      id: 'timetable-management',
      title: 'Timetable Management',
      href: '/timetable',
      icon: 'Calendar',
      bgGradient: 'from-amber-500 to-amber-600',
      type: 'normal',
      permission: PERMISSIONS.TIMETABLE.VIEW_TIMETABLE
    },
    {
      id: 'examination-management',
      title: 'Test Management',
      href: '/examinations',
      icon: 'GraduationCap',
      bgGradient: 'from-indigo-500 to-indigo-600',
      type: 'normal',
      permission: PERMISSIONS.EXAMINATION.CREATE_TEST,
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'academic-records-management',
      title: 'Academic Records',
      href: '/examinations?tab=academic-records',
      icon: 'BookOpen',
      bgGradient: 'from-red-500 to-red-600',
      type: 'normal',
      permission: PERMISSIONS.EXAMINATION.MANAGE_ACADEMIC_RECORDS,
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'system-analytics',
      title: 'System Analytics',
      href: '/analytics',
      icon: 'Activity',
      bgGradient: 'from-orange-500 to-orange-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    }
  ],

  // Teacher Role - Access based on their responsibilities
  'Teacher': [
    {
      id: 'attendance-management',
      title: 'Attendance Management',
      href: '/attendance',
      icon: 'UserCheck',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      permission: null // Teachers access based on class/floor assignments
    },
    {
      id: 'my-timetable',
      title: 'My Schedule',
      href: '/timetable/view',
      icon: 'Calendar',
      bgGradient: 'from-green-500 to-green-600',
      type: 'normal',
      permission: null
    },
    {
      id: 'my-tests',
      title: 'My Tests & Marks Entry',
      href: '/examinations?view=teacher',
      icon: 'ClipboardCheck',
      bgGradient: 'from-indigo-500 to-indigo-600',
      type: 'normal',
      permission: PERMISSIONS.EXAMINATION.ENTER_MARKS,
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'class-analytics',
      title: 'Class Analytics',
      href: '/analytics?view=class',
      icon: 'BarChart3',
      bgGradient: 'from-cyan-500 to-cyan-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    },
    {
      id: 'student-examination-report',
      title: 'Student Examination Report',
      href: '/teacher/student-examination-report',
      icon: 'FileText',
      bgGradient: 'from-rose-500 to-rose-600',
      type: 'normal',
      permission: null, // Teachers can view only for subjects they teach
      description: 'View examination performance of students for subjects you teach'
    }
  ],

  // Receptionist - Very limited access
  'Receptionist': [
    {
      id: 'student-management',
      title: 'Student Management',
      href: '/students',
      icon: 'Users',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'normal',
      permission: PERMISSIONS.USER_MANAGEMENT.VIEW_USERS
    },
    {
      id: 'enquiry-management',
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageSquare',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'normal',
      permission: PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT
    },
    {
      id: 'enquiry-reports',
      title: 'Enquiry Reports',
      href: '/reports?section=enquiries',
      icon: 'BarChart3',
      bgGradient: 'from-purple-500 to-purple-600',
      type: 'normal',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS
    }
  ],

  // Coordinator/Floor Head - Teacher supervision + Limited enquiry management (No student management access)
  'Coordinator': [
    {
      id: 'teacher-attendance',
      title: 'Teacher Attendance',
      href: '/coordinator/teacher-attendance',
      icon: 'UserCheck2',
      bgGradient: 'from-green-500 to-green-600',
      type: 'normal',
      permission: null
    },
    {
      id: 'student-attendance',
      title: 'Student Attendance Reports',
      href: '/reports?section=student-attendance',
      icon: 'UserCheck',
      bgGradient: 'from-blue-500 to-blue-600',
      type: 'sliding',
      permission: PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS
    },
    {
      id: 'enquiry-management',
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageCircle',
      bgGradient: 'from-orange-500 to-orange-600',
      type: 'normal',
      permission: PERMISSIONS.ENQUIRY_MANAGEMENT.VIEW_ENQUIRIES
    },
    {
      id: 'campus-analytics',
      title: 'Campus Analytics',
      href: '/analytics?view=campus',
      icon: 'Building',
      bgGradient: 'from-violet-500 to-violet-600',
      type: 'normal',
      recentActivity: null,
      todayCount: null
    }
  ]
};

// Quick Management Access items for different roles
export const QUICK_MANAGEMENT_ACCESS = {
  'InstituteAdmin': [
    {
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageSquare',
      description: 'Handle enquiries and applications',
      permission: PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT
    },
    {
      title: 'User Management',
      href: '/admin/users',
      icon: 'UserCog',
      description: 'System user management',
      permission: PERMISSIONS.USER_MANAGEMENT.VIEW_USERS
    },
    {
      title: 'Reports Dashboard',
      href: '/reports',
      icon: 'BarChart3',
      description: 'Analytics and reporting',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS
    },
    {
      title: 'Advanced Statistics',
      href: '/admin/advanced-statistics',
      icon: 'TrendingUp',
      description: 'Advanced analytics and insights',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS
    },
    {
      title: 'Class Management',
      href: '/classes',
      icon: 'School',
      description: 'Manage classes and student assignments',
      permission: PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASSES
    },
    {
      title: 'Student Assignment',
      href: '/classes/assign-students',
      icon: 'UserPlus',
      description: 'Assign students to classes',
      permission: PERMISSIONS.CLASS_MANAGEMENT.BULK_ASSIGN_STUDENTS
    }
  ],

  'IT': [
    {
      title: 'User Management',
      href: '/admin/users',
      icon: 'UserCog',
      description: 'System user management',
      permission: PERMISSIONS.USER_MANAGEMENT.VIEW_USERS
    },
    {
      title: 'Student Information',
      href: '/students',
      icon: 'UserCheck',
      description: 'Edit student information and details',
      permission: PERMISSIONS.USER_MANAGEMENT.EDIT_USERS
    },
    {
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageSquare',
      description: 'Handle enquiries and applications',
      permission: PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT
    },
    {
      title: 'Enquiry Reports',
      href: '/reports?section=enquiries',
      icon: 'BarChart3',
      description: 'Enquiry analytics and reports',
      permission: PERMISSIONS.REPORTS.VIEW_ENQUIRY_REPORTS
    },
    {
      title: 'Class Management',
      href: '/classes',
      icon: 'School',
      description: 'Manage classes and student assignments',
      permission: PERMISSIONS.CLASS_MANAGEMENT.VIEW_CLASSES
    },
    {
      title: 'Student Assignment',
      href: '/classes/assign-students',
      icon: 'UserPlus',
      description: 'Assign students to classes',
      permission: PERMISSIONS.CLASS_MANAGEMENT.BULK_ASSIGN_STUDENTS
    },
    {
      title: 'Timetable Management',
      href: '/timetable',
      icon: 'Calendar',
      description: 'Manage timetables and schedules',
      permission: PERMISSIONS.TIMETABLE.VIEW_TIMETABLE
    },
    {
      title: 'Test Management',
      href: '/examinations',
      icon: 'GraduationCap',
      description: 'Create and manage tests',
      permission: PERMISSIONS.EXAMINATION.CREATE_TEST
    },
    {
      title: 'Academic Records',
      href: '/examinations?tab=academic-records',
      icon: 'BookOpen',
      description: 'Manage student matriculation marks and academic records',
      permission: PERMISSIONS.EXAMINATION.MANAGE_ACADEMIC_RECORDS
    }
  ],

  'Principal': [
    {
      title: 'Enquiry Stats',
      href: '/principal/enquiries',
      icon: 'BarChart3',
      description: 'View enquiry statistics and analytics',
      permission: null
    },
    {
      title: 'Attendance Reports',
      href: '/principal/attendance-reports',
      icon: 'TrendingUp',
      description: 'View teacher attendance reports and analytics',
      permission: PERMISSIONS.REPORTS.VIEW_ATTENDANCE_REPORTS
    },
    {
      title: 'Timetable Overview',
      href: '/principal/timetable',
      icon: 'Calendar',
      description: 'View real-time timetable with teacher attendance status',
      permission: null
    },
    {
      title: 'Correspondence Management',
      href: '/correspondence',
      icon: 'Mail',
      description: 'Manage student correspondence and communications',
      permission: null
    }
  ],

  'Teacher': [
    {
      title: 'Student Attendance',
      href: '/attendance',
      icon: 'UserCheck',
      description: 'Mark and manage student attendance for your classes',
      permission: PERMISSIONS.ATTENDANCE.MARK_STUDENT_ATTENDANCE
    },
    {
      title: 'My Schedule',
      href: '/timetable/view',
      icon: 'Calendar',
      description: 'View your teaching schedule and timetable',
      permission: null
    },
    {
      title: 'My Tests & Marks',
      href: '/examinations?view=teacher',
      icon: 'ClipboardCheck',
      description: 'Manage test marks and examination records',
      permission: PERMISSIONS.EXAMINATION.ENTER_MARKS
    },
    {
      title: 'Correspondence',
      href: '/correspondence',
      icon: 'Mail',
      description: 'Manage student correspondence and communications',
      permission: null
    }
  ],

  'Receptionist': [
    {
      title: 'Student Management',
      href: '/students',
      icon: 'Users',
      description: 'View and edit student information',
      permission: PERMISSIONS.USER_MANAGEMENT.VIEW_USERS
    },
    {
      title: 'Enquiry Management',
      href: '/institute-admin/enquiries',
      icon: 'MessageSquare',
      description: 'Handle enquiries (Level 3 access)',
      permission: PERMISSIONS.MANAGEMENT.ENQUIRY_MANAGEMENT
    }
  ],

  'Coordinator': [
    {
      title: 'Teacher Attendance',
      href: '/coordinator/teacher-attendance',
      icon: 'UserCheck2',
      description: 'Mark teacher attendance and add remarks',
      permission: null
    },
    {
      title: 'Student Attendance',
      href: '/attendance',
      icon: 'UserCheck',
      description: 'Mark and manage student attendance',
      permission: PERMISSIONS.ATTENDANCE.MARK_STUDENT_ATTENDANCE
    },
    {
      title: 'Enquiry Support',
      href: '/institute-admin/enquiries',
      icon: 'MessageCircle',
      description: 'Support enquiry management processes',
      permission: PERMISSIONS.ENQUIRY_MANAGEMENT.VIEW_ENQUIRIES
    }
  ]
};

// Get dashboard cards for a specific role
export const getDashboardCardsForRole = (role) => {
  return DASHBOARD_CARDS[role] || [];
};

// Get quick access items for a specific role  
export const getQuickAccessForRole = (role) => {
  return QUICK_MANAGEMENT_ACCESS[role] || [];
};
