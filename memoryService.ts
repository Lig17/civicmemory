
import { MemoryPayload } from "../types";

const COLLECTION_NAME = "civic_memory_v1";

export class QdrantMock {
  static save(payload: MemoryPayload) {
    const existing = this.getAll();
    existing.push(payload);
    localStorage.setItem(COLLECTION_NAME, JSON.stringify(existing));
  }

  static getAll(): MemoryPayload[] {
    const data = localStorage.getItem(COLLECTION_NAME);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Simulates vector retrieval with temporal decay and metadata filtering.
   * In a real system, this would be a Qdrant search with a recency filter 
   * and a payload filter for confidence.
   */
  static search(query: string, currentHour: number, limit: number = 5, minConfidence: number = 0): MemoryPayload[] {
    const memories = this.getAll();
    const queryTerms = query.toLowerCase().split(/\W+/);

    // Filter by confidence first (metadata filtering)
    const filtered = memories.filter(m => m.confidence >= minConfidence);

    // Simple keyword-based similarity score + temporal decay
    const scored = filtered.map(m => {
      let textMatch = 0;
      const content = m.text.toLowerCase();
      queryTerms.forEach(term => {
        if (content.includes(term)) textMatch += 1;
      });

      // Normalize text match
      const baseScore = textMatch / (queryTerms.length || 1);
      
      // Temporal decay factor: 1.0 for now, decreasing as memory gets older
      const ageHours = (currentHour * 60 - m.timestamp) / 60;
      const decay = 1 / (1 + (ageHours * 0.1)); // Hyper-parameter for decay speed

      return {
        ...m,
        score: baseScore * decay
      };
    });

    // Sort by combined score and return top results
    return scored
      .sort((a, b) => (b as any).score - (a as any).score)
      .slice(0, limit);
  }

  static clear() {
    localStorage.removeItem(COLLECTION_NAME);
  }
}
