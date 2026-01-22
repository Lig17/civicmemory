
import { AgentLog } from "../types";
import { IngestAgent } from "./IngestAgent";
import { ReasoningAgent } from "./ReasoningAgent";

export class CoordinatorAgent {
  private ingester = new IngestAgent();
  private reasoner = new ReasoningAgent();

  async handleSimulation(text: string, hour: number): Promise<{ logs: AgentLog[] }> {
    const logs: AgentLog[] = [];
    logs.push({
      id: crypto.randomUUID(),
      agentName: 'CoordinatorAgent',
      action: 'Starting ingestion cycle',
      timestamp: new Date(),
      type: 'system'
    });

    const { log } = await this.ingester.ingest(text, hour);
    logs.push(log);

    return { logs };
  }

  async handleQuery(query: string, hour: number, threshold: number) {
    const logs: AgentLog[] = [];
    logs.push({
      id: crypto.randomUUID(),
      agentName: 'CoordinatorAgent',
      action: `Orchestrating reasoning cycle. Active Confidence Threshold: ${threshold.toFixed(2)}`,
      timestamp: new Date(),
      type: 'system'
    });

    const { result, log } = await this.reasoner.query(query, hour, threshold);
    logs.push(log);

    return { result, logs };
  }
}
