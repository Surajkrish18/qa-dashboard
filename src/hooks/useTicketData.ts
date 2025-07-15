import { useState, useEffect } from 'react';
import { TicketData, EmployeeStats, SLAViolation } from '../types';
import { DynamoService } from '../services/dynamoService';

const ALLOWED_EMPLOYEES = [
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
  "Sharmila chandru",
  "Stinoy Stanley",
  "Rahul P Nampoothiri"
];

export const useTicketData = () => {
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStats[]>([]);
  const [slaViolations, setSlaViolations] = useState<SLAViolation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tickets from DynamoDB
      const allTickets = await DynamoService.getAllTickets();
      
      // Filter tickets for allowed employees
      const filteredTickets = allTickets.filter(ticket => 
        ALLOWED_EMPLOYEES.includes(ticket.employee)
      );

      // Calculate employee statistics
      const stats = DynamoService.calculateEmployeeStats(allTickets, ALLOWED_EMPLOYEES);
      
      // Calculate SLA violations
      const violations = DynamoService.calculateSLAViolations(filteredTickets);

      setTickets(filteredTickets);
      setEmployeeStats(stats);
      setSlaViolations(violations);
    } catch (err) {
      console.error('Error fetching ticket data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = () => {
    fetchData();
  };

  const getTicketsByEmployee = async (employee: string): Promise<TicketData[]> => {
    try {
      return await DynamoService.getTicketsByEmployee(employee);
    } catch (err) {
      console.error(`Error fetching tickets for ${employee}:`, err);
      return [];
    }
  };

  const getTicketInteractions = async (ticketId: string): Promise<TicketData[]> => {
    try {
      return await DynamoService.getTicketInteractions(ticketId);
    } catch (err) {
      console.error(`Error fetching interactions for ${ticketId}:`, err);
      return [];
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return {
    tickets,
    employeeStats,
    slaViolations,
    loading,
    error,
    refreshData,
    getTicketsByEmployee,
    getTicketInteractions,
    allowedEmployees: ALLOWED_EMPLOYEES
  };
};
