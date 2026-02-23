import React from 'react';
import { BookOpen, TrendingUp, TrendingDown, Award, Target, Calendar, Star, AlertTriangle } from 'lucide-react';

const OptimizedExaminationTab = ({ studentData }) => {
  if (!studentData) {
    return (
      <div className="text-center py-8">
        <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600">No examination data available</p>
      </div>
    );
  }

  const { examinationStats, recentExams, matriculationPercentage } = studentData;

  // Helper functions
  const getGradeFromPercentage = (percentage) => {
    if (percentage >= 80) return { grade: 'A+', color: 'text-green-600' };
    if (percentage >= 70) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 60) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 50) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 40) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  const getPerformanceIcon = (percentage) => {
    if (percentage >= 80) return <Star className="h-5 w-5 text-green-500" />;
    if (percentage >= 60) return <TrendingUp className="h-5 w-5 text-blue-500" />;
    if (percentage >= 40) return <Target className="h-5 w-5 text-yellow-500" />;
    return <AlertTriangle className="h-5 w-5 text-red-500" />;
  };

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-blue-500" />
          Examination Performance
        </h3>
        <p className="text-gray-600 text-sm">Comprehensive analysis of test results and academic performance</p>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Exams</p>
              <p className="text-2xl font-bold text-gray-900">{examinationStats?.totalExams || 0}</p>
            </div>
            <BookOpen className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Average Score</p>
              <p className="text-2xl font-bold text-purple-600">{examinationStats?.averageMarks || 0}%</p>
            </div>
            <Target className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Passed Exams</p>
              <p className="text-2xl font-bold text-green-600">{examinationStats?.passedExams || 0}</p>
            </div>
            <Award className="h-8 w-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Highest Score</p>
              <p className="text-2xl font-bold text-blue-600">{examinationStats?.highestMarks || 0}%</p>
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
              <div className={`text-4xl font-bold ${getGradeFromPercentage(examinationStats?.averageMarks || 0).color}`}>
                {getGradeFromPercentage(examinationStats?.averageMarks || 0).grade}
              </div>
              <div>
                <div className="text-2xl font-semibold text-gray-900">{examinationStats?.averageMarks || 0}%</div>
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
                <span className="text-sm font-medium text-green-600">
                  {examinationStats?.passedExams || 0}/{examinationStats?.totalExams || 0}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full"
                  style={{ 
                    width: `${examinationStats?.totalExams > 0 ? 
                      ((examinationStats?.passedExams || 0) / examinationStats.totalExams) * 100 : 0}%` 
                  }}
                ></div>
              </div>
              {(examinationStats?.failedExams || 0) > 0 && (
                <div className="text-sm text-red-600">
                  {examinationStats.failedExams} exam(s) need attention
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subject Performance */}
      {examinationStats?.subjectPerformance && examinationStats.subjectPerformance.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Subject Performance</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {examinationStats.subjectPerformance.map((subject) => (
              <div key={subject.subject} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                    </div>
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
                        subject.average >= 60 ? 'bg-blue-500' :
                        subject.average >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(subject.average, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Baseline Comparison */}
      {matriculationPercentage > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-medium text-gray-900 mb-4">Matriculation Comparison</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{matriculationPercentage}%</div>
              <div className="text-sm text-gray-600">Matriculation</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{examinationStats?.averageMarks || 0}%</div>
              <div className="text-sm text-gray-600">Current Average</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className={`text-2xl font-bold ${
                (examinationStats?.averageMarks || 0) >= matriculationPercentage ? 
                'text-green-600' : 'text-red-600'
              }`}>
                {((examinationStats?.averageMarks || 0) - matriculationPercentage).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Improvement</div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Exam Results */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Recent Exam Results</h4>
        
        {!recentExams || recentExams.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Exam Results</h3>
            <p className="text-gray-600">No examination records found for this student.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentExams.map((exam, index) => {
              if (exam.type === 'matriculation') {
                return (
                  <div key={index} className="flex items-center justify-between p-4 bg-yellow-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="h-5 w-5 text-yellow-500" />
                      <div>
                        <div className="font-medium text-gray-900">Matriculation</div>
                        <div className="text-sm text-gray-600">Academic baseline</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{matriculationPercentage}%</div>
                      <div className="text-sm text-gray-600">Overall</div>
                    </div>
                  </div>
                );
              }

              const totalMarks = exam.totalMarks || 100;
              const obtainedMarks = exam.obtainedMarks || 0;
              const percentage = Math.round((obtainedMarks / totalMarks) * 100);
              const gradeInfo = getGradeFromPercentage(percentage);
              
              return (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {getPerformanceIcon(percentage)}
                    <div>
                      <div className="font-medium text-gray-900">{exam.subject || 'Unknown Subject'}</div>
                      <div className="text-sm text-gray-600">
                        {exam.examName} • {formatDate(exam.testDate)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium text-gray-900">{obtainedMarks}/{totalMarks}</div>
                      <div className="text-sm text-gray-600">{percentage}%</div>
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
          </div>
        )}
      </div>

      {/* Performance Insights */}
      <div className="bg-white border rounded-lg p-6">
        <h4 className="font-medium text-gray-900 mb-4">Performance Insights</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Strengths */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Strengths</h5>
            <div className="space-y-2 text-sm text-gray-700">
              {examinationStats?.subjectPerformance?.filter(s => s.average >= 70).map(subject => (
                <div key={subject.subject} className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">
                    <strong>{subject.subject}</strong> - Excellent performance ({subject.average}%)
                  </span>
                </div>
              )) || []}
              {(!examinationStats?.subjectPerformance?.filter(s => s.average >= 70).length) && (
                <p className="text-sm text-gray-600">Focus on building stronger foundations</p>
              )}
            </div>
          </div>
          
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2">Recommendations</h5>
            <div className="space-y-2 text-sm text-gray-700">
              {(examinationStats?.averageMarks || 0) >= 80 ? (
                <p>Excellent work! Maintain this high standard and consider advanced topics.</p>
              ) : (examinationStats?.averageMarks || 0) >= 60 ? (
                <p>Good progress! Focus on consistency and strengthening weaker areas.</p>
              ) : (
                <p>Consider additional tutoring and regular practice to improve performance.</p>
              )}
              
              {examinationStats?.subjectPerformance?.filter(s => s.average < 50).length > 0 && (
                <p>Special attention needed in: {
                  examinationStats.subjectPerformance
                    .filter(s => s.average < 50)
                    .map(s => s.subject)
                    .join(', ')
                }</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OptimizedExaminationTab;