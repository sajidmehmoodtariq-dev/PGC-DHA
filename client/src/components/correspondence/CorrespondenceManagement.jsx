import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import AdminCorrespondenceManagement from './AdminCorrespondenceManagement';
import StaffCorrespondenceManagement from './StaffCorrespondenceManagement';

const CorrespondenceManagement = () => {
  const { user } = useAuth();

  // Determine which component to show based on user role
  const isAdmin = user?.role === 'Principal' || user?.role === 'InstituteAdmin';
  
  if (isAdmin) {
    // Principal and InstituteAdmin see all correspondence + full stats
    return <AdminCorrespondenceManagement />;
  } else {
    // Teacher, Coordinator, Receptionist see only their own correspondence
    return <StaffCorrespondenceManagement />;
  }
};

export default CorrespondenceManagement;
