import React from 'react';
import { Ticket, Clock, CheckCircle, AlertCircle } from 'lucide-react';
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
  const avgScores = tickets.reduce((acc, ticket) => {
    const scores = [
      ticket.client_alignment,
      ticket.consistency,
      ticket.empathy,
      ticket.enablement,
      ticket.grammar_language,
      ticket.non_tech_clarity,
      ticket.ownership_accountability,
      ticket.proactivity,
      ticket.professionalism_clarity,
      ticket.responsiveness,
      ticket.risk_impact,
      ticket.tone_and_trust
    ];
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    return acc + avgScore;
  }, 0) / tickets.length;

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
            <span className="text-gray-300">Average QA Score</span>
	    <span className="text-green-400 font-semibold">{avgScores.toFixed(1)}</span>
          </div>
        </div>
        
        {/* Sentiment Distribution */}
        <div className="space-y-4">
          <h4 className="font-medium text-white">Sentiment Distribution</h4>
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
  );
};
