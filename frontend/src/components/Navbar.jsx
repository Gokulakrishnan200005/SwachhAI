import React, { useState } from 'react';
import { 
  Trash2, Shield, User, HardHat, FileText, MapPin, 
  BarChart3, Brain, Bell, RefreshCw, Globe, ChevronDown, CheckCircle2 
} from 'lucide-react';
import { translations } from '../translations';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  currentRole, 
  setCurrentRole, 
  language, 
  setLanguage,
  notificationsCount,
  onOpenNotifications,
  onOpenAssistant,
  onOpenAudit,
  onLoadDemoData,
  isLoadingDemo
}) {
  const t = translations[language] || translations.en;
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const roles = [
    { id: 'citizen', label: 'Citizen', icon: User, desc: 'Public Reporting & Feedback' },
    { id: 'worker', label: 'Sanitation Worker', icon: HardHat, desc: 'Field Collection & Verification' },
    { id: 'supervisor', label: 'Zonal Supervisor', icon: Shield, desc: 'Review & Override' },
    { id: 'admin', label: 'Municipal Admin', icon: BarChart3, desc: 'Hotspots & Analytics' },
  ];

  const langs = [
    { code: 'en', label: 'English' },
    { code: 'ta', label: 'தமிழ் (Tamil)' },
    { code: 'hi', label: 'हिन्दी (Hindi)' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('landing')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900">
                  Swachh<span className="text-emerald-600">AI</span>
                </span>
                <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  MVP 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">AI Waste Intelligence & Verification</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            <button 
              onClick={() => setActiveTab('landing')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'landing' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_home}
            </button>
            <button 
              onClick={() => setActiveTab('report')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'report' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_report}
            </button>
            <button 
              onClick={() => setActiveTab('tracking')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'tracking' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_track}
            </button>
            <button 
              onClick={() => setActiveTab('worker')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'worker' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_worker}
            </button>
            <button 
              onClick={() => setActiveTab('hotspots')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'hotspots' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_hotspots}
            </button>
            <button 
              onClick={() => setActiveTab('routes')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'routes' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_routes}
            </button>
            <button 
              onClick={() => setActiveTab('admin')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${activeTab === 'admin' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}>
              {t.nav_admin}
            </button>
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            
            {/* AI Civic Assistant Button */}
            <button
              onClick={onOpenAssistant}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm transition shadow-emerald-600/20"
              title="Query Live Municipal AI Assistant">
              <Brain className="w-3.5 h-3.5 animate-pulse" />
              <span className="hidden sm:inline">AI Assistant</span>
            </button>

            {/* Load Demo Data Button */}
            <button
              onClick={onLoadDemoData}
              disabled={isLoadingDemo}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-semibold transition"
              title="Reset and populate 32 realistic demo reports, tasks, hotspots & predictions">
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDemo ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">{t.load_demo_data}</span>
            </button>

            {/* Notifications Bell */}
            <button
              onClick={onOpenNotifications}
              className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
              title="In-App Escalation & Alerts">
              <Bell className="w-4 h-4" />
              {notificationsCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notificationsCount}
                </span>
              )}
            </button>

            {/* Language Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setLangMenuOpen(!langMenuOpen)}
                className="flex items-center gap-1 p-1.5 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium border border-slate-200 transition">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span className="uppercase font-bold">{language}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {langMenuOpen && (
                <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                  {langs.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLanguage(l.code); setLangMenuOpen(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between hover:bg-slate-50 ${language === l.code ? 'font-semibold text-emerald-600 bg-emerald-50/50' : 'text-slate-700'}`}>
                      {l.label}
                      {language === l.code && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span className="capitalize">{currentRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleMenuOpen && (
                <div className="absolute right-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50">
                  <div className="px-3 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Switch Active Persona
                  </div>
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isSelected = currentRole === r.id;
                    return (
                      <button
                        key={r.id}
                        onClick={() => {
                          setCurrentRole(r.id);
                          setRoleMenuOpen(false);
                          if (r.id === 'worker') setActiveTab('worker');
                          if (r.id === 'admin') setActiveTab('admin');
                          if (r.id === 'citizen') setActiveTab('report');
                          if (r.id === 'supervisor') setActiveTab('admin');
                        }}
                        className={`w-full text-left px-3 py-2 flex items-start gap-2.5 hover:bg-slate-50 transition ${isSelected ? 'bg-emerald-50/60' : ''}`}>
                        <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className={`text-xs font-medium ${isSelected ? 'text-emerald-900 font-bold' : 'text-slate-800'}`}>
                              {r.label}
                            </p>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>}
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{r.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                  <div className="border-t border-slate-100 mt-1 pt-1 px-3 py-1 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Demo Fast-Switch Enabled</span>
                    <button onClick={onOpenAudit} className="text-emerald-600 hover:underline">View Audit</button>
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>
      </div>
    </header>
  );
}
