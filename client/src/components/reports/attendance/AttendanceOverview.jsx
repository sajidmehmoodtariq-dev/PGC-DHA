import React, { useState } from 'react';
import { Calendar, Users, TrendingUp, Building, GraduationCap, Search } from 'lucide-react';
import { Button } from '../../ui/button';
import { useAuth } from '../../../hooks/useAuth';

// Import sub-components
import AttendanceStatsCards from './AttendanceStatsCards';
import FloorDistribution from './FloorDistribution';
import ProgramDistribution from './ProgramDistribution';
import ClassDistribution from './ClassDistribution';
import DateRangeSelector from './DateRangeSelector';
import StudentSearchPage from '../../attendance/StudentSearchPage';
import StudentDetailsModal from '../../attendance/StudentDetailsModal';
import AttendanceGlimpse from './AttendanceGlimpse';
import AttendanceGlimpseButton from './AttendanceGlimpseButton';

/**
 * Attendance Overview Component for Principal
 * Shows hierarchical view: Overall -> Campus -> Floor/Program -> Class
 */
const AttendanceOverview = ({
  attendanceData,
  classesData,
  selectedCampus,
  selectedFloor,
  selectedProgram,
  selectedClass,
  dateRange,
  onFilterChange,
  onRefresh,
  loading
}) => {
  // Derive currentView from props instead of local state to avoid reset issues
  const getCurrentView = () => {
    if (selectedFloor !== 'all') return 'floor';
    if (selectedProgram !== 'all') return 'program';
    if (selectedCampus !== 'all') return 'campus';
    return 'overview';
  };
  
  const currentView = getCurrentView();
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [showGlimpseModal, setShowGlimpseModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showStudentDetails, setShowStudentDetails] = useState(false);
  
  // Get auth context for role checking
  const { user } = useAuth();
  const isPrincipal = user?.role === 'Principal' || user?.role === 'InstituteAdmin';

  // Calculate overall statistics
  const calculateOverallStats = () => {
    if (!attendanceData) return { total: 0, present: 0, absent: 0, percentage: 0 };
    
    const totalStudents = attendanceData.totalStudents || 0;
    const presentRecords = attendanceData.presentStudents || 0; // This is actually record count now
    const absentRecords = attendanceData.absentStudents || 0;   // This is actually record count now
    const totalRecords = attendanceData.totalRecords || (presentRecords + absentRecords);
    
    return {
      total: totalStudents,           // Total unique students
      present: presentRecords,        // Total present records
      absent: absentRecords,          // Total absent records  
      totalRecords: totalRecords,     // Total attendance records
      percentage: attendanceData.attendancePercentage || 0
    };
  };

  const overallStats = calculateOverallStats();

  const handleViewChange = (view, options = {}) => {
    // Reset to overview - clear all filters
    if (view === 'overview') {
      onFilterChange('campus', 'all');
      onFilterChange('floor', 'all');
      onFilterChange('program', 'all');
      onFilterChange('classId', 'all');
      return;
    }
    
    // Apply any filters passed in options
    if (options.campus) {
      onFilterChange('campus', options.campus);
    }
    if (options.floor) {
      onFilterChange('floor', options.floor);
    }
    if (options.program) {
      onFilterChange('program', options.program);
    }
    if (options.classId) {
      onFilterChange('classId', options.classId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-sm text-gray-600">
                Monitor attendance across campus, floors, programs, and classes
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <DateRangeSelector
              dateRange={dateRange}
              onDateRangeChange={(range) => onFilterChange('dateRange', range)}
            />
            <Button 
              onClick={() => setShowStudentSearch(true)}
              variant="outline"
            >
              <Search className="h-4 w-4 mr-2" />
              Search Student
            </Button>
            <Button 
              onClick={onRefresh} 
              disabled={loading}
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <AttendanceStatsCards
        stats={overallStats}
        title="Student Attendance Statistics"
        showPercentage={true}
      />

      {/* Navigation Breadcrumb */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
        <nav className="flex items-center space-x-2 text-sm text-gray-600">
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleViewChange('overview');
            }}
            className={`px-3 py-1 rounded-lg transition-colors ${
              currentView === 'overview' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'hover:bg-gray-100'
            }`}
          >
            Overview
          </button>
          
          {selectedCampus !== 'all' && (
            <>
              <span>/</span>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleViewChange('campus');
                }}
                className={`px-3 py-1 rounded-lg transition-colors ${
                  currentView === 'campus' 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'hover:bg-gray-100'
                }`}
              >
                {selectedCampus} Campus
              </button>
            </>
          )}
          
          {selectedFloor !== 'all' && (
            <>
              <span>/</span>
              <span className="px-3 py-1 bg-gray-100 rounded-lg">
                {selectedFloor} Floor
              </span>
            </>
          )}
          
          {selectedProgram !== 'all' && (
            <>
              <span>/</span>
              <span className="px-3 py-1 bg-gray-100 rounded-lg">
                {selectedProgram}
              </span>
            </>
          )}
          
          {selectedClass !== 'all' && (
            <>
              <span>/</span>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg">
                Class View
              </span>
            </>
          )}
        </nav>
      </div>

      {/* Main Content based on current view */}
      {currentView === 'overview' && selectedCampus === 'all' && (
        <div className="space-y-6">
          {/* Boys Campus Row */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Boys Campus</h3>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleViewChange('campus', { campus: 'Boys' });
                }}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                View Details →
              </button>
            </div>
            {attendanceData?.campusBreakdown?.boys && (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {attendanceData.campusBreakdown.boys.total || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {attendanceData.campusBreakdown.boys.present || 0}
                  </div>
                  <div className="text-sm text-gray-600">Present Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {attendanceData.campusBreakdown.boys.absent || 0}
                  </div>
                  <div className="text-sm text-gray-600">Absent Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {attendanceData.campusBreakdown.boys.percentage?.toFixed(1) || '0.0'}%
                  </div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>
              </div>
            )}
          </div>

          {/* Girls Campus Row */}
          <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 bg-gradient-to-br from-pink-500 to-pink-600 rounded-lg flex items-center justify-center">
                  <Building className="h-4 w-4 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Girls Campus</h3>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleViewChange('campus', { campus: 'Girls' });
                }}
                className="text-pink-600 hover:text-pink-700 text-sm font-medium"
              >
                View Details →
              </button>
            </div>
            {attendanceData?.campusBreakdown?.girls && (
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {attendanceData.campusBreakdown.girls.total || 0}
                  </div>
                  <div className="text-sm text-gray-600">Total Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {attendanceData.campusBreakdown.girls.present || 0}
                  </div>
                  <div className="text-sm text-gray-600">Present Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {attendanceData.campusBreakdown.girls.absent || 0}
                  </div>
                  <div className="text-sm text-gray-600">Absent Records</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-600">
                    {attendanceData.campusBreakdown.girls.percentage?.toFixed(1) || '0.0'}%
                  </div>
                  <div className="text-sm text-gray-600">Attendance Rate</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'campus' && selectedCampus !== 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <FloorDistribution
            attendanceData={attendanceData}
            campus={selectedCampus}
            selectedFloor={selectedFloor}
            onFloorSelect={(floor) => handleViewChange('floor', { floor, campus: selectedCampus })}
          />
          <ProgramDistribution
            attendanceData={attendanceData}
            campus={selectedCampus}
            selectedProgram={selectedProgram}
            onProgramSelect={(program) => handleViewChange('program', { program, campus: selectedCampus })}
          />
        </div>
      )}

      {(currentView === 'floor' || currentView === 'program') && (
        <ClassDistribution
          attendanceData={attendanceData}
          classesData={classesData}
          filters={{
            campus: selectedCampus,
            floor: selectedFloor,
            program: selectedProgram
          }}
          selectedClass={selectedClass}
          onClassSelect={(classId) => handleViewChange('class', { class: classId })}
        />
      )}

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="h-8 w-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">How to navigate</h3>
            <p className="text-sm text-blue-700">
              Start with the overall view, then click on campus tabs to see Boys/Girls distribution. 
              From there, explore floor-wise or program-wise breakdowns, and finally drill down to individual classes.
            </p>
          </div>
        </div>
      </div>

      {/* Student Search Modal */}
      {showStudentSearch && (
        <StudentSearchPage 
          onClose={() => setShowStudentSearch(false)}
          onStudentSelect={(student) => {
            setSelectedStudent(student);
            setShowStudentDetails(true);
            setShowStudentSearch(false);
          }}
        />
      )}

      {/* Student Details Modal */}
      {showStudentDetails && selectedStudent && (
        <StudentDetailsModal 
          student={selectedStudent}
          onClose={() => {
            setShowStudentDetails(false);
            setSelectedStudent(null);
          }}
        />
      )}

      {/* Floating Glimpse Button - Only for Principal */}
      {isPrincipal && (
        <AttendanceGlimpseButton 
          onClick={() => setShowGlimpseModal(true)}
          loading={loading}
        />
      )}

      {/* Glimpse Modal */}
      {showGlimpseModal && (
        <AttendanceGlimpse 
          onClose={() => setShowGlimpseModal(false)}
        />
      )}
    </div>
  );
};

export default AttendanceOverview;
