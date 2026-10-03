import React from 'react';
import { Bell, X, AlertTriangle, ShieldAlert, CheckCircle2, UserCheck, Flame } from 'lucide-react';
import api from '../api';

export default function NotificationsDrawer({ isOpen, onClose, notifications, onRefresh }) {
  if (!isOpen) return null;

  const handleMarkRead = async (id) => {
    try {
      await api.post(`/notifications/${id}/read`);
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-900">Municipal Escalation & Alerts</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {notifications.length === 0 ? (
            <div className="text-center p-8 text-xs text-slate-400">
              No active alerts or escalations.
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition ${
                  n.is_read ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-emerald-300 shadow-sm'
                }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                    n.type === 'ESCALATION' ? 'bg-red-100 text-red-800' :
                    n.type === 'FAILED_VERIFICATION' ? 'bg-orange-100 text-orange-800' :
                    n.type === 'FEEDBACK_MISMATCH' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {n.type}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: {n.target_role || 'All'}
                  </span>
                </div>

                <h4 className="font-bold text-slate-900">{n.title}</h4>
                <p className="text-slate-600 leading-relaxed text-[11px]">{n.message}</p>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                  <span className="text-slate-400 font-mono">{n.reference_id || 'Alert'}</span>
                  {!n.is_read && (
                    <button
                      onClick={() => handleMarkRead(n.id)}
                      className="text-emerald-700 font-semibold hover:underline">
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
