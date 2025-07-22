import React, { useState } from 'react';
import { Ticket, MessageSquare, User, Clock, Star, X, Calendar, TrendingUp } from 'lucide-react';
import { TicketData } from '../types';
import { DynamoService } from '../services/dynamoService';

interface TicketDetailsProps {
  tickets: TicketData[];
}

interface TicketModalProps {
  ticketId: string;
  ticketData: TicketData[];
  onClose: () => void;
}

const TicketModal: React.FC<TicketModalProps> = ({ ticketId, ticketData, onClose }) => {
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'text-green-400';
      case 'negative': return 'text-red-400';
      case 'neutral': return 'text-gray-400';
      default: return 'text-yellow-400';
    }
  };

  const getSentimentBg = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-500/10 border-green-500/20';
      case 'negative': return 'bg-red-500/10 border-red-500/20';
      case 'neutral': return 'bg-gray-500/10 border-gray-500/20';
      default: return 'bg-yellow-500/10 border-yellow-500/20';
    }
  };

  const calculateInteractionScore = (interaction: TicketData): number => {
    const CORE_CRITERIA = [
      'tone_and_trust', 'grammar_language', 'professionalism_clarity',
      'non_tech_clarity', 'empathy', 'responsiveness'
    ];
    
    const CONTEXTUAL_CRITERIA = [
      'client_alignment', 'proactivity', 'ownership_accountability',
      'enablement', 'consistency', 'risk_impact'
    ];

    // Calculate core criteria average
    const coreScores = CORE_CRITERIA
      .map(key => {
        const value = interaction[key as keyof TicketData];
        return typeof value === 'number' ? value : parseFloat(value as string) || 0;
      })
      .filter(score => !isNaN(score));
    
    const coreAverage = coreScores.length > 0 
      ? coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length 
      : 0;

    // Calculate contextual criteria average (only valid scores)
    const contextualScores = CONTEXTUAL_CRITERIA
      .map(key => {
        const value = interaction[key as keyof TicketData];
        const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
        return numValue;
      })
      .filter(score => !isNaN(score) && score > 0);
    
    const contextualAverage = contextualScores.length > 0 
      ? contextualScores.reduce((sum, score) => sum + score, 0) / contextualScores.length 
      : 0;

    // Weight: 70% core, 30% contextual (if available)
    if (contextualScores.length > 0) {
      return (coreAverage * 0.7) + (contextualAverage * 0.3);
    } else {
      return coreAverage;
    }
  };

  const formatScore = (value: any): string => {
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);
    return !isNaN(numValue) && numValue > 0 ? numValue.toFixed(1) : 'N/A';
  };

  // Sort interactions by created_date
  const sortedInteractions = [...ticketData].sort(
    (a, b) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime()
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <MessageSquare className="h-6 w-6 text-blue-400" />
            <h2 className="text-xl font-semibold text-white">Ticket Details: {ticketId}</h2>
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
          {/* Ticket Summary */}
          <div className="bg-gray-700/50 rounded-lg p-4 mb-6 border border-gray-600">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <span className="text-gray-400 text-sm">Total Interactions</span>
                <p className="text-white font-semibold">{ticketData.length}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Unique Employees</span>
                <p className="text-white font-semibold">{new Set(ticketData.map(t => t.employee)).size}</p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Created Date</span>
                <p className="text-white font-semibold">
                  {new Date(sortedInteractions[0]?.created_date).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-gray-400 text-sm">Latest Update</span>
                <p className="text-white font-semibold">
                  {new Date(sortedInteractions[sortedInteractions.length - 1]?.created_date).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Interactions Timeline */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white flex items-center">
              <Clock className="h-5 w-5 mr-2 text-green-400" />
              Interaction Timeline
            </h3>
            
            {sortedInteractions.map((interaction, index) => {
              const interactionScore = calculateInteractionScore(interaction);
              
              return (
                <div key={`${interaction.employee}-${index}`} className="bg-gray-700/50 rounded-lg p-6 border border-gray-600">
                  {/* Interaction Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <User className="h-5 w-5 text-blue-400" />
                        <span className="font-medium text-white">{interaction.employee}</span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-xs font-medium border ${getSentimentBg(interaction.sentiment)} ${getSentimentColor(interaction.sentiment)}`}>
                        {interaction.sentiment?.toUpperCase() || 'UNKNOWN'}
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="h-4 w-4 text-yellow-400" />
                        <span className="text-white font-medium">{interactionScore.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-400">
                      <Calendar className="h-4 w-4" />
                      <span>{new Date(interaction.created_date).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  {/* QA Scores Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Core Criteria */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-white text-sm flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-green-400" />
                        Core Criteria
                      </h5>
                      <div className="space-y-2">
                        {[
                          { key: 'tone_and_trust', label: 'Tone & Trust' },
                          { key: 'grammar_language', label: 'Grammar & Language' },
                          { key: 'professionalism_clarity', label: 'Professionalism' },
                          { key: 'non_tech_clarity', label: 'Technical Clarity' },
                          { key: 'empathy', label: 'Empathy' },
                          { key: 'responsiveness', label: 'Responsiveness' }
                        ].map(({ key, label }) => (
                          <div key={key} className="flex justify-between items-center">
                            <span className="text-gray-300 text-sm">{label}:</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-16 bg-gray-600 rounded-full h-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-blue-500 h-2 rounded-full"
                                  style={{ 
                                    width: `${Math.max(0, Math.min(100, (parseFloat(formatScore(interaction[key as keyof TicketData])) / 10) * 100))}%` 
                                  }}
                                />
                              </div>
                              <span className="text-white text-sm font-medium w-8">
                                {formatScore(interaction[key as keyof TicketData])}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Contextual Criteria */}
                    <div className="space-y-3">
                      <h5 className="font-medium text-white text-sm flex items-center">
                        <TrendingUp className="h-4 w-4 mr-1 text-purple-400" />
                        Contextual Criteria
                      </h5>
                      <div className="space-y-2">
                        {[
                          { key: 'client_alignment', label: 'Client Alignment' },
                          { key: 'proactivity', label: 'Proactivity' },
                          { key: 'ownership_accountability', label: 'Ownership' },
                          { key: 'enablement', label: 'Enablement' },
                          { key: 'consistency', label: 'Consistency' },
                          { key: 'risk_impact', label: 'Risk Impact' }
                        ].map(({ key, label }) => {
                          const score = formatScore(interaction[key as keyof TicketData]);
                          const hasScore = score !== 'N/A';
                          
                          return (
                            <div key={key} className="flex justify-between items-center">
                              <span className="text-gray-300 text-sm">{label}:</span>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-600 rounded-full h-2">
                                  {hasScore && (
                                    <div 
                                      className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full"
                                      style={{ 
                                        width: `${Math.max(0, Math.min(100, (parseFloat(score) / 10) * 100))}%` 
                                      }}
                                    />
                                  )}
                                </div>
                                <span className={`text-sm font-medium w-8 ${hasScore ? 'text-white' : 'text-gray-500'}`}>
                                  {score}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Sentiment Analysis */}
                  {interaction.sentiment_scores && (
                    <div className="mt-4 p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                      <h5 className="font-medium text-white text-sm mb-2">Sentiment Analysis</h5>
                      <div className="grid grid-cols-4 gap-4 text-xs">
                        {Object.entries(interaction.sentiment_scores).map(([sentiment, score]) => (
                          <div key={sentiment} className="text-center">
                            <div className={`font-medium capitalize ${getSentimentColor(sentiment)}`}>
                              {sentiment}
                            </div>
                            <div className="text-white">
                              {typeof score === 'number' ? (score * 100).toFixed(1) : '0.0'}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const TicketDetails: React.FC<TicketDetailsProps> = ({ tickets }) => {
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);

  // Group tickets by ticket_id
  const groupedTickets = DynamoService.groupTicketsByTicketId(tickets);

  const calculateTicketAvgScore = (ticketData: TicketData[]): number => {
    const scores = ticketData.map(interaction => {
      const CORE_CRITERIA = [
        'tone_and_trust', 'grammar_language', 'professionalism_clarity',
        'non_tech_clarity', 'empathy', 'responsiveness'
      ];
      
      const CONTEXTUAL_CRITERIA = [
        'client_alignment', 'proactivity', 'ownership_accountability',
        'enablement', 'consistency', 'risk_impact'
      ];

      // Calculate core criteria average
      const coreScores = CORE_CRITERIA
        .map(key => {
          const value = interaction[key as keyof TicketData];
          return typeof value === 'number' ? value : parseFloat(value as string) || 0;
        })
        .filter(score => !isNaN(score));
      
      const coreAverage = coreScores.length > 0 
        ? coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length 
        : 0;

      // Calculate contextual criteria average (only valid scores)
      const contextualScores = CONTEXTUAL_CRITERIA
        .map(key => {
          const value = interaction[key as keyof TicketData];
          const numValue = typeof value === 'number' ? value : parseFloat(value as string) || 0;
          return numValue;
        })
        .filter(score => !isNaN(score) && score > 0);
      
      const contextualAverage = contextualScores.length > 0 
        ? contextualScores.reduce((sum, score) => sum + score, 0) / contextualScores.length 
        : 0;

      // Weight: 70% core, 30% contextual (if available)
      if (contextualScores.length > 0) {
        return (coreAverage * 0.7) + (contextualAverage * 0.3);
      } else {
        return coreAverage;
      }
    }).filter(score => !isNaN(score) && score > 0);

    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  };

  const selectedTicketData = selectedTicket ? groupedTickets[selectedTicket] : null;

  return (
    <div className="space-y-6">
      {/* Ticket List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Ticket className="h-5 w-5 mr-2 text-blue-400" />
          Ticket Details
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(groupedTickets)
            .sort(([, ticketDataA], [, ticketDataB]) => {
              // Sort by earliest created_date in each ticket group
              const dateA = new Date(ticketDataA[0]?.created_date || 0);
              const dateB = new Date(ticketDataB[0]?.created_date || 0);
              return dateB.getTime() - dateA.getTime(); // Most recent first
            })
            .map(([ticketId, ticketData]) => {
            const avgScore = calculateTicketAvgScore(ticketData);

            return (
              <div
                key={ticketId}
                onClick={() => setSelectedTicket(ticketId)}
                className="p-4 rounded-lg border border-gray-600 bg-gray-700/50 hover:border-gray-500 cursor-pointer transition-all hover:bg-gray-700/70"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-white">{ticketId}</h4>
                    {ticketData[0]?.subject && (
                      <p className="text-gray-400 text-sm mt-1 truncate">{ticketData[0].subject}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Star className="h-4 w-4 text-yellow-400" />
                    <span className="text-sm text-white">{avgScore > 0 ? avgScore.toFixed(1) : 'N/A'}</span>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Interactions:</span>
                    <span className="text-white">{ticketData.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Employees:</span>
                    <span className="text-white">{new Set(ticketData.map(t => t.employee)).size}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Created:</span>
                    <span className="text-white">
                      {new Date(ticketData[0].created_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {selectedTicketData && (
        <TicketModal
          ticketId={selectedTicket!}
          ticketData={selectedTicketData}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
};
