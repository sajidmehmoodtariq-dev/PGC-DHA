import React, { useState, useEffect } from 'react';
import { BookOpen, TrendingUp, TrendingDown, Award, Target, BarChart3, PieChart, Calendar, Star, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import PerformanceGraph from './PerformanceGraph';
import api from '../../services/api';
import { useToast } from '../../contexts/ToastContext';

const ExaminationTab = ({ studentId }) => {
  const [examData, setExamData] = useState([]);
  const [allExamData, setAllExamData] = useState([]); // Store all data for filtering
  const [stats, setStats] = useState({
    totalExams: 0,
    averageMarks: 0,
    highestMarks: 0,
    lowestMarks: 0,
    passedExams: 0,
    failedExams: 0,
    improvementNeeded: []
  });
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState('all');
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const [subjectPerformance, setSubjectPerformance] = useState([]);
  const [performanceMatrix, setPerformanceMatrix] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [availablePeriods, setAvailablePeriods] = useState([]);

  const { showToast } = useToast();

  // Fetch examination data
  const fetchExaminationData = async () => {
    try {
      setLoading(true);
      
      // Fetch test results for the specific student
      const response = await api.get(`/examinations/student/${studentId}/results`);

      if (response.data.success) {
        const results = response.data.data || [];
        setAllExamData(results); // Store all data for filtering
        extractFilterOptions(results);
        applyFilters(results, selectedSubject, selectedPeriod);
      } else {
        // Fallback to get test results with student filter
        const fallbackResponse = await api.get('/examinations/results', {
          params: {
            studentId: studentId,
            limit: 100,
            sortBy: 'enteredOn',
            sortOrder: 'desc'
          }
        });
        
        if (fallbackResponse.data.success) {
          const results = fallbackResponse.data.data || [];
          setAllExamData(results); // Store all data for filtering
          extractFilterOptions(results);
          applyFilters(results, selectedSubject, selectedPeriod);
        }
      }

    } catch (error) {
      console.error('Error fetching examination data:', error);
      // Use safe toast call
      if (typeof showToast === 'function') {
        showToast('Failed to load examination data', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch student analytics matrix and data
  const fetchStudentMatrix = async () => {
    try {
      // Fetch student analytics matrix
      const matrixResponse = await api.get(`/analytics/student/${studentId}/matrix`);
      if (matrixResponse.data.success) {
        setPerformanceMatrix(matrixResponse.data.data.performanceMatrix);
        setStudentData(matrixResponse.data.data.studentInfo);
      }
    } catch (error) {
      console.error('Error fetching student matrix:', error);
    }
  };

  // Extract available filter options from exam data
  const extractFilterOptions = (data) => {
    const subjects = new Set();
    const periods = new Set();
    
    data.forEach(exam => {
      const subject = exam.test?.subject || exam.subject || 'Unknown Subject';
      subjects.add(subject);
      
      // Extract period from test date (month/year)
      const testDate = new Date(exam.test?.testDate || exam.date || exam.createdAt || exam.enteredOn);
      const period = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}`;
      periods.add(period);
    });
    
    setAvailableSubjects([...subjects].sort());
    setAvailablePeriods([...periods].sort().reverse()); // Most recent first
  };

  // Apply filters to exam data
  const applyFilters = (data, subject, period) => {
    let filteredData = [...data];
    
    // Filter by subject
    if (subject !== 'all') {
      filteredData = filteredData.filter(exam => {
        const examSubject = exam.test?.subject || exam.subject || 'Unknown Subject';
        return examSubject === subject;
      });
    }
    
    // Filter by period
    if (period !== 'all') {
      filteredData = filteredData.filter(exam => {
        const testDate = new Date(exam.test?.testDate || exam.date || exam.createdAt || exam.enteredOn);
        const examPeriod = `${testDate.getFullYear()}-${String(testDate.getMonth() + 1).padStart(2, '0')}`;
        return examPeriod === period;
      });
    }
    
    setExamData(filteredData);
    calculateStats(filteredData);
    calculateSubjectPerformance(filteredData);
  };

  // Handle filter changes
  const handleSubjectFilter = (subject) => {
    setSelectedSubject(subject);
    applyFilters(allExamData, subject, selectedPeriod);
  };

  const handlePeriodFilter = (period) => {
    setSelectedPeriod(period);
    applyFilters(allExamData, selectedSubject, period);
  };

  // Calculate examination statistics
  const calculateStats = (data) => {
    if (!data.length) {
      setStats({
        totalExams: 0,
        averageMarks: 0,
        highestMarks: 0,
        lowestMarks: 0,
        passedExams: 0,
        failedExams: 0,
        improvementNeeded: []
      });
      return;
    }

    const totalExams = data.length;
    const percentages = data.map(exam => {
      const totalMarks = exam.test?.totalMarks || exam.totalMarks || 100;
      const obtainedMarks = exam.obtainedMarks || 0;
      return Math.round((obtainedMarks / totalMarks) * 100);
    });
    
    const averageMarks = Math.round(percentages.reduce((sum, perc) => sum + perc, 0) / totalExams);
    const highestMarks = Math.max(...percentages);
    const lowestMarks = Math.min(...percentages);
    
    // Assuming passing marks is 40%
    const passingMarks = 40;
    const passedExams = percentages.filter(perc => perc >= passingMarks).length;
    const failedExams = totalExams - passedExams;
    
    // Identify subjects needing improvement (below 50%)
    const improvementNeeded = data.filter(exam => {
      const totalMarks = exam.test?.totalMarks || exam.totalMarks || 100;
      const obtainedMarks = exam.obtainedMarks || 0;
      const percentage = (obtainedMarks / totalMarks) * 100;
      return percentage < 50;
    }).map(exam => exam.test?.subject || exam.subject || 'Unknown')
      .filter((subject, index, self) => self.indexOf(subject) === index);

    setStats({
      totalExams,
      averageMarks,
      highestMarks,
      lowestMarks,
      passedExams,
      failedExams,
      improvementNeeded
    });
  };

  // Calculate subject-wise performance
  const calculateSubjectPerformance = (data) => {
    const subjectMap = {};
    
    data.forEach(exam => {
      // Use test subject from populated test data or fallback to direct subject
      const subject = exam.test?.subject || exam.subject || 'Unknown Subject';
      const totalMarks = exam.test?.totalMarks || exam.totalMarks || 100;
      const obtainedMarks = exam.obtainedMarks || 0;
      
      if (!subjectMap[subject]) {
        subjectMap[subject] = {
          subject,
          totalMarks: 0,
          obtainedMarks: 0,
          exams: 0,
          highest: 0,
          lowest: 100
        };
      }
      
      const percentage = Math.round((obtainedMarks / totalMarks) * 100);
      subjectMap[subject].totalMarks += totalMarks;
      subjectMap[subject].obtainedMarks += obtainedMarks;
      subjectMap[subject].exams += 1;
      subjectMap[subject].highest = Math.max(subjectMap[subject].highest, percentage);
      subjectMap[subject].lowest = Math.min(subjectMap[subject].lowest, percentage);
    });

    const performance = Object.values(subjectMap).map(subject => ({
      ...subject,
      average: Math.round((subject.obtainedMarks / subject.totalMarks) * 100) || 0
    })).sort((a, b) => b.average - a.average);

    setSubjectPerformance(performance);
  };

  useEffect(() => {
    if (studentId) {
      fetchExaminationData();
      fetchStudentMatrix();
    }
  }, [studentId]); // Only re-fetch when studentId changes

  // Apply filters when allExamData is available
  useEffect(() => {
    if (allExamData.length > 0) {
      applyFilters(allExamData, selectedSubject, selectedPeriod);
    }
  }, [selectedSubject, selectedPeriod, allExamData]);

  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 90) return { grade: 'A+', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'A', color: 'text-green-500' };
    if (percentage >= 70) return { grade: 'B', color: 'text-blue-500' };
    if (percentage >= 60) return { grade: 'C', color: 'text-yellow-500' };
    if (percentage >= 50) return { grade: 'D', color: 'text-orange-500' };
    return { grade: 'F', color: 'text-red-500' };
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getPerformanceIcon = (percentage) => {
    if (percentage >= 80) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (percentage >= 60) return <Star className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Examination Performance
        </h3>
        <p className="text-gray-600 text-sm">Comprehensive analysis of test results and academic performance</p>
      </div>

      {/* Filters */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Subject:</label>
            <select
              value={selectedSubject}
              onChange={(e) => handleSubjectFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Subjects</option>
              {availableSubjects.map(subject => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Period:</label>
            <select
              value={selectedPeriod}
              onChange={(e) => handlePeriodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Periods</option>
              {availablePeriods.map(period => {
                const [year, month] = period.split('-');
                const monthName = new Date(2000, parseInt(month) - 1).toLocaleString('default', { month: 'long' });
                return (
                  <option key={period} value={period}>{monthName} {year}</option>
                );
              })}
            </select>
          </div>

          {(selectedSubject !== 'all' || selectedPeriod !== 'all') && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedSubject('all');
                setSelectedPeriod('all');
              }}
              className="text-sm"
            >
              Clear Filters
            </Button>
          )}

          <div className="text-sm text-gray-600 ml-auto">
            Showing {examData.length} of {allExamData.length} results
          </div>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Exams</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalExams}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-purple-600">{stats.averageMarks}%</p>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Passed Exams</p>
              <p className="text-2xl font-bold text-green-600">{stats.passedExams}</p>
            </div>
            <Award className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Highest Score</p>
              <p className="text-2xl font-bold text-blue-600">{stats.highestMarks}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Performance Overview</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Grade Distribution */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Overall Grade</h5>
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${getGradeFromPercentage(stats.averageMarks).color}`}>
                {getGradeFromPercentage(stats.averageMarks).grade}
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">{stats.averageMarks}%</div>
                <div className="text-sm text-gray-600">Average Performance</div>
              </div>
            </div>
          </div>
          
          {/* Pass/Fail Ratio */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-3">Pass/Fail Ratio</h5>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Passed</span>
                <span className="text-sm font-medium text-green-600">{stats.passedExams}/{stats.totalExams}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${stats.totalExams > 0 ? (stats.passedExams / stats.totalExams) * 100 : 0}%` }}
                ></div>
              </div>
              {stats.failedExams > 0 && (
                <div className="text-sm text-red-600">
                  {stats.failedExams} exam(s) need attention
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Performance Analysis Graphs */}
      <PerformanceGraph 
        examData={examData}
        subjectPerformance={subjectPerformance}
        performanceMatrix={performanceMatrix}
      />

      {/* Subject-wise Performance */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-500" />
          Subject-wise Performance
        </h4>
        
        {subjectPerformance.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No subject performance data available</p>
          </div>
        ) : (
          <div className="space-y-4">
            {subjectPerformance.map((subject, index) => (
              <div key={index} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getPerformanceIcon(subject.average)}
                    <div>
                      <h5 className="font-medium text-gray-900">{subject.subject}</h5>
                      <p className="text-sm text-gray-600">{subject.exams} exam(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${getGradeFromPercentage(subject.average).color}`}>
                      {subject.average}%
                    </div>
                    <div className="text-sm text-gray-600">
                      {getGradeFromPercentage(subject.average).grade}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Progress</span>
                    <span className="font-medium">{subject.average}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        subject.average >= 80 ? 'bg-green-500' :
                        subject.average >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${subject.average}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Lowest: {Math.round(subject.lowest)}%</span>
                    <span>Highest: {Math.round(subject.highest)}%</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Performance Matrix Table */}
      {performanceMatrix && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="h-5 w-5 text-blue-500" />
            Test Performance Matrix
          </h4>
          <p className="text-sm text-gray-600 mb-6">
            Each cell shows: <strong>Test Result %</strong> / <strong>Matric Subject %</strong>
          </p>
          
          {performanceMatrix.classTestResults && performanceMatrix.classTestResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-900">
                      Test
                    </th>
                    {Object.keys(performanceMatrix.currentAverages.subjects || {}).map(subject => (
                      <th key={subject} className="border border-gray-200 px-3 py-2 text-center font-medium text-gray-900">
                        {subject}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {performanceMatrix.classTestResults.map((test, testIndex) => (
                    <tr key={testIndex} className={testIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 px-3 py-2 font-medium text-gray-900">
                        <div>
                          <div className="text-sm">{test.testName}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(test.testDate).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      {Object.keys(performanceMatrix.currentAverages.subjects || {}).map(subject => {
                        const testResult = test.subjects[subject];
                        const matricSubject = performanceMatrix.matriculationBaseline?.subjects?.[subject];
                        
                        return (
                          <td key={subject} className="border border-gray-200 px-3 py-2 text-center">
                            {testResult ? (
                              <div className="space-y-1">
                                <div className="text-sm font-medium">
                                  {Math.round(testResult.percentage)}%
                                  {matricSubject ? (
                                    <>
                                      <span className="text-gray-400 mx-1">/</span>
                                      <span className="text-blue-600">{Math.round(matricSubject)}%</span>
                                    </>
                                  ) : (
                                    <span className="text-gray-400 mx-1">/ N/A</span>
                                  )}
                                </div>
                                <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                  testResult.percentage >= 80 ? 'bg-green-100 text-green-800' :
                                  testResult.percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {testResult.zone || 'N/A'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                  
                  {/* Current Average Row */}
                  <tr className="bg-blue-50 border-t-2 border-blue-200">
                    <td className="border border-gray-200 px-3 py-2 font-bold text-blue-900">
                      Current Average
                    </td>
                    {Object.entries(performanceMatrix.currentAverages.subjects || {}).map(([subject, data]) => {
                      const matricSubject = performanceMatrix.matriculationBaseline?.subjects?.[subject];
                      
                      return (
                        <td key={subject} className="border border-gray-200 px-3 py-2 text-center">
                          <div className="space-y-1">
                            <div className="text-sm font-bold text-blue-900">
                              {data.percentage ? Math.round(data.percentage) : 0}%
                              {matricSubject ? (
                                <>
                                  <span className="text-gray-400 mx-1">/</span>
                                  <span className="text-blue-600">{Math.round(matricSubject)}%</span>
                                </>
                              ) : (
                                <span className="text-gray-400 mx-1">/ N/A</span>
                              )}
                            </div>
                            <div className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                              data.zone === 'green' ? 'bg-green-100 text-green-800' :
                              data.zone === 'blue' ? 'bg-blue-100 text-blue-800' :
                              data.zone === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                              data.zone === 'red' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {data.zone || 'N/A'}
                            </div>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <PieChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Matrix Data</h3>
              <p className="text-gray-600">No test results available for matrix analysis.</p>
            </div>
          )}
          
          {/* Matrix Legend */}
          <div className="mt-6 border-t pt-4">
            <h5 className="font-medium text-gray-900 mb-3">Zone Legend</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-500 rounded"></div>
                <span className="text-sm text-gray-700">Green Zone (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-500 rounded"></div>
                <span className="text-sm text-gray-700">Blue Zone (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-500 rounded"></div>
                <span className="text-sm text-gray-700">Yellow Zone (Needs Focus)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-red-500 rounded"></div>
                <span className="text-sm text-gray-700">Red Zone (Critical)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Areas Needing Improvement */}
      {stats.improvementNeeded.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Areas Needing Improvement
          </h4>
          <div className="space-y-2">
            {stats.improvementNeeded.map((subject, index) => (
              <div key={index} className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-700">
                  <strong>{subject}</strong> - Consider additional practice and support
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Exam Results */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Recent Exam Results</h4>
        
        {examData.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Results</h3>
            <p className="text-gray-600">No examination records found for this student.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {examData.slice().reverse().slice(0, 10).map((exam, index) => {
              const totalMarks = exam.test?.totalMarks || exam.totalMarks || 100;
              const obtainedMarks = exam.obtainedMarks || 0;
              const percentage = Math.round((obtainedMarks / totalMarks) * 100);
              const gradeInfo = getGradeFromPercentage(percentage);
              const testName = exam.test?.title || exam.testName || 'Test';
              const subject = exam.test?.subject || exam.subject || 'Unknown Subject';
              const testType = exam.test?.testType || exam.testType || '';
              const testDate = exam.test?.testDate || exam.date || exam.createdAt || exam.enteredOn;
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPerformanceIcon(percentage)}
                    <div>
                      <div className="font-medium text-gray-900">
                        {subject}
                      </div>
                      <div className="text-sm text-gray-600">
                        {testName} {testType && `(${testType})`} • {formatDate(testDate)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900">
                        {obtainedMarks}/{totalMarks}
                      </div>
                      <div className="text-sm text-gray-600">
                        {percentage}%
                      </div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                      percentage >= 80 ? 'bg-green-100 text-green-800' :
                      percentage >= 60 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {gradeInfo.grade}
                    </div>
                  </div>
                </div>
              );
            })}
            
            {examData.length > 10 && (
              <div className="text-center pt-4">
                <Button variant="outline" size="sm">
                  View All Results ({examData.length})
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Performance Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Strengths</h5>
            <div className="space-y-2">
              {subjectPerformance.filter(s => s.average >= 70).slice(0, 3).map((subject, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-gray-700">
                    Strong performance in <strong>{subject.subject}</strong> ({subject.average}%)
                  </span>
                </div>
              ))}
              {subjectPerformance.filter(s => s.average >= 70).length === 0 && (
                <p className="text-sm text-gray-600">Focus on improving overall performance</p>
              )}
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h5>
            <div className="space-y-2 text-sm text-gray-700">
              {stats.averageMarks >= 80 ? (
                <p>Excellent work! Maintain this high standard and consider advanced topics.</p>
              ) : stats.averageMarks >= 60 ? (
                <p>Good progress! Focus on consistency and strengthening weaker areas.</p>
              ) : (
                <p>Consider additional tutoring and regular practice to improve performance.</p>
              )}
              
              {stats.improvementNeeded.length > 0 && (
                <p>Special attention needed in: {stats.improvementNeeded.join(', ')}</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExaminationTab;