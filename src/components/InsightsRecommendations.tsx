import React from 'react';
import { Lightbulb, AlertTriangle, TrendingUp, Users, Target } from 'lucide-react';
import { EmployeeStats, SLAViolation } from '../types';
import { DynamoService } from '../services/dynamoService';

interface InsightsRecommendationsProps {
  employeeStats: EmployeeStats[];
  slaViolations: SLAViolation[];
  totalTickets: number;
}

interface Insight {
  type: 'success' | 'warning' | 'info' | 'critical';
  title: string;
  description: string;
  action?: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const InsightsRecommendations: React.FC<InsightsRecommendationsProps> = ({
  employeeStats,
  slaViolations,
  totalTickets
}) => {
  const generateInsights = (): Insight[] => {
    const insights: Insight[] = [];
    
    // Calculate key metrics
    const avgTeamScore = (() => {
      const scores = employeeStats
        .map(emp => DynamoService.calculateOverallScore(emp.avg_scores))
        .filter(score => score > 0);
      return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    })();
    
    const slaCompliance = ((totalTickets - slaViolations.length) / totalTickets) * 100;
    
    const topPerformer = employeeStats
      .map(emp => ({ ...emp, score: DynamoService.calculateOverallScore(emp.avg_scores) }))
      .filter(emp => emp.score > 0)
      .sort((a, b) => b.score - a.score)[0];
    
    const lowPerformers = employeeStats
      .map(emp => ({ ...emp, score: DynamoService.calculateOverallScore(emp.avg_scores) }))
      .filter(emp => emp.score > 0 && emp.score < 7.5);
    
    const highSLAViolators = employeeStats
      .filter(emp => emp.sla_violations > 2)
      .sort((a, b) => b.sla_violations - a.sla_violations);

    // Generate insights based on data
    if (avgTeamScore >= 8.5) {
      insights.push({
        type: 'success',
        title: 'Excellent Team Performance',
        description: `Team average score of ${avgTeamScore.toFixed(1)} indicates high-quality customer service.`,
        action: 'Continue current training and recognition programs.',
        icon: TrendingUp
      });
    } else if (avgTeamScore < 7.5) {
      insights.push({
        type: 'critical',
        title: 'Team Performance Below Target',
        description: `Team average score of ${avgTeamScore.toFixed(1)} needs improvement.`,
        action: 'Implement focused training on core criteria and provide additional coaching.',
        icon: AlertTriangle
      });
    }

    if (slaCompliance < 90) {
      insights.push({
        type: 'warning',
        title: 'SLA Compliance Issue',
        description: `SLA compliance at ${slaCompliance.toFixed(1)}% is below the 90% target.`,
        action: 'Review response time processes and consider workload redistribution.',
        icon: Target
      });
    }

    if (topPerformer) {
      insights.push({
        type: 'success',
        title: 'Top Performer Recognition',
        description: `${topPerformer.employee} leads with a score of ${topPerformer.score.toFixed(1)}.`,
        action: 'Consider having them mentor other team members.',
        icon: Users
      });
    }

    if (lowPerformers.length > 0) {
      insights.push({
        type: 'warning',
        title: `${lowPerformers.length} Employee(s) Need Support`,
        description: `${lowPerformers.length} team member(s) scoring below 7.5 need additional support.`,
        action: 'Schedule one-on-one coaching sessions and identify specific improvement areas.',
        icon: Users
      });
    }

    if (highSLAViolators.length > 0) {
      insights.push({
        type: 'critical',
        title: 'Frequent SLA Violations',
        description: `${highSLAViolators.length} employee(s) have multiple SLA violations.`,
        action: 'Review workload distribution and provide time management training.',
        icon: AlertTriangle
      });
    }

    // Sentiment analysis insights
    const totalSentiments = employeeStats.reduce((acc, emp) => {
      acc.positive += emp.sentiment_distribution.positive;
      acc.negative += emp.sentiment_distribution.negative;
      acc.neutral += emp.sentiment_distribution.neutral;
      return acc;
    }, { positive: 0, negative: 0, neutral: 0 });

    const negativePercentage = (totalSentiments.negative / totalTickets) * 100;
    if (negativePercentage > 15) {
      insights.push({
        type: 'warning',
        title: 'High Negative Sentiment',
        description: `${negativePercentage.toFixed(1)}% of interactions have negative sentiment.`,
        action: 'Focus on empathy and tone training to improve customer satisfaction.',
        icon: AlertTriangle
      });
    }

    return insights.slice(0, 5); // Limit to 5 insights
  };

  const insights = generateInsights();

  const getInsightStyle = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'border-green-500/20 bg-green-500/10';
      case 'warning':
        return 'border-yellow-500/20 bg-yellow-500/10';
      case 'critical':
        return 'border-red-500/20 bg-red-500/10';
      default:
        return 'border-blue-500/20 bg-blue-500/10';
    }
  };

  const getIconColor = (type: Insight['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Lightbulb className="h-5 w-5 mr-2 text-yellow-400" />
        Insights & Recommendations
      </h3>
      
      <div className="space-y-4">
        {insights.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No specific insights available at this time.</p>
          </div>
        ) : (
          insights.map((insight, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border ${getInsightStyle(insight.type)}`}
            >
              <div className="flex items-start space-x-3">
                <insight.icon className={`h-5 w-5 mt-0.5 ${getIconColor(insight.type)}`} />
                <div className="flex-1">
                  <h4 className="font-medium text-white mb-1">{insight.title}</h4>
                  <p className="text-gray-300 text-sm mb-2">{insight.description}</p>
                  {insight.action && (
                    <div className="text-xs text-gray-400 bg-gray-700/50 rounded px-2 py-1">
                      <strong>Recommended Action:</strong> {insight.action}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
