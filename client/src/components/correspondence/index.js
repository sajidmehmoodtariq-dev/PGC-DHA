// Main correspondence component with role-based routing
export { default as CorrespondenceManagement } from './CorrespondenceManagement';

// Admin view (Principal/InstituteAdmin) - sees all correspondence + stats
export { default as AdminCorrespondenceManagement } from './AdminCorrespondenceManagement';

// Staff view (Teacher/Coordinator/Receptionist) - sees only own correspondence
export { default as StaffCorrespondenceManagement } from './StaffCorrespondenceManagement';

// Create new correspondence modal
export { default as CreateCorrespondenceModal } from './CreateCorrespondenceModal';
