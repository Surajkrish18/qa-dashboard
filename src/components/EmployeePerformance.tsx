import React from 'react';
import { User, Star, TrendingUp, TrendingDown, X } from 'lucide-react';
import { EmployeeStats } from '../types';
import { DynamoService } from '../services/dynamoService';

interface EmployeePerformanceProps {
  employeeStats: EmployeeStats[];
  selectedEmployee: string | null;
  onEmployeeSelect: (employee: string | null) => void;
}

interface EmployeeModalProps {
  employee: EmployeeStats;
  onClose: () => void;
}

const EmployeeModal: React.FC<EmployeeModalProps> = ({ employee, onClose }) => {
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-400';
    if (score >= 7.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8.5) return 'bg-green-500/10';
    if (score >= 7.5) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  const avgScore = DynamoService.calculateOverallScore(employee.avg_scores);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <Star className="h-6 w-6 text-yellow-400" />
            <h2 className="text-xl font-semibold text-white">Detailed Performance: {employee.employee}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* QA Scores */}
            <div className="space-y-4">
              <div className="space-y-6">
                {/* Core Criteria */}
                <div>
                  <h4 className="font-medium text-white mb-3">Core Criteria</h4>
                  <div className="space-y-2">
                    {['tone_and_trust', 'grammar_language', 'professionalism_clarity', 'non_tech_clarity', 'empathy', 'responsiveness'].map((key) => {
                      const score = employee.avg_scores[key as keyof typeof employee.avg_scores];
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-gray-300 capitalize text-sm">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-700 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                                style={{ width: `${(score / 10) * 100}%` }}
                              />
                            </div>
                            <span className={`text-sm font-medium ${getScoreColor(score)}`}>
                              {score.toFixed(1)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Contextual Criteria */}
                <div>
                  <h4 className="font-medium text-white mb-3">Contextual Criteria</h4>
                  <div className="space-y-2">
                    {['client_alignment', 'proactivity', 'ownership_accountability', 'enablement', 'consistency', 'risk_impact'].map((key) => {
                      const score = employee.avg_scores[key as keyof typeof employee.avg_scores];
                      const hasScore = !isNaN(score) && score > 0;
                      return (
                        <div key={key} className="flex items-center justify-between">
                          <span className="text-gray-300 capitalize text-sm">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <div className="flex items-center space-x-2">
                            <div className="w-20 bg-gray-700 rounded-full h-2">
                              {hasScore && (
                                <div 
                                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                  style={{ width: `${(score / 10) * 100}%` }}
                                />
                              )}
                            </div>
                            <span className={`text-sm font-medium ${hasScore ? getScoreColor(score) : 'text-gray-500'}`}>
                              {hasScore ? score.toFixed(1) : 'N/A'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Overall Score */}
                <div className="pt-4 border-t border-gray-600">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Overall Score</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-700 rounded-full h-3">
                        <div 
                          className="bg-gradient-to-r from-yellow-500 to-orange-500 h-3 rounded-full"
                          style={{ width: `${(avgScore / 10) * 100}%` }}
                        />
                      </div>
                      <span className={`font-bold ${getScoreColor(avgScore)}`}>
                        {avgScore.toFixed(1)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Sentiment Distribution */}
            <div className="space-y-4">
              <h4 className="font-medium text-white">Sentiment Distribution</h4>
              {Object.entries(employee.sentiment_distribution).map(([sentiment, count]) => (
                <div key={sentiment} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${
                      sentiment === 'positive' ? 'bg-green-500' :
                      sentiment === 'negative' ? 'bg-red-500' :
                      sentiment === 'neutral' ? 'bg-gray-500' : 'bg-yellow-500'
                    }`} />
                    <span className="text-gray-300 capitalize">{sentiment}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          sentiment === 'positive' ? 'bg-green-500' :
                          sentiment === 'negative' ? 'bg-red-500' :
                          sentiment === 'neutral' ? 'bg-gray-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${(count / employee.total_tickets) * 100}%` }}
                      />
                    </div>
                    <div className="text-sm text-right min-w-[40px]">
                      <div className="text-white font-medium">{count}</div>
                      <div className="text-gray-400 text-xs">
                        {employee.total_tickets > 0 ? ((count / employee.total_tickets) * 100).toFixed(1) : '0.0'}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Summary Stats */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Total Tickets</span>
                <span className="text-white font-semibold">{employee.total_tickets}</span>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">SLA Violations</span>
                <span className="text-red-400 font-semibold">{employee.sla_violations}</span>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">SLA Compliance</span>
                <span className="text-green-400 font-semibold">
                  {(((employee.total_tickets - employee.sla_violations) / employee.total_tickets) * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EmployeePerformance: React.FC<EmployeePerformanceProps> = ({
  employeeStats,
  selectedEmployee,
  onEmployeeSelect
}) => {
  const getScoreColor = (score: number) => {
    if (score >= 8.5) return 'text-green-400';
    if (score >= 7.5) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBackground = (score: number) => {
    if (score >= 8.5) return 'bg-green-500/10';
    if (score >= 7.5) return 'bg-yellow-500/10';
    return 'bg-red-500/10';
  };

  const selectedEmployeeData = selectedEmployee 
    ? employeeStats.find(emp => emp.employee === selectedEmployee)
    : null;

  return (
    <div className="space-y-6">
      {/* Employee List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <User className="h-5 w-5 mr-2 text-blue-400" />
          Employee Performance Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employeeStats.map((emp) => {
            const avgScore = DynamoService.calculateOverallScore(emp.avg_scores);
            const isSelected = selectedEmployee === emp.employee;
            
            return (
              <div
                key={emp.employee}
                onClick={() => onEmployeeSelect(isSelected ? null : emp.employee)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-500/10' 
                    : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white truncate">{emp.employee}</h4>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${getScoreBackground(avgScore)} ${getScoreColor(avgScore)}`}>
                    {avgScore.toFixed(1)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <span>{emp.total_tickets} tickets</span>
                  <span>{emp.sla_violations} SLA violations</span>
                </div>
                
                <div className="mt-2 flex items-center">
                  <div className="flex-1 bg-gray-600 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${(avgScore / 10) * 100}%` }}
                    />
                  </div>
                  <span className="ml-2 text-xs text-gray-400">{((avgScore / 10) * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Employee Modal */}
      {selectedEmployeeData && (
        <EmployeeModal
          employee={selectedEmployeeData}
          onClose={() => onEmployeeSelect(null)}
        />
      )}
    </div>
  );
};

