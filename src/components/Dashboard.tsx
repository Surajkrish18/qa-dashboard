import React, { useState, useMemo } from 'react';
import { BarChart3, Users, AlertTriangle, TrendingUp, Filter, Search, RefreshCw } from 'lucide-react';
import { useTicketData } from '../hooks/useTicketData';
import { DynamoService } from '../services/dynamoService';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorMessage } from './ErrorMessage';
import { EmployeePerformance } from './EmployeePerformance';
import { TicketStatistics } from './TicketStatistics';
import { SLAMonitoring } from './SLAMonitoring';
import { OverallAnalytics } from './OverallAnalytics';
import { TicketDetails } from './TicketDetails';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    tickets, 
    employeeStats, 
    slaViolations, 
    loading, 
    error, 
    refreshData 
  } = useTicketData();

  const filteredTickets = useMemo(() => {
    return DynamoService.searchTickets(tickets, searchQuery);
  }, [tickets, searchQuery]);

  const totalTickets = tickets.length;
  const totalEmployees = employeeStats.length;
  const totalSLAViolations = slaViolations.length;
  const avgOverallScore = (() => {
    const overallScores = employeeStats
      .map(emp => DynamoService.calculateOverallScore(emp.avg_scores))
      .filter(score => score > 0);
    return overallScores.length > 0 ? overallScores.reduce((sum, score) => sum + score, 0) / overallScores.length : 0;
  })();

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'employees', label: 'Employee Performance', icon: Users },
    { id: 'sla', label: 'SLA Monitoring', icon: AlertTriangle },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp },
    { id: 'tickets', label: 'Ticket Details', icon: Filter }
  ];

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ClientCentral QA Dashboard
              </h1>
              <p className="text-gray-400 mt-1">Quality Assurance Analytics & Performance Monitoring</p>
            </div>
          </div>
        </header>
        <LoadingSpinner message="Fetching data from DynamoDB..." />
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                ClientCentral QA Dashboard
              </h1>
              <p className="text-gray-400 mt-1">Quality Assurance Analytics & Performance Monitoring</p>
            </div>
          </div>
        </header>
        <ErrorMessage message={error} onRetry={refreshData} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              ClientCentral QA Dashboard
            </h1>
            <p className="text-gray-400 mt-1">Quality Assurance Analytics & Performance Monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={refreshData}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg transition-colors"
              title="Refresh data"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search tickets or employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg pl-10 pr-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Total Tickets</p>
                <p className="text-2xl font-bold text-white">{totalTickets}</p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <BarChart3 className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Employees</p>
                <p className="text-2xl font-bold text-white">{totalEmployees}</p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-lg">
                <Users className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">SLA Violations</p>
                <p className="text-2xl font-bold text-white">{totalSLAViolations}</p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Avg QA Score</p>
                <p className="text-2xl font-bold text-white">{avgOverallScore.toFixed(1)}</p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <TrendingUp className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TicketStatistics tickets={filteredTickets} />
              <OverallAnalytics employeeStats={employeeStats} />
            </div>
          )}
          
          {activeTab === 'employees' && (
            <EmployeePerformance 
              employeeStats={employeeStats}
              selectedEmployee={selectedEmployee}
              onEmployeeSelect={setSelectedEmployee}
            />
          )}
          
          {activeTab === 'sla' && <SLAMonitoring violations={slaViolations} />}
          
          {activeTab === 'analytics' && <OverallAnalytics employeeStats={employeeStats} />}
          
          {activeTab === 'tickets' && <TicketDetails tickets={filteredTickets} />}
        </div>
      </div>
    </div>
  );
};
