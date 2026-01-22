
# CivicMemory: Multi-Agent Flood Monitoring System

CivicMemory is an academic demonstration of a **Multi-Agent System (MAS)** designed for high-stakes urban crisis management. It moves beyond standard RAG by implementing **long-term evolving memory** and **agentic reasoning** with explicit temporal awareness.

## 🧠 Core Architecture

### 1. Multi-Agent System (MAS)
The system employs three distinct agents, each with defined responsibilities:
- **IngestAgent**: Parses raw sensor and citizen reports using Gemini 3 Flash. It extracts structured metadata (location, source, confidence) and indexes data into the memory layer.
- **ReasoningAgent**: Performs complex reasoning over the 48-hour timeline. It utilizes Gemini 3 Pro with a Thinking Budget to synthesize decisions grounded in retrieved evidence.
- **CoordinatorAgent**: The central orchestrator that manages the flow between ingestion and reasoning, emitting logs for full system traceability.

### 2. Memory Layer (Qdrant)
The primary storage is a vector-aware memory layer (simulated in this demo via persistent storage with similarity logic).
- **Temporal Decay**: Memories are retrieved using a scoring function that weights recency: `Score = Similarity * (1 / (1 + age_hours * decay_constant))`.
- **Persistence**: Memory state persists across page reloads, simulating a long-running monitoring lifecycle.

### 3. Traceability
Every system decision includes:
- **Reasoning Chain**: Step-by-step logic used by the ReasoningAgent.
- **Evidence Provenance**: Direct links to specific historical reports used to justify an answer.
- **Confidence Scoring**: Dynamic scoring based on report age and source reliability.

## 🚀 How to Run

### Local Development
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Add your Gemini API key to your environment variables as `API_KEY`.
4. Run the development server:
   ```bash
   npm run dev
   ```

### Docker (Production Setup)
This demo simulates the Qdrant instance. In a full production deployment, the backend connects to a Qdrant container:
```bash
docker-compose up -d
```
*The `backend/` folder contains the Python implementation for use in a full Dockerized environment.*

## 📁 Project Structure
- `agents/`: Core logic for Ingest, Reasoning, and Coordination.
- `services/`: API connectors for Gemini and Memory (Qdrant).
- `components/`: UI layer focused on traceability and visualization.
- `constants.tsx`: The 48-hour simulated dataset.

---
*Created for the Multi-Intelligent Agent Systems (MAS) Academic Track.*
