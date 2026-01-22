
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { CoordinatorAgent } from './agents/CoordinatorAgent';
import { AgentLog, MemoryPayload, ReasoningResult } from './types';
import { SCENARIO_DATA, INITIAL_PROMPT } from './constants';
import { QdrantMock } from './services/memoryService';

const App: React.FC = () => {
  const [currentHour, setCurrentHour] = useState(0);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [memories, setMemories] = useState<MemoryPayload[]>([]);
  const [query, setQuery] = useState(INITIAL_PROMPT);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.3);
  const [lastResult, setLastResult] = useState<ReasoningResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const coordinator = useMemo(() => new CoordinatorAgent(), []);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Sync with mock Qdrant on mount
  useEffect(() => {
    const existing = QdrantMock.getAll();
    setMemories(existing);
    if (existing.length > 0) {
      const maxHour = Math.max(...existing.map(m => Math.floor(m.timestamp / 60)));
      setCurrentHour(maxHour + 1);
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const handleSimulate = async () => {
    if (currentHour >= SCENARIO_DATA.length) return;
    setIsProcessing(true);
    try {
      const { logs: newLogs } = await coordinator.handleSimulation(
        SCENARIO_DATA[currentHour],
        currentHour
      );
      setLogs(prev => [...prev, ...newLogs]);
      setMemories(QdrantMock.getAll());
      setCurrentHour(prev => prev + 1);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuery = async () => {
    if (!query.trim()) return;
    setIsProcessing(true);
    try {
      const { result, logs: queryLogs } = await coordinator.handleQuery(query, currentHour, confidenceThreshold);
      setLastResult(result);
      setLogs(prev => [...prev, ...queryLogs]);
    } catch (error) {
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetSystem = () => {
    QdrantMock.clear();
    setMemories([]);
    setLogs([]);
    setCurrentHour(0);
    setLastResult(null);
  };

  // Filter evidence based on current threshold for the UI view
  const visibleEvidence = useMemo(() => {
    if (!lastResult) return [];
    return lastResult.evidence.filter(ev => ev.confidence >= confidenceThreshold);
  }, [lastResult, confidenceThreshold]);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white p-6 shadow-xl flex justify-between items-center sticky top-0 z-50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">CivicMemory <span className="text-blue-400 font-normal">MAS</span></h1>
          <p className="text-slate-400 text-sm">Long-term Evolving Memory Demonstration (Flood Scenario)</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="bg-slate-800 px-4 py-2 rounded-full border border-slate-700">
            <span className="text-blue-400 font-mono text-lg font-bold">T+{currentHour}h</span>
          </div>
          <button 
            onClick={resetSystem}
            className="text-xs text-slate-400 hover:text-white transition-colors uppercase tracking-widest border border-slate-700 px-3 py-1 rounded"
          >
            Reset System
          </button>
        </div>
      </header>

      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-[1600px] mx-auto w-full">
        
        {/* Left Column: Control & Logs */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Simulation Control */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <h2 className="text-sm font-semibold uppercase text-slate-500 mb-4 tracking-wider">Simulation Core</h2>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                <p className="text-sm text-blue-900 italic font-medium">
                  {currentHour < SCENARIO_DATA.length 
                    ? `Next event at H+${currentHour}: ${SCENARIO_DATA[currentHour].split(':')[1].trim()}` 
                    : "End of 48-hour dataset reached."}
                </p>
              </div>
              
              {/* Agent Configuration: Confidence Threshold */}
              <div className="space-y-2 py-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-tight">Memory Confidence Threshold</label>
                  <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">{confidenceThreshold.toFixed(2)}</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.05" 
                  value={confidenceThreshold}
                  onChange={(e) => setConfidenceThreshold(parseFloat(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <p className="text-[10px] text-slate-400 leading-tight">
                  Agents will ignore ingested reports with confidence scores below this value during reasoning.
                </p>
              </div>

              <button
                onClick={handleSimulate}
                disabled={isProcessing || currentHour >= SCENARIO_DATA.length}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {isProcessing ? (
                  <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                ) : (
                  "Simulate Next Hour"
                )}
              </button>
            </div>
          </section>

          {/* Traceability: Agent Reasoning Log */}
          <section className="bg-slate-900 rounded-xl shadow-sm overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-sm font-semibold uppercase text-slate-400 tracking-wider">Agent Execution Log</h2>
              <span className="text-[10px] text-slate-500 font-mono uppercase">Read Only</span>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {logs.length === 0 && (
                <p className="text-slate-600 text-sm text-center italic mt-10">No agent actions recorded yet.</p>
              )}
              {logs.map(log => (
                <div key={log.id} className="border-l-2 border-slate-700 pl-4 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-1.5 rounded uppercase ${
                      log.agentName === 'IngestAgent' ? 'bg-green-900 text-green-300' :
                      log.agentName === 'ReasoningAgent' ? 'bg-blue-900 text-blue-300' :
                      log.agentName === 'CoordinatorAgent' ? 'bg-purple-900 text-purple-300' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {log.agentName}
                    </span>
                    <span className="text-slate-500 text-[10px] font-mono">{log.timestamp.toLocaleTimeString()}</span>
                  </div>
                  <p className="text-slate-200 text-sm font-medium">{log.action}</p>
                  {log.details && (
                    <p className="text-slate-500 text-xs mt-1 leading-relaxed">{log.details}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Interaction & Result */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* Query Interface */}
          <section className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask the system about the current flood status..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition-all pr-24"
                />
                <button
                  onClick={handleQuery}
                  disabled={isProcessing || !query.trim()}
                  className="absolute right-2 top-2 bottom-2 px-4 bg-slate-900 text-white rounded-md text-sm font-semibold hover:bg-slate-800 disabled:bg-slate-400 transition-all"
                >
                  Query
                </button>
              </div>
            </div>

            {/* Reasoning Result */}
            {lastResult && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-slate-900">System Reasoning Output</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">Model Confidence:</span>
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full ${lastResult.confidence > 0.7 ? 'bg-green-500' : 'bg-yellow-500'}`} 
                        style={{ width: `${lastResult.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-bold text-slate-700">{(lastResult.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                  <p className="text-slate-800 text-lg leading-relaxed font-medium mb-6">
                    {lastResult.answer}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Reasoning Steps */}
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Internal Reasoning Chain</h4>
                      <ul className="space-y-3">
                        {lastResult.reasoningSteps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm text-slate-600 bg-white/40 p-2 rounded border border-slate-100 shadow-sm">
                            <span className="text-blue-500 font-mono font-bold shrink-0">{i + 1}</span>
                            <span className="leading-snug">{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Evidence Points */}
                    <div className="flex flex-col">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Retrieved Evidence</h4>
                      <div className="space-y-3 flex-1">
                        {visibleEvidence.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full min-h-[100px] border-2 border-dashed border-slate-200 rounded-xl bg-slate-100/50 p-4">
                            <svg className="w-8 h-8 text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-xs text-slate-500 font-medium text-center">No specific evidence linked (check threshold)</p>
                          </div>
                        ) : (
                          visibleEvidence.map((ev) => (
                            <div key={ev.id} className="bg-white border-l-4 border-l-blue-500 border border-slate-200 p-3 rounded shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                                  T-{currentHour - Math.floor(ev.timestamp / 60)}h ago
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">Trust: {ev.confidence.toFixed(2)}</span>
                                </div>
                              </div>
                              <p className="text-[13px] text-slate-700 leading-normal font-medium mb-1">"{ev.text}"</p>
                              <div className="flex justify-between items-center text-[10px] text-slate-400">
                                <span className="italic">Source: {ev.source}</span>
                                <span className="uppercase tracking-widest">{ev.location}</span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Long-term Memory Visualization */}
          <section className="flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-semibold uppercase text-slate-500 mb-4 tracking-wider px-2">Evolving Long-term Memory (Qdrant)</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 flex-1">
              {memories.length === 0 && (
                <div className="col-span-full h-48 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400 italic">
                  No memories indexed yet. Simulate an hour to start ingestion.
                </div>
              )}
              {memories.slice().reverse().map(m => {
                const isFiltered = m.confidence < confidenceThreshold;
                return (
                  <div 
                    key={m.id} 
                    className={`relative bg-white border p-4 rounded-xl shadow-sm transition-all duration-300 group ${
                      isFiltered 
                        ? 'opacity-50 grayscale border-red-200 border-dashed bg-slate-100 pointer-events-none blur-[0.5px]' 
                        : 'border-slate-200 hover:border-blue-300 hover:shadow-md'
                    }`}
                  >
                    {/* Filtered Badge */}
                    {isFiltered && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[8px] font-bold text-red-600 uppercase tracking-tight bg-red-50/90 backdrop-blur px-1.5 py-0.5 rounded border border-red-100 z-10 animate-pulse">
                        <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                        Untrusted
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-[10px] font-mono ${isFiltered ? 'text-slate-400' : 'text-slate-500 font-bold'}`}>
                        H+{Math.floor(m.timestamp/60)}
                      </span>
                      <span className={`text-[10px] uppercase tracking-tighter ${isFiltered ? 'text-slate-400' : 'text-blue-600 font-bold'}`}>
                        {m.location}
                      </span>
                    </div>
                    
                    <p className={`text-sm leading-snug mb-3 ${isFiltered ? 'text-slate-400 italic' : 'text-slate-700'}`}>
                      {m.text}
                    </p>

                    <div className="flex justify-between items-center mt-auto">
                      <div className="flex flex-wrap gap-1">
                        {m.tags.map(tag => (
                          <span 
                            key={tag} 
                            className={`text-[9px] px-1.5 py-0.5 rounded ${
                              isFiltered ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <span className={`text-[10px] font-mono font-bold ${
                        isFiltered ? 'text-red-400' : 'text-blue-500'
                      }`}>
                        {m.confidence.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-slate-50 border-t border-slate-200 p-4 text-center">
        <p className="text-xs text-slate-500 font-medium">
          CivicMemory Academic Demo • Powered by Gemini Pro & Simulated Qdrant Vector Storage
        </p>
      </footer>
    </div>
  );
};

export default App;
