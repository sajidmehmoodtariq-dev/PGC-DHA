import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

const AnalyticsAccessContext = createContext();

export const useAnalyticsAccess = () => {
  const context = useContext(AnalyticsAccessContext);
  if (!context) {
    throw new Error('useAnalyticsAccess must be used within an AnalyticsAccessProvider');
  }
  return context;
};

export const AnalyticsAccessProvider = ({ children }) => {
  const { user } = useAuth();
  const [accessScope, setAccessScope] = useState({
    type: 'none',
    permissions: [],
    scope: {}
  });

  useEffect(() => {
    if (!user) {
      setAccessScope({ type: 'none', permissions: [], scope: {} });
      return;
    }

    const role = user.role;
    let scope = {};

    switch (role) {
      case 'Principal':
      case 'InstituteAdmin':
      case 'IT':
        scope = {
          type: 'full',
          permissions: ['view', 'export', 'manage', 'admin'],
          scope: { all: true }
        };
        break;

      case 'Coordinator':
        scope = {
          type: 'coordinator',
          permissions: ['view', 'export'],
          scope: {
            campus: user.coordinatorAssignment?.campus,
            grade: user.coordinatorAssignment?.grade
          }
        };
        break;

      case 'Teacher':
        scope = {
          type: 'classes',
          permissions: ['view', 'export'],
          scope: {
            classIds: user.assignedClasses?.map(cls => cls._id) || [],
            subjects: user.subjects || []
          }
        };
        break;

      default:
        scope = {
          type: 'none',
          permissions: [],
          scope: {}
        };
    }

    setAccessScope(scope);
  }, [user]);

  const hasPermission = (permission) => {
    return accessScope.permissions.includes(permission);
  };

  const canAccessCampus = (campus) => {
    if (accessScope.type === 'full') return true;
    if (accessScope.type === 'coordinator') {
      return accessScope.scope.campus === campus;
    }
    return false;
  };

  const canAccessGrade = (grade) => {
    if (accessScope.type === 'full') return true;
    if (accessScope.type === 'coordinator') {
      return accessScope.scope.grade === grade;
    }
    return false;
  };

  const canAccessClass = (classId) => {
    if (accessScope.type === 'full') return true;
    if (accessScope.type === 'classes') {
      return accessScope.scope.classIds.includes(classId);
    }
    if (accessScope.type === 'coordinator') {
      // Would need to check if class belongs to coordinator's campus/grade
      return true; // For now, assume yes if coordinator
    }
    return false;
  };

  const canAccessSubject = (subject) => {
    if (accessScope.type === 'full') return true;
    if (accessScope.type === 'classes') {
      return accessScope.scope.subjects.length === 0 || accessScope.scope.subjects.includes(subject);
    }
    return true; // Coordinators and others can access all subjects
  };

  const value = {
    accessScope,
    hasPermission,
    canAccessCampus,
    canAccessGrade,
    canAccessClass,
    canAccessSubject
  };

  return (
    <AnalyticsAccessContext.Provider value={value}>
      {children}
    </AnalyticsAccessContext.Provider>
  );
};
