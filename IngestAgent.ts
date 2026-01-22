
import { processIngestion } from "../services/geminiService";
import { QdrantMock } from "../services/memoryService";
import { MemoryPayload, AgentLog } from "../types";

export class IngestAgent {
  async ingest(text: string, hour: number): Promise<{ memory: MemoryPayload; log: AgentLog }> {
    const metadata = await processIngestion(text, hour);
    
    const memory: MemoryPayload = {
      id: crypto.randomUUID(),
      text,
      timestamp: hour * 60,
      source: metadata.source,
      location: metadata.location,
      confidence: metadata.confidence,
      tags: metadata.tags
    };

    QdrantMock.save(memory);

    return {
      memory,
      log: {
        id: crypto.randomUUID(),
        agentName: 'IngestAgent',
        action: `Ingested report for ${metadata.location}`,
        timestamp: new Date(),
        details: `Source: ${metadata.source}, Tags: ${metadata.tags.join(', ')}`,
        type: 'success'
      }
    };
  }
}
