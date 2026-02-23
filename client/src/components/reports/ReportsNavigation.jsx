import React from 'react';
import { 
  MessageSquare,
  Mail,
  UserX,
  BookOpen,
  ClipboardList,
  Calendar,
  BarChart3
} from 'lucide-react';

const ReportsNavigation = ({ config, activeSection, onSectionChange }) => {
  const allReportSections = [
    { id: 'enquiries', name: 'Enquiry Reports', icon: MessageSquare, color: 'from-blue-500 to-blue-600' },
    { id: 'student-attendance', name: 'Student Attendance Reports', icon: UserX, color: 'from-red-500 to-red-600' },
    { id: 'lecture-attendance', name: 'Lecture Attendance Reports', icon: BookOpen, color: 'from-orange-500 to-orange-600' },
    { id: 'attendance-reports', name: 'Attendance Reports', icon: BarChart3, color: 'from-indigo-500 to-indigo-600' },
    { id: 'examinations', name: 'Examination Reports', icon: ClipboardList, color: 'from-purple-500 to-purple-600' },
    { id: 'appointments', name: 'Appointment Reports', icon: Calendar, color: 'from-amber-500 to-amber-600' }
  ];

  // Filter sections based on user permissions
  const allowedSections = allReportSections.filter(section => 
    config?.allowedReports?.includes(section.id)
  );

  if (allowedSections.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6 text-center">
        <p className="text-gray-600">No report sections available for your role.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-200 mb-6 p-2">
      <div className="flex flex-wrap gap-2">
        {allowedSections.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;
          
          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                isActive 
                  ? `bg-gradient-to-r ${section.color} text-white shadow-lg` 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:block">{section.name}</span>
              <span className="sm:hidden">{section.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ReportsNavigation;
