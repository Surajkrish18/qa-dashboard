import React, { useState, useMemo } from 'react';
import { Calendar, Download, TrendingUp, Users, Target, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { TicketData, EmployeeStats } from '../types';
import { DynamoService } from '../services/dynamoService';
import { Sparkline } from './Sparkline';

interface WeeklyReportProps {
  tickets: TicketData[];
  employeeStats: EmployeeStats[];
}

interface WeeklyData {
  weekStart: string;
  weekEnd: string;
  totalTickets: number;
  uniqueTickets: number;
  avgScore: number;
  slaViolations: number;
  sentimentDistribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  topPerformers: Array<{
    employee: string;
    score: number;
    tickets: number;
  }>;
  employeeDetails: Array<{
    employee: string;
    totalInteractions: number;
    uniqueTickets: number;
    avgScore: number;
    ticketIds: string[];
    sentimentDistribution: {
      positive: number;
      negative: number;
      neutral: number;
      mixed: number;
    };
    slaViolations: number;
  }>;
  dailyTickets: number[];
  dailyScores: number[];
}

export const WeeklyReport: React.FC<WeeklyReportProps> = ({ tickets, employeeStats }) => {
  const [selectedWeek, setSelectedWeek] = useState<string>('');

  // Generate available weeks from ticket data
  const availableWeeks = useMemo(() => {
    const weeks = new Set<string>();
    
    tickets.forEach(ticket => {
      const date = new Date(ticket.created_date);
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay()); // Start of week (Sunday)
      const weekKey = weekStart.toISOString().split('T')[0];
      weeks.add(weekKey);
    });
    
    return Array.from(weeks).sort().reverse();
  }, [tickets]);

  // Set default week to most recent
  React.useEffect(() => {
    if (availableWeeks.length > 0 && !selectedWeek) {
      setSelectedWeek(availableWeeks[0]);
    }
  }, [availableWeeks, selectedWeek]);

  const weeklyData = useMemo((): WeeklyData | null => {
    if (!selectedWeek) return null;

    const weekStart = new Date(selectedWeek);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    // Filter tickets for the selected week
    const weekTickets = tickets.filter(ticket => {
      const ticketDate = new Date(ticket.created_date);
      return ticketDate >= weekStart && ticketDate <= weekEnd;
    });

    if (weekTickets.length === 0) {
      return {
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: weekEnd.toLocaleDateString(),
        totalTickets: 0,
        uniqueTickets: 0,
        avgScore: 0,
        slaViolations: 0,
        sentimentDistribution: { positive: 0, negative: 0, neutral: 0, mixed: 0 },
        topPerformers: [],
        employeeDetails: [],
        dailyTickets: [0, 0, 0, 0, 0, 0, 0],
        dailyScores: [0, 0, 0, 0, 0, 0, 0]
      };
    }

    // Use the EXACT same SLA calculation as Dashboard component
    const slaCalculation = (() => {
      if (weekTickets.length === 0) return { violations: 0, compliance: 100 };
      
      const interactions: any[] = [];
      const processedInteractions = new Set<string>();
      
      weekTickets.forEach(ticket => {
        if (!ticket.response_times || !Array.isArray(ticket.response_times)) {
          return;
        }
        
        try {
          const employeeResponses = ticket.response_times.filter(
            response => response && response.response_type === 'Employee to Client'
          );
          
          employeeResponses.forEach(response => {
            if (!response || !response.response_by || !response.response_time) {
              return;
            }
            
            // Create unique key to prevent duplicates
            const interactionKey = `${ticket.ticket_id}-${response.response_by}-${response.response_time}`;
            if (processedInteractions.has(interactionKey)) return;
            processedInteractions.add(interactionKey);
            
            const responseTime = DynamoService.parseResponseTime(response.response_time);
            interactions.push({
              ticket_id: ticket.ticket_id,
              employee: response.response_by,
              response_time: responseTime,
              is_violation: responseTime > 30
            });
          });
        } catch (error) {
          console.warn('Error processing SLA compliance for ticket:', ticket.ticket_id, error);
        }
      });
      
      const totalInteractions = interactions.length;
      const violationInteractions = interactions.filter(interaction => interaction.is_violation).length;
      const compliance = totalInteractions > 0 
        ? (((totalInteractions - violationInteractions) / totalInteractions) * 100)
        : 100;
      
      return { violations: violationInteractions, compliance };
    })();

    // Calculate unique tickets for the week (count unique ticket IDs)
    const uniqueTickets = new Set(weekTickets.map(ticket => ticket.ticket_id)).size;

    // Calculate metrics
    const avgScore = (() => {
      const scores = weekTickets.map(ticket => DynamoService.calculateOverallScore({
        tone_and_trust: ticket.tone_and_trust,
        grammar_language: ticket.grammar_language,
        professionalism_clarity: ticket.professionalism_clarity,
        non_tech_clarity: ticket.non_tech_clarity,
        empathy: ticket.empathy,
        responsiveness: ticket.responsiveness,
        client_alignment: ticket.client_alignment,
        proactivity: ticket.proactivity,
        ownership_accountability: ticket.ownership_accountability,
        enablement: ticket.enablement,
        consistency: ticket.consistency,
        risk_impact: ticket.risk_impact
      })).filter(score => score > 0);
      return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    })();

    const sentimentDistribution = weekTickets.reduce((acc, ticket) => {
      const sentiment = ticket.sentiment?.toLowerCase();
      if (sentiment === 'positive') acc.positive++;
      else if (sentiment === 'negative') acc.negative++;
      else if (sentiment === 'neutral') acc.neutral++;
      else if (sentiment === 'mixed') acc.mixed++;
      return acc;
    }, { positive: 0, negative: 0, neutral: 0, mixed: 0 });

    // Calculate top performers for the week
    const weekEmployeeStats: Record<string, { tickets: number; totalScore: number; scores: number[] }> = {};
    weekTickets.forEach(ticket => {
      if (!weekEmployeeStats[ticket.employee]) {
        weekEmployeeStats[ticket.employee] = { tickets: 0, totalScore: 0, scores: [] };
      }
      const score = DynamoService.calculateOverallScore({
        tone_and_trust: ticket.tone_and_trust,
        grammar_language: ticket.grammar_language,
        professionalism_clarity: ticket.professionalism_clarity,
        non_tech_clarity: ticket.non_tech_clarity,
        empathy: ticket.empathy,
        responsiveness: ticket.responsiveness,
        client_alignment: ticket.client_alignment,
        proactivity: ticket.proactivity,
        ownership_accountability: ticket.ownership_accountability,
        enablement: ticket.enablement,
        consistency: ticket.consistency,
        risk_impact: ticket.risk_impact
      });
      if (score > 0) {
        weekEmployeeStats[ticket.employee].tickets++;
        weekEmployeeStats[ticket.employee].totalScore += score;
        weekEmployeeStats[ticket.employee].scores.push(score);
      }
    });

    const topPerformers = Object.entries(weekEmployeeStats)
      .map(([employee, stats]) => ({
        employee,
        score: stats.scores.length > 0 ? stats.totalScore / stats.scores.length : 0,
        tickets: stats.tickets
      }))
      .filter(emp => emp.score > 0) // Only include employees with valid scores
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Calculate detailed employee performance for the week
    const employeeDetails = Object.entries(weekEmployeeStats).map(([employee, stats]) => {
      const employeeTickets = weekTickets.filter(t => t.employee === employee);
      const ticketIds = [...new Set(employeeTickets.map(t => t.ticket_id))];
      const avgScore = stats.totalScore / stats.tickets;
      
      // Calculate sentiment breakdown for this employee
      const employeeSentiment = employeeTickets.reduce((acc, ticket) => {
        const sentiment = ticket.sentiment?.toLowerCase();
        if (sentiment === 'positive') acc.positive++;
        else if (sentiment === 'negative') acc.negative++;
        else if (sentiment === 'neutral') acc.neutral++;
        else if (sentiment === 'mixed') acc.mixed++;
        return acc;
      }, { positive: 0, negative: 0, neutral: 0, mixed: 0 });

      // Calculate SLA violations for this specific employee in this week
      const employeeSLAViolations = allInteractions.filter(
        interaction => interaction.employee === employee && interaction.is_violation
      ).length;
      return {
        employee,
        totalInteractions: stats.tickets,
        uniqueTickets: ticketIds.length,
        avgScore,
        ticketIds,
        sentimentDistribution: employeeSentiment,
        slaViolations: employeeSLAViolations
      };
    }).sort((a, b) => b.avgScore - a.avgScore);

    // Calculate daily metrics - FIXED to count unique tickets per day
    const dailyTickets = Array(7).fill(0);
    const dailyScores = Array(7).fill(0);

    // Group by actual creation date and count unique tickets
    const dailyData = Array(7).fill(null).map(() => ({
      uniqueTickets: new Set<string>(),
      scores: [] as number[]
    }));
    
    weekTickets.forEach(ticket => {
      const ticketDate = new Date(ticket.created_date);
      const dayOfWeek = ticketDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      
      // Only count if the day falls within our week range
      if (dayOfWeek >= 0 && dayOfWeek <= 6) {
        dailyData[dayOfWeek].uniqueTickets.add(ticket.ticket_id);
        
        // Calculate score for this interaction
        const score = DynamoService.calculateOverallScore({
          tone_and_trust: ticket.tone_and_trust,
          grammar_language: ticket.grammar_language,
          professionalism_clarity: ticket.professionalism_clarity,
          non_tech_clarity: ticket.non_tech_clarity,
          empathy: ticket.empathy,
          responsiveness: ticket.responsiveness,
          client_alignment: ticket.client_alignment,
          proactivity: ticket.proactivity,
          ownership_accountability: ticket.ownership_accountability,
          enablement: ticket.enablement,
          consistency: ticket.consistency,
          risk_impact: ticket.risk_impact
        });
        
        if (score > 0) {
          dailyData[dayOfWeek].scores.push(score);
        }
      }
    });
    
    // Convert to arrays
    for (let i = 0; i < 7; i++) {
      dailyTickets[i] = dailyData[i].uniqueTickets.size;
      if (dailyData[i].scores.length > 0) {
        dailyScores[i] = dailyData[i].scores.reduce((sum, score) => sum + score, 0) / dailyData[i].scores.length;
      } else {
        dailyScores[i] = 0;
      }
    }

    return {
      weekStart: weekStart.toLocaleDateString(),
      weekEnd: weekEnd.toLocaleDateString(),
      totalTickets: weekTickets.length,
      uniqueTickets,
      avgScore,
      slaViolations: slaCalculation.violations,
      sentimentDistribution,
      topPerformers,
      employeeDetails,
      dailyTickets,
      dailyScores
    };
  }, [selectedWeek, tickets]);

  const exportReport = () => {
    if (!weeklyData) return;
    
    // Create workbook
    const workbook = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Weekly Report Summary', ''],
      ['Week Period', `${weeklyData.weekStart} - ${weeklyData.weekEnd}`],
      ['Total Tickets', weeklyData.totalTickets],
      ['Unique Tickets', weeklyData.uniqueTickets],
      ['Average QA Score', weeklyData.avgScore.toFixed(2)],
      ['SLA Violations', weeklyData.slaViolations],
      ['SLA Compliance', `${slaCompliance.toFixed(1)}%`],
      [''],
      ['Daily Breakdown', ''],
      ['Day', 'Tickets', 'Avg Score'],
      ...['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => [
        day,
        weeklyData.dailyTickets[index],
        weeklyData.dailyScores[index] > 0 ? weeklyData.dailyScores[index].toFixed(2) : 'N/A'
      ])
    ];
    
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
    
    // Employee Details sheet
    const employeeData = [
      ['Employee Performance Details', '', '', '', '', '', ''],
      ['Employee', 'Total Interactions', 'Unique Tickets', 'Avg Score', 'Positive', 'Negative', 'Neutral', 'Mixed', 'SLA Violations', 'Ticket IDs'],
      ...weeklyData.employeeDetails.map(emp => [
        emp.employee,
        emp.totalInteractions,
        emp.uniqueTickets,
        emp.avgScore.toFixed(2),
        emp.sentimentDistribution.positive,
        emp.sentimentDistribution.negative,
        emp.sentimentDistribution.neutral,
        emp.sentimentDistribution.mixed,
        emp.slaViolations,
        emp.ticketIds.join(', ')
      ])
    ];
    
    const employeeSheet = XLSX.utils.aoa_to_sheet(employeeData);
    XLSX.utils.book_append_sheet(workbook, employeeSheet, 'Employee Details');
    
    // Top Performers sheet
    if (weeklyData.topPerformers.length > 0) {
      const topPerformersData = [
        ['Top Performers', '', ''],
        ['Rank', 'Employee', 'Score', 'Tickets'],
        ...weeklyData.topPerformers.map((performer, index) => [
          index + 1,
          performer.employee,
          performer.score.toFixed(2),
          performer.tickets
        ])
      ];
      
      const topPerformersSheet = XLSX.utils.aoa_to_sheet(topPerformersData);
      XLSX.utils.book_append_sheet(workbook, topPerformersSheet, 'Top Performers');
    }
    
    // Export the file
    XLSX.writeFile(workbook, `weekly-report-${selectedWeek}.xlsx`);
  };

  if (!weeklyData) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Calendar className="h-5 w-5 mr-2 text-blue-400" />
          Weekly Report
        </h3>
        <div className="text-center py-8 text-gray-400">
          <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No data available for weekly reports</p>
        </div>
      </div>
    );
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get SLA compliance directly from weeklyData
  const slaCompliance = weeklyData ? 
    (weeklyData.totalTickets > 0 ? 
      (((weeklyData.totalTickets - weeklyData.slaViolations) / weeklyData.totalTickets) * 100) : 100) 
    : 100;

  return (
    <div className="space-y-6">
      {/* Week Selection */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-blue-400" />
            Weekly Report
          </h3>
          <div className="flex items-center space-x-4">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableWeeks.map(week => {
                const weekStart = new Date(week);
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                return (
                  <option key={week} value={week}>
                    {weekStart.toLocaleDateString()} - {weekEnd.toLocaleDateString()}
                  </option>
                );
              })}
            </select>
            <button
              onClick={exportReport}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Week Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 rounded-xl p-6 border border-blue-500/20 hover:border-blue-400/30 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm font-medium">Total Tickets</p>
                <p className="text-3xl font-bold text-white mt-1">{weeklyData.totalTickets}</p>
                <p className="text-blue-300/70 text-xs mt-1">interactions this week</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="p-3 bg-blue-500/20 rounded-lg mb-2">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <div className="text-blue-400">
                  <Sparkline data={weeklyData.dailyTickets} color="#3B82F6" showTrend={false} height={20} width={60} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-xl p-6 border border-green-500/20 hover:border-green-400/30 transition-all duration-300 shadow-lg hover:shadow-green-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm font-medium">Avg QA Score</p>
                <p className="text-3xl font-bold text-white mt-1">{weeklyData.avgScore.toFixed(1)}</p>
                <p className="text-green-300/70 text-xs mt-1">quality rating</p>
              </div>
              <div className="flex flex-col items-end">
                <div className="p-3 bg-green-500/20 rounded-lg mb-2">
                  <Target className="h-6 w-6 text-green-400" />
                </div>
                <div className="text-green-400">
                  <Sparkline data={weeklyData.dailyScores.filter(score => score > 0)} color="#10B981" showTrend={false} height={20} width={60} />
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 rounded-xl p-6 border border-red-500/20 hover:border-red-400/30 transition-all duration-300 shadow-lg hover:shadow-red-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm font-medium">SLA Violations</p>
                <p className="text-3xl font-bold text-white mt-1">{weeklyData.slaViolations}</p>
                <p className="text-red-300/70 text-xs mt-1">response delays</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 rounded-xl p-6 border border-purple-500/20 hover:border-purple-400/30 transition-all duration-300 shadow-lg hover:shadow-purple-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm font-medium">SLA Compliance</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {weeklyData.slaViolations === 0 && weeklyData.totalTickets === 0 ? '100.0' : 
                   weeklyData.totalTickets > 0 ? 
                   (((weeklyData.totalTickets - weeklyData.slaViolations) / weeklyData.totalTickets) * 100).toFixed(1) : 
                   '100.0'}%
                </p>
                <p className="text-purple-300/70 text-xs mt-1">on-time responses</p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Daily Tickets */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/40 rounded-xl p-6 border border-gray-600/50 shadow-xl">
            <h4 className="font-semibold text-white mb-4 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Daily Ticket Volume
            </h4>
            <div className="space-y-3">
              {dayNames.map((day, index) => (
                <div key={day} className="flex items-center justify-between group hover:bg-gray-700/30 rounded-lg p-2 transition-all duration-200">
                  <span className="text-gray-300 text-sm w-12 font-medium">{day}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-600/50 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-blue-500 to-blue-400 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${weeklyData.totalTickets > 0 ? (weeklyData.dailyTickets[index] / Math.max(...weeklyData.dailyTickets)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm w-8 text-right font-semibold">{weeklyData.dailyTickets[index]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Scores */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/40 rounded-xl p-6 border border-gray-600/50 shadow-xl">
            <h4 className="font-semibold text-white mb-4 flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              Daily Average Scores
            </h4>
            <div className="space-y-3">
              {dayNames.map((day, index) => (
                <div key={day} className="flex items-center justify-between group hover:bg-gray-700/30 rounded-lg p-2 transition-all duration-200">
                  <span className="text-gray-300 text-sm w-12 font-medium">{day}</span>
                  <div className="flex-1 mx-4">
                    <div className="w-full bg-gray-600/50 rounded-full h-3 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-green-400 h-3 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${weeklyData.dailyScores[index] > 0 ? (weeklyData.dailyScores[index] / 10) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm w-12 text-right font-semibold">
                    {weeklyData.dailyScores[index] > 0 ? weeklyData.dailyScores[index].toFixed(1) : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {weeklyData.topPerformers.length > 0 && (
          <div className="mb-8 bg-gradient-to-br from-gray-800/80 to-gray-900/40 rounded-xl p-6 border border-gray-600/50 shadow-xl">
            <h4 className="font-semibold text-white mb-4 flex items-center">
              <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
              Top Performers This Week
            </h4>
            <div className="space-y-3">
              {weeklyData.topPerformers.map((performer, index) => (
                <div key={performer.employee} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-700/50 to-gray-800/30 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-lg ${
                      index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' : 
                      index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500' : 
                      index === 2 ? 'bg-gradient-to-br from-orange-400 to-orange-600' : 'bg-gradient-to-br from-gray-500 to-gray-700'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <span className="text-white font-semibold">{performer.employee}</span>
                      <div className="text-gray-400 text-xs">{performer.tickets} tickets handled</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-lg">{performer.score.toFixed(1)}</div>
                    <div className="text-gray-400 text-xs">avg score</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/40 rounded-xl p-6 border border-gray-600/50 shadow-xl">
            <h4 className="font-semibold text-white mb-4 flex items-center">
              <div className="w-2 h-2 bg-pink-500 rounded-full mr-3"></div>
              Sentiment Distribution
            </h4>
            <div className="grid grid-cols-2 gap-6">
              {Object.entries(weeklyData.sentimentDistribution).map(([sentiment, count]) => (
                <div key={sentiment} className="text-center p-4 bg-gray-700/30 rounded-lg border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300">
                  <div className={`w-4 h-4 rounded-full mx-auto mb-3 shadow-lg ${
                    sentiment === 'positive' ? 'bg-green-500' :
                    sentiment === 'negative' ? 'bg-red-500' :
                    sentiment === 'neutral' ? 'bg-gray-500' : 'bg-yellow-500'
                  }`} />
                  <div className="text-white font-bold text-xl mb-1">{count}</div>
                  <div className="text-gray-300 text-sm capitalize font-medium mb-1">{sentiment}</div>
                  <div className="text-gray-400 text-xs font-medium">
                    {weeklyData.totalTickets > 0 ? ((count / weeklyData.totalTickets) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Week Summary Stats */}
          <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/40 rounded-xl p-6 border border-gray-600/50 shadow-xl">
            <h4 className="font-semibold text-white mb-4 flex items-center">
              <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
              Week Summary
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300">Unique Tickets:</span>
                <span className="text-white font-semibold">
                  {weeklyData.uniqueTickets}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300">Total Tickets:</span>
                <span className="text-white font-semibold">
                  {weeklyData.totalTickets}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300">Active Employees:</span>
                <span className="text-white font-semibold">
                  {weeklyData.employeeDetails.length}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300">Avg Interactions/Employee:</span>
                <span className="text-white font-semibold">
                  {weeklyData.employeeDetails.length > 0 
                    ? (weeklyData.totalTickets / weeklyData.employeeDetails.length).toFixed(1)
                    : '0.0'
                  }
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300">Best Performer:</span>
                <span className="text-green-400 font-semibold">
                  {weeklyData.topPerformers[0]?.employee || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/30 rounded-lg">
                <span className="text-gray-300">SLA Compliance:</span>
                <span className="text-purple-400 font-semibold">
                  {weeklyData.slaViolations === 0 && weeklyData.totalTickets === 0 ? '100.0' : 
                   weeklyData.totalTickets > 0 ? 
                   (((weeklyData.totalTickets - weeklyData.slaViolations) / weeklyData.totalTickets) * 100).toFixed(1) : 
                   '100.0'}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Employee Performance */}
        <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-medium text-white mb-4 flex items-center">
            <Users className="h-4 w-4 mr-2 text-blue-400" />
            Detailed Employee Performance
          </h4>
          
          <div className="space-y-4">
            {weeklyData.employeeDetails.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No employee data available for this week</p>
              </div>
            ) : (
              weeklyData.employeeDetails.map((employee, index) => (
                <div key={employee.employee} className="bg-gray-600/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                        index < 3 ? 'bg-gradient-to-r from-blue-500 to-purple-500' : 'bg-gray-600'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <h5 className="font-medium text-white">{employee.employee}</h5>
                        <p className="text-gray-400 text-sm">
                          {employee.totalInteractions} interactions • {employee.uniqueTickets} unique tickets
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{employee.avgScore.toFixed(1)}</div>
                      <div className="text-gray-400 text-sm">Avg Score</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* Ticket IDs */}
                    <div>
                      <h6 className="text-sm font-medium text-gray-300 mb-2">Ticket IDs Handled:</h6>
                      <div className="flex flex-wrap gap-1">
                        {employee.ticketIds.map(ticketId => (
                          <span 
                            key={ticketId}
                            className="px-2 py-1 bg-blue-500/20 text-blue-300 text-xs rounded border border-blue-500/30"
                          >
                            {ticketId}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Employee Sentiment & SLA */}
                    <div className="space-y-3">
                      <div>
                        <h6 className="text-sm font-medium text-gray-300 mb-2">Sentiment Breakdown:</h6>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {Object.entries(employee.sentimentDistribution).map(([sentiment, count]) => (
                            <div key={sentiment} className="flex items-center justify-between">
                              <div className="flex items-center space-x-1">
                                <div className={`w-2 h-2 rounded-full ${
                                  sentiment === 'positive' ? 'bg-green-500' :
                                  sentiment === 'negative' ? 'bg-red-500' :
                                  sentiment === 'neutral' ? 'bg-gray-500' : 'bg-yellow-500'
                                }`} />
                                <span className="text-gray-400 capitalize">{sentiment}</span>
                              </div>
                              <span className="text-white">{count}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-gray-400 text-sm">SLA Violations:</span>
                        <span className={`font-medium ${employee.slaViolations > 0 ? 'text-red-400' : 'text-green-400'}`}>
                          {employee.slaViolations}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
