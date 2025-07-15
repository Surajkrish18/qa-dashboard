import { TicketData, SLAViolation, EmployeeStats } from '../types';

export const ALLOWED_EMPLOYEES = [
  "Nithin V P",
  "Sajni V",
  "Abhishek Krishna",
  "Suraj Krishnan",
  "Abin Joseph",
  "Adarsh K",
  "Adhilekshmi P S",
  "Aswani Chandran",
  "Bency Benny",
  "Catherine Anto",
  "Denny Antony",
  "Devika Sreenivasan",
  "Julious Gonsalves",
  "Megha Chithran",
  "Nandhu Krishnan",
  "Saradha Seenivasan",
  "Shine Kumar",
  "Sreelakshmi K M",
  "Surya Krishna",
  "Swathi Rajendran",
  "Adarsh RK",
  "Alvin M Varghese",
  "Anusree O",
  "Alikha Krishna",
  "Vishnu C P",
  "Shyam Prakash",
  "Sourav K",
  "Sharmila chandru"
];

export const mockTicketData: TicketData[] = [
  {
    ticket_id: "TKT-001",
    employee: "Nithin V P",
    created_date: "2024-01-15T10:30:00Z",
    sentiment: "positive",
    sentiment_scores: { positive: 0.85, negative: 0.05, neutral: 0.10, mixed: 0.00 },
    client_alignment: 8.5,
    consistency: 9.0,
    empathy: 8.8,
    enablement: 8.2,
    grammar_language: 9.2,
    non_tech_clarity: 8.7,
    ownership_accountability: 9.1,
    proactivity: 8.9,
    professionalism_clarity: 9.3,
    responsiveness: 8.6,
    risk_impact: 8.4,
    tone_and_trust: 9.0
  },
  {
    ticket_id: "TKT-002",
    employee: "Sajni V",
    created_date: "2024-01-15T14:20:00Z",
    sentiment: "neutral",
    sentiment_scores: { positive: 0.45, negative: 0.20, neutral: 0.35, mixed: 0.00 },
    client_alignment: 7.8,
    consistency: 8.2,
    empathy: 7.9,
    enablement: 8.1,
    grammar_language: 8.5,
    non_tech_clarity: 8.0,
    ownership_accountability: 8.3,
    proactivity: 7.7,
    professionalism_clarity: 8.4,
    responsiveness: 8.0,
    risk_impact: 7.9,
    tone_and_trust: 8.2
  },
  {
    ticket_id: "TKT-003",
    employee: "Abhishek Krishna",
    created_date: "2024-01-16T09:15:00Z",
    sentiment: "positive",
    sentiment_scores: { positive: 0.78, negative: 0.10, neutral: 0.12, mixed: 0.00 },
    client_alignment: 8.9,
    consistency: 8.7,
    empathy: 9.1,
    enablement: 8.6,
    grammar_language: 8.8,
    non_tech_clarity: 9.0,
    ownership_accountability: 8.8,
    proactivity: 9.2,
    professionalism_clarity: 8.9,
    responsiveness: 8.7,
    risk_impact: 8.5,
    tone_and_trust: 9.1
  },
  {
    ticket_id: "TKT-001",
    employee: "Suraj Krishnan",
    created_date: "2024-01-15T11:45:00Z",
    sentiment: "positive",
    sentiment_scores: { positive: 0.82, negative: 0.08, neutral: 0.10, mixed: 0.00 },
    client_alignment: 8.3,
    consistency: 8.8,
    empathy: 8.5,
    enablement: 8.4,
    grammar_language: 8.9,
    non_tech_clarity: 8.6,
    ownership_accountability: 8.7,
    proactivity: 8.1,
    professionalism_clarity: 8.8,
    responsiveness: 8.9,
    risk_impact: 8.2,
    tone_and_trust: 8.6
  },
  {
    ticket_id: "TKT-004",
    employee: "Abin Joseph",
    created_date: "2024-01-16T16:30:00Z",
    sentiment: "negative",
    sentiment_scores: { positive: 0.15, negative: 0.70, neutral: 0.15, mixed: 0.00 },
    client_alignment: 6.8,
    consistency: 7.2,
    empathy: 6.9,
    enablement: 7.0,
    grammar_language: 7.8,
    non_tech_clarity: 7.1,
    ownership_accountability: 7.3,
    proactivity: 6.7,
    professionalism_clarity: 7.4,
    responsiveness: 6.9,
    risk_impact: 7.0,
    tone_and_trust: 7.2
  }
];

export const mockSLAViolations: SLAViolation[] = [
  {
    ticket_id: "TKT-004",
    employee: "Abin Joseph",
    violation_type: "initial_response",
    actual_time: 45,
    sla_limit: 30,
    created_date: "2024-01-16T16:30:00Z"
  },
  {
    ticket_id: "TKT-002",
    employee: "Sajni V",
    violation_type: "resolution",
    actual_time: 9.5,
    sla_limit: 8,
    created_date: "2024-01-15T14:20:00Z"
  }
];

export const calculateEmployeeStats = (tickets: TicketData[]): EmployeeStats[] => {
  const stats: Record<string, EmployeeStats> = {};
  
  tickets.forEach(ticket => {
    if (!ALLOWED_EMPLOYEES.includes(ticket.employee)) return;
    
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
    
    // Calculate averages
    Object.keys(emp.avg_scores).forEach(key => {
      const scoreKey = key as keyof typeof emp.avg_scores;
      emp.avg_scores[scoreKey] = (emp.avg_scores[scoreKey] * (emp.total_tickets - 1) + ticket[scoreKey]) / emp.total_tickets;
    });
    
    // Update sentiment distribution
    emp.sentiment_distribution[ticket.sentiment]++;
  });
  
  // Add SLA violations
  mockSLAViolations.forEach(violation => {
    if (stats[violation.employee]) {
      stats[violation.employee].sla_violations++;
    }
  });
  
  return Object.values(stats);
};