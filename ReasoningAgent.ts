
import { performReasoning } from "../services/geminiService";
import { QdrantMock } from "../services/memoryService";
import { AgentLog, ReasoningResult } from "../types";

export class ReasoningAgent {
  async query(query: string, hour: number, threshold: number): Promise<{ result: ReasoningResult; log: AgentLog }> {
    /**
     * TRACEABILITY: We pass the threshold directly to the memory layer.
     * This mimics "Pre-filtering" in vector databases, ensuring the agent 
     * only considers evidence that meets the required trust level.
     */
    const retrievedMemories = QdrantMock.search(query, hour, 10, threshold);
    
    // Perform reasoning via LLM over the trustworthy subset
    const result = await performReasoning(query, retrievedMemories, hour);

    return {
      result,
      log: {
        id: crypto.randomUUID(),
        agentName: 'ReasoningAgent',
        action: `Retrieved ${retrievedMemories.length} memories above threshold ${threshold.toFixed(2)}`,
        timestamp: new Date(),
        details: `Reasoning execution completed. Confidence: ${result.confidence}. Evidence points: ${result.evidence.length}. Query context: "${query.substring(0, 40)}..."`,
        type: 'info'
      }
    };
  }
}
