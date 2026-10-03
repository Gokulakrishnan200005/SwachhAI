import React, { useState, useEffect } from 'react';
import { 
  Search, CheckCircle2, Clock, AlertTriangle, MessageSquare, 
  Star, RefreshCw, MapPin, Eye, ThumbsUp, ThumbsDown
} from 'lucide-react';
import api from '../api';
import { translations } from '../translations';

export default function CitizenTrackingView({ language }) {
  const t = translations[language] || translations.en;
  
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState('');
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Feedback form state
  const [feedbackAnswer, setFeedbackAnswer] = useState('YES');
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccessMsg, setFeedbackSuccessMsg] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/reports/');
      setReports(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleSelectReport = async (reportId) => {
    setDetailLoading(true);
    setFeedbackSuccessMsg(null);
    try {
      const res = await api.get(`/reports/${reportId}`);
      setSelectedReport(res.data);
      if (res.data.feedback) {
        setFeedbackAnswer(res.data.feedback.was_cleared);
        setFeedbackRating(res.data.feedback.rating);
        setFeedbackComment(res.data.feedback.comment || '');
      } else {
        setFeedbackAnswer('YES');
        setFeedbackRating(5);
        setFeedbackComment('');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleFeedbackSubmit = async (e) => {
    e.preventDefault();
    if (!selectedReport) return;

    setFeedbackSubmitting(true);
    const formData = new FormData();
    formData.append('was_cleared', feedbackAnswer);
    formData.append('rating', feedbackRating);
    formData.append('comment', feedbackComment);

    try {
      const res = await api.post(`/reports/${selectedReport.id}/feedback`, formData);
      setFeedbackSuccessMsg(res.data.message);
      // Refresh report details
      handleSelectReport(selectedReport.id);
      fetchReports();
    } catch (err) {
      console.error(err);
    } finally {
      setFeedbackSubmitting(false);
    }
  };

  const filteredReports = reports.filter(r => 
    !searchCode || 
    r.report_code.toLowerCase().includes(searchCode.toLowerCase()) ||
    r.address.toLowerCase().includes(searchCode.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6">
      
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t.nav_track}</h1>
          <p className="text-sm text-slate-500">Inspect live status, AI detection metrics, and submit post-clearance feedback.</p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Report ID (e.g. SWA-2026-001)..."
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Reports List */}
        <div className="lg:col-span-1 space-y-2.5 max-h-[720px] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading complaints...</div>
          ) : filteredReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-2xl border border-slate-200">
              No reports found matching your criteria.
            </div>
          ) : (
            filteredReports.map((r) => {
              const isSelected = selectedReport?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectReport(r.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer bg-white shadow-sm ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      {r.report_code}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      r.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                      r.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                      r.status === 'MANUAL_REVIEW' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {r.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1">{r.title}</h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{r.address}</span>
                  </p>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px] text-slate-500">
                    <span>{r.ai_detected_category}</span>
                    <span className="font-semibold text-slate-700">Priority: {r.priority_level}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Report Detailed View & Feedback Modal */}
        <div className="lg:col-span-2">
          {detailLoading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading report telemetry...
            </div>
          ) : selectedReport ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              
              {/* Header Title & Status Badge */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{selectedReport.title}</h2>
                  </div>
                  <p className="text-xs font-mono text-emerald-700 font-semibold">{selectedReport.report_code} • {selectedReport.zone}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    selectedReport.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                    selectedReport.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                    selectedReport.status === 'MANUAL_REVIEW' ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Status: {selectedReport.status}
                  </span>
                </div>
              </div>

              {/* Progress Stepper */}
              <div className="py-2">
                <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-2">
                  <span className="text-emerald-700">1. Reported</span>
                  <span className={['ASSIGNED', 'IN_PROGRESS', 'COLLECTED', 'VERIFIED'].includes(selectedReport.status) ? 'text-emerald-700' : 'text-slate-400'}>2. Crew Assigned</span>
                  <span className={['IN_PROGRESS', 'COLLECTED', 'VERIFIED'].includes(selectedReport.status) ? 'text-emerald-700' : 'text-slate-400'}>3. Collection</span>
                  <span className={selectedReport.status === 'VERIFIED' ? 'text-emerald-700' : 'text-slate-400'}>4. AI Verified</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-emerald-600 h-full transition-all duration-500 rounded-full"
                    style={{
                      width: selectedReport.status === 'VERIFIED' ? '100%' :
                             selectedReport.status === 'COLLECTED' ? '75%' :
                             selectedReport.status === 'IN_PROGRESS' ? '50%' :
                             selectedReport.status === 'ASSIGNED' ? '30%' : '15%'
                    }}
                  />
                </div>
              </div>

              {/* Photo & AI Diagnostics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Photo Evidence */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-600 uppercase">Citizen Reported Image</p>
                  <div className="relative rounded-xl overflow-hidden bg-slate-100 border border-slate-200 aspect-video flex items-center justify-center">
                    <img 
                      src={`http://localhost:8000${selectedReport.image_url}`} 
                      alt="Garbage Scene" 
                      className="object-cover w-full h-full"
                      onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600"; }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Address: {selectedReport.address}</p>
                </div>

                {/* AI Assessment */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">AI WASTE CATEGORY</span>
                    <span className="text-xs font-bold text-emerald-800">{selectedReport.ai_detected_category}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500">SEGREGATION COMPLIANCE</span>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                      selectedReport.segregation_status === 'PROPER' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {selectedReport.segregation_status}
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-2">
                    <span className="text-[11px] font-bold text-slate-500">PRIORITY BREAKDOWN:</span>
                    <p className="text-[11px] text-slate-600 whitespace-pre-line mt-0.5 leading-snug">
                      {selectedReport.priority_reason}
                    </p>
                  </div>

                  {selectedReport.task?.evidence && (
                    <div className="border-t border-slate-200 pt-2">
                      <span className="text-[11px] font-bold text-slate-500">WORKER AI VERIFICATION:</span>
                      <p className="text-xs font-semibold text-emerald-800 mt-0.5">
                        Clearance: {selectedReport.task.evidence.clearance_percentage}% • Result: {selectedReport.task.evidence.verification_result}
                      </p>
                    </div>
                  )}
                </div>

              </div>

              {/* Citizen Post-Collection Feedback Module */}
              <div className="border-t border-slate-200 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{t.was_cleared}</h3>
                    <p className="text-xs text-slate-500">Your feedback helps verify municipal cleaning quality and flags fraud.</p>
                  </div>
                  {selectedReport.feedback?.mismatch_flag && (
                    <span className="px-2.5 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-lg border border-red-200">
                      Feedback Mismatch Alert Active
                    </span>
                  )}
                </div>

                {feedbackSuccessMsg && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{feedbackSuccessMsg}</span>
                  </div>
                )}

                <form onSubmit={handleFeedbackSubmit} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'YES', label: t.yes, color: 'text-emerald-700 bg-emerald-50 border-emerald-300' },
                      { id: 'PARTIALLY', label: t.partially, color: 'text-amber-700 bg-amber-50 border-amber-300' },
                      { id: 'NO', label: t.no, color: 'text-red-700 bg-red-50 border-red-300' }
                    ].map((opt) => (
                      <button
                        type="button"
                        key={opt.id}
                        onClick={() => setFeedbackAnswer(opt.id)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                          feedbackAnswer === opt.id 
                            ? `${opt.color} ring-2 ring-slate-800` 
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  {feedbackAnswer === 'NO' && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold">Live Mismatch Simulation:</p>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Selecting "NO" when a collection is marked verified triggers an automatic civic escalation to the Zonal Sanitation Inspector for re-inspection.
                        </p>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Optional Citizen Comment</label>
                    <input
                      type="text"
                      value={feedbackComment}
                      onChange={(e) => setFeedbackComment(e.target.value)}
                      placeholder="e.g. Cleared quickly, but perimeter plastic was left behind..."
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={feedbackSubmitting}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition">
                      {feedbackSubmitting ? "Submitting..." : t.submit_feedback}
                    </button>
                  </div>
                </form>

              </div>

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select any complaint from the list on the left to view detailed AI metrics and progress.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
