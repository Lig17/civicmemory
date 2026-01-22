
import { GoogleGenAI, Type } from "@google/genai";
import { MemoryPayload, ReasoningResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Uses Gemini to parse raw crisis text into structured metadata for Qdrant ingestion.
 */
export async function processIngestion(text: string, hour: number) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this flood monitoring report from simulation hour ${hour}: "${text}".
    Extract: Source, Location (Specific landmark or street), Confidence (0-1), and key Tags.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          source: { type: Type.STRING },
          location: { type: Type.STRING },
          confidence: { type: Type.NUMBER },
          tags: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["source", "location", "confidence", "tags"]
      }
    }
  });

  return JSON.parse(response.text);
}

/**
 * Uses Gemini to reason over retrieved memories with temporal weighting.
 */
export async function performReasoning(
  query: string, 
  memories: MemoryPayload[], 
  currentHour: number
): Promise<ReasoningResult> {
  const contextStr = memories.map(m => 
    `[T-${currentHour - m.timestamp/60}h ago] Source: ${m.source} | Location: ${m.location} | Report: ${m.text}`
  ).join('\n');

  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `As a Civil Defense Reasoning Agent, analyze the following retrieved memories to answer the user's query: "${query}".
    Current Simulation Time: Hour ${currentHour}.
    
    CRITICAL INSTRUCTIONS:
    1. Prioritize recent memories over older ones.
    2. Identify specific evidence points.
    3. Calculate an overall confidence score (0.0 to 1.0) based on source consistency and recency.
    
    Context:
    ${contextStr}`,
    config: {
      thinkingConfig: { thinkingBudget: 4000 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          answer: { type: Type.STRING },
          evidence_ids: { type: Type.ARRAY, items: { type: Type.STRING }, description: "IDs of memories used as primary evidence" },
          confidence: { type: Type.NUMBER },
          steps: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Chain of thought steps" }
        },
        required: ["answer", "evidence_ids", "confidence", "steps"]
      }
    }
  });

  const parsed = JSON.parse(response.text);
  const selectedEvidence = memories.filter(m => parsed.evidence_ids.includes(m.id));

  return {
    answer: parsed.answer,
    evidence: selectedEvidence,
    confidence: parsed.confidence,
    reasoningSteps: parsed.steps
  };
}
