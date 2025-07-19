import React, { useState, useMemo } from 'react';
import { BarChart3, Users, AlertTriangle, TrendingUp } from 'lucide-react';
import OverallAnalytics from './OverallAnalytics';
import EmployeePerformance from './EmployeePerformance';
import SLAMonitoring from './SLAMonitoring';
import TicketDetails from './TicketDetails';
import WeeklyReport from './WeeklyReport';
import InsightsRecommendations from './InsightsRecommendations';
import { useTicketData } from '../hooks/useTicketData';
import LoadingSpinner from './LoadingSpinner';
import ErrorMessage from './ErrorMessage';
import Sparkline from './Sparkline';

const Dashboard: React.FC = () => {
  const { tickets, loading, error } = useTicketData();
  const [activeTab, setActiveTab] = useState('overview');

  const employeeStats = useMemo(() => {
    const stats = tickets.reduce((acc, ticket) => {
      const employee = ticket.employee_name;
      if (!acc[employee]) {
        acc[employee] = {
          name: employee,
          totalTickets: 0,
          avgScore: 0,
          scores: []
        };
      }
      acc[employee].totalTickets++;
      acc[employee].scores.push(ticket.qa_score);
      return acc;
    }, {} as Record<string, any>);

    return Object.values(stats).map((stat: any) => ({
      ...stat,
      avgScore: stat.scores.reduce((sum: number, score: number) => sum + score, 0) / stat.scores.length
    }));
  }, [tickets]);

  const slaViolations = useMemo(() => {
    return tickets.filter(ticket => ticket.response_time_minutes > 30);
  }, [tickets]);

  const totalTickets = useMemo(() => {
    return new Set(tickets.map(ticket => ticket.ticket_id)).size;
  }, [tickets]);

  const totalEmployees = useMemo(() => {
    return new Set(tickets.map(ticket => ticket.employee_name)).size;
  }, [tickets]);

  const totalSLAViolations = slaViolations.length;

  const slaCompliance = useMemo(() => {
    if (tickets.length === 0) return 0;
    const compliantTickets = tickets.filter(ticket => ticket.response_time_minutes <= 30).length;
    return (compliantTickets / tickets.length) * 100;
  }, [tickets]);

  const avgQAScore = useMemo(() => {
    if (tickets.length === 0) return 0;
    const totalScore = tickets.reduce((sum, ticket) => sum + ticket.qa_score, 0);
    return totalScore / tickets.length;
  }, [tickets]);

  const getSparklineData = (metric: string) => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      return date.toISOString().split('T')[0];
    });

    return last7Days.map(date => {
      const dayTickets = tickets.filter(ticket => 
        ticket.interaction_date.startsWith(date)
      );

      switch (metric) {
        case 'tickets':
          return dayTickets.length;
        case 'sla':
          return dayTickets.length > 0 
            ? (dayTickets.filter(t => t.response_time_minutes <= 30).length / dayTickets.length) * 100
            : 0;
        case 'qa':
          return dayTickets.length > 0
            ? dayTickets.reduce((sum, t) => sum + t.qa_score, 0) / dayTickets.length
            : 0;
        default:
          return 0;
      }
    });
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'employee', label: 'Employee Performance', icon: Users },
    { id: 'sla', label: 'SLA Monitoring', icon: AlertTriangle },
    { id: 'tickets', label: 'Ticket Details', icon: TrendingUp },
    { id: 'weekly', label: 'Weekly Report', icon: BarChart3 }
  ];

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 p-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Tickets</p>
              <p className="text-3xl font-bold">{totalTickets}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkline data={getSparklineData('tickets')} color="#3b82f6" />
              <BarChart3 className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-400">0.0%</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Employees</p>
              <p className="text-3xl font-bold">{totalEmployees}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Users className="w-8 h-8 text-green-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-400">0.0%</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">SLA Compliance</p>
              <p className="text-3xl font-bold">{slaCompliance.toFixed(1)}%</p>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkline data={getSparklineData('sla')} color="#ef4444" />
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-400">0.0%</span>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg QA Score</p>
              <p className="text-3xl font-bold">{avgQAScore.toFixed(1)}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Sparkline data={getSparklineData('qa')} color="#8b5cf6" />
              <TrendingUp className="w-8 h-8 text-purple-400" />
            </div>
          </div>
          <div className="flex items-center mt-2 text-sm">
            <span className="text-gray-400">0.0%</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="px-6">
        <div className="flex space-x-1 bg-gray-800 rounded-lg p-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <OverallAnalytics employeeStats={employeeStats} />
            </div>
            <InsightsRecommendations
              employeeStats={employeeStats}
              slaViolations={slaViolations}
              totalTickets={totalTickets}
              tickets={tickets}
            />
          </>
        )}
        {activeTab === 'employee' && <EmployeePerformance />}
        {activeTab === 'sla' && <SLAMonitoring />}
        {activeTab === 'tickets' && <TicketDetails />}
        {activeTab === 'weekly' && <WeeklyReport />}
      </div>
    </div>
  );
};

export default Dashboard;