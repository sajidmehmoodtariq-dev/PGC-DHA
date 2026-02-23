import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, Shield, Save, Eye, EyeOff, CreditCard, GraduationCap, BookOpen, Plus, Trash2, Award, Info } from 'lucide-react';
import { Button } from '../ui/button';
import { userAPI } from '../../services/api';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { usePermissions } from '../../hooks/usePermissions';
import PermissionGuard from '../PermissionGuard';
import { PERMISSIONS } from '../../utils/rolePermissions';
import { ENQUIRY_LEVELS } from '../../constants/enquiryLevels';

/**
 * User Form Component
 * Form for adding/editing users with role-based field visibility
 */
const UserForm = ({
  user = null,
  mode = 'create',
  allowedRoles = ['all'],
  restrictedFields = [],
  userType = null,
  onClose,
  onSave
}) => {
  const { toast } = useToast();
  const { userRole, can } = usePermissions();
  
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState([]);
  
  // Academic background data
  const [academicBackground, setAcademicBackground] = useState({
    matriculation: {
      percentage: '',
      passingYear: new Date().getFullYear(),
      board: '',
      subjects: []
    },
    intermediate: {
      percentage: '',
      passingYear: new Date().getFullYear(),
      board: '',
      subjects: []
    }
  });

  // Common subjects for matriculation
  const MATRICULATION_SUBJECTS = [
    'Mathematics',
    'Physics', 
    'Chemistry',
    'Biology',
    'English',
    'Urdu',
    'Islamiat',
    'Pakistan Studies',
    'Computer Science',
    'Economics',
    'Accounting',
    'Business Studies'
  ];

  // Common subjects for intermediate (11th/12th)
  const INTERMEDIATE_SUBJECTS = [
    'Mathematics',
    'Physics',
    'Chemistry', 
    'Biology',
    'English',
    'Urdu',
    'Islamiat',
    'Pakistan Studies',
    'Computer Science',
    'Economics',
    'Statistics',
    'Psychology',
    'Sociology',
    'Philosophy'
  ];
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    fatherName: '',
    cnic: '',
    gender: '',
    email: '',
    password: '',
    phoneNumber: '',
    secondaryPhone: '',  // Updated from mobileNumber
    role: '',
    program: '',
    dateOfBirth: '',
    address: '',
    reference: '',
    emergencyContact: '',
    previousSchool: '',  // Previous school/college name
    matricMarks: '',     // Updated from matriculationObtainedMarks
    matricTotal: '',     // Updated from matriculationTotalMarks
    status: 'active',
    enquiryLevel: 1,     // New field for enquiry levels
    admissionInfo: {     // Additional info for Level 5 students
      grade: '',
      className: ''
    },
    coordinatorGrade: '', // For coordinator role assignment
    coordinatorCampus: '' // For coordinator role assignment
  });

  const [errors, setErrors] = useState({});

  // Load classes for Level 5 students
  const loadClasses = async () => {
    try {
      const response = await userAPI.get('/classes');
      console.log('Classes API response:', response);
      // Handle different possible response structures
      const classesData = response.data?.classes || response.classes || response.data || [];
      setClasses(classesData);
    } catch (error) {
      console.error('Error loading classes:', error);
      // Don't show error to user, just set empty array
      setClasses([]);
    }
  };

  // Initialize form data
  useEffect(() => {
    // Load classes when component mounts
    loadClasses();

    if (user && mode !== 'create') {
      setFormData({
        firstName: user.fullName?.firstName || user.firstName || '',
        lastName: user.fullName?.lastName || user.lastName || '',
        fatherName: user.fatherName || '',
        cnic: user.cnic || '',
        gender: user.gender || '',
        email: user.email || '',
        password: '', // Don't prefill password for security
        phoneNumber: user.phoneNumber || user.phoneNumbers?.primary || '',
        secondaryPhone: user.secondaryPhone || user.mobileNumber || user.phoneNumbers?.secondary || '',
        role: user.role || '',
        program: user.program || '',
        dateOfBirth: user.dateOfBirth || user.dob ? new Date(user.dateOfBirth || user.dob).toISOString().split('T')[0] : '',
        address: user.address || '',
        reference: user.reference || '',
        emergencyContact: user.emergencyContact?.phone || user.emergencyContact || '',
        previousSchool: user.previousSchool || '',
        matricMarks: user.matricMarks || user.matriculationObtainedMarks || '',
        matricTotal: user.matricTotal || user.matriculationTotalMarks || '',
        status: user.status === 1 ? 'active' : user.status === 2 ? 'inactive' : 'pending',
        enquiryLevel: user.enquiryLevel || 1,
        admissionInfo: {
          grade: user.admissionInfo?.grade || '',
          className: user.admissionInfo?.className || ''
        },
        coordinatorGrade: user.coordinatorAssignment?.grade || '',
        coordinatorCampus: user.coordinatorAssignment?.campus || ''
      });

      // Load academic background data if available
      if (user.academicBackground) {
        setAcademicBackground(user.academicBackground);
      } else {
        // Reset academic background for editing mode if no data
        setAcademicBackground({
          matriculation: {
            percentage: '',
            passingYear: new Date().getFullYear(),
            board: '',
            subjects: []
          },
          intermediate: {
            percentage: '',
            passingYear: new Date().getFullYear(),
            board: '',
            subjects: []
          }
        });
      }
    } else {
      // For create mode, set default role based on userType or permissions
      const defaultRole = userType === 'student' ? 'Student' : (userRole === 'Receptionist') ? 'Student' : '';
      setFormData(prev => ({ ...prev, role: defaultRole }));
      
      // Reset academic background for create mode
      setAcademicBackground({
        matriculation: {
          percentage: '',
          passingYear: new Date().getFullYear(),
          board: '',
          subjects: []
        },
        intermediate: {
          percentage: '',
          passingYear: new Date().getFullYear(),
          board: '',
          subjects: []
        }
      });
    }
  }, [user, mode, userRole, userType]);

  // Clear class selection when program or gender changes to avoid mismatches
  useEffect(() => {
    if (formData.admissionInfo.className && (formData.program || formData.gender)) {
      // Check if the currently selected class matches the program and gender
      const selectedClass = classes.find(cls => cls.name === formData.admissionInfo.className);
      if (selectedClass) {
        const programMismatch = formData.program && selectedClass.program !== formData.program;
        const genderMismatch = formData.gender && 
          ((formData.gender === 'Male' && selectedClass.campus !== 'Boys') ||
           (formData.gender === 'Female' && selectedClass.campus !== 'Girls'));
        
        if (programMismatch || genderMismatch) {
          // Clear the class selection if it doesn't match the program or gender
          setFormData(prev => ({
            ...prev,
            admissionInfo: {
              ...prev.admissionInfo,
              className: ''
            }
          }));
          
          const reason = programMismatch ? 'program change' : 'gender change';
          toast.warning(`Class selection cleared due to ${reason}. Please select a compatible class.`);
        }
      }
    }
  }, [formData.program, formData.gender, formData.admissionInfo.className, classes, toast]);

  // Get available roles based on permissions
  const getAvailableRoles = () => {
    // If userType is student, only allow Student role
    if (userType === 'student') {
      return [
        { value: 'Student', label: 'Student' }
      ];
    }

    if (allowedRoles.includes('all')) {
      return [
        { value: '', label: 'Select Role' },
        { value: 'Teacher', label: 'Teacher' },
        { value: 'Coordinator', label: 'Coordinator' },
        { value: 'IT', label: 'IT' },
        { value: 'Receptionist', label: 'Receptionist' },
        { value: 'Staff', label: 'Staff' },
        { value: 'InstituteAdmin', label: 'Institute Admin' },
        { value: 'Principal', label: 'Principal' }
      ];
    }

    // For limited roles - exclude Student from regular user management
    const roleMap = {
      'Teacher': { value: 'Teacher', label: 'Teacher' },
      'Coordinator': { value: 'Coordinator', label: 'Coordinator' },
      'IT': { value: 'IT', label: 'IT' },
      'Receptionist': { value: 'Receptionist', label: 'Receptionist' },
      'Staff': { value: 'Staff', label: 'Staff' }
    };

    const availableRoles = [{ value: '', label: 'Select Role' }];
    allowedRoles.forEach(role => {
      if (roleMap[role]) {
        availableRoles.push(roleMap[role]);
      }
    });

    return availableRoles;
  };

  const getAvailablePrograms = () => {
    return [
      { value: '', label: 'Select Program' },
      { value: 'ICS-PHY', label: 'ICS-PHY (Computer Science with Physics)' },
      { value: 'ICS-STAT', label: 'ICS-STAT (Computer Science with Statistics)' },
      { value: 'ICOM', label: 'ICOM (Commerce)' },
      { value: 'Pre Engineering', label: 'Pre Engineering' },
      { value: 'Pre Medical', label: 'Pre Medical' },
      { value: 'FA', label: 'FA (Faculty of Arts)' },
      { value: 'FA IT', label: 'FA IT (Faculty of Arts - Information Technology)' },
      { value: 'General Science', label: 'General Science' }
    ];
  };

  // Get available grades for Level 5 students
  const getAvailableGrades = () => {
    return [
      { value: '', label: 'Select Grade' },
      { value: '11th', label: '11th Grade' },
      { value: '12th', label: '12th Grade' }
    ];
  };

  // Check if current role is student
  const isStudentRole = () => {
    return formData.role === 'Student' || (userRole === 'Receptionist' && allowedRoles.includes('Student'));
  };

  // Check if current role is coordinator
  const isCoordinatorRole = () => {
    return formData.role === 'Coordinator';
  };

  // Check if user can create users
  const canCreateUser = () => {
    return can(PERMISSIONS.USER_MANAGEMENT.ADD_ANY_USER) ||
      can(PERMISSIONS.USER_MANAGEMENT.ADD_STUDENT) ||
      can(PERMISSIONS.USER_MANAGEMENT.ADD_TEACHER) ||
      can(PERMISSIONS.USER_MANAGEMENT.ADD_STAFF);
  };

  // Check if field should be shown
  const shouldShowField = (fieldName) => {
    if (restrictedFields.includes(fieldName)) {
      return false;
    }

    // For student management, hide role field (auto-set to Student)
    if (fieldName === 'role' && userType === 'student') {
      return false;
    }

    // For receptionist, hide role field if only Student is allowed
    if (fieldName === 'role' && userRole === 'Receptionist' && allowedRoles.length === 1 && allowedRoles[0] === 'Student') {
      return false;
    }

    // For IT users, hide role field when creating students (auto-set to Student)
    if (fieldName === 'role' && userRole === 'IT' && mode === 'create' && formData.role === 'Student') {
      return false;
    }

    return true;
  };

  // Academic background helper functions
  const addSubject = (level) => {
    const newSubject = {
      name: '',
      obtainedMarks: '',
      totalMarks: ''
    };
    
    setAcademicBackground(prev => {
      const updated = {
        ...prev,
        [level]: {
          ...prev[level],
          subjects: [...prev[level].subjects, newSubject]
        }
      };
      return updated;
    });
  };

  const removeSubject = (level, index) => {
    setAcademicBackground(prev => {
      const updated = {
        ...prev,
        [level]: {
          ...prev[level],
          subjects: prev[level].subjects.filter((_, i) => i !== index)
        }
      };
      // Auto-calculate percentage after removing subject
      updated[level].percentage = calculatePercentage(level, updated);
      return updated;
    });
  };

  const updateSubject = (level, index, field, value) => {
    setAcademicBackground(prev => {
      const updated = {
        ...prev,
        [level]: {
          ...prev[level],
          subjects: prev[level].subjects.map((subject, i) => 
            i === index ? { ...subject, [field]: value } : subject
          )
        }
      };
      // Auto-calculate percentage when marks change
      if (field === 'obtainedMarks' || field === 'totalMarks') {
        updated[level].percentage = calculatePercentage(level, updated);
      }
      return updated;
    });
  };

  const handleAcademicBackgroundChange = (field, value) => {
    const fieldParts = field.split('.');
    if (fieldParts.length === 2) {
      const [section, subField] = fieldParts;
      setAcademicBackground(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subField]: value
        }
      }));
    }
  };

  // Updated calculatePercentage to work with the data structure
  const calculatePercentage = (level, data = academicBackground) => {
    const subjects = data[level].subjects;
    if (subjects.length === 0) return '';
    
    const totalObtained = subjects.reduce((sum, subject) => {
      return sum + (parseFloat(subject.obtainedMarks) || 0);
    }, 0);
    
    const totalMaxMarks = subjects.reduce((sum, subject) => {
      return sum + (parseFloat(subject.totalMarks) || 0);
    }, 0);
    
    if (totalMaxMarks === 0) return '';
    
    const percentage = ((totalObtained / totalMaxMarks) * 100).toFixed(2);
    return percentage;
  };

  // Check if academic data exists and has content
  const hasAcademicData = () => {
    const matricHasData = academicBackground.matriculation.percentage || 
                         academicBackground.matriculation.subjects.length > 0 ||
                         academicBackground.matriculation.board;
    
    // Only check intermediate data for 12th grade students
    const interHasData = formData.admissionInfo?.grade === '12th' ? (
      academicBackground.intermediate.percentage || 
      academicBackground.intermediate.subjects.length > 0 ||
      academicBackground.intermediate.board
    ) : false;
    
    return matricHasData || interHasData;
  };

  // Save academic background using the dedicated academic records endpoint
  const saveAcademicBackground = async (studentId) => {
    try {
      // Prepare academic records data in the format expected by the server
      const academicRecords = {};

      // Process matriculation data
      if (academicBackground.matriculation.percentage || 
          academicBackground.matriculation.subjects.length > 0 ||
          academicBackground.matriculation.board) {
        
        const validMatricSubjects = academicBackground.matriculation.subjects.filter(subject => 
          subject.name && subject.obtainedMarks && subject.totalMarks
        ).map(subject => ({
          name: subject.name.trim(),
          totalMarks: Number(subject.totalMarks),
          obtainedMarks: Number(subject.obtainedMarks),
          percentage: subject.totalMarks > 0 ? 
            ((Number(subject.obtainedMarks) / Number(subject.totalMarks)) * 100).toFixed(2) : 0
        }));

        academicRecords.matriculation = {
          percentage: academicBackground.matriculation.subjects.length > 0 ? 
            calculatePercentage('matriculation') : academicBackground.matriculation.percentage,
          passingYear: academicBackground.matriculation.passingYear || undefined,
          board: academicBackground.matriculation.board || undefined,
          subjects: validMatricSubjects
        };
      }

      // Process intermediate data (map to previousGrade) - only for 12th grade students
      if (formData.admissionInfo?.grade === '12th' && (
          academicBackground.intermediate.percentage || 
          academicBackground.intermediate.subjects.length > 0 ||
          academicBackground.intermediate.board)) {
        
        const validInterSubjects = academicBackground.intermediate.subjects.filter(subject => 
          subject.name && subject.obtainedMarks && subject.totalMarks
        ).map(subject => ({
          name: subject.name.trim(),
          totalMarks: Number(subject.totalMarks),
          obtainedMarks: Number(subject.obtainedMarks),
          percentage: subject.totalMarks > 0 ? 
            ((Number(subject.obtainedMarks) / Number(subject.totalMarks)) * 100).toFixed(2) : 0,
          term: 'Annual' // Default term for intermediate
        }));

        // Only create previousGrade if we have actual data
        if (academicBackground.intermediate.percentage || validInterSubjects.length > 0) {
          academicRecords.previousGrade = {
            grade: '10th', // If the student is in 11th/12th, their previous grade is 10th (matriculation level)
            percentage: academicBackground.intermediate.subjects.length > 0 ? 
              calculatePercentage('intermediate') : academicBackground.intermediate.percentage,
            academicYear: academicBackground.intermediate.passingYear ? 
              `${academicBackground.intermediate.passingYear-1}-${academicBackground.intermediate.passingYear}` : undefined,
            subjects: validInterSubjects
          };
          
          // Clean up undefined fields
          if (!academicRecords.previousGrade.academicYear) {
            delete academicRecords.previousGrade.academicYear;
          }
        }
      }

      // Only save if there's actual data
      if (Object.keys(academicRecords).length > 0) {
        console.log('Saving academic records:', academicRecords);
        
        const response = await api.patch(`/students/${studentId}/academic-records`, {
          academicRecords
        });
        
        if (response.data.success) {
          console.log('Academic background saved successfully');
        } else {
          throw new Error(response.data.message || 'Failed to save academic background');
        }
      } else {
        console.log('No academic data to save');
      }
    } catch (error) {
      console.error('Error in saveAcademicBackground:', error);
      throw error;
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate permissions - check if user can create users based on their role
    if (mode === 'create') {
      const canCreateUser = can(PERMISSIONS.USER_MANAGEMENT.ADD_ANY_USER) ||
        can(PERMISSIONS.USER_MANAGEMENT.ADD_STUDENT) ||
        can(PERMISSIONS.USER_MANAGEMENT.ADD_TEACHER) ||
        can(PERMISSIONS.USER_MANAGEMENT.ADD_STAFF);

      if (!canCreateUser) {
        toast.error('You don\'t have permission to create users');
        return;
      }
    }

    if (mode === 'edit' && !can(PERMISSIONS.USER_MANAGEMENT.EDIT_USERS)) {
      toast.error('You don\'t have permission to edit users');
      return;
    }

    // Validate form
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = isStudentRole() ? 'Student name is required' : 'First name is required';
    }

    // For all roles, ensure we have a last name (for students, we'll use father name as fallback)
    if (!isStudentRole() && !formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!formData.role && shouldShowField('role')) newErrors.role = 'Role is required';

    // Password validation for non-student roles
    if (!isStudentRole()) {
      if (mode === 'create' && !formData.password.trim()) {
        newErrors.password = 'Password is required';
      }
      if (formData.password && formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }

    // Additional validation for students
    if (isStudentRole()) {
      if (!formData.fatherName.trim()) newErrors.fatherName = 'Father name is required';
      if (!formData.gender) newErrors.gender = 'Gender is required';
      if (!formData.program) newErrors.program = 'Program is required';
      if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';

      // Grade validation for Level 5 students (officially admitted)
      if (formData.enquiryLevel >= 5) {
        if (!formData.admissionInfo.grade) {
          newErrors['admissionInfo.grade'] = 'Grade is required for admitted students';
        }
        if (formData.admissionInfo.grade && (!formData.admissionInfo.className || !formData.program || !formData.gender)) {
          if (!formData.program) {
            newErrors['program'] = 'Program is required for class assignment';
          }
          if (!formData.gender) {
            newErrors['gender'] = 'Gender is required for class assignment';  
          }
          if (!formData.admissionInfo.className) {
            newErrors['admissionInfo.className'] = 'Class assignment is required for admitted students';
          }
        }
      }
    }

    // Additional validation for coordinators
    if (isCoordinatorRole()) {
      if (!formData.coordinatorGrade) newErrors.coordinatorGrade = 'Grade assignment is required for coordinators';
      if (!formData.coordinatorCampus) newErrors.coordinatorCampus = 'Campus assignment is required for coordinators';
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // CNIC validation for all users
    if (formData.cnic) {
      const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
      if (!cnicRegex.test(formData.cnic)) {
        newErrors.cnic = 'CNIC must be in format: 12345-1234567-1';
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);

      // Show a helpful message about what's missing
      const missingFields = Object.keys(newErrors);
      const fieldLabels = {
        firstName: isStudentRole() ? 'Student Name' : 'First Name',
        lastName: 'Last Name',
        email: 'Email',
        role: 'Role',
        fatherName: 'Father Name',
        cnic: 'CNIC',
        gender: 'Gender',
        program: 'Program',
        phoneNumber: 'Phone Number',
        enquiryLevel: 'Enquiry Level',
        'admissionInfo.grade': 'Grade',
        'admissionInfo.className': 'Class Assignment'
      };

      const missingFieldNames = missingFields.map(field => fieldLabels[field] || field);
      toast.error(`Please fill in the following required fields: ${missingFieldNames.join(', ')}`);

      return;
    }

    setLoading(true);
    setErrors({});

    try {
      let response;
      const submitData = { ...formData };

      // For students, use father name as last name if lastName is empty
      if (isStudentRole() && !submitData.lastName && submitData.fatherName) {
        submitData.lastName = submitData.fatherName;
      }

      // Set default role for receptionist or IT if not shown
      if (!shouldShowField('role') && (userRole === 'Receptionist' || userRole === 'IT')) {
        submitData.role = 'Student';
      }

      // For edit mode, structure the data properly for the server
      if (mode === 'edit') {
        // For students, use father name as last name if lastName is empty
        if (isStudentRole() && !submitData.lastName && submitData.fatherName) {
          submitData.lastName = submitData.fatherName;
        }

        // Ensure both firstName and lastName are present
        if (!submitData.firstName || !submitData.lastName) {
          if (isStudentRole()) {
            submitData.firstName = submitData.firstName || 'Student';
            submitData.lastName = submitData.lastName || submitData.fatherName || 'Name';
          }
        }
        // Remove admissionInfo.grade for non-student users
        if (!isStudentRole() && submitData.admissionInfo && ('grade' in submitData.admissionInfo)) {
          delete submitData.admissionInfo.grade;
        }
      }

      // For create mode, ensure required fields are present
      if (mode === 'create') {
        // For students, use father name as last name if lastName is empty
        if (isStudentRole() && !submitData.lastName && submitData.fatherName) {
          submitData.lastName = submitData.fatherName;
        }

        // Ensure firstName and lastName are not empty
        if (!submitData.firstName || !submitData.lastName) {
          if (isStudentRole()) {
            submitData.firstName = submitData.firstName || 'Student';
            submitData.lastName = submitData.lastName || submitData.fatherName || 'Name';
          } else {
            // For non-student roles, ensure we have proper names
            if (!submitData.firstName) {
              toast.error('First name is required');
              return;
            }
            if (!submitData.lastName) {
              toast.error('Last name is required');
              return;
            }
          }
        }
        // Remove admissionInfo.grade for non-student users
        if (!isStudentRole() && submitData.admissionInfo && ('grade' in submitData.admissionInfo)) {
          delete submitData.admissionInfo.grade;
        }
      }

      // Filter out student-specific fields for non-student roles
      if (!isStudentRole()) {
        delete submitData.program;
        delete submitData.matricMarks;
        delete submitData.matricTotal;
        delete submitData.previousSchool;
        // Keep general fields that might be useful for all roles
      }

      // Add academic background data for students
      if (isStudentRole() && academicBackground) {
        // Don't include academic data in main user creation/update
        // We'll handle it separately via the academic records endpoint
        console.log('Academic background data will be saved separately');
      }

      console.log('Submitting data:', submitData);

      if (mode === 'create') {
        response = await userAPI.createUser(submitData);
      } else if (mode === 'edit') {
        response = await userAPI.updateUser(user._id, submitData);
      }

      if (response.success) {
        // For students, sync enquiry level to students endpoint only if it has changed
        if (isStudentRole() && submitData.enquiryLevel && (user?._id || response.data?.user?._id)) {
          try {
            const studentId = user?._id || response.data.user._id;
            const currentLevel = user?.enquiryLevel || user?.prospectusStage;
            
            // Only sync if the level has actually changed
            if (currentLevel !== submitData.enquiryLevel) {
              const levelResponse = await api.put(`/students/${studentId}/level`, {
                level: submitData.enquiryLevel,
                notes: `Level updated from user ${mode === 'create' ? 'creation' : 'edit'} form`
              });
              
              if (levelResponse.data.success) {
                if (levelResponse.data.data?.unchanged) {
                  console.log('Level sync confirmed - student was already at the correct level');
                } else {
                  console.log('Successfully synced enquiry level to students endpoint');
                }
              }
            } else {
              console.log('Level unchanged, skipping sync to students endpoint');
            }
          } catch (levelUpdateError) {
            console.warn('Failed to sync enquiry level to students endpoint:', levelUpdateError);
            // Don't fail the whole operation for this
          }
        }

        toast.success(`User ${mode === 'create' ? 'created' : 'updated'} successfully`);
        
        // Check if it's a new student with class assignment
        if (mode === 'create' && isStudentRole() && submitData.admissionInfo?.className) {
          const createdStudent = response.data.user || response.data;
          
          // Find the class by name to get its ID
          try {
            const selectedClass = classes.find(cls => cls.name === submitData.admissionInfo.className);
            if (selectedClass) {
              console.log('Assigning student to class:', selectedClass.name, selectedClass._id);
              
              // Call the assign-class API
              const assignResponse = await api.post(`/students/${createdStudent._id}/assign-class`, {
                classId: selectedClass._id,
                grade: submitData.admissionInfo.grade,
                program: submitData.program
              });
              
              if (assignResponse.data.success) {
                console.log('Student successfully assigned to class');
                toast.success(`Student assigned to ${selectedClass.name} successfully`);
              } else {
                console.error('Failed to assign student to class:', assignResponse.data.message);
                toast.error('Student created but class assignment failed. Please assign manually.');
              }
            } else {
              console.error('Selected class not found in available classes');
              toast.error('Student created but class assignment failed. Please assign manually.');
            }
          } catch (assignError) {
            console.error('Error assigning student to class:', assignError);
            toast.error('Student created but class assignment failed. Please assign manually.');
          }
          
          // Save academic background data separately if user is a student
          if (isStudentRole() && response.data.user && hasAcademicData()) {
            try {
              await saveAcademicBackground(response.data.user._id);
              toast.success('Academic background saved successfully');
            } catch (academicError) {
              console.error('Error saving academic background:', academicError);
              // Show more specific error message
              toast.warning('Student created but academic background could not be saved. Please add it later.');
            }
          }
          
          onSave(); // Close the form and refresh the list
        } else {
          // For existing users or students without class assignment
          // Save academic background data separately if user is a student  
          if (isStudentRole() && response.data && hasAcademicData()) {
            try {
              const userId = response.data.user?._id || response.data._id || user?._id;
              if (userId) {
                await saveAcademicBackground(userId);
                toast.success('Academic background saved successfully');
              }
            } catch (academicError) {
              console.error('Error saving academic background:', academicError);
              // Show more specific error message
              toast.warning('User updated but academic background could not be saved. Please add it later.');
            }
          }
          onSave();
        }
      } else {
        console.error('User creation/update failed:', response);
        toast.error(response.message || `Failed to ${mode} user`);
      }
    } catch (error) {
      console.error(`${mode} user error:`, error);

      // More detailed error logging
      if (error.response?.data) {
        console.error('Server response:', error.response.data);
        toast.error(error.response.data.message || `Failed to ${mode} user`);
      } else {
        toast.error(`Failed to ${mode} user. Please try again.`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Handle nested admissionInfo fields
    if (name.startsWith('admissionInfo.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        admissionInfo: {
          ...prev.admissionInfo,
          [field]: value
        }
      }));
    } else {
      // If role is changing, clear coordinator fields if not coordinator
      if (name === 'role') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          // Clear coordinator fields if role is not Coordinator
          coordinatorGrade: value === 'Coordinator' ? prev.coordinatorGrade : '',
          coordinatorCampus: value === 'Coordinator' ? prev.coordinatorCampus : ''
        }));
      } else if (name === 'enquiryLevel') {
        // If enquiry level is changing to below 5, clear admission info
        const newLevel = parseInt(value);
        setFormData(prev => ({
          ...prev,
          [name]: newLevel,
          // Clear admission info if level drops below 5
          admissionInfo: {
            ...prev.admissionInfo,
            grade: newLevel >= 5 ? prev.admissionInfo.grade : '',
            className: newLevel >= 5 ? prev.admissionInfo.className : ''
          }
        }));
      } else {
        setFormData(prev => ({ ...prev, [name]: value }));
      }
    }

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Clear admission info errors when enquiry level changes
    if (name === 'enquiryLevel' && parseInt(e.target.value) < 5) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors['admissionInfo.grade'];
        return newErrors;
      });
    }
  };

  const isReadOnly = mode === 'view';

  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-start justify-center z-50 p-4 mt-8 pt-8">
      <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-border/50 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform transition-all duration-200 mt-[-400px]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 ">
          <div className="flex items-center gap-3">
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${mode === 'create' ? 'bg-green-100 text-green-600' :
              mode === 'edit' ? 'bg-blue-100 text-blue-600' :
                'bg-gray-100 text-gray-600'
              }`}>
              {mode === 'view' ? <Eye className="h-5 w-5" /> : <User className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {mode === 'create' && 'Add New User'}
                {mode === 'edit' && 'Edit User'}
                {mode === 'view' && 'User Details'}
              </h2>
              <p className="text-sm text-gray-600">
                {mode === 'create' && 'Fill in the details to create a new user'}
                {mode === 'edit' && 'Update user information'}
                {mode === 'view' && 'View user information'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Selection - Only for create mode */}
            {mode === 'create' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  required
                  disabled={userType === 'student'}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${
                    userType === 'student' ? 'bg-gray-100 cursor-not-allowed' : ''
                  } ${errors.role ? 'border-red-300' : 'border-gray-300'}`}
                >
                  {getAvailableRoles().map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
                {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                {userType === 'student' && (
                  <p className="text-gray-500 text-xs mt-1">Role is automatically set to Student</p>
                )}
              </div>
            )}

            {/* Only show the rest of the form if a role is selected (for create mode) */}
            {(mode !== 'create' || formData.role) && (
              <>
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      readOnly={isReadOnly}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.firstName ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                      placeholder="Enter first name"
                    />
                  </div>
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                {/* Last Name - Hidden for students */}
                {!isStudentRole() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.lastName ? 'border-red-300' : 'border-gray-300'
                          } ${isReadOnly ? 'bg-gray-50' : ''}`}
                        placeholder="Enter last name"
                      />
                    </div>
                    {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
                  </div>
                )}

                {/* Father Name, Gender, Program, Enquiry Level, etc. - Only for students */}
                {isStudentRole() && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Father Name *
                      </label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <input
                          type="text"
                          name="fatherName"
                          value={formData.fatherName}
                          onChange={handleInputChange}
                          readOnly={isReadOnly}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.fatherName ? 'border-red-300' : 'border-gray-300'
                            } ${isReadOnly ? 'bg-gray-50' : ''}`}
                          placeholder="Enter father name"
                        />
                      </div>
                      {errors.fatherName && <p className="text-red-500 text-xs mt-1">{errors.fatherName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Gender *
                      </label>
                      <select
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        disabled={isReadOnly}
                        className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.gender ? 'border-red-300' : 'border-gray-300'
                          } ${isReadOnly ? 'bg-gray-50' : ''}`}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                      {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                    </div>
                    {/* Program, Enquiry Level, etc. */}
                    {/* ...existing student fields... */}
                  </>
                )}

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      readOnly={isReadOnly}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.email ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                      placeholder="Enter email address"
                    />
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                {/* Password - Required for non-student roles */}
                {!isStudentRole() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password {mode === 'create' ? '*' : ''}
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.password ? 'border-red-300' : 'border-gray-300'
                          } ${isReadOnly ? 'bg-gray-50' : ''}`}
                        placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Enter password'}
                      />
                    </div>
                    {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                    {mode === 'edit' && (
                      <p className="text-gray-500 text-xs mt-1">Leave blank to keep current password</p>
                    )}
                  </div>
                )}

                {/* CNIC - Optional for all users */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    CNIC
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      name="cnic"
                      value={formData.cnic}
                      onChange={handleInputChange}
                      readOnly={isReadOnly}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.cnic ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                      placeholder="12345-1234567-1"
                    />
                  </div>
                  {errors.cnic && <p className="text-red-500 text-xs mt-1">{errors.cnic}</p>}
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number {isStudentRole() ? '*' : ''}
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="tel"
                      name="phoneNumber"
                      value={formData.phoneNumber}
                      onChange={handleInputChange}
                      readOnly={isReadOnly}
                      className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.phoneNumber ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                      placeholder="Enter phone number"
                    />
                  </div>
                  {errors.phoneNumber && <p className="text-red-500 text-xs mt-1">{errors.phoneNumber}</p>}
                </div>

                {/* Secondary Phone - Only for students */}
                {isStudentRole() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Secondary Phone
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <input
                        type="tel"
                        name="secondaryPhone"
                        value={formData.secondaryPhone}
                        onChange={handleInputChange}
                        readOnly={isReadOnly}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="Enter secondary phone number"
                      />
                    </div>
                  </div>
                )}

                {/* Program - Only for students */}
                {isStudentRole() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Program *
                    </label>
                    <select
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.program ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                    >
                      {getAvailablePrograms().map(program => (
                        <option key={program.value} value={program.value}>{program.label}</option>
                      ))}
                    </select>
                    {errors.program && <p className="text-red-500 text-xs mt-1">{errors.program}</p>}
                  </div>
                )}

                {/* Enquiry Level - Only for students */}
                {isStudentRole() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enquiry Level *
                    </label>
                    <select
                      name="enquiryLevel"
                      value={formData.enquiryLevel}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.enquiryLevel ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                    >
                      {ENQUIRY_LEVELS.map(level => (
                        <option key={level.id} value={level.id}>
                          Level {level.id} - {level.shortName}
                        </option>
                      ))}
                    </select>
                    {errors.enquiryLevel && <p className="text-red-500 text-xs mt-1">{errors.enquiryLevel}</p>}
                  </div>
                )}

                {/* Grade - Only for Level 5 students (officially admitted) */}
                {isStudentRole() && formData.enquiryLevel >= 5 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-2">
                        Grade *
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                          Admitted Student
                        </span>
                      </span>
                    </label>
                    <select
                      name="admissionInfo.grade"
                      value={formData.admissionInfo.grade}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors['admissionInfo.grade'] ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                    >
                      {getAvailableGrades().map(grade => (
                        <option key={grade.value} value={grade.value}>{grade.label}</option>
                      ))}
                    </select>
                    {errors['admissionInfo.grade'] && <p className="text-red-500 text-xs mt-1">{errors['admissionInfo.grade']}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      This field is required for students who have been officially admitted (Level 5)
                    </p>
                  </div>
                )}

                {/* Class Assignment - Only for Level 5 students with grade, program and gender selected */}
                {isStudentRole() && formData.enquiryLevel >= 5 && formData.admissionInfo.grade && formData.program && formData.gender && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <span className="flex items-center gap-2">
                        Class Assignment *
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                          Grade {formData.admissionInfo.grade}
                        </span>
                      </span>
                    </label>
                    <select
                      name="admissionInfo.className"
                      value={formData.admissionInfo.className}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors['admissionInfo.className'] ? 'border-red-300' : 'border-gray-300'
                        } ${isReadOnly ? 'bg-gray-50' : ''}`}
                    >
                      <option value="">Select Class</option>
                      {classes
                        .filter(cls => {
                          // Filter by grade and program
                          const matchesGradeAndProgram = cls.grade === formData.admissionInfo.grade && 
                                                        cls.program === formData.program;
                          
                          // Filter by gender/campus if gender is selected
                          let matchesGender = true;
                          if (formData.gender) {
                            const requiredCampus = formData.gender === 'Male' ? 'Boys' : 'Girls';
                            matchesGender = cls.campus === requiredCampus;
                          }
                          
                          return matchesGradeAndProgram && matchesGender;
                        })
                        .map(cls => (
                          <option key={cls._id} value={cls.name}>
                            {cls.name} - {cls.campus} Campus ({cls.capacity ? `${cls.enrolled || 0}/${cls.capacity} students` : 'No capacity limit'})
                          </option>
                        ))}
                    </select>
                    {errors['admissionInfo.className'] && <p className="text-red-500 text-xs mt-1">{errors['admissionInfo.className']}</p>}
                    <p className="text-xs text-gray-500 mt-1">
                      Select a class for the admitted student based on their grade, program ({formData.program || 'No program selected'}) and gender ({formData.gender || 'No gender selected'})
                    </p>
                  </div>
                )}

                {/* Previous School - Only for students */}
                {isStudentRole() && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Previous School
                    </label>
                    <input
                      type="text"
                      name="previousSchool"
                      value={formData.previousSchool}
                      onChange={handleInputChange}
                      readOnly={isReadOnly}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isReadOnly ? 'bg-gray-50' : ''
                        }`}
                      placeholder="Enter previous school name"
                    />
                  </div>
                )}

                {/* Academic Background - Only for students - Full width */}
                {isStudentRole() && (
                  <div className="col-span-2 space-y-6 p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center gap-2 mb-4">
                      <GraduationCap className="h-5 w-5 text-primary" />
                      <h4 className="font-medium text-gray-900">Academic Background</h4>
                    </div>
                    
                    {/* Matriculation Section */}
                    <div className="space-y-4 p-4 bg-white rounded-lg border">
                      <h5 className="font-medium text-gray-800 flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        Matriculation (10th Grade)
                      </h5>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Percentage
                            {academicBackground.matriculation.subjects.length > 0 && (
                              <span className="text-xs text-green-600 ml-1">(Auto-calculated)</span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={
                              academicBackground.matriculation.subjects.length > 0 
                                ? calculatePercentage('matriculation') 
                                : academicBackground.matriculation.percentage
                            }
                            onChange={(e) => {
                              if (academicBackground.matriculation.subjects.length === 0) {
                                handleAcademicBackgroundChange('matriculation.percentage', e.target.value);
                              }
                            }}
                            placeholder="Enter percentage"
                            disabled={isReadOnly || academicBackground.matriculation.subjects.length > 0}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-gray-300 ${
                              academicBackground.matriculation.subjects.length > 0 ? 'bg-green-50' : ''
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passing Year
                          </label>
                          <input
                            type="number"
                            value={academicBackground.matriculation.passingYear}
                            onChange={(e) => handleAcademicBackgroundChange('matriculation.passingYear', parseInt(e.target.value))}
                            placeholder="Enter year"
                            disabled={isReadOnly}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Board/University
                          </label>
                          <input
                            type="text"
                            value={academicBackground.matriculation.board}
                            onChange={(e) => handleAcademicBackgroundChange('matriculation.board', e.target.value)}
                            placeholder="Enter board name"
                            disabled={isReadOnly}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-gray-300"
                          />
                        </div>
                      </div>

                      {/* Matriculation Subject-wise marks */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h6 className="text-sm font-medium text-gray-700">
                            Subject-wise Marks
                            {academicBackground.matriculation.subjects.length > 0 && (
                              <span className="text-xs text-gray-500 ml-2">- Percentage auto-calculated</span>
                            )}
                          </h6>
                          {!isReadOnly && (
                            <Button
                              type="button"
                              onClick={() => addSubject('matriculation')}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary hover:bg-primary/90"
                            >
                              <Plus className="h-3 w-3" />
                              Add Subject
                            </Button>
                          )}
                        </div>

                        {academicBackground.matriculation.subjects.map((subject, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                              <select
                                value={subject.name}
                                onChange={(e) => updateSubject('matriculation', index, 'name', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary border-gray-300"
                              >
                                <option value="">Select Subject</option>
                                {MATRICULATION_SUBJECTS.map(subjectName => (
                                  <option key={subjectName} value={subjectName}>{subjectName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Obtained</label>
                              <input
                                type="number"
                                value={subject.obtainedMarks}
                                onChange={(e) => updateSubject('matriculation', index, 'obtainedMarks', e.target.value)}
                                placeholder="Marks"
                                disabled={isReadOnly}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary border-gray-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                              <input
                                type="number"
                                value={subject.totalMarks}
                                onChange={(e) => updateSubject('matriculation', index, 'totalMarks', e.target.value)}
                                placeholder="Total"
                                disabled={isReadOnly}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary border-gray-300"
                              />
                            </div>
                            <div>
                              {!isReadOnly && (
                                <Button
                                  type="button"
                                  onClick={() => removeSubject('matriculation', index)}
                                  variant="outline"
                                  className="px-2 py-1.5 text-sm text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {academicBackground.matriculation.subjects.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            No matriculation subjects added.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Information message for 11th grade students */}
                    {formData.admissionInfo?.grade === '11th' && (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 text-blue-800">
                          <Info className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            For 11th Grade Students
                          </span>
                        </div>
                        <p className="text-sm text-blue-700 mt-1">
                          Intermediate (11th grade) academic records will be available once you complete your 11th grade. 
                          Currently, only matriculation (10th grade) records are required.
                        </p>
                      </div>
                    )}

                    {/* Intermediate Section - Only show for 12th grade students */}
                    {formData.admissionInfo?.grade === '12th' && (
                      <div className="space-y-4 p-4 bg-white rounded-lg border">
                        <h5 className="font-medium text-gray-800 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Intermediate (11th Grade - Previous Year)
                          <span className="text-xs text-gray-500 ml-2">(Only for 12th grade students)</span>
                        </h5>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Percentage
                            {academicBackground.intermediate.subjects.length > 0 && (
                              <span className="text-xs text-green-600 ml-1">(Auto-calculated)</span>
                            )}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={
                              academicBackground.intermediate.subjects.length > 0 
                                ? calculatePercentage('intermediate') 
                                : academicBackground.intermediate.percentage
                            }
                            onChange={(e) => {
                              if (academicBackground.intermediate.subjects.length === 0) {
                                handleAcademicBackgroundChange('intermediate.percentage', e.target.value);
                              }
                            }}
                            placeholder="Enter percentage"
                            disabled={isReadOnly || academicBackground.intermediate.subjects.length > 0}
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-gray-300 ${
                              academicBackground.intermediate.subjects.length > 0 ? 'bg-green-50' : ''
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Passing Year
                          </label>
                          <input
                            type="number"
                            value={academicBackground.intermediate.passingYear}
                            onChange={(e) => handleAcademicBackgroundChange('intermediate.passingYear', parseInt(e.target.value))}
                            placeholder="Enter year"
                            disabled={isReadOnly}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-gray-300"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Board/University
                          </label>
                          <input
                            type="text"
                            value={academicBackground.intermediate.board}
                            onChange={(e) => handleAcademicBackgroundChange('intermediate.board', e.target.value)}
                            placeholder="Enter board name"
                            disabled={isReadOnly}
                            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent border-gray-300"
                          />
                        </div>
                      </div>

                      {/* Intermediate Subject-wise marks */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h6 className="text-sm font-medium text-gray-700">
                            Subject-wise Marks
                            {academicBackground.intermediate.subjects.length > 0 && (
                              <span className="text-xs text-gray-500 ml-2">- Percentage auto-calculated</span>
                            )}
                          </h6>
                          {!isReadOnly && (
                            <Button
                              type="button"
                              onClick={() => addSubject('intermediate')}
                              className="flex items-center gap-1 px-2 py-1 text-xs bg-primary hover:bg-primary/90"
                            >
                              <Plus className="h-3 w-3" />
                              Add Subject
                            </Button>
                          )}
                        </div>

                        {academicBackground.intermediate.subjects.map((subject, index) => (
                          <div key={index} className="grid grid-cols-4 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Subject</label>
                              <select
                                value={subject.name}
                                onChange={(e) => updateSubject('intermediate', index, 'name', e.target.value)}
                                disabled={isReadOnly}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary border-gray-300"
                              >
                                <option value="">Select Subject</option>
                                {INTERMEDIATE_SUBJECTS.map(subjectName => (
                                  <option key={subjectName} value={subjectName}>{subjectName}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Obtained</label>
                              <input
                                type="number"
                                value={subject.obtainedMarks}
                                onChange={(e) => updateSubject('intermediate', index, 'obtainedMarks', e.target.value)}
                                placeholder="Marks"
                                disabled={isReadOnly}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary border-gray-300"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-medium text-gray-700 mb-1">Total</label>
                              <input
                                type="number"
                                value={subject.totalMarks}
                                onChange={(e) => updateSubject('intermediate', index, 'totalMarks', e.target.value)}
                                placeholder="Total"
                                disabled={isReadOnly}
                                className="w-full px-2 py-1.5 text-sm border rounded-md focus:ring-1 focus:ring-primary border-gray-300"
                              />
                            </div>
                            <div>
                              {!isReadOnly && (
                                <Button
                                  type="button"
                                  onClick={() => removeSubject('intermediate', index)}
                                  variant="outline"
                                  className="px-2 py-1.5 text-sm text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}

                        {academicBackground.intermediate.subjects.length === 0 && (
                          <p className="text-sm text-gray-500 text-center py-2">
                            No intermediate subjects added.
                          </p>
                        )}
                      </div>
                    </div>
                    )}
                  </div>
                )}

                {/* Role - Show only if allowed */}
                {shouldShowField('role') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Role *
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <select
                        name="role"
                        value={formData.role}
                        onChange={handleInputChange}
                        disabled={isReadOnly || userType === 'student'}
                        className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.role ? 'border-red-300' : 'border-gray-300'
                          } ${isReadOnly || userType === 'student' ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        {getAvailableRoles().map(role => (
                          <option key={role.value} value={role.value}>{role.label}</option>
                        ))}
                      </select>
                    </div>
                    {errors.role && <p className="text-red-500 text-xs mt-1">{errors.role}</p>}
                  </div>
                )}

                {/* Coordinator Assignment Fields - Only for Coordinator role */}
                {isCoordinatorRole() && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Coordinator Grade *
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <select
                          name="coordinatorGrade"
                          value={formData.coordinatorGrade}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.coordinatorGrade ? 'border-red-300' : 'border-gray-300'
                            } ${isReadOnly ? 'bg-gray-50' : ''}`}
                        >
                          <option value="">Select Grade</option>
                          <option value="11th">11th Grade</option>
                          <option value="12th">12th Grade</option>
                        </select>
                      </div>
                      {errors.coordinatorGrade && <p className="text-red-500 text-xs mt-1">{errors.coordinatorGrade}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Coordinator Campus *
                      </label>
                      <div className="relative">
                        <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                        <select
                          name="coordinatorCampus"
                          value={formData.coordinatorCampus}
                          onChange={handleInputChange}
                          disabled={isReadOnly}
                          className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${errors.coordinatorCampus ? 'border-red-300' : 'border-gray-300'
                            } ${isReadOnly ? 'bg-gray-50' : ''}`}
                        >
                          <option value="">Select Campus</option>
                          <option value="Boys">Boys Campus</option>
                          <option value="Girls">Girls Campus</option>
                        </select>
                      </div>
                      {errors.coordinatorCampus && <p className="text-red-500 text-xs mt-1">{errors.coordinatorCampus}</p>}
                    </div>
                  </>
                )}

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      readOnly={isReadOnly}
                      className={`w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isReadOnly ? 'bg-gray-50' : ''
                        }`}
                    />
                  </div>
                </div>

                {/* Status - Only for edit mode and if allowed */}
                {mode !== 'create' && !restrictedFields.includes('status') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      disabled={isReadOnly}
                      className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isReadOnly ? 'bg-gray-50' : ''
                        }`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="pending">Pending</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Address - Full width */}
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Address
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              readOnly={isReadOnly}
              rows="3"
              className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isReadOnly ? 'bg-gray-50' : ''
                }`}
              placeholder="Enter address"
            />
          </div>

          {/* Reference - Only for students */}
          {isStudentRole() && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reference
              </label>
              <input
                type="text"
                name="reference"
                value={formData.reference}
                onChange={handleInputChange}
                readOnly={isReadOnly}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isReadOnly ? 'bg-gray-50' : ''
                  }`}
                placeholder="Enter reference"
              />
            </div>
          )}

          {/* Emergency Contact - For non-students or rename for students */}
          {!isStudentRole() && (
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Emergency Contact
              </label>
              <input
                type="text"
                name="emergencyContact"
                value={formData.emergencyContact}
                onChange={handleInputChange}
                readOnly={isReadOnly}
                className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent ${isReadOnly ? 'bg-gray-50' : ''
                  }`}
                placeholder="Enter emergency contact"
              />
            </div>
          )}

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="px-6"
            >
              {mode === 'view' ? 'Close' : 'Cancel'}
            </Button>

            {!isReadOnly && (
              <Button
                type="submit"
                disabled={loading || (mode === 'create' && !canCreateUser()) || (mode === 'edit' && !can(PERMISSIONS.USER_MANAGEMENT.EDIT_USERS))}
                className="bg-gradient-to-r from-primary to-accent text-white hover:shadow-lg transition-all duration-200 px-6 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {loading ? 'Saving...' : (mode === 'create' ? 'Create User' : 'Save Changes')}
              </Button>
            )}
          </div>
        </form>
      </div>

    </div>
  );
};

export default UserForm;
