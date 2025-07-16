import React from 'react';
import { TrendingUp, Award, Target, Users } from 'lucide-react';
import { EmployeeStats } from '../types';
import { DynamoService } from '../services/dynamoService';
import { TicketData } from '../types';

interface OverallAnalyticsProps {
  employeeStats: EmployeeStats[];
  tickets: TicketData[];
}

export const OverallAnalytics: React.FC<OverallAnalyticsProps> = ({ employeeStats , tickets }) => {
  const totalTickets = employeeStats.reduce((sum, emp) => sum + emp.total_tickets, 0);
  const totalViolations = employeeStats.reduce((sum, emp) => sum + emp.sla_violations, 0);
  const slaCompliance = DynamoService.calculateSLACompliance(tickets);

  const topPerformers = employeeStats
    .map(emp => ({
      ...emp,
      avgScore: DynamoService.calculateOverallScore(emp.avg_scores)
    }))
    .filter(emp => emp.avgScore > 0)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 5);

  const coreCategories = [
    { name: 'Tone & Trust', key: 'tone_and_trust', color: 'bg-pink-500' },
    { name: 'Grammar & Language', key: 'grammar_language', color: 'bg-blue-500' },
    { name: 'Professionalism', key: 'professionalism_clarity', color: 'bg-purple-500' },
    { name: 'Technical Clarity', key: 'non_tech_clarity', color: 'bg-cyan-500' },
    { name: 'Empathy', key: 'empathy', color: 'bg-green-500' },
    { name: 'Responsiveness', key: 'responsiveness', color: 'bg-yellow-500' }
  ];

  const contextualCategories = [
    { name: 'Client Alignment', key: 'client_alignment', color: 'bg-indigo-500' },
    { name: 'Proactivity', key: 'proactivity', color: 'bg-orange-500' },
    { name: 'Ownership', key: 'ownership_accountability', color: 'bg-red-500' },
    { name: 'Enablement', key: 'enablement', color: 'bg-teal-500' },
    { name: 'Consistency', key: 'consistency', color: 'bg-violet-500' },
    { name: 'Risk Impact', key: 'risk_impact', color: 'bg-rose-500' }
  ];

  const coreCategoryAverages = coreCategories.map(category => ({
    ...category,
    average: (() => {
      const validScores = employeeStats
        .map(emp => emp.avg_scores[category.key as keyof typeof emp.avg_scores])
        .filter(score => !isNaN(score) && score > 0);
      return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
    })()
  }));

  const contextualCategoryAverages = contextualCategories.map(category => ({
    ...category,
    average: (() => {
      const validScores = employeeStats
        .map(emp => emp.avg_scores[category.key as keyof typeof emp.avg_scores])
        .filter(score => !isNaN(score) && score > 0);
      return validScores.length > 0 ? validScores.reduce((sum, score) => sum + score, 0) / validScores.length : 0;
    })()
  }));

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 mr-2 text-blue-400" />
          Overall Analytics
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm">SLA Compliance</p>
                <p className="text-2xl font-bold text-white">{slaCompliance.toFixed(1)}%</p>
              </div>
              <Target className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Active Employees</p>
                <p className="text-2xl font-bold text-white">{employeeStats.length}</p>
              </div>
              <Users className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm">Avg Team Score</p>
                <p className="text-2xl font-bold text-white">
                  {(() => {
                    const overallScores = employeeStats.map(emp => DynamoService.calculateOverallScore(emp.avg_scores)).filter(score => score > 0);
                    return overallScores.length > 0 ? (overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length).toFixed(1) : '0.0';
                  })()}
                </p>
              </div>
              <Award className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2 text-yellow-400" />
          Top Performers
        </h3>
        
        <div className="space-y-3">
          {topPerformers.map((performer, index) => (
            <div key={performer.employee} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                  index === 0 ? 'bg-yellow-500' : 
                  index === 1 ? 'bg-gray-400' : 
                  index === 2 ? 'bg-orange-500' : 'bg-gray-600'
                }`}>
                  {index + 1}
                </div>
                <span className="text-white font-medium">{performer.employee}</span>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-gray-400 text-sm">{performer.total_tickets} tickets</span>
                <span className="text-green-400 font-bold">{performer.avgScore.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Core Criteria Scores */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Core Criteria Averages</h3>
        <p className="text-gray-400 text-sm mb-4">These criteria are evaluated for all tickets</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {coreCategoryAverages.map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <span className="text-gray-300">{category.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${category.color}`}
                    style={{ width: `${(category.average / 10) * 100}%` }}
                  />
                </div>
                <span className="text-white font-medium w-8">{category.average.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contextual Criteria Scores */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Contextual Criteria Averages</h3>
        <p className="text-gray-400 text-sm mb-4">These criteria are evaluated only when applicable</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {contextualCategoryAverages.map((category) => (
            <div key={category.key} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${category.color}`} />
                <span className="text-gray-300">{category.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-20 bg-gray-600 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${category.color}`}
                    style={{ width: `${(category.average / 10) * 100}%` }}
                  />
                </div>
                <span className="text-white font-medium w-8">
                  {category.average > 0 ? category.average.toFixed(1) : 'N/A'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
