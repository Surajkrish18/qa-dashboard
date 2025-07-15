export interface TicketData {
  ticket_id: string;
  subject?: string;
  employee: string;
  created_date: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentiment_scores: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  client_alignment: number;
  consistency: number;
  empathy: number;
  enablement: number;
  grammar_language: number;
  non_tech_clarity: number;
  ownership_accountability: number;
  proactivity: number;
  professionalism_clarity: number;
  responsiveness: number;
  risk_impact: number;
  tone_and_trust: number;
  response_times?: Array<{
    response_by: string;
    response_time: string;
    response_type: string;
  }>;
}

export interface SLAViolation {
  ticket_id: string;
  employee: string;
  violation_type: 'initial_response' | 'resolution';
  actual_time: number;
  sla_limit: number;
  created_date: string;
}

export interface EmployeeStats {
  employee: string;
  total_tickets: number;
  avg_scores: {
    client_alignment: number;
    consistency: number;
    empathy: number;
    enablement: number;
    grammar_language: number;
    non_tech_clarity: number;
    ownership_accountability: number;
    proactivity: number;
    professionalism_clarity: number;
    responsiveness: number;
    risk_impact: number;
    tone_and_trust: number;
  };
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
    mixed: number;
  };
  sla_violations: number;
}
