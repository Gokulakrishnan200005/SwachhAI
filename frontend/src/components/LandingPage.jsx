import React from 'react';
import { 
  ArrowRight, Camera, CheckCircle2, ShieldCheck, AlertTriangle, 
  MapPin, Brain, RefreshCw, BarChart3, Truck, Flame, Sparkles, Activity
} from 'lucide-react';

export default function LandingPage({ setActiveTab, setCurrentRole, onOpenAssistant, stats }) {
  const kpis = stats?.kpis || {
    total_reports: 32,
    open_reports: 16,
    verified_collections: 8,
    swachhai_operational_score: 82.5,
    recurring_hotspots: 5
  };

  return (
    <div className="space-y-12 pb-16">
      
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-white to-slate-50 border-b border-slate-200/80 pt-12 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Built for Real-World Indian Municipal Sanitation Challenges</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight">
            AI-Powered Waste Segregation & <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Hotspot Intelligence</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            A complete, working civic-tech platform combining computer-vision waste detection, source segregation compliance, before/after clearance verification, and predictive hotspot intelligence.
          </p>

          {/* Quick Action CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={() => { setCurrentRole('citizen'); setActiveTab('report'); }}
              className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 flex items-center gap-2 transition hover:-translate-y-0.5">
              <Camera className="w-4 h-4" />
              <span>Report Waste as Citizen</span>
            </button>
            <button
              onClick={() => { setCurrentRole('worker'); setActiveTab('worker'); }}
              className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 font-semibold text-sm border border-slate-200 shadow-sm flex items-center gap-2 transition hover:-translate-y-0.5">
              <Truck className="w-4 h-4 text-emerald-600" />
              <span>Worker Verification Flow</span>
            </button>
            <button
              onClick={() => { setCurrentRole('admin'); setActiveTab('admin'); }}
              className="px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md flex items-center gap-2 transition hover:-translate-y-0.5">
              <BarChart3 className="w-4 h-4 text-emerald-400" />
              <span>Municipal Dashboard</span>
            </button>
          </div>

          {/* Live Telemetry Banner */}
          <div className="max-w-4xl mx-auto pt-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
              <div className="text-center p-2 border-r border-slate-100 last:border-r-0">
                <p className="text-xs text-slate-500 font-medium">SwachhAI Score</p>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <span className="text-2xl font-bold text-slate-900">{kpis.swachhai_operational_score || 82.5}</span>
                  <span className="text-xs font-semibold text-slate-400">/100</span>
                </div>
                <p className="text-[10px] text-emerald-700 font-medium mt-0.5">Municipal Index</p>
              </div>

              <div className="text-center p-2 border-r border-slate-100 last:border-r-0">
                <p className="text-xs text-slate-500 font-medium">Verified Cleared</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">{kpis.verified_collections || 8}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">AI Confirmed</p>
              </div>

              <div className="text-center p-2 border-r border-slate-100 last:border-r-0">
                <p className="text-xs text-slate-500 font-medium">Active Hotspots</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{kpis.recurring_hotspots || 5}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Under Surveillance</p>
              </div>

              <div className="text-center p-2">
                <p className="text-xs text-slate-500 font-medium">Total Complaints</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{kpis.total_reports || 32}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">Tracked & Geotagged</p>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2 italic">
              *SwachhAI Operational Score is an algorithmic efficiency measure based on telemetry. Not an official statutory cleanliness certification.
            </p>
          </div>

        </div>
      </section>

      {/* End-to-End Pipeline Visualization */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">End-to-End Automation</span>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Closed-Loop Municipal Waste Lifecycle</h2>
            <p className="text-sm text-slate-500">Every report traverses an auditable AI-verified progression from citizen reporting to collection verification.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 pt-2">
            {[
              { step: "01", title: "Citizen Report", desc: "Multilingual input + photo + GPS", icon: Camera },
              { step: "02", title: "AI Vision Pipeline", desc: "9 categories, contours & severity", icon: Brain },
              { step: "03", title: "Segregation & Priority", desc: "Wet/Dry rules + transparent score", icon: AlertTriangle },
              { step: "04", title: "Worker Dispatch", desc: "Before photo & GPS geofencing", icon: Truck },
              { step: "05", title: "AI Verification", desc: "Relative reduction & anti-fraud", icon: ShieldCheck },
              { step: "06", title: "Hotspot Intelligence", desc: "Root causes & 24h risk prediction", icon: Flame }
            ].map((st, idx) => {
              const Icon = st.icon;
              return (
                <div key={idx} className="relative p-4 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-between group hover:border-emerald-500 transition">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">{st.step}</span>
                      <Icon className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{st.title}</h3>
                    <p className="text-xs text-slate-500 leading-normal">{st.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Core Innovation Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Key Differentiators</span>
          <h2 className="text-2xl font-bold text-slate-900 mt-1">Why SwachhAI Solves Real Municipal Problems</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Before/After AI Verification</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Eliminates fake clearance claims. Workers must submit both Before and After photos. The CV engine calculates relative waste reduction percentage, flags residual garbage, and catches duplicate photo fraud.
            </p>
            <div className="pt-2">
              <button onClick={() => { setCurrentRole('worker'); setActiveTab('worker'); }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <span>Test Worker Verification</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Source Segregation Engine</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Identifies whether waste is properly segregated into wet biodegradable and dry recyclable streams. Generates clear, non-punitive civic recommendations for households and bulk commercial generators.
            </p>
            <div className="pt-2">
              <button onClick={() => { setCurrentRole('citizen'); setActiveTab('report'); }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <span>Analyze Segregation</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3 hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              <Flame className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Predictive Hotspot Intelligence</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Moves cities from reactive firefighting to proactive prevention. Correlates repeat complaints with market activity, transit times, and bin deficits to generate grounded AI Root Cause Hypotheses.
            </p>
            <div className="pt-2">
              <button onClick={() => { setCurrentRole('admin'); setActiveTab('hotspots'); }} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                <span>View Hotspot Insights</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

        </div>
      </section>

    </div>
  );
}
