import React, { useState, useEffect } from 'react';
import { 
  ChevronDown, 
  ChevronUp, 
  TrendingUp, 
  TrendingDown, 
  BarChart3,
  Edit2,
  Save,
  X,
  FileText,
  Users,
  Award,
  AlertCircle,
  LineChart,
  Filter
} from 'lucide-react';
import { Button } from '../ui/button';
import Card from '../ui/card';
import { useToast } from '../../contexts/ToastContext';
import { default as api } from '../../services/api';
import OptimizedExaminationTab from '../../components/student-profile/OptimizedExaminationTab';

// Performance Graph Modal Component
const PerformanceGraphModal = ({ student, isOpen, onClose }) => {
  if (!isOpen) return null;

  const subjectData = {};
  const program = student.admissionInfo?.program || student.program || 'default';
  
  // Extract subject performance data from backend-processed examData
  student.examData?.forEach(exam => {
    Object.entries(exam.data || {}).forEach(([subject, marks]) => {
      if (marks && marks !== '-') {
        if (!subjectData[subject]) {
          subjectData[subject] = [];
        }
        subjectData[subject].push({
          exam: exam.examName,
          marks: parseFloat(marks),
          type: exam.type
        });
      }
    });
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Performance Analysis: {student.fullName?.firstName} {student.fullName?.lastName}
            </h2>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClose();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
            <div className="text-sm text-gray-600">
              <div>Zone: {student?.overallZone || 'N/A'}</div>
              <div>Gender: {student?.gender || student?.personalInfo?.gender || 'N/A'}</div>
            </div>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Roll No: {student.rollNumber} | Program: {program}
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {Object.entries(subjectData).map(([subject, data]) => {
              const matriculationMark = data.find(d => d.type === 'matriculation')?.marks;
              const currentMarks = data.filter(d => d.type === 'test');
              const avgCurrent = currentMarks.length > 0 
                ? currentMarks.reduce((sum, d) => sum + d.marks, 0) / currentMarks.length 
                : 0;
              
              const trend = matriculationMark ? avgCurrent - matriculationMark : 0;
              
              return (
                <div key={subject} className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2">
                    <LineChart className="h-5 w-5 text-blue-600" />
                    {subject}
                  </h3>
                  
                  <div className="space-y-3">
                    {/* Matriculation baseline */}
                    {matriculationMark && (
                      <div className="flex items-center justify-between p-2 bg-yellow-100 rounded">
                        <span className="text-sm font-medium text-yellow-800">Matriculation</span>
                        <span className="text-sm font-bold text-yellow-900">{matriculationMark}</span>
                      </div>
                    )}
                    
                    {/* Current performance */}
                    <div className="flex items-center justify-between p-2 bg-blue-100 rounded">
                      <span className="text-sm font-medium text-blue-800">Current Average</span>
                      <span className="text-sm font-bold text-blue-900">{avgCurrent.toFixed(1)}</span>
                    </div>
                    
                    {/* Trend */}
                    {matriculationMark && (
                      <div className={`flex items-center justify-between p-2 rounded ${
                        trend > 0 ? 'bg-green-100' : trend < 0 ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        <span className={`text-sm font-medium ${
                          trend > 0 ? 'text-green-800' : trend < 0 ? 'text-red-800' : 'text-gray-800'
                        }`}>
                          Progress from Matric
                        </span>
                        <div className={`flex items-center gap-1 text-sm font-bold ${
                          trend > 0 ? 'text-green-900' : trend < 0 ? 'text-red-900' : 'text-gray-900'
                        }`}>
                          {trend > 0 ? <TrendingUp className="h-4 w-4" /> : 
                           trend < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                          {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                        </div>
                      </div>
                    )}
                    
                    {/* Test scores */}
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Test Scores</p>
                      {currentMarks.map((test, index) => (
                          <div key={test.exam || index} className="flex justify-between text-sm text-gray-700">
                            <span>{test.exam}</span>
                            <span className="font-medium">{test.marks}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {Object.keys(subjectData).length === 0 && (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No performance data available for analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const StudentExaminationReport = () => {
  // Check URL parameters for initial filter state
  const urlParams = new URLSearchParams(window.location.search);
  const initialZoneFilter = urlParams.get('filter') === 'red-zone' ? 'red' : 'all';
  
  const [students, setStudents] = useState([]);
  const [allStudents, setAllStudents] = useState([]); // Cache all student data
  const [initialLoading, setInitialLoading] = useState(true); // Only for initial data load
  const [expandedCards, setExpandedCards] = useState({});
  // Inline editing removed in favor of embedded ExaminationTab
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [selectedZone, setSelectedZone] = useState(initialZoneFilter);
  const [selectedGender, setSelectedGender] = useState('all');
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const [selectedStudentForGraph, setSelectedStudentForGraph] = useState(null);
  const [zoneCounts, setZoneCounts] = useState({});
  const zoneCountsRef = React.useRef(zoneCounts);
  const [summaryData, setSummaryData] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [pageSize] = useState(20);
  const [recomputing, setRecomputing] = useState(false);
  const [showStatsPanel, setShowStatsPanel] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState(null); // 'boys' | 'girls'
  const [floorCounts, setFloorCounts] = useState({}); // { '11th': n, '12th': n }
  const [selectedFloor, setSelectedFloor] = useState(null); // '11th' | '12th'
  const [selectedClass, setSelectedClass] = useState(null); // For class-specific filtering
  const [classCounts, setClassCounts] = useState([]); // array of { className, count, classId }
  const [campusStats, setCampusStats] = useState([]);
  const [campusZoneCounts, setCampusZoneCounts] = useState({});
  const [isStudentListCollapsed, setIsStudentListCollapsed] = useState(true); // Start collapsed
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [dataFullyLoaded, setDataFullyLoaded] = useState(false); // Track if all data is loaded
  
  const { toast } = useToast();

  // Helper: fetch a sample of students for given filters and compute zone counts
  const computeZoneBreakdown = async (params = {}) => {
    try {
      const sampleParams = { ...params, page: 1, limit: 200 };
      const resp = await api.get('/analytics/students', { params: sampleParams });
      const sample = resp?.data?.data?.students || [];
      const zoneAgg = sample.reduce((acc, s) => { const z = s.overallZone || 'gray'; acc[z] = (acc[z] || 0) + 1; return acc; }, {});
      // remove gray/unassigned for drill display
      const zoneReduced = {
        green: zoneAgg.green || 0,
        blue: zoneAgg.blue || 0,
        yellow: zoneAgg.yellow || 0,
        red: zoneAgg.red || 0
      };
      return zoneReduced;
    } catch (err) {
      console.warn('Failed to compute zone breakdown sample', err?.message || err);
      return { green: 0, blue: 0, yellow: 0, red: 0 };
    }
  };

  // Client-side helper: compute zone breakdown from cached allStudents data
  const computeZoneBreakdownFromCache = (filters = {}) => {
    if (!allStudents || allStudents.length === 0) {
      return { green: 0, blue: 0, yellow: 0, red: 0 };
    }

    let filteredStudents = [...allStudents];

    // Apply filters
    if (filters.campus) {
      filteredStudents = filteredStudents.filter(student => {
        const campus = student.admissionInfo?.campus || student.campus || '';
        return campus.toLowerCase() === filters.campus.toLowerCase();
      });
    }

    if (filters.grade) {
      filteredStudents = filteredStudents.filter(student => {
        const grade = student.admissionInfo?.grade || student.grade || '';
        return grade === filters.grade;
      });
    }

    if (filters.classId) {
      filteredStudents = filteredStudents.filter(student => {
        const studentClass = student.admissionInfo?.class || student.class || '';
        return studentClass === filters.classId || student.classId === filters.classId;
      });
    }

    // Compute zone aggregation
    const zoneAgg = filteredStudents.reduce((acc, s) => { 
      const z = s.overallZone || 'gray'; 
      acc[z] = (acc[z] || 0) + 1; 
      return acc; 
    }, {});

    // Return zone counts (excluding gray for drill display)
    return {
      green: zoneAgg.green || 0,
      blue: zoneAgg.blue || 0,
      yellow: zoneAgg.yellow || 0,
      red: zoneAgg.red || 0
    };
  };

  // Subject configurations based on program
  const PROGRAM_SUBJECTS = {
    'ICS': ['English', 'Math', 'Urdu', 'Computer', 'Pak Study', 'T.Quran', 'Stats'],
    'FSC': ['English', 'Math', 'Urdu', 'Biology', 'Pak Study', 'T.Quran', 'Physics'],
    'Pre Medical': ['English', 'Math', 'Urdu', 'Biology', 'Pak Study', 'T.Quran', 'Physics'],
    'Pre Engineering': ['English', 'Math', 'Urdu', 'Computer', 'Pak Study', 'T.Quran', 'Physics'],
    'ICS-PHY': ['English', 'Math', 'Urdu', 'Computer', 'Pak Study', 'T.Quran', 'Physics'],
    'default': ['English', 'Math', 'Urdu', 'Pak Study', 'T.Quran', 'Physics']
  };

  // Load all student data initially - this will be called only once on component mount
  const loadAllStudentData = React.useCallback(async () => {
    if (dataFullyLoaded) {
      return; // Prevent multiple calls
    }

    setInitialLoading(true);
    try {
      // Load analytics overview first (without fallback to prevent API loops)
      const overviewResponse = await api.get('/analytics/overview');
      if (overviewResponse.data && overviewResponse.data.success) {
        const analytics = overviewResponse.data.data || {};
        const cs = analytics.campusStats || [];
        setCampusStats(cs);
        
        const collegeStats = analytics.collegeWideStats || { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 };
        setZoneCounts({
          green: collegeStats.green || 0,
          blue: collegeStats.blue || 0,
          yellow: collegeStats.yellow || 0,
          red: collegeStats.red || 0,
          gray: collegeStats.unassigned || 0
        });
        setSummaryData({
          lastUpdated: analytics.lastUpdated,
          studentsProcessed: analytics.studentsProcessed,
          calculationDuration: analytics.calculationDuration
        });
      }

      // Then load ALL student data for client-side filtering
      const studentResponse = await api.get('/examinations/student-examination-report-optimized', {
        params: {
          page: 1,
          limit: 5000, // Load all students at once
        },
        timeout: 180000 // 3 minute timeout for large data load
      });

      if (studentResponse.data && studentResponse.data.success) {
        const payload = studentResponse.data.data || {};
        const studentsData = payload.students || [];
        
        // Cache all students data
        setAllStudents(studentsData);
        
        // Set initial pagination info
        const pagination = payload.pagination || {};
        setSummaryData(prev => ({
          ...prev,
          totalStudents: pagination.totalStudents || studentsData.length
        }));

        // Mark data as fully loaded
        setDataFullyLoaded(true);
        setStudentsLoaded(true);
        setIsStudentListCollapsed(false);

        toast.success(`Loaded ${studentsData.length} student records for instant filtering`);
      } else {
        throw new Error(studentResponse.data?.message || 'Failed to load students');
      }
    } catch (error) {
      console.error('Failed to load student examination data:', error);
      toast.error('Failed to load examination data from server');
      setAllStudents([]);
      setZoneCounts({});
    } finally {
      setInitialLoading(false);
    }
  }, [dataFullyLoaded, toast]);

  // Fetch summary analytics (fast) by default to avoid timeouts when loading full student lists
  const fetchStudentData = React.useCallback(async (options = { loadStudents: false }) => {
    // If data is already fully loaded, don't make API calls for filtering
    if (dataFullyLoaded && !options.forceRefresh) {
      return;
    }

    setInitialLoading(true);
    try {
      if (!options.loadStudents) {
        setShowStatsPanel(true);
        // Load analytics overview which contains zone counts and campus breakdown
        const response = await api.get('/analytics/overview');
        if (response.data && response.data.success) {
          const analytics = response.data.data || {};
          let cs = analytics.campusStats || [];
          
          const zeroTotals = (arr) => !arr || arr.length === 0 || arr.every(c => {
            const total = Object.values(c.campusZoneDistribution || {}).reduce((s,v)=>s+(v||0),0);
            return total === 0;
          });
          if (zeroTotals(cs)) {
            try {
              const fallback = [];
              for (const campusName of ['Boys','Girls']) {
                const campusResp = await api.get('/analytics/students', { params: { campus: campusName, page: 1, limit: 1 } });
                const campusTotal = campusResp?.data?.data?.pagination?.totalStudents || 0;
                const grades = ['11th','12th'];
                const gradeStats = [];
                for (const grade of grades) {
                  const gradeResp = await api.get('/analytics/students', { params: { campus: campusName, grade, page: 1, limit: 1 } });
                  const gradeTotal = gradeResp?.data?.data?.pagination?.totalStudents || 0;
                  const classMap = {};
                  const sampleResp = await api.get('/analytics/students', { params: { campus: campusName, grade, page: 1, limit: 50 } });
                  const sampleStudents = sampleResp?.data?.data?.students || [];
                  sampleStudents.forEach(s => { if (s.class) classMap[s.class] = (classMap[s.class] || 0) + 1; });
                  gradeStats.push({ gradeName: grade, gradeZoneDistribution: { total: gradeTotal }, classStats: Object.entries(classMap).map(([name, cnt]) => ({ className: name, classZoneDistribution: { total: cnt } })) });
                }
                fallback.push({ campusName, campusZoneDistribution: { total: campusTotal }, gradeStats });
              }
              cs = fallback;
            } catch (err) {
              console.warn('Fallback campus stats computation failed', err?.message || err);
            }
          }
          setCampusStats(cs);
          const collegeStats = analytics.collegeWideStats || { green: 0, blue: 0, yellow: 0, red: 0, unassigned: 0, total: 0 };
          setZoneCounts({
            green: collegeStats.green || 0,
            blue: collegeStats.blue || 0,
            yellow: collegeStats.yellow || 0,
            red: collegeStats.red || 0,
            gray: collegeStats.unassigned || 0
          });
          setSummaryData({
            lastUpdated: analytics.lastUpdated,
            studentsProcessed: analytics.studentsProcessed,
            calculationDuration: analytics.calculationDuration
          });
          setStudents([]);
        } else {
          throw new Error(response.data?.message || 'Failed to load analytics overview');
        }
      } else {
        // This branch should rarely be used now - only for forced refreshes
        setShowStatsPanel(false);
        const params = {
          page: options.page || 1,
          limit: options.limit || pageSize,
          zone: (options.zone !== undefined) ? (options.zone === 'all' ? undefined : options.zone) : (selectedZone !== 'all' ? selectedZone : undefined),
          gender: (options.gender !== undefined) ? (options.gender === 'all' ? undefined : options.gender) : (selectedGender !== 'all' ? selectedGender : undefined),
        };
        
        if (options.campus) params.campus = options.campus;
        if (options.grade) params.grade = options.grade;
        if (options.classId) params.classId = options.classId;

        const axiosConfig = { params, timeout: 120000 };
        const response = await api.get('/examinations/student-examination-report-optimized', axiosConfig);
        
        if (response.data && response.data.success) {
          const payload = response.data.data || {};
          const studentsData = payload.students || [];
          
          setStudents(studentsData);
          
          if ((!options.zone || options.zone === 'all') && 
              (!options.gender || options.gender === 'all') && 
              !options.campus && !options.grade && !options.classId) {
            setAllStudents(studentsData);
          }
          
          const pagination = payload.pagination || {};
          setPage(pagination.currentPage || params.page);
          setTotalPages(pagination.totalPages || 1);
          setSummaryData({
            totalStudents: pagination.totalStudents || studentsData.length
          });
          
          if (!Object.keys(zoneCountsRef.current || {}).length && studentsData.length > 0) {
            const counts = studentsData.reduce((acc, s) => {
              const c = s.overallZone || 'gray';
              acc[c] = (acc[c] || 0) + 1;
              return acc;
            }, {});
            setZoneCounts(counts);
          }
        } else {
          throw new Error(response.data?.message || 'Failed to load students');
        }
      }
    } catch (error) {
      console.error('Failed to fetch student examination report:', error);
      toast.error('Failed to load examination data from server');
      setStudents([]);
      setZoneCounts({});
    } finally {
      setInitialLoading(false);
    }
  }, [toast, pageSize, selectedZone, selectedGender, dataFullyLoaded]);

  // Apply filters when any filter state changes
  React.useEffect(() => {
    if (!studentsLoaded || allStudents.length === 0) return;

    let filteredStudents = [...allStudents];

    // Apply zone filter
    if (selectedZone !== 'all') {
      filteredStudents = filteredStudents.filter(student => {
        // Try multiple possible zone field locations
        const zoneVal = student.overallZone || 
                       student.zone || 
                       student.analytics?.overallZone || 
                       student.analytics?.zone ||
                       'gray';
        
        if (selectedZone === 'unassigned') {
          return !zoneVal || zoneVal === 'gray' || zoneVal === null || zoneVal === undefined;
        }
        
        return zoneVal === selectedZone;
      });
    }

    // Apply gender filter
    if (selectedGender !== 'all') {
      filteredStudents = filteredStudents.filter(student => {
        const gender = student.admissionInfo?.gender || student.gender || '';
        return gender.toLowerCase() === selectedGender.toLowerCase();
      });
    }

    // Apply search term filter
    if (searchTerm) {
      filteredStudents = filteredStudents.filter(student => {
        const term = searchTerm.toLowerCase();
        return (
          (student.name || '').toLowerCase().includes(term) ||
          (student.rollNumber || '').toLowerCase().includes(term) ||
          (student.admissionInfo?.fatherName || student.fatherName || '').toLowerCase().includes(term)
        );
      });
    }

    // Apply grade filter
    if (selectedGrade !== 'all') {
      filteredStudents = filteredStudents.filter(student => {
        const grade = student.admissionInfo?.grade || student.grade || '';
        return grade === selectedGrade;
      });
    }

    // Apply program filter
    if (selectedProgram !== 'all') {
      filteredStudents = filteredStudents.filter(student => {
        const program = student.admissionInfo?.program || student.program || '';
        return program === selectedProgram;
      });
    }

    // Apply campus filter
    if (selectedCampus) {
      filteredStudents = filteredStudents.filter(student => {
        const campus = student.admissionInfo?.campus || student.campus || '';
        return campus.toLowerCase() === selectedCampus.toLowerCase();
      });
    }

    // Apply class filter
    if (selectedClass) {
      filteredStudents = filteredStudents.filter(student => {
        const studentClass = student.admissionInfo?.class || student.class || '';
        return studentClass === selectedClass || student.classId === selectedClass;
      });
    }

    // Calculate pagination
    const totalStudents = filteredStudents.length;
    const totalPagesCalc = Math.ceil(totalStudents / pageSize);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    const paginatedStudents = filteredStudents.slice(startIndex, endIndex);

    setStudents(paginatedStudents);
    setTotalPages(totalPagesCalc);
    
    // Update summary with filtered count
    setSummaryData(prev => ({
      ...prev,
      totalStudents: filteredStudents.length
    }));
  }, [selectedZone, selectedGender, searchTerm, selectedGrade, selectedProgram, selectedCampus, selectedClass, studentsLoaded, allStudents, page, pageSize]);

  // Reset page to 1 when filters change
  React.useEffect(() => {
    if (dataFullyLoaded) {
      setPage(1);
    }
  }, [selectedZone, selectedGender, searchTerm, selectedGrade, selectedProgram, selectedCampus, selectedClass, dataFullyLoaded]);

  // keep ref in sync (separate effect so hooks are used at top-level)
  React.useEffect(() => {
    zoneCountsRef.current = zoneCounts;
  }, [zoneCounts]);

  useEffect(() => {
    // Load all data initially - only once on component mount
    loadAllStudentData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Intentionally empty - only run once on mount

  // Defensive: block any unexpected form submissions on the page while this component is mounted.
  // Some browsers or parent layouts may still trigger a submit; capture and prevent to avoid full-page reloads.
  useEffect(() => {
    const onSubmitCapture = (e) => {
      try {
        console.warn('Blocked unexpected form submit from', e.target);
      } catch (err) {
        console.warn('Error in submit capture handler', err);
      }
      e.preventDefault();
      e.stopImmediatePropagation();
      return false;
    };

    document.addEventListener('submit', onSubmitCapture, true);
    return () => document.removeEventListener('submit', onSubmitCapture, true);
  }, []);

  const getCardColor = (student) => {
    const colorMap = {
      'green': 'bg-green-50 border-green-200',
      'yellow': 'bg-yellow-50 border-yellow-200',
      'blue': 'bg-blue-50 border-blue-200',
      'red': 'bg-red-50 border-red-200',
      'gray': 'bg-gray-50 border-gray-200'
    };
    
    return colorMap[student.cardColor] || 'bg-gray-50 border-gray-200';
  };

  const getPerformanceTrend = (student) => {
    // Defensive: some student objects may not have performanceTrend
  const trend = student.performanceTrend || { trend: 'no-data', color: 'gray', value: '-' };

    const iconMap = {
      'up': TrendingUp,
      'down': TrendingDown,
      'stable': TrendingUp,
      'no-data': AlertCircle,
      'no-baseline': AlertCircle
    };

    const colorMap = {
      'green': 'text-green-600',
      'red': 'text-red-600',
      'gray': 'text-gray-500'
    };

    const trendKey = typeof trend.trend === 'string' ? trend.trend : 'no-data';
    const colorKey = typeof trend.color === 'string' ? trend.color : 'gray';

    return {
      trend: trendKey,
      icon: iconMap[trendKey] || AlertCircle,
      color: colorMap[colorKey] || 'text-gray-500',
  value: (trend.value !== undefined && trend.value !== null) ? trend.value : '-'
    };
  };

  const toggleCard = (studentId) => {
    setExpandedCards(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  // Editing and inline table helpers removed: principal now embeds the student `ExaminationTab` for consistent UI

  const openPerformanceGraph = (student) => {
    setSelectedStudentForGraph(student);
    setShowPerformanceModal(true);
  };

  const closePerformanceModal = () => {
    setShowPerformanceModal(false);
    setSelectedStudentForGraph(null);
  };

  // Compute filtered students for display based on all current filters
  const filteredStudents = React.useMemo(() => {
    if (!dataFullyLoaded || !allStudents.length) {
      return students; // Return paginated students while loading
    }

    let filtered = [...allStudents];

    // Apply zone filter
    if (selectedZone !== 'all') {
      filtered = filtered.filter(student => {
        const zoneVal = student.overallZone || 
                       student.zone || 
                       student.analytics?.overallZone || 
                       student.analytics?.zone ||
                       'gray';
        
        if (selectedZone === 'unassigned') {
          return !zoneVal || zoneVal === 'gray' || zoneVal === null || zoneVal === undefined;
        }
        
        return zoneVal === selectedZone;
      });
    }

    // Apply gender filter
    if (selectedGender !== 'all') {
      filtered = filtered.filter(student => {
        const gender = student.admissionInfo?.gender || student.gender || '';
        return gender.toLowerCase() === selectedGender.toLowerCase();
      });
    }

    // Apply search term filter
    if (searchTerm) {
      filtered = filtered.filter(student => {
        const term = searchTerm.toLowerCase();
        return (
          (student.name || '').toLowerCase().includes(term) ||
          (student.rollNumber || '').toLowerCase().includes(term) ||
          (student.admissionInfo?.fatherName || student.fatherName || '').toLowerCase().includes(term) ||
          (`${student.fullName?.firstName || ''} ${student.fullName?.lastName || ''}`).toLowerCase().includes(term)
        );
      });
    }

    // Apply grade filter
    if (selectedGrade !== 'all') {
      filtered = filtered.filter(student => {
        const grade = student.admissionInfo?.grade || student.grade || '';
        return grade === selectedGrade;
      });
    }

    // Apply program filter
    if (selectedProgram !== 'all') {
      filtered = filtered.filter(student => {
        const program = student.admissionInfo?.program || student.program || '';
        return program === selectedProgram;
      });
    }

    // Apply campus filter
    if (selectedCampus) {
      filtered = filtered.filter(student => {
        const campus = student.admissionInfo?.campus || student.campus || '';
        return campus.toLowerCase() === selectedCampus.toLowerCase();
      });
    }

    // Apply class filter
    if (selectedClass) {
      filtered = filtered.filter(student => {
        const studentClass = student.admissionInfo?.class || student.class || '';
        return studentClass === selectedClass || student.classId === selectedClass;
      });
    }

    return filtered;
  }, [
    allStudents, 
    dataFullyLoaded, 
    students,
    selectedZone, 
    selectedGender, 
    searchTerm, 
    selectedGrade, 
    selectedProgram, 
    selectedCampus, 
    selectedClass
  ]);

  // Compute paginated students for display
  const paginatedStudents = React.useMemo(() => {
    if (!dataFullyLoaded) {
      return students; // Return current students while loading
    }

    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return filteredStudents.slice(startIndex, endIndex);
  }, [filteredStudents, page, pageSize, dataFullyLoaded, students]);

  // Compute total pages based on filtered results
  const computedTotalPages = React.useMemo(() => {
    if (!dataFullyLoaded) {
      return totalPages; // Use server pagination while loading
    }
    return Math.ceil(filteredStudents.length / pageSize);
  }, [filteredStudents.length, pageSize, dataFullyLoaded, totalPages]);

  // Helper to robustly obtain matriculation percentage for display
  const getMatricPercentage = (student) => {
    // Try common fields first
    const numeric = (v) => (v === undefined || v === null) ? null : Number(v);
    const candidatePaths = [
      student.academicRecords?.matriculation?.percentage,
      student.matriculation?.percentage,
      student.matricPercentage,
      student.analytics?.matriculationPercentage,
      student.matriculationPercentage
    ];
    for (const c of candidatePaths) {
      const n = numeric(c);
      if (!isNaN(n) && n !== null) return n;
    }
    // Fallback: attempt to derive from examData entries of type 'matriculation'
    if (Array.isArray(student.examData)) {
      const marks = [];
      student.examData.forEach(ex => {
        if (ex.type === 'matriculation' && ex.data) {
          Object.values(ex.data).forEach(v => { const nv = numeric(v); if (!isNaN(nv)) marks.push(nv); });
        }
      });
      if (marks.length > 0) {
        const avg = marks.reduce((s, x) => s + x, 0) / marks.length;
        return Math.round(avg * 10) / 10;
      }
    }
    return null;
  };

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex flex-col justify-center items-center min-h-screen">
          <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Loading Examination Data</h3>
              <p className="text-gray-600 mb-4">
                {showStatsPanel ? 
                  'Loading analytics overview...' : 
                  'Fetching all student records for fast filtering...'
                }
              </p>
              <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                <div className="bg-blue-600 h-full rounded-full animate-pulse w-3/4"></div>
              </div>
              <p className="text-sm text-gray-500 mt-2">This may take a moment, but filtering will be instant afterwards</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 relative">
      {/* No more loading overlay for filter changes - filtering is now instant */}

      {/* Performance Graph Modal */}
      <PerformanceGraphModal 
        student={selectedStudentForGraph}
        isOpen={showPerformanceModal}
        onClose={closePerformanceModal}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <FileText className="h-7 w-7 text-blue-600" />
              Student Examination Report
            </h1>
            <p className="text-gray-600 mt-1">
              Comprehensive examination performance tracking with matriculation comparison
            </p>
            {summaryData?.lastUpdated && (
              <p className="text-sm text-gray-500 mt-1">
                Last analytics update: {new Date(summaryData.lastUpdated).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 bg-gray-100 px-3 py-2 rounded-lg">
              <Users className="inline h-4 w-4 mr-1" />
              {dataFullyLoaded ? `${filteredStudents.length} Students` : 'Loading Students...'}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                // Clear all UI filters and reset drill selections
                setSearchTerm('');
                setSelectedProgram('all');
                setSelectedGrade('all');
                setSelectedZone('all');
                setSelectedGender('all');
                setSelectedCampus(null);
                setSelectedClass(null); // Reset class filter
                setSelectedFloor(null);
                setClassCounts([]);
                setCampusZoneCounts({});
                setPage(1); // Reset to first page
                // No need to make API call - useEffect will handle client-side filtering
              }}
            >
              <Filter className="h-4 w-4 mr-1" />
              Clear Filters
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (recomputing) return;
                const confirm = window.confirm('Recompute analytics for all students? This may take several minutes.');
                if (!confirm) return;
                try {
                  setRecomputing(true);
                  toast.info('Triggering analytics recalculation...');
                  await api.post('/analytics/calculate/all', { academicYear: '2024-2025' });
                  await api.post('/analytics/refresh/statistics', { academicYear: '2024-2025' });
                  toast.success('Analytics recalculation completed. Refreshing data...');
                  await loadAllStudentData(); // Reload all data after recomputation
                } catch (err) {
                  console.error('Failed to recompute analytics:', err?.message || err);
                  toast.error('Failed to trigger analytics recalculation');
                } finally {
                  setRecomputing(false);
                }
              }}
              disabled={recomputing}
            >
              {recomputing ? 'Recomputing...' : 'Recompute Analytics'}
            </Button>
          </div>
        </div>
      </div>

      <div className="px-6">
        {/* Zone Stats (compact) */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Performance Overview</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['green','blue','yellow','red'].map(zoneKey => {
              // prefer scoped counts (campus/grade/class) when available
              const hasScoped = campusZoneCounts && Object.values(campusZoneCounts).some(v => v > 0);
              const counts = hasScoped ? campusZoneCounts : zoneCounts;
              const colorClass = zoneKey === 'green' ? 'bg-green-500' : zoneKey === 'blue' ? 'bg-blue-500' : zoneKey === 'yellow' ? 'bg-yellow-500' : 'bg-red-500';
              const bgClass = zoneKey === 'green' ? 'bg-green-50' : zoneKey === 'blue' ? 'bg-blue-50' : zoneKey === 'yellow' ? 'bg-yellow-50' : 'bg-red-50';
              return (
                <button
                  key={zoneKey}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // Set zone filter for client-side filtering
                    setSelectedZone(zoneKey);
                    setStudentsLoaded(true);
                    setIsStudentListCollapsed(false); // Show student list
                  }}
                  className={`w-full text-left p-4 rounded-lg border ${bgClass} transition-all hover:shadow-md hover:scale-105 cursor-pointer ${
                    selectedZone === zoneKey ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`h-4 w-4 rounded-full ${colorClass}`} />
                    <div>
                      <div className="text-sm font-medium text-gray-700 capitalize">{zoneKey} Zone</div>
                      <div className="text-2xl font-bold text-gray-900">{counts?.[zoneKey] || 0}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            {/* show gray as a separate tile only when no campus drill is active */}
            {!selectedCampus && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  // Set unassigned zone filter for client-side filtering
                  setSelectedZone('unassigned');
                  setStudentsLoaded(true);
                  setIsStudentListCollapsed(false); // Show student list
                }}
                className={`w-full text-left p-4 rounded-lg border bg-gray-50 transition-all hover:shadow-md hover:scale-105 cursor-pointer ${
                  selectedZone === 'unassigned' ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full bg-gray-400" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">Unassigned</div>
                    <div className="text-2xl font-bold text-gray-900">{zoneCounts.gray || 0}</div>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>

        {/* Campus -> Grade -> Class Stats Drill (shown when not loading students) */}
        {showStatsPanel && (!students || students.length === 0) && (
          <Card className="mb-6">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Campus / Grade / Class Breakdown
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Campus list */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Campus</div>
                  <div className="space-y-2">
                    {campusStats.map(c => (
                      <button
                        key={c.campusName}
                        type="button"
                        onClick={async (e) => {
                          e.preventDefault();
                          setSelectedCampus(c.campusName);
                          setSelectedFloor(null);
                          setClassCounts([]);
                          // populate floor counts from provided data if available
                          const floors = {};
                          (c.gradeStats || []).forEach(g => { floors[g.gradeName] = (floors[g.gradeName] || 0) + (g.gradeZoneDistribution?.total || 0); });
                          setFloorCounts(floors);
                          
                          // Use cached data instead of API call for zone breakdown
                          if (allStudents && allStudents.length > 0) {
                            const zoneReduced = computeZoneBreakdownFromCache({ campus: c.campusName });
                            setCampusZoneCounts(zoneReduced);
                          } else {
                            // Fallback to API call only if no cached data available
                            try {
                              const resp = await api.get('/analytics/students', { params: { campus: c.campusName, page: 1, limit: 200 } });
                              const studentsSample = resp?.data?.data?.students || [];
                              const zoneAgg = studentsSample.reduce((acc, s) => { const z = s.overallZone || 'gray'; acc[z] = (acc[z] || 0) + 1; return acc; }, {});
                              const zoneReduced = {
                                green: zoneAgg.green || 0,
                                blue: zoneAgg.blue || 0,
                                yellow: zoneAgg.yellow || 0,
                                red: zoneAgg.red || 0
                              };
                              setCampusZoneCounts(zoneReduced);
                            } catch (err) {
                              console.warn('Failed to fetch campus students for zone breakdown', err?.message || err);
                            }
                          }
                        }}
                        className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                          selectedCampus === c.campusName ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="text-sm font-medium text-gray-900">{c.campusName}</div>
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Floor (grade) list */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Grade</div>
                  <div className="space-y-2">
                    {Object.keys(floorCounts).length === 0 ? (
                      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                        Select a campus to view grades
                      </div>
                    ) : (
                      Object.keys(floorCounts).map((floor) => (
                        <button
                          key={floor}
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            setSelectedFloor(floor);
                            // find classes from campusStats
                            const campus = campusStats.find(cs => cs.campusName === selectedCampus);
                            const grade = campus?.gradeStats?.find(g => g.gradeName === floor);
                            // Build an array of class objects with name, count and classId if available
                            const classesArr = (grade?.classStats || []).map(cl => ({
                              className: cl.className,
                              count: (cl.classZoneDistribution?.total || 0),
                              classId: cl.classId || null
                            }));
                            setClassCounts(classesArr);
                            // compute zone breakdown for this grade and update tiles
                            const zones = await computeZoneBreakdown({ campus: selectedCampus, grade: floor });
                            setCampusZoneCounts(zones);
                          }}
                          className={`w-full text-left p-3 rounded-lg border transition-all hover:shadow-md ${
                            selectedFloor === floor ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">{floor}</div>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          </div>
                        </button>
                        ))
                    )}
                  </div>
                </div>

                {/* Class list */}
                <div>
                  <div className="text-sm font-medium text-gray-700 mb-3">Class</div>
                  <div className="space-y-2">
                    {(!classCounts || classCounts.length === 0) ? (
                      <div className="text-sm text-gray-500 bg-gray-50 p-4 rounded-lg text-center">
                        Select a grade to view classes
                      </div>
                    ) : (
                      classCounts.map(cl => (
                        <button
                          key={cl.classId || cl.className}
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            if (cl.classId) {
                              // Use cached data for client-side filtering instead of API call
                              if (allStudents && allStudents.length > 0) {
                                // Set class filter and reset other filters
                                setSelectedClass(cl.classId);
                                setSelectedZone('all');
                                setSelectedGender('all');
                                setPage(1); // Reset pagination
                                setStudentsLoaded(true);
                                setIsStudentListCollapsed(false); // Auto-expand to show results
                                // Update zone tiles to reflect this class using cached data
                                const zones = computeZoneBreakdownFromCache({ classId: cl.classId, campus: selectedCampus });
                                setCampusZoneCounts(zones);
                              } else {
                                // Fallback to API call only if no cached data
                                await fetchStudentData({ loadStudents: true, classId: cl.classId, campus: selectedCampus });
                                setStudentsLoaded(true);
                                setIsStudentListCollapsed(false);
                                const zones = await computeZoneBreakdown({ classId: cl.classId });
                                setCampusZoneCounts(zones);
                              }
                            } else {
                              // Use cached data for class name lookup
                              if (allStudents && allStudents.length > 0) {
                                setSelectedClass(cl.className);
                                setSelectedZone('all');
                                setSelectedGender('all');
                                setPage(1);
                                setStudentsLoaded(true);
                                setIsStudentListCollapsed(false);
                                const zones = computeZoneBreakdownFromCache({ classId: cl.className, campus: selectedCampus, grade: selectedFloor });
                                setCampusZoneCounts(zones);
                              } else {
                                // Fallback to API call
                                await fetchStudentData({ loadStudents: true, classId: cl.className, campus: selectedCampus, grade: selectedFloor, page: 1 });
                                setStudentsLoaded(true);
                                setIsStudentListCollapsed(false);
                                const zones = await computeZoneBreakdown({ classId: cl.className, campus: selectedCampus, grade: selectedFloor });
                                setCampusZoneCounts(zones);
                              }
                            }
                          }}
                          className="w-full text-left p-3 rounded-lg border bg-white border-gray-200 transition-all hover:shadow-md hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="text-sm font-medium text-gray-900">{cl.className}</div>
                            <Users className="h-4 w-4 text-gray-400" />
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Filter className="h-5 w-5 text-blue-600" />
                Filters
              </h3>
              {(searchTerm || selectedProgram !== 'all' || selectedGrade !== 'all' || selectedZone !== 'all' || selectedGender !== 'all') && (
                <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                  ⚡ Instant Filters Active
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Students</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by name or roll number..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Program</label>
                <select
                  value={selectedProgram}
                  onChange={(e) => {
                    e.preventDefault();
                    setSelectedProgram(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Programs</option>
                  <option value="ICS">ICS</option>
                  <option value="FSC">FSC</option>
                  <option value="Pre Medical">Pre Medical</option>
                  <option value="Pre Engineering">Pre Engineering</option>
                  <option value="ICS-PHY">ICS-PHY</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => {
                    e.preventDefault();
                    setSelectedGrade(e.target.value);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Grades</option>
                  <option value="11th">11th Grade</option>
                  <option value="12th">12th Grade</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Zone</label>
                <select
                  value={selectedZone}
                  onChange={(e) => {
                    e.preventDefault();
                    const val = e.target.value;
                    setSelectedZone(val);
                    // Client-side filtering will be triggered by useEffect
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Zones</option>
                  <option value="green">Green</option>
                  <option value="blue">Blue</option>
                  <option value="yellow">Yellow</option>
                  <option value="red">Red</option>
                  <option value="unassigned">Unassigned</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
                <select
                  value={selectedGender}
                  onChange={(e) => {
                    e.preventDefault();
                    const val = e.target.value;
                    setSelectedGender(val);
                    // Client-side filtering will be triggered by useEffect
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                >
                  <option value="all">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Student Cards */}
        <div className="space-y-4">
          {studentsLoaded && filteredStudents.length > 0 && (
            <>
              {/* Student List Header - Collapsible */}
              <div className="bg-white rounded-lg border">
                {/* Header with pagination separate */}
                <div className="flex items-center justify-between p-4 border-b">
                  <button
                    type="button"
                    onClick={() => setIsStudentListCollapsed(!isStudentListCollapsed)}
                    className="flex items-center gap-4 hover:text-blue-600 transition-colors"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      Student List
                    </h3>
                    <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                      {filteredStudents.length} {filteredStudents.length === 1 ? 'student' : 'students'}
                    </span>
                    {(searchTerm || selectedProgram !== 'all' || selectedGrade !== 'all' || selectedZone !== 'all' || selectedGender !== 'all') && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        ⚡ Instant Filters Active
                      </span>
                    )}
                    {/* Collapse/Expand Icon */}
                    {isStudentListCollapsed ? (
                      <ChevronDown className="h-5 w-5 text-gray-400 ml-2" />
                    ) : (
                      <ChevronUp className="h-5 w-5 text-gray-400 ml-2" />
                    )}
                  </button>
                  
                  {/* Pagination controls - separate from collapsible button */}
                  {computedTotalPages > 1 && !isStudentListCollapsed && (
                    <div className="flex items-center gap-3">
                      <div className="text-sm text-gray-600">
                        Page {page} of {Math.max(1, computedTotalPages)}
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (page > 1) {
                              setPage(page - 1);
                            }
                          }}
                          disabled={page <= 1}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (page < computedTotalPages) {
                              setPage(page + 1);
                            }
                          }}
                          disabled={page >= computedTotalPages}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Collapsible Student List Content */}
                {!isStudentListCollapsed && (
                  <div className="p-4 space-y-4">
                      {paginatedStudents.map((student) => {
                        const isExpanded = expandedCards[student._id];
                        const program = student.admissionInfo?.program || student.program || 'Not specified';
                        const performanceTrend = getPerformanceTrend(student);
                        
                        return (
                          <Card key={student._id} className={`${getCardColor(student)} transition-all duration-200 hover:shadow-md`}>
                            {/* Card Header */}
                            <div 
                              className="p-6 cursor-pointer"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                toggleCard(student._id);
                              }}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                  <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                      {student.fullName?.firstName} {student.fullName?.lastName}
                                      {student.fatherName && (
                                        <span className="text-sm text-gray-600 font-normal ml-3">(Father: {student.fatherName})</span>
                                      )}
                                    </h3>
                                    <div className="flex items-center gap-6 text-sm text-gray-600">
                                      <span className="flex items-center gap-1">
                                        <strong>Roll:</strong> {student.rollNumber || 'N/A'}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <strong>Grade:</strong> {student.admissionInfo?.grade || student.grade || 'N/A'}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <strong>Program:</strong> {program}
                                      </span>
                                      {student.class && (
                                        <span className="flex items-center gap-1">
                                          <strong>Class:</strong> {student.class}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex items-center gap-6">
                                  {/* Performance Trend */}
                                  <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border">
                                    <performanceTrend.icon className={`h-5 w-5 ${performanceTrend.color}`} />
                                    <span className={`text-sm font-medium ${performanceTrend.color}`}>
                                      {performanceTrend.value}
                                    </span>
                                  </div>
                                  
                                  {/* Current performance */}
                                  {student.currentAvgPercentage && (
                                    <div className="text-center bg-white px-3 py-2 rounded-lg border">
                                      <div className="text-xs text-gray-600">Current</div>
                                      <div className="text-sm font-semibold text-gray-900">
                                        {student.currentAvgPercentage}%
                                      </div>
                                    </div>
                                  )}

                                  {/* Matriculation Percentage (robust fallback) */}
                                  {(() => {
                                    const m = getMatricPercentage(student);
                                    return m !== null ? (
                                      <div className="text-center bg-white px-3 py-2 rounded-lg border">
                                        <div className="text-xs text-gray-600">Matric</div>
                                        <div className="text-sm font-semibold text-gray-900">{m}%</div>
                                      </div>
                                    ) : null;
                                  })()}
                                  
                                  {/* Actions */}
                                  <div className="flex items-center gap-2">
                                    <Button
                                      onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        openPerformanceGraph(student);
                                      }}
                                      variant="outline"
                                      size="sm"
                                      className="flex items-center gap-1"
                                    >
                                      <BarChart3 className="h-4 w-4" />
                                      Graph
                                    </Button>
                                    
                                    {isExpanded ? (
                                      <ChevronUp className="h-5 w-5 text-gray-400" />
                                    ) : (
                                      <ChevronDown className="h-5 w-5 text-gray-400" />
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Expanded Content */}
                            {isExpanded && (
                              <div className="border-t border-gray-200 bg-gray-50">
                                <div className="p-6">
                                  {/* Use the optimized examination tab with pre-loaded data */}
                                  <OptimizedExaminationTab studentData={student} />
                                </div>
                              </div>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                )}
              </div>
            </>
          )}

          {/* No Students Found Message */}
          {dataFullyLoaded && filteredStudents.length === 0 && (
            <Card className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Found</h3>
              <p className="text-gray-600">No students match the current filter criteria.</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setSelectedProgram('all');
                  setSelectedGrade('all');
                  setSelectedZone('all');
                  setSelectedGender('all');
                }}
                className="mt-4"
              >
                Reset Filters
              </Button>
            </Card>
          )}

          {/* Loading Students Message */}
          {!studentsLoaded && (
            <Card className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Students</h3>
              <p className="text-gray-600">Fetching student examination data...</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentExaminationReport;
