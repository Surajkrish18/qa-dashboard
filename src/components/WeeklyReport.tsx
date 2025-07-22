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

    // Calculate unique tickets for the week
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

    const slaViolations = DynamoService.calculateSLAViolations(weekTickets).length;
    
    // Calculate SLA compliance based on actual interactions (matching SLA Monitoring logic)
    const allInteractions: any[] = [];
    weekTickets.forEach(ticket => {
      if (ticket.response_times && Array.isArray(ticket.response_times)) {
        const employeeResponses = ticket.response_times.filter(
          response => response.response_type === 'Employee to Client'
        );
        employeeResponses.forEach(response => {
          const responseTime = DynamoService.parseResponseTime(response.response_time);
          allInteractions.push({
            ticket_id: ticket.ticket_id,
            employee: response.response_by,
            response_time: responseTime,
            is_violation: responseTime > 30
          });
        });
      }
    });
    
    const totalInteractions = allInteractions.length;
    const violationInteractions = allInteractions.filter(interaction => interaction.is_violation).length;
    const slaCompliance = totalInteractions > 0 
      ? (((totalInteractions - violationInteractions) / totalInteractions) * 100)
      : 100;

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

    // Calculate daily metrics
    const dailyTickets = Array(7).fill(0);
    const dailyScores = Array(7).fill(0);
    const dailyScoreCounts = Array(7).fill(0);

    // Group tickets by creation date (not interaction date)
    const ticketsByDate = new Map<string, Set<string>>();
    const scoresByDate = new Map<string, number[]>();
    
    weekTickets.forEach(ticket => {
      const ticketDate = new Date(ticket.created_date);
      const dateKey = ticketDate.toDateString();
      
      // Count unique tickets per day
      if (!ticketsByDate.has(dateKey)) {
        ticketsByDate.set(dateKey, new Set());
      }
      ticketsByDate.get(dateKey)!.add(ticket.ticket_id);
      
      // Collect scores per day
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
        if (!scoresByDate.has(dateKey)) {
          scoresByDate.set(dateKey, []);
        }
        scoresByDate.get(dateKey)!.push(score);
      }
    });
    
    // Map to daily arrays (Sunday = 0, Monday = 1, etc.)
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateKey = date.toDateString();
      
      // Count unique tickets for this day
      const uniqueTicketsForDay = ticketsByDate.get(dateKey);
      dailyTickets[i] = uniqueTicketsForDay ? uniqueTicketsForDay.size : 0;
      
      // Calculate average score for this day
      const scoresForDay = scoresByDate.get(dateKey);
      if (scoresForDay && scoresForDay.length > 0) {
        dailyScores[i] = scoresForDay.reduce((sum, score) => sum + score, 0) / scoresForDay.length;
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
      slaViolations: violationInteractions,
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

  // Calculate SLA compliance based on actual interactions (matching SLA Monitoring logic)
  const allInteractions: any[] = [];
  const weekStart = new Date(selectedWeek);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  const weekTickets = tickets.filter(ticket => {
    const ticketDate = new Date(ticket.created_date);
    return ticketDate >= weekStart && ticketDate <= weekEnd;
  });

  weekTickets.forEach(ticket => {
    if (ticket.response_times && Array.isArray(ticket.response_times)) {
      const employeeResponses = ticket.response_times.filter(
        response => response.response_type === 'Employee to Client'
      );
      employeeResponses.forEach(response => {
        const responseTime = DynamoService.parseResponseTime(response.response_time);
        allInteractions.push({
          ticket_id: ticket.ticket_id,
          employee: response.response_by,
          response_time: responseTime,
          is_violation: responseTime > 30
        });
      });
    }
  });
  
  const totalInteractions = allInteractions.length;
  const violationInteractions = allInteractions.filter(interaction => interaction.is_violation).length;
  const slaCompliance = totalInteractions > 0 
    ? (((totalInteractions - violationInteractions) / totalInteractions) * 100)
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Total Tickets</p>
                <p className="text-2xl font-bold text-white">{weeklyData.totalTickets}</p>
              </div>
              <div className="text-blue-400">
                <Sparkline data={weeklyData.dailyTickets} color="#3B82F6" showTrend={false} />
              </div>
            </div>
          </div>
          
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm">Avg QA Score</p>
                <p className="text-2xl font-bold text-white">{weeklyData.avgScore.toFixed(1)}</p>
              </div>
              <div className="text-green-400">
                <Sparkline data={weeklyData.dailyScores.filter(score => score > 0)} color="#10B981" showTrend={false} />
              </div>
            </div>
          </div>
          
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm">SLA Violations</p>
                <p className="text-2xl font-bold text-white">{violationInteractions}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm">SLA Compliance</p>
                <p className="text-2xl font-bold text-white">
                  {slaCompliance.toFixed(1)}%
                </p>
              </div>
              <Target className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>

        {/* Daily Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Tickets */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Daily Ticket Volume</h4>
            <div className="space-y-2">
              {dayNames.map((day, index) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm w-12">{day}</span>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${weeklyData.totalTickets > 0 ? (weeklyData.dailyTickets[index] / Math.max(...weeklyData.dailyTickets)) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm w-8 text-right">{weeklyData.dailyTickets[index]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Scores */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Daily Average Scores</h4>
            <div className="space-y-2">
              {dayNames.map((day, index) => (
                <div key={day} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm w-12">{day}</span>
                  <div className="flex-1 mx-3">
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${weeklyData.dailyScores[index] > 0 ? (weeklyData.dailyScores[index] / 10) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-white text-sm w-12 text-right">
                    {weeklyData.dailyScores[index] > 0 ? weeklyData.dailyScores[index].toFixed(1) : 'N/A'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Performers */}
        {weeklyData.topPerformers.length > 0 && (
          <div className="mt-6 bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2 text-yellow-400" />
              Top Performers This Week
            </h4>
            <div className="space-y-2">
              {weeklyData.topPerformers.map((performer, index) => (
                <div key={performer.employee} className="flex items-center justify-between p-2 bg-gray-600/50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-500' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-white font-medium">{performer.employee}</span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-gray-400 text-sm">{performer.tickets} tickets</span>
                    <span className="text-green-400 font-bold">{performer.score.toFixed(1)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sentiment Distribution */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Sentiment Distribution</h4>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(weeklyData.sentimentDistribution).map(([sentiment, count]) => (
                <div key={sentiment} className="text-center">
                  <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${
                    sentiment === 'positive' ? 'bg-green-500' :
                    sentiment === 'negative' ? 'bg-red-500' :
                    sentiment === 'neutral' ? 'bg-gray-500' : 'bg-yellow-500'
                  }`} />
                  <div className="text-white font-medium">{count}</div>
                  <div className="text-gray-400 text-sm capitalize">{sentiment}</div>
                  <div className="text-gray-400 text-xs">
                    {weeklyData.totalTickets > 0 ? ((count / weeklyData.totalTickets) * 100).toFixed(1) : '0.0'}%
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Week Summary Stats */}
          <div className="bg-gray-700/50 rounded-lg p-4">
            <h4 className="font-medium text-white mb-3">Week Summary</h4>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-300">Unique Tickets:</span>
                <span className="text-white font-medium">
                  {weeklyData.uniqueTickets}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Total Tickets:</span>
                <span className="text-white font-medium">
                  {weeklyData.totalTickets}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Active Employees:</span>
                <span className="text-white font-medium">
                  {weeklyData.employeeDetails.length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Avg Interactions/Employee:</span>
                <span className="text-white font-medium">
                  {weeklyData.employeeDetails.length > 0 
                    ? (weeklyData.totalTickets / weeklyData.employeeDetails.length).toFixed(1)
                    : '0.0'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Best Performer:</span>
                <span className="text-green-400 font-medium">
                  {weeklyData.topPerformers[0]?.employee || 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">SLA Compliance:</span>
                <span className="text-purple-400 font-medium">
                  {slaCompliance.toFixed(1)}%
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
