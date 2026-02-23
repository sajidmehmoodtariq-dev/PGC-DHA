import React from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { TrendingUp, BarChart3 } from 'lucide-react';

const PerformanceGraph = ({ examData, subjectPerformance, performanceMatrix }) => {
  // Prepare data for the line chart showing performance over time
  const prepareTimelineData = () => {
    if (!examData || examData.length === 0) {
      // If no exam data but we have matriculation, show just baseline
      if (performanceMatrix?.matriculationBaseline?.overall > 0) {
        return [{
          testIndex: 0,
          testName: "Matriculation Baseline",
          score: performanceMatrix.matriculationBaseline.overall,
          subject: "Overall",
          date: "Baseline",
          marks: "Matriculation",
          isBaseline: true
        }];
      }
      return [];
    }
    
    // Sort exam data by date
    const sortedExams = examData
      .slice()
      .sort((a, b) => new Date(a.test?.testDate || a.date || a.enteredOn) - new Date(b.test?.testDate || b.date || b.enteredOn));
    
    const timelineData = [];
    
    // Add matriculation baseline as starting point (index 0)
    if (performanceMatrix?.matriculationBaseline?.overall) {
      timelineData.push({
        testIndex: 0,
        testName: "Matriculation Baseline",
        score: performanceMatrix.matriculationBaseline.overall,
        subject: "Overall",
        date: "Baseline",
        marks: "Matriculation",
        isBaseline: true
      });
    }

    // Add exam data starting from index 1 (include all valid tests, even 0 scores)
    const examTimelineData = sortedExams
      .filter(exam => {
        const totalMarks = exam.test?.totalMarks || exam.totalMarks;
        // Only exclude tests where we don't have total marks (incomplete test setup)
        return totalMarks > 0;
      })
      .map((exam, index) => {
        const totalMarks = exam.test?.totalMarks || exam.totalMarks || 100;
        const obtainedMarks = exam.obtainedMarks || 0;
        const percentage = Math.round((obtainedMarks / totalMarks) * 100);
        const testDate = new Date(exam.test?.testDate || exam.date || exam.enteredOn);
        const subject = exam.test?.subject || exam.subject || 'Unknown';
        
        return {
          testIndex: index + 1, // Start from 1 since 0 is matriculation
          testName: `${subject} Test ${index + 1}`,
          score: percentage,
          subject: subject,
          date: testDate.toLocaleDateString(),
          marks: `${obtainedMarks}/${totalMarks}`,
          isBaseline: false
        };
      });
    
    return [...timelineData, ...examTimelineData];
  };

  // Prepare data for comparison between test scores and matric baseline
  const prepareComparisonData = () => {
    if (!performanceMatrix?.currentAverages?.subjects) return [];
    
    return Object.entries(performanceMatrix.currentAverages.subjects).map(([subject, data]) => {
      const currentScore = data.percentage || 0;
      const matricScore = performanceMatrix.matriculationBaseline?.subjects?.[subject] || 0;
      
      return {
        subject: subject,
        currentScore: Math.round(currentScore),
        matricBaseline: Math.round(matricScore),
        difference: Math.round(currentScore - matricScore)
      };
    });
  };

  // Prepare subject-wise performance data for bar chart
  const prepareSubjectData = () => {
    if (!subjectPerformance || subjectPerformance.length === 0) return [];
    
    return subjectPerformance.map(subject => ({
      subject: subject.subject,
      average: subject.average,
      highest: subject.highest,
      lowest: subject.lowest,
      exams: subject.exams
    }));
  };

  const timelineData = prepareTimelineData();
  const comparisonData = prepareComparisonData();
  const subjectData = prepareSubjectData();

  // Custom tooltip for timeline chart
  const TimelineTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.testName}</p>
          <p className="text-sm text-gray-600">Score: {data.score}%</p>
          {data.isBaseline ? (
            <p className="text-sm text-orange-600">Matriculation Baseline</p>
          ) : (
            <>
              <p className="text-sm text-gray-600">Marks: {data.marks}</p>
              <p className="text-sm text-gray-600">Date: {data.date}</p>
              <p className="text-sm text-gray-600">Subject: {data.subject}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  // Custom tooltip for comparison chart
  const ComparisonTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const current = payload[0]?.value || 0;
      const matric = payload[1]?.value || 0;
      const difference = current - matric;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <p className="text-sm text-blue-600">Current: {current}%</p>
          <p className="text-sm text-orange-600">Matric Baseline: {matric}%</p>
          <p className={`text-sm font-medium ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            Difference: {difference > 0 ? '+' : ''}{difference}%
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white border rounded-lg p-6">
      <h4 className="font-medium text-gray-900 mb-6 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-blue-500" />
        Performance Analysis Graphs
      </h4>

      <div className="space-y-8">
        {/* Performance Timeline */}
        {timelineData.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-4">Performance Timeline</h5>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={timelineData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="testIndex" 
                    label={{ value: 'Test Number', position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis 
                    label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<TimelineTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={(props) => {
                      const { payload } = props;
                      if (payload?.isBaseline) {
                        return <circle {...props} r={6} fill="#F59E0B" stroke="#D97706" strokeWidth={2} />;
                      }
                      return <circle {...props} r={4} fill="#3B82F6" stroke="#1E40AF" strokeWidth={2} />;
                    }}
                    name="Performance Score"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Current Performance vs Matric Baseline Comparison */}
        {comparisonData.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-4">Current Performance vs Matric Baseline</h5>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="subject" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip content={<ComparisonTooltip />} />
                  <Legend />
                  <Bar dataKey="currentScore" fill="#3B82F6" name="Current Score" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="matricBaseline" fill="#F59E0B" name="Matric Baseline" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Subject-wise Performance Distribution */}
        {subjectData.length > 0 && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-4">Subject-wise Performance Range</h5>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={subjectData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="subject" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis 
                    label={{ value: 'Percentage (%)', angle: -90, position: 'insideLeft' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    formatter={(value, name) => [
                      `${value}%`, 
                      name === 'average' ? 'Average' : 
                      name === 'highest' ? 'Highest' : 'Lowest'
                    ]}
                    labelFormatter={(label) => `Subject: ${label}`}
                  />
                  <Legend />
                  <Bar dataKey="average" fill="#10B981" name="Average" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="highest" fill="#3B82F6" name="Highest" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="lowest" fill="#EF4444" name="Lowest" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Performance Zones Overview */}
        {performanceMatrix?.currentAverages?.subjects && (
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-4">Zone Distribution</h5>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(performanceMatrix.currentAverages.subjects).map(([subject, data]) => (
                <div key={subject} className="text-center p-3 border rounded-lg">
                  <div className={`w-full h-2 rounded-full mb-2 ${
                    data.zone === 'green' ? 'bg-green-500' :
                    data.zone === 'blue' ? 'bg-blue-500' :
                    data.zone === 'yellow' ? 'bg-yellow-500' :
                    data.zone === 'red' ? 'bg-red-500' : 'bg-gray-500'
                  }`}></div>
                  <div className="text-sm font-medium text-gray-900">{subject}</div>
                  <div className="text-xs text-gray-600">{Math.round(data.percentage || 0)}%</div>
                  <div className={`text-xs font-medium capitalize ${
                    data.zone === 'green' ? 'text-green-600' :
                    data.zone === 'blue' ? 'text-blue-600' :
                    data.zone === 'yellow' ? 'text-yellow-600' :
                    data.zone === 'red' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {data.zone || 'unassigned'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Graph Legend and Info */}
      <div className="mt-6 pt-4 border-t">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h6 className="font-medium text-gray-900 mb-2">Graph Information</h6>
            <ul className="space-y-1">
              <li>• Timeline shows performance progression over tests</li>
              <li>• Comparison chart displays current vs matric baseline scores</li>
              <li>• Range chart shows average, highest, and lowest scores per subject</li>
            </ul>
          </div>
          <div>
            <h6 className="font-medium text-gray-900 mb-2">Zone Colors</h6>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span>Green (Excellent)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span>Blue (Good)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                <span>Yellow (Needs Focus)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded"></div>
                <span>Red (Critical)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceGraph;