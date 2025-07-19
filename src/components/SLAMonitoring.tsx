import React, { useState, useMemo } from 'react';
import { AlertTriangle, Clock, XCircle, CheckCircle, User, Calendar, Filter, TrendingUp } from 'lucide-react';
import { SLAViolation, TicketData } from '../types';
import { DynamoService } from '../services/dynamoService';

interface SLAMonitoringProps {
  violations: SLAViolation[];
  tickets?: TicketData[];
}

interface SLAInteraction {
  ticket_id: string;
  employee: string;
  response_time: number;
  response_type: string;
  created_date: string;
  is_violation: boolean;
  sla_limit: number;
}

export const SLAMonitoring: React.FC<SLAMonitoringProps> = ({ violations = [], tickets = [] }) => {
  const [activeTab, setActiveTab] = useState<'violations' | 'compliant' | 'all'>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');

  // Safely calculate all SLA interactions
  const allInteractions = useMemo((): SLAInteraction[] => {
    if (!tickets || !Array.isArray(tickets)) {
      return [];
    }

    const interactions: SLAInteraction[] = [];
    const processedInteractions = new Set<string>();
    
    try {
      tickets.forEach(ticket => {
        if (!ticket || !ticket.response_times || !Array.isArray(ticket.response_times)) {
          return;
        }
        
        // Filter for "Employee to Client" responses only
        const employeeResponses = ticket.response_times.filter(
          response => response && response.response_type === 'Employee to Client'
        );
        
        employeeResponses.forEach(response => {
          if (!response || !response.response_by || !response.response_time) {
            return;
          }

          try {
            const responseTime = DynamoService.parseResponseTime(response.response_time);
            const slaLimit = 30; // 30 minutes SLA
            
            // Create unique key to prevent duplicates
            const interactionKey = `${ticket.ticket_id}-${response.response_by}-${response.response_time}`;
            if (processedInteractions.has(interactionKey)) return;
            processedInteractions.add(interactionKey);
            
            interactions.push({
              ticket_id: ticket.ticket_id || 'Unknown',
              employee: response.response_by || 'Unknown',
              response_time: responseTime,
              response_type: response.response_type,
              created_date: ticket.created_date || new Date().toISOString(),
              is_violation: responseTime > slaLimit,
              sla_limit: slaLimit
            });
          } catch (error) {
            console.warn('Error processing response time:', error);
          }
        });
      });
    } catch (error) {
      console.error('Error processing SLA interactions:', error);
    }

    return interactions.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  }, [tickets]);

  // Calculate metrics safely
  const metrics = useMemo(() => {
    const violationInteractions = allInteractions.filter(interaction => interaction.is_violation);
    const compliantInteractions = allInteractions.filter(interaction => !interaction.is_violation);
    const totalInteractions = allInteractions.length;
    
    const violationPercentage = totalInteractions > 0 ? (violationInteractions.length / totalInteractions) * 100 : 0;
    const compliancePercentage = 100 - violationPercentage;
    
    const avgResponseTime = totalInteractions > 0 
      ? allInteractions.reduce((sum, interaction) => sum + interaction.response_time, 0) / totalInteractions
      : 0;

    return {
      totalInteractions,
      violationInteractions: violationInteractions.length,
      compliantInteractions: compliantInteractions.length,
      violationPercentage,
      compliancePercentage,
      avgResponseTime
    };
  }, [allInteractions]);

  // Get unique employees for filter
  const uniqueEmployees = useMemo(() => {
    const employees = [...new Set(allInteractions.map(interaction => interaction.employee))];
    return employees.filter(emp => emp && emp !== 'Unknown').sort();
  }, [allInteractions]);

  // Filter interactions based on active tab and selected employee
  const filteredInteractions = useMemo(() => {
    let filtered = allInteractions;
    
    if (activeTab === 'violations') {
      filtered = allInteractions.filter(interaction => interaction.is_violation);
    } else if (activeTab === 'compliant') {
      filtered = allInteractions.filter(interaction => !interaction.is_violation);
    }
    
    if (selectedEmployee !== 'all') {
      filtered = filtered.filter(interaction => interaction.employee === selectedEmployee);
    }
    
    return filtered;
  }, [allInteractions, activeTab, selectedEmployee]);

  const getResponseTimeColor = (responseTime: number, slaLimit: number) => {
    return responseTime <= slaLimit ? 'text-green-400' : 'text-red-400';
  };

  const getResponseTimeBg = (responseTime: number, slaLimit: number) => {
    return responseTime <= slaLimit 
      ? 'bg-green-500/10 border-green-500/20' 
      : 'bg-red-500/10 border-red-500/20';
  };

  return (
    <div className="space-y-6">
      {/* SLA Overview */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
          SLA Monitoring Dashboard
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-400 text-sm">Client Interactions</p>
                <p className="text-2xl font-bold text-white">{metrics.totalInteractions}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-400" />
            </div>
          </div>
          
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm">SLA Violations</p>
                <p className="text-2xl font-bold text-white">{metrics.violationInteractions}</p>
                <p className="text-red-400 text-xs">{metrics.violationPercentage.toFixed(1)}%</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-400 text-sm">SLA Compliant</p>
                <p className="text-2xl font-bold text-white">{metrics.compliantInteractions}</p>
                <p className="text-green-400 text-xs">{metrics.compliancePercentage.toFixed(1)}%</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
          </div>
          
          <div className="bg-purple-500/10 rounded-lg p-4 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-400 text-sm">Avg Response Time</p>
                <p className="text-2xl font-bold text-white">
                  {metrics.avgResponseTime.toFixed(0)}m
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-400" />
            </div>
          </div>
        </div>
        
        {/* SLA Policies */}
        <div className="bg-gray-700/50 rounded-lg p-4">
          <h4 className="font-medium text-white mb-2">SLA Policies</h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Initial Response Time</span>
              <span className="text-blue-400 font-medium">≤ 30 minutes (Employee to Client)</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-xs">SLA Met: ≤30 min</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-red-400 text-xs">Violation: {'>'}30 min</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Filters and Tabs */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
          <h3 className="text-lg font-semibold">Detailed SLA Interactions</h3>
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Employee Filter */}
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Employees</option>
                {uniqueEmployees.map(employee => (
                  <option key={employee} value={employee}>{employee}</option>
                ))}
              </select>
            </div>
            
            {/* Tab Buttons */}
            <div className="flex space-x-1 bg-gray-700 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeTab === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                All ({metrics.employeeToClientTotal})
              </button>
              <button
                onClick={() => setActiveTab('violations')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeTab === 'violations'
                    ? 'bg-red-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Violations ({metrics.violationInteractions})
              </button>
              <button
                onClick={() => setActiveTab('compliant')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeTab === 'compliant'
                    ? 'bg-green-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Compliant ({metrics.compliantInteractions})
              </button>
            </div>
          </div>
        </div>
        
        {/* Interactions List */}
        <div className="space-y-4">
          {filteredInteractions.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No interactions found for the selected filters</p>
              {metrics.totalInteractions === 0 && (
                <p className="text-sm mt-2">No response time data available in tickets</p>
              )}
            </div>
          ) : (
            filteredInteractions.map((interaction, index) => (
              <div 
                key={`${interaction.ticket_id}-${interaction.employee}-${index}`} 
                className={`rounded-lg p-4 border ${getResponseTimeBg(interaction.response_time, interaction.sla_limit)}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      {interaction.is_violation ? (
                        <XCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-400" />
                      )}
                      <span className="font-medium text-white">{interaction.ticket_id}</span>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      interaction.is_violation 
                        ? 'bg-red-500/20 text-red-400' 
                        : 'bg-green-500/20 text-green-400'
                    }`}>
                      {interaction.is_violation ? 'SLA VIOLATION' : 'SLA COMPLIANT'}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <Calendar className="h-4 w-4" />
                    <span>{new Date(interaction.created_date).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <User className="h-4 w-4 text-gray-400" />
                    <div>
                      <span className="text-gray-400">Employee: </span>
                      <span className="text-white font-medium">{interaction.employee}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400">Response Time: </span>
                    <span className={`font-bold ${getResponseTimeColor(interaction.response_time, interaction.sla_limit)}`}>
                      {interaction.response_time} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">SLA Limit: </span>
                    <span className="text-blue-400 font-medium">
                      {interaction.sla_limit} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">Difference: </span>
                    <span className={`font-medium ${
                      interaction.response_time <= interaction.sla_limit 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      {interaction.response_time <= interaction.sla_limit ? '-' : '+'}
                      {Math.abs(interaction.response_time - interaction.sla_limit)} min
                    </span>
                  </div>
                </div>
                
                {/* Response Time Visual Indicator */}
                <div className="mt-3">
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                    <span>Response Time Progress</span>
                    <span>{((interaction.response_time / (interaction.sla_limit * 1.5)) * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all ${
                        interaction.response_time <= interaction.sla_limit ? 'bg-green-500' : 'bg-red-500'
                      }`}
                      style={{ 
                        width: `${Math.min(100, (interaction.response_time / (interaction.sla_limit * 1.5)) * 100)}%` 
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Summary Stats */}
        {filteredInteractions.length > 0 && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Filtered Results</span>
                <span className="text-white font-semibold">{filteredInteractions.length}</span>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Avg Response Time</span>
                <span className="text-white font-semibold">
                  {filteredInteractions.length > 0 
                    ? (filteredInteractions.reduce((sum, interaction) => sum + interaction.response_time, 0) / filteredInteractions.length).toFixed(1)
                    : '0'
                  }m
                </span>
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-300">Violation Rate</span>
                <span className={`font-semibold ${
                  filteredInteractions.length > 0 && (filteredInteractions.filter(i => i.is_violation).length / filteredInteractions.length) * 100 > 10 
                    ? 'text-red-400' 
                    : 'text-green-400'
                }`}>
                  {filteredInteractions.length > 0 
                    ? ((filteredInteractions.filter(i => i.is_violation).length / filteredInteractions.length) * 100).toFixed(1)
                    : '0'
                  }%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
