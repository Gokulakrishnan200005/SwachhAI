import React, { useState } from 'react';
import { Brain, X, Send, Sparkles, Database, RefreshCw, MessageSquare } from 'lucide-react';
import api from '../api';

export default function CivicAssistantModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [inputQuery, setInputQuery] = useState('');
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: "Hello! I am SwachhAI Civic Assistant. I analyze real-time municipal complaints, collection verification logs, and hotspot intelligence to answer your operational questions.",
      grounding: "Grounded in live municipal database"
    }
  ]);
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    "Which area has the most repeated complaints?",
    "Where did collection fail most often?",
    "What type of waste is most common?",
    "Which areas should be prioritized tomorrow?",
    "What are the major recurring hotspots?"
  ];

  const handleSend = async (queryText) => {
    const q = queryText || inputQuery;
    if (!q.trim()) return;

    // Add user message
    const newMsgs = [...messages, { sender: 'user', text: q }];
    setMessages(newMsgs);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await api.post('/assistant/chat', { question: q });
      setMessages([...newMsgs, {
        sender: 'bot',
        text: res.data.answer,
        grounding: res.data.grounding_source
      }]);
    } catch (err) {
      console.error(err);
      setMessages([...newMsgs, {
        sender: 'bot',
        text: "Error reaching database assistant. Please check backend connection.",
        grounding: "Network Error"
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl flex flex-col h-[600px] overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold">SwachhAI Civic Assistant</h2>
              <p className="text-[11px] text-emerald-100">Live Municipal Intelligence & Grounded Data Q&A</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 transition">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-slate-800 rounded-bl-none border border-slate-200 shadow-sm'
                }`}>
                <p className="whitespace-pre-line">{m.text}</p>
                {m.grounding && (
                  <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-1.5 text-[10px] text-emerald-700 font-medium">
                    <Database className="w-3 h-3 text-emerald-600" />
                    <span>{m.grounding}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-200 w-44 text-xs text-slate-500">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-600" />
              <span>Querying database...</span>
            </div>
          )}
        </div>

        {/* Quick Question Pills */}
        <div className="px-4 py-2 border-t border-slate-100 bg-white">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
            Suggested Municipal Queries:
          </span>
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {quickQuestions.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSend(q)}
                className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 border border-slate-200/80 rounded-lg text-[11px] font-medium whitespace-nowrap transition">
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question about complaints, failed collections, hotspots..."
            className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            type="submit"
            disabled={loading || !inputQuery.trim()}
            className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl transition">
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>
    </div>
  );
}
