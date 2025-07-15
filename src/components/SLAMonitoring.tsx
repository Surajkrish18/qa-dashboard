import React from 'react';
import { AlertTriangle, Clock, XCircle } from 'lucide-react';
import { SLAViolation } from '../types';

interface SLAMonitoringProps {
  violations: SLAViolation[];
}

export const SLAMonitoring: React.FC<SLAMonitoringProps> = ({ violations }) => {
  const initialResponseViolations = violations;

  return (
    <div className="space-y-6">
      {/* SLA Overview */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
          SLA Monitoring Dashboard
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-400 text-sm">Total Violations</p>
                <p className="text-2xl font-bold text-white">{violations.length}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-400" />
            </div>
          </div>
          
          <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-400 text-sm">Response Time Violations</p>
                <p className="text-2xl font-bold text-white">{initialResponseViolations.length}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-400" />
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
          </div>
        </div>
      </div>
      
      {/* Violations List */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h3 className="text-lg font-semibold mb-4">Employee Response Time Violations</h3>
        
        <div className="space-y-4">
          {violations.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No SLA violations found</p>
            </div>
          ) : (
            violations.map((violation, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <span className="font-medium text-white">{violation.ticket_id}</span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400">
                      Response Time
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm">
                    {new Date(violation.created_date).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Employee: </span>
                    <span className="text-white">{violation.employee}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Actual Time: </span>
                    <span className="text-red-400 font-medium">
                      {violation.actual_time} minutes
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400">SLA Limit: </span>
                    <span className="text-blue-400 font-medium">
                      {violation.sla_limit} minutes
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
