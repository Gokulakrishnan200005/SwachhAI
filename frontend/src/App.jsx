import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import DemoGuideBar from './components/DemoGuideBar';
import LandingPage from './components/LandingPage';
import CitizenReportView from './components/CitizenReportView';
import CitizenTrackingView from './components/CitizenTrackingView';
import WorkerDashboardView from './components/WorkerDashboardView';
import AdminDashboardView from './components/AdminDashboardView';
import HotspotIntelligenceView from './components/HotspotIntelligenceView';
import RouteOptimizerView from './components/RouteOptimizerView';
import CivicAssistantModal from './components/CivicAssistantModal';
import NotificationsDrawer from './components/NotificationsDrawer';
import AuditLogModal from './components/AuditLogModal';
import api from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('landing');
  const [currentRole, setCurrentRole] = useState('citizen');
  const [language, setLanguage] = useState('en');

  // Drawers & Modals
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Notifications & Stats
  const [notifications, setNotifications] = useState([]);
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchGlobalData = async () => {
    try {
      const [notifRes, analyticsRes] = await Promise.all([
        api.get('/notifications/'),
        api.get('/analytics/dashboard')
      ]);
      setNotifications(notifRes.data);
      setAnalyticsStats(analyticsRes.data);
    } catch (err) {
      console.warn("Backend not yet connected or initializing:", err.message);
    }
  };

  useEffect(() => {
    fetchGlobalData();
  }, [currentRole]);

  // Fast demo data loader
  const handleLoadDemoData = async () => {
    setIsLoadingDemo(true);
    try {
      const res = await api.post('/demo/load');
      showToast("Demo Data Successfully Loaded (32 Reports, 10 Locations, 5 Hotspots, Tasks & Predictions)");
      fetchGlobalData();
    } catch (err) {
      console.error(err);
      showToast("Failed to reload demo data. Ensure backend is running.");
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* 3-Minute Guided Demo Ribbon */}
      <DemoGuideBar
        setActiveTab={setActiveTab}
        setCurrentRole={setCurrentRole}
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* Main App Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentRole={currentRole}
        setCurrentRole={setCurrentRole}
        language={language}
        setLanguage={setLanguage}
        notificationsCount={unreadNotificationsCount}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenAssistant={() => setIsAssistantOpen(true)}
        onOpenAudit={() => setIsAuditOpen(true)}
        onLoadDemoData={handleLoadDemoData}
        isLoadingDemo={isLoadingDemo}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-3 animate-in slide-in-from-bottom duration-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Main View Container */}
      <main className="flex-1 py-6">
        {activeTab === 'landing' && (
          <LandingPage
            setActiveTab={setActiveTab}
            setCurrentRole={setCurrentRole}
            onOpenAssistant={() => setIsAssistantOpen(true)}
            stats={analyticsStats}
          />
        )}

        {activeTab === 'report' && (
          <CitizenReportView
            language={language}
            onReportSubmitted={() => {
              fetchGlobalData();
              showToast("Report submitted with AI analysis. Proceed to Track Reports or Worker Portal.");
            }}
          />
        )}

        {activeTab === 'tracking' && (
          <CitizenTrackingView language={language} />
        )}

        {activeTab === 'worker' && (
          <WorkerDashboardView currentRole={currentRole} />
        )}

        {activeTab === 'admin' && (
          <AdminDashboardView />
        )}

        {activeTab === 'hotspots' && (
          <HotspotIntelligenceView />
        )}

        {activeTab === 'routes' && (
          <RouteOptimizerView />
        )}
      </main>

      {/* Modals & Drawers */}
      <CivicAssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />

      <NotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
        onRefresh={fetchGlobalData}
      />

      <AuditLogModal
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />

      {/* Civic Tech Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-700">
            <span>SwachhAI Hackathon MVP</span>
            <span>•</span>
            <button onClick={() => setIsAssistantOpen(true)} className="hover:text-emerald-600 transition">
              AI Civic Assistant
            </button>
            <span>•</span>
            <button onClick={() => setIsAuditOpen(true)} className="hover:text-emerald-600 transition">
              Audit Logs
            </button>
            <span>•</span>
            <button onClick={handleLoadDemoData} className="hover:text-amber-600 transition">
              Reload Demo Data
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Designed for 1–2 person student teams tackling real-world Indian municipal waste segregation, collection verification & hotspot intelligence.
          </p>
        </div>
      </footer>

    </div>
  );
}
