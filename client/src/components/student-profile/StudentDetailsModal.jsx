import React, { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, Mail, Calendar, GraduationCap, Building, Users, Star, BookOpen, MessageSquare, TrendingUp } from 'lucide-react';
import { Button } from '../ui/button';
import AttendanceTab from './AttendanceTab';
import ExaminationTab from './ExaminationTab';
import CorrespondenceTab from './CorrespondenceTab';

const StudentDetailsModal = ({ isOpen, onClose, student, className }) => {
  const [activeTab, setActiveTab] = useState('general');

  // Reset to general tab when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab('general');
    }
  }, [isOpen]);

  if (!isOpen || !student) return null;

  const tabs = [
    { id: 'general', label: 'General', icon: User },
    { id: 'attendance', label: 'Attendance', icon: Calendar },
    { id: 'examination', label: 'Examination', icon: BookOpen },
    { id: 'correspondence', label: 'Correspondence', icon: MessageSquare }
  ];

  const formatDate = (dateString) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStudentAge = () => {
    if (!student.personalInfo?.dateOfBirth) return 'Not specified';
    const dob = new Date(student.personalInfo.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return `${age} years`;
  };

  const renderGeneralTab = () => (
    <div className="space-y-6">
      {/* Student Header */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <div className="h-20 w-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">
              {`${student.fullName?.firstName?.[0] || ''}${student.fullName?.lastName?.[0] || ''}`}
            </span>
          </div>
          
          {/* Basic Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {student.fullName?.firstName} {student.fullName?.lastName}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <GraduationCap className="h-4 w-4 text-blue-500" />
                <span>{className}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Building className="h-4 w-4 text-blue-500" />
                <span>{student.campus}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Phone className="h-4 w-4 text-blue-500" />
                <span>{student.phoneNumber || 'Not provided'}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="h-4 w-4 text-blue-500" />
                <span>{student.email || 'Not provided'}</span>
              </div>
            </div>
          </div>
          
          {/* Status Badge */}
          <div className="flex flex-col gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Admitted Student
            </span>
            {student.prospectusStage === 5 && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Enrolled
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          Personal Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Full Name</label>
            <p className="text-gray-900 font-medium">
              {student.fullName?.firstName} {student.fullName?.lastName}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Date of Birth</label>
            <p className="text-gray-900">
              {formatDate(student.personalInfo?.dateOfBirth)}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Age</label>
            <p className="text-gray-900">{getStudentAge()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Gender</label>
            <p className="text-gray-900">{student.personalInfo?.gender || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">CNIC</label>
            <p className="text-gray-900">{student.personalInfo?.cnicNumber || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Religion</label>
            <p className="text-gray-900">{student.personalInfo?.religion || 'Not specified'}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Phone className="h-5 w-5 text-green-500" />
          Contact Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Primary Phone</label>
            <p className="text-gray-900">{student.phoneNumber || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Email Address</label>
            <p className="text-gray-900">{student.email || 'Not provided'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-gray-500">Address</label>
            <p className="text-gray-900">
              {student.personalInfo?.address || 'Not provided'}
            </p>
          </div>
        </div>
      </div>

      {/* Academic Information */}
      <div className="bg-white border rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-purple-500" />
          Academic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div>
            <label className="text-sm font-medium text-gray-500">Campus</label>
            <p className="text-gray-900 font-medium">{student.campus}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Program</label>
            <p className="text-gray-900">{student.program || student.admissionInfo?.program || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Grade/Level</label>
            <p className="text-gray-900">{student.admissionInfo?.grade || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Class</label>
            <p className="text-gray-900 font-medium">{className}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Student ID</label>
            <p className="text-gray-900 font-mono text-sm">{student._id}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Admission Date</label>
            <p className="text-gray-900">{formatDate(student.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Guardian Information */}
      {(student.guardianInfo?.fatherName || student.guardianInfo?.motherName) && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-orange-500" />
            Guardian Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {student.guardianInfo?.fatherName && (
              <div>
                <label className="text-sm font-medium text-gray-500">Father's Name</label>
                <p className="text-gray-900">{student.guardianInfo.fatherName}</p>
                {student.guardianInfo?.fatherPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    <Phone className="h-3 w-3 inline mr-1" />
                    {student.guardianInfo.fatherPhone}
                  </p>
                )}
              </div>
            )}
            {student.guardianInfo?.motherName && (
              <div>
                <label className="text-sm font-medium text-gray-500">Mother's Name</label>
                <p className="text-gray-900">{student.guardianInfo.motherName}</p>
                {student.guardianInfo?.motherPhone && (
                  <p className="text-sm text-gray-600 mt-1">
                    <Phone className="h-3 w-3 inline mr-1" />
                    {student.guardianInfo.motherPhone}
                  </p>
                )}
              </div>
            )}
            {student.guardianInfo?.guardianOccupation && (
              <div>
                <label className="text-sm font-medium text-gray-500">Guardian Occupation</label>
                <p className="text-gray-900">{student.guardianInfo.guardianOccupation}</p>
              </div>
            )}
            {student.guardianInfo?.emergencyContact && (
              <div>
                <label className="text-sm font-medium text-gray-500">Emergency Contact</label>
                <p className="text-gray-900">{student.guardianInfo.emergencyContact}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Additional Information */}
      {(student.personalInfo?.previousSchool || student.personalInfo?.medicalInfo) && (
        <div className="bg-white border rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Additional Information
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {student.personalInfo?.previousSchool && (
              <div>
                <label className="text-sm font-medium text-gray-500">Previous School</label>
                <p className="text-gray-900">{student.personalInfo.previousSchool}</p>
              </div>
            )}
            {student.personalInfo?.medicalInfo && (
              <div>
                <label className="text-sm font-medium text-gray-500">Medical Information</label>
                <p className="text-gray-900">{student.personalInfo.medicalInfo}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-blue-100 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Student Profile</h2>
            <p className="text-gray-600">
              {student.fullName?.firstName} {student.fullName?.lastName} - {className}
            </p>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 font-medium text-sm border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 bg-white'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && renderGeneralTab()}
          {activeTab === 'attendance' && (
            <AttendanceTab studentId={student._id} />
          )}
          {activeTab === 'examination' && (
            <ExaminationTab studentId={student._id} />
          )}
          {activeTab === 'correspondence' && (
            <CorrespondenceTab studentId={student._id} studentName={`${student.fullName?.firstName} ${student.fullName?.lastName}`} />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50 rounded-b-2xl">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StudentDetailsModal;