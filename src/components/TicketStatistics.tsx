import React from 'react';
import { Ticket, Clock, Users, TrendingUp, MessageSquare } from 'lucide-react';
import { TicketData } from '../types';

interface TicketStatisticsProps {
  tickets: TicketData[];
}

export const TicketStatistics: React.FC<TicketStatisticsProps> = ({ tickets }) => {
  const sentimentStats = tickets.reduce((acc, ticket) => {
    acc[ticket.sentiment] = (acc[ticket.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const uniqueTickets = [...new Set(tickets.map(t => t.ticket_id))];
  
  // Calculate interactions per ticket
  const interactionsPerTicket = tickets.length / uniqueTickets.length;
  
  // Calculate unique employees
  const uniqueEmployees = [...new Set(tickets.map(t => t.employee))];
  
  // Calculate most active employee
  const employeeTicketCounts = tickets.reduce((acc, ticket) => {
    acc[ticket.employee] = (acc[ticket.employee] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const mostActiveEmployee = Object.entries(employeeTicketCounts)
    .sort(([,a], [,b]) => b - a)[0];
  
  // Calculate recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTickets = tickets.filter(ticket => 
    new Date(ticket.created_date) >= sevenDaysAgo
  );

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-lg font-semibold mb-4 flex items-center">
        <Ticket className="h-5 w-5 mr-2 text-blue-400" />
        Ticket Statistics
      </h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Stats */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300">Total Interactions</span>
            <span className="text-white font-semibold">{tickets.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300">Unique Tickets</span>
            <span className="text-white font-semibold">{uniqueTickets.length}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300">Interactions per Ticket</span>
            <span className="text-blue-400 font-semibold">{interactionsPerTicket.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
            <span className="text-gray-300">Active Employees</span>
            <span className="text-purple-400 font-semibold">{uniqueEmployees.length}</span>
          </div>
        </div>
        
        {/* Enhanced Analytics */}
        <div className="space-y-4">
          <h4 className="font-medium text-white flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
            Activity Insights
          </h4>
          
          {/* Most Active Employee */}
          <div className="bg-blue-500/10 rounded-lg p-3 border border-blue-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="h-4 w-4 text-blue-400" />
                <span className="text-blue-400 text-sm">Most Active Employee</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{mostActiveEmployee?.[0] || 'N/A'}</div>
                <div className="text-blue-400 text-xs">{mostActiveEmployee?.[1] || 0} interactions</div>
              </div>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-green-500/10 rounded-lg p-3 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm">Last 7 Days Activity</span>
              </div>
              <div className="text-right">
                <div className="text-white font-medium">{recentTickets.length}</div>
                <div className="text-green-400 text-xs">interactions</div>
              </div>
            </div>
          </div>
          
          {/* Sentiment Distribution */}
          <div>
            <h5 className="font-medium text-white mb-2 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2 text-yellow-400" />
              Sentiment Distribution
            </h5>
            <div className="space-y-2">
              {Object.entries(sentimentStats).map(([sentiment, count]) => (
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
                    <div className="w-20 bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          sentiment === 'positive' ? 'bg-green-500' :
                          sentiment === 'negative' ? 'bg-red-500' :
                          sentiment === 'neutral' ? 'bg-gray-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${(count / tickets.length) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-400">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
