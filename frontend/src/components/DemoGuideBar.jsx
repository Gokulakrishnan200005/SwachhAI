import React, { useState } from 'react';
import { Play, CheckCircle2, ArrowRight, Sparkles, ChevronRight, X, AlertCircle } from 'lucide-react';

export default function DemoGuideBar({ setActiveTab, setCurrentRole, onOpenAssistant }) {
  const [minimized, setMinimized] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const steps = [
    { num: 1, title: "1. File Complaint", role: "citizen", tab: "report", desc: "Citizen uploads garbage photo with AI vision" },
    { num: 2, title: "2. AI Segregation", role: "citizen", tab: "report", desc: "Wet vs dry analysis + priority score" },
    { num: 3, title: "3. Worker Tasks", role: "worker", tab: "worker", desc: "Crew arrives, uploads Before & After photos" },
    { num: 4, title: "4. AI Verification", role: "worker", tab: "worker", desc: "Live waste reduction % & anti-fraud validation" },
    { num: 5, title: "5. Citizen Feedback", role: "citizen", tab: "tracking", desc: "Citizen rates clearance or triggers mismatch" },
    { num: 6, title: "6. Hotspot & Root Cause", role: "admin", tab: "hotspots", desc: "Recurring patterns & predictive demand" },
    { num: 7, title: "7. Route Optimizer", role: "admin", tab: "routes", desc: "Optimized truck navigation path" },
    { num: 8, title: "8. AI Assistant", role: "admin", tab: "admin", desc: "Data-grounded municipal natural language Q&A" }
  ];

  const handleStepClick = (step) => {
    setCurrentStep(step.num);
    setCurrentRole(step.role);
    setActiveTab(step.tab);
    if (step.num === 8) {
      onOpenAssistant();
    }
  };

  if (minimized) {
    return (
      <div className="bg-slate-900 text-white px-4 py-1.5 flex items-center justify-between text-xs border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-amber-300">Hackathon Guided Demo Flow (3-Minute Tour)</span>
        </div>
        <button 
          onClick={() => setMinimized(false)}
          className="text-xs text-slate-300 hover:text-white underline">
          Expand Guide
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white border-b border-slate-800 px-4 py-2 text-xs shadow-inner">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
        
        {/* Left Label */}
        <div className="flex items-center gap-2">
          <div className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
            <Play className="w-2.5 h-2.5 fill-emerald-400 text-emerald-400" />
            Live Demo Flow
          </div>
          <span className="text-slate-300 hidden xl:inline">Click any step to inspect the live automated pipeline:</span>
        </div>

        {/* Step Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
          {steps.map((st) => (
            <button
              key={st.num}
              onClick={() => handleStepClick(st)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition flex items-center gap-1.5 ${
                currentStep === st.num 
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400' 
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white'
              }`}>
              <span>{st.title}</span>
            </button>
          ))}
        </div>

        {/* Right Close / Minimize */}
        <button 
          onClick={() => setMinimized(true)}
          className="text-slate-400 hover:text-slate-200 self-end md:self-auto"
          title="Minimize Demo Ribbon">
          <X className="w-3.5 h-3.5" />
        </button>

      </div>
    </div>
  );
}
