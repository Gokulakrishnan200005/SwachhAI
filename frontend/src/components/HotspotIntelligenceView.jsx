import React, { useState, useEffect } from 'react';
import { 
  Flame, TrendingUp, Clock, AlertTriangle, ShieldCheck, 
  MapPin, Sparkles, RefreshCw, Calendar, Users, HelpCircle
} from 'lucide-react';
import api from '../api';

export default function HotspotIntelligenceView() {
  const [hotspots, setHotspots] = useState([]);
  const [predictions, setPredictions] = useState([]);
  const [demandSlots, setDemandSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHotspotData = async () => {
    setLoading(true);
    try {
      const [hRes, pRes, dRes] = await Promise.all([
        api.get('/hotspots/'),
        api.get('/hotspots/predictions'),
        api.get('/hotspots/demand')
      ]);
      setHotspots(hRes.data);
      setPredictions(pRes.data);
      setDemandSlots(dRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHotspotData();
  }, []);

  if (loading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Synthesizing spatial hotspot intelligence...
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6">
      
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Recurring Waste Hotspot Intelligence</h1>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-200">
            Predictive Analytics
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Algorithmic clustering of chronic waste dumps, causal root-cause hypotheses, and 24-hour collection demand forecasting.
        </p>
      </div>

      {/* 24-Hour Hotspot Risk Predictions Banner */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-2xl p-6 text-white shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
            <h2 className="text-base font-bold">24-Hour Hotspot Predictive Risk Forecast</h2>
          </div>
          <span className="text-[11px] text-amber-300 font-semibold bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
            Demo prediction based on simulated historical data
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {predictions.slice(0, 3).map((p) => (
            <div key={p.id} className="bg-white/10 backdrop-blur rounded-xl p-4 border border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">{p.zone}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  p.predicted_risk === 'CRITICAL' ? 'bg-red-500/80 text-white' : 'bg-orange-500/80 text-white'
                }`}>
                  {p.predicted_risk} RISK
                </span>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{p.explanation}</p>
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[11px] text-slate-300 font-medium">
                <span>Peak: {p.peak_hours}</span>
                <span>Expected: ~{p.expected_reports} reports</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Hourly Collection Demand Forecast */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              <span>Tomorrow's Hourly Collection Demand Forecast</span>
            </h2>
            <p className="text-xs text-slate-500">Resource allocation recommendations based on simulated historical load curves.</p>
          </div>
          <span className="text-[10px] text-slate-400 font-mono">Simulated Predictive Model</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {demandSlots.map((d, i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">{d.time_slot}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  d.demand_level === 'HIGH DEMAND' ? 'bg-red-100 text-red-800' :
                  d.demand_level === 'MEDIUM DEMAND' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                }`}>
                  {d.demand_level}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Est. Volume</span>
                  <span className="font-bold text-slate-800">{d.estimated_volume_kg} kg</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 block font-medium">Crew Required</span>
                  <span className="font-bold text-emerald-700">{d.required_workers} Workers</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-600 leading-relaxed">
                <span className="font-semibold text-slate-700">Priority Zones: </span>
                {d.priority_zones?.join(', ') || "Central District"}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recurring Hotspots Detail Cards */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-4 h-4 text-orange-600" />
            <span>Active Recurring Waste Hotspots</span>
          </h2>
          <p className="text-xs text-slate-500">Clusters identified by spatial aggregation with root cause hypotheses and actionable mitigation steps.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotspots.map((h) => (
            <div key={h.id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 hover:border-slate-300 transition">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">{h.name}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{h.zone}</span>
                  </p>
                </div>
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  h.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {h.risk_level} RISK
                </span>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Complaints</span>
                  <span className="font-bold text-slate-800">{h.report_count}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Dominant Waste</span>
                  <span className="font-bold text-slate-800 truncate">{h.dominant_waste_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Clearance Failures</span>
                  <span className="font-bold text-red-600">{h.failed_clearance_count}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Avg Clearance</span>
                  <span className="font-bold text-slate-800">{h.avg_clearance_hours}h</span>
                </div>
              </div>

              {/* AI Hypothesis (Root Cause) */}
              <div className="p-3.5 bg-purple-50/60 rounded-xl border border-purple-200/80 space-y-1.5">
                <span className="text-[10px] font-bold text-purple-900 uppercase tracking-wider">
                  AI HYPOTHESIS (Root-Cause Investigation)
                </span>
                <p className="text-xs text-purple-950 leading-relaxed font-medium">
                  {h.ai_hypothesis}
                </p>
                {h.contributing_factors && h.contributing_factors.length > 0 && (
                  <div className="pt-2 border-t border-purple-200/50">
                    <span className="text-[10px] font-semibold text-purple-800">Observed Municipal Factors:</span>
                    <ul className="list-disc list-inside text-[11px] text-purple-900/80 space-y-0.5 mt-0.5">
                      {h.contributing_factors.map((f, fi) => (
                        <li key={fi}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* AI Recommendation */}
              <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1">
                <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  AI RECOMMENDATION (Mitigation Action)
                </span>
                <p className="text-xs text-emerald-950 font-semibold leading-relaxed">
                  {h.recommended_action}
                </p>
              </div>

            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
