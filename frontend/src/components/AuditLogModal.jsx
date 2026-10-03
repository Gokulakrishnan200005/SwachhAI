import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, RefreshCw, Clock } from 'lucide-react';
import api from '../api';

export default function AuditLogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/audit/?limit=40');
        setLogs(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[620px] flex flex-col overflow-hidden animate-in fade-in zoom-in-95">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">Immutable Municipal Audit Trail</h2>
              <p className="text-[11px] text-slate-500">Chronological ledger of citizen reports, worker submissions, and supervisor actions.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-200 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Audit Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
              Loading audit logs...
            </div>
          ) : logs.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">No audit logs found.</div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Action</th>
                  <th className="pb-2">Target</th>
                  <th className="pb-2">Actor</th>
                  <th className="pb-2">Role</th>
                  <th className="pb-2">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                {logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 text-slate-500 font-sans">{new Date(l.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</td>
                    <td className="py-2.5 font-bold text-slate-800">{l.action}</td>
                    <td className="py-2.5 text-emerald-700">{l.target_type} ({l.target_id})</td>
                    <td className="py-2.5 text-slate-700">{l.user_email || "System"}</td>
                    <td className="py-2.5">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] uppercase font-bold">
                        {l.role || "SYSTEM"}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-500 truncate max-w-xs">{JSON.stringify(l.details || {})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}
