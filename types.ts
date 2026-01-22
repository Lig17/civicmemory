
export interface MemoryPayload {
  id: string;
  text: string;
  timestamp: number; // Simulated simulation time in minutes from start
  source: string;
  location: string;
  confidence: number;
  tags: string[];
}

export interface AgentLog {
  id: string;
  agentName: 'IngestAgent' | 'ReasoningAgent' | 'CoordinatorAgent';
  action: string;
  timestamp: Date;
  details?: string;
  type: 'info' | 'warning' | 'success' | 'system';
}

export interface ReasoningResult {
  answer: string;
  evidence: MemoryPayload[];
  confidence: number;
  reasoningSteps: string[];
}

export interface SimulationState {
  currentHour: number;
  memories: MemoryPayload[];
  logs: AgentLog[];
}
