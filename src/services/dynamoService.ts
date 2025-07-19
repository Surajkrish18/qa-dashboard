import { ScanCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLE_NAME } from '../config/aws';
import { TicketData, SLAViolation, EmployeeStats } from '../types';

export class DynamoService {
  // Fetch all ticket data from DynamoDB
  static async getAllTickets(): Promise<TicketData[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
      });

      const response = await docClient.send(command);
      return response.Items as TicketData[] || [];
    } catch (error) {
      console.error('Error fetching tickets from DynamoDB:', error);
      throw new Error('Failed to fetch tickets from DynamoDB');
    }
  }

  // Fetch tickets for a specific employee
  static async getTicketsByEmployee(employee: string): Promise<TicketData[]> {
    try {
      const command = new ScanCommand({
        TableName: TABLE_NAME,
        FilterExpression: 'employee = :employee',
        ExpressionAttributeValues: {
          ':employee': employee,
        },
      });

      const response = await docClient.send(command);
      return response.Items as TicketData[] || [];
    } catch (error) {
      console.error(`Error fetching tickets for employee ${employee}:`, error);
      throw new Error(`Failed to fetch tickets for employee ${employee}`);
    }
  }

  // Fetch all interactions for a specific ticket
  static async getTicketInteractions(ticketId: string): Promise<TicketData[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'ticket_id = :ticketId',
        ExpressionAttributeValues: {
          ':ticketId': ticketId,
        },
      });

      const response = await docClient.send(command);
      return response.Items as TicketData[] || [];
    } catch (error) {
      console.error(`Error fetching interactions for ticket ${ticketId}:`, error);
      throw new Error(`Failed to fetch interactions for ticket ${ticketId}`);
    }
  }

  // Calculate SLA violations based on ticket interactions
  static calculateSLAViolations(tickets: TicketData[]): SLAViolation[] {
    const violations: SLAViolation[] = [];
    
    tickets.forEach(ticket => {
      // Check if ticket has response_times field
      if (!ticket.response_times || !Array.isArray(ticket.response_times)) {
        return;
      }
      
      // Filter for "Employee to Client" responses only
      const employeeResponses = ticket.response_times.filter(
        response => response.response_type === 'Employee to Client'
      );
      
      employeeResponses.forEach(response => {
        const responseTime = this.parseResponseTime(response.response_time);
        
        // Check if response time exceeds 30 minutes SLA
        if (responseTime > 30) {
          violations.push({
            ticket_id: ticket.ticket_id,
            employee: response.response_by,
            violation_type: 'initial_response',
            actual_time: responseTime,
            sla_limit: 30,
            created_date: ticket.created_date,
          });
        }
      });
    });

    return violations;
  }
  
  // Parse response time string to minutes
  static parseResponseTime(responseTimeStr: string): number {
    if (!responseTimeStr || typeof responseTimeStr !== 'string') {
      return 0;
    }
    
    // Handle formats like "20h 33m", "0h 19m", "45m", "2h", etc.
    const timeStr = responseTimeStr.toLowerCase().trim();
    let totalMinutes = 0;
    
    // Extract hours
    const hoursMatch = timeStr.match(/(\d+)h/);
    if (hoursMatch) {
      totalMinutes += parseInt(hoursMatch[1]) * 60;
    }
    
    // Extract minutes
    const minutesMatch = timeStr.match(/(\d+)m/);
    if (minutesMatch) {
      totalMinutes += parseInt(minutesMatch[1]);
    }
    
    // If no hours or minutes found, try to parse as plain number (assume minutes)
    if (totalMinutes === 0) {
      const numberMatch = timeStr.match(/(\d+)/);
      if (numberMatch) {
        totalMinutes = parseInt(numberMatch[1]);
      }
    }
    
    return totalMinutes;
  }

  // Group tickets by ticket_id
  static groupTicketsByTicketId(tickets: TicketData[]): Record<string, TicketData[]> {
    return tickets.reduce((acc, ticket) => {
      if (!acc[ticket.ticket_id]) {
        acc[ticket.ticket_id] = [];
      }
      acc[ticket.ticket_id].push(ticket);
      return acc;
    }, {} as Record<string, TicketData[]>);
  }

  // Calculate employee statistics
  static calculateEmployeeStats(tickets: TicketData[], allowedEmployees: string[]): EmployeeStats[] {
    const stats: Record<string, EmployeeStats> = {};
    
    // Define core criteria (always present) and contextual criteria (sometimes present)
    const CORE_CRITERIA = [
      'tone_and_trust',
      'grammar_language', 
      'professionalism_clarity',
      'non_tech_clarity',
      'empathy',
      'responsiveness'
    ];
    
    const CONTEXTUAL_CRITERIA = [
      'client_alignment',
      'proactivity', 
      'ownership_accountability',
      'enablement',
      'consistency',
      'risk_impact'
    ];
    
    // Filter tickets for allowed employees only
    const filteredTickets = tickets.filter(ticket => 
      allowedEmployees.includes(ticket.employee)
    );

    filteredTickets.forEach(ticket => {
      if (!stats[ticket.employee]) {
        stats[ticket.employee] = {
          employee: ticket.employee,
          total_tickets: 0,
          avg_scores: {
            client_alignment: 0,
            consistency: 0,
            empathy: 0,
            enablement: 0,
            grammar_language: 0,
            non_tech_clarity: 0,
            ownership_accountability: 0,
            proactivity: 0,
            professionalism_clarity: 0,
            responsiveness: 0,
            risk_impact: 0,
            tone_and_trust: 0
          },
          sentiment_distribution: {
            positive: 0,
            negative: 0,
            neutral: 0,
            mixed: 0
          },
          sla_violations: 0
        };
      }
      
      const emp = stats[ticket.employee];
      emp.total_tickets++;
      
      // Calculate running averages for QA scores, excluding 0 and N/A values
      Object.keys(emp.avg_scores).forEach(key => {
        const scoreKey = key as keyof typeof emp.avg_scores;
        const rawValue = ticket[scoreKey];
        const newValue = typeof rawValue === 'number' ? rawValue : parseFloat(rawValue as string) || 0;
        
        // Only include valid positive scores (exclude 0, NaN, null, undefined)
        const isCoreScore = CORE_CRITERIA.includes(scoreKey);
        const isValidScore = !isNaN(newValue) && newValue > 0;
        
        if (isValidScore) {
          // Track count of valid scores for proper averaging
          if (!emp.avg_scores[`${scoreKey}_count` as any]) {
            emp.avg_scores[`${scoreKey}_count` as any] = 0;
          }
          if (!emp.avg_scores[`${scoreKey}_sum` as any]) {
            emp.avg_scores[`${scoreKey}_sum` as any] = 0;
          }
          
          emp.avg_scores[`${scoreKey}_count` as any]++;
          emp.avg_scores[`${scoreKey}_sum` as any] += newValue;
          emp.avg_scores[scoreKey] = emp.avg_scores[`${scoreKey}_sum` as any] / emp.avg_scores[`${scoreKey}_count` as any];
        }
      });
      
      // Update sentiment distribution with proper sentiment handling
      const sentiment = ticket.sentiment?.toLowerCase();
      if (sentiment === 'positive' || sentiment === 'negative' || sentiment === 'neutral' || sentiment === 'mixed') {
        emp.sentiment_distribution[sentiment as keyof typeof emp.sentiment_distribution]++;
      }
    });
    
    // Clean up temporary counting fields
    Object.values(stats).forEach(emp => {
      Object.keys(emp.avg_scores).forEach(key => {
        if (key.endsWith('_count') || key.endsWith('_sum')) {
          delete emp.avg_scores[key as keyof typeof emp.avg_scores];
        }
      });
    });
    
    // Calculate SLA violations for each employee
    const violations = this.calculateSLAViolations(filteredTickets);
    violations.forEach(violation => {
      if (stats[violation.employee]) {
        stats[violation.employee].sla_violations++;
      }
    });
    
    return Object.values(stats);
  }

  // Calculate overall score for an employee considering core vs contextual criteria
  static calculateOverallScore(avgScores: EmployeeStats['avg_scores']): number {
    const CORE_CRITERIA = [
      'tone_and_trust',
      'grammar_language', 
      'professionalism_clarity',
      'non_tech_clarity',
      'empathy',
      'responsiveness'
    ];
    
    const CONTEXTUAL_CRITERIA = [
      'client_alignment',
      'proactivity', 
      'ownership_accountability',
      'enablement',
      'consistency',
      'risk_impact'
    ];

    // Calculate core criteria average (should always have values)
    const coreScores = CORE_CRITERIA
      .map(key => avgScores[key as keyof typeof avgScores])
      .filter(score => !isNaN(score) && score > 0);
    
    const coreAverage = coreScores.length > 0 
      ? coreScores.reduce((sum, score) => sum + score, 0) / coreScores.length 
      : 0;

    // Calculate contextual criteria average (only from valid scores)
    const contextualScores = CONTEXTUAL_CRITERIA
      .map(key => avgScores[key as keyof typeof avgScores])
      .filter(score => !isNaN(score) && score > 0);
    
    const contextualAverage = contextualScores.length > 0 
      ? contextualScores.reduce((sum, score) => sum + score, 0) / contextualScores.length 
      : 0;

    // Weight: 70% core criteria, 30% contextual criteria (if available)
    if (contextualScores.length > 0) {
      return (coreAverage * 0.7) + (contextualAverage * 0.3);
    } else {
      // If no contextual scores, use only core criteria
      return coreAverage;
    }
  }

  // Search tickets by ticket ID or employee name
  static searchTickets(tickets: TicketData[], query: string): TicketData[] {
    if (!query.trim()) return tickets;
    
    const lowerQuery = query.toLowerCase();
    return tickets.filter(ticket => 
      ticket.ticket_id.toLowerCase().includes(lowerQuery) ||
      ticket.employee.toLowerCase().includes(lowerQuery)
    );
  }
}
