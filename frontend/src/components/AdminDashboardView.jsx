import React, { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, AlertTriangle, ShieldCheck, 
  MapPin, RefreshCw, Filter, Layers, CheckCircle2, Flame, Activity
} from 'lucide-react';
import { 
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area, Legend 
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';

// Custom Leaflet Icons
const createMarkerIcon = (color) => {
  return L.divIcon({
    className: 'custom-pin',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,0.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7]
  });
};

const iconCritical = createMarkerIcon('#dc2626');
const iconHigh = createMarkerIcon('#ea580c');
const iconMedium = createMarkerIcon('#2563eb');
const iconVerified = createMarkerIcon('#16a34a');

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6b7280'];

export default function AdminDashboardView() {
  const [data, setData] = useState(null);
  const [reports, setReports] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterZone, setFilterZone] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [analyticsRes, reportsRes, hotspotsRes] = await Promise.all([
        api.get('/analytics/dashboard'),
        api.get('/reports/?limit=100'),
        api.get('/hotspots/')
      ]);
      setData(analyticsRes.data);
      setReports(reportsRes.data);
      setHotspots(hotspotsRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const filteredReports = reports.filter(r => {
    if (filterZone && r.zone !== filterZone) return false;
    if (filterPriority && r.priority_level !== filterPriority) return false;
    if (filterStatus && r.status !== filterStatus) return false;
    return true;
  });

  if (loading || !data) {
    return (
      <div className="p-16 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Loading municipal operations telemetry...
      </div>
    );
  }

  const { kpis, waste_distribution, daily_trends, zone_performance, zone_operational_scores } = data;

  return (
    <div className="max-w-7xl mx-auto space-y-8 px-4 sm:px-6">
      
      {/* Page Title & Operational Index */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Municipal Operations Command Center</h1>
          <p className="text-sm text-slate-500">Zonal waste telemetry, computer vision verification index, and hotspot clustering.</p>
        </div>

        {/* SwachhAI Operational Score Badge */}
        <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
          <Activity className="w-5 h-5 text-emerald-600 shrink-0" />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-emerald-800">SwachhAI Operational Score:</span>
              <span className="text-xl font-bold text-emerald-900">{kpis.swachhai_operational_score || 82.5}/100</span>
            </div>
            <p className="text-[10px] text-emerald-700/80">Algorithmic municipal index (Not official statutory rating)</p>
          </div>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: "Total Reports", value: kpis.total_reports, color: "text-slate-900", bg: "bg-slate-50" },
          { label: "Open Reports", value: kpis.open_reports, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "High Priority", value: kpis.high_priority_reports, color: "text-red-600", bg: "bg-red-50" },
          { label: "Verified Clear", value: kpis.verified_collections, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Failed Clear", value: kpis.failed_collections, color: "text-red-700", bg: "bg-red-50/70" },
          { label: "Active Hotspots", value: kpis.recurring_hotspots, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Avg Response", value: `${kpis.avg_response_hours}h`, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Segregation Alert", value: kpis.segregation_violations, color: "text-orange-600", bg: "bg-orange-50" },
        ].map((kpi, idx) => (
          <div key={idx} className={`p-3 rounded-2xl border border-slate-200/80 bg-white flex flex-col justify-between shadow-sm`}>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-tight truncate">{kpi.label}</span>
            <p className={`text-xl font-bold mt-1 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Interactive GIS Municipal Map */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Zonal GIS Waste & Hotspot Map</span>
            </h2>
            <p className="text-xs text-slate-500">Live coordinates of reported dumps, verified collections, and surveillance hotspots.</p>
          </div>

          {/* Map Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none">
              <option value="">All Zones</option>
              <option value="Zone 1 - Central Market">Zone 1 - Central Market</option>
              <option value="Zone 2 - Gandhi Nagar">Zone 2 - Gandhi Nagar</option>
              <option value="Zone 3 - Station Road">Zone 3 - Station Road</option>
              <option value="Zone 4 - Anna Salai">Zone 4 - Anna Salai</option>
              <option value="Zone 5 - Industrial Area">Zone 5 - Industrial Area</option>
              <option value="Zone 6 - Lakeview Colony">Zone 6 - Lakeview Colony</option>
            </select>

            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none">
              <option value="">All Priorities</option>
              <option value="CRITICAL">CRITICAL</option>
              <option value="HIGH">HIGH</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="LOW">LOW</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs bg-slate-50 outline-none">
              <option value="">All Statuses</option>
              <option value="REPORTED">REPORTED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="VERIFIED">VERIFIED</option>
              <option value="FAILED">FAILED</option>
            </select>
          </div>
        </div>

        {/* Map Container */}
        <div className="h-96 w-full rounded-xl overflow-hidden border border-slate-200 relative">
          <MapContainer 
            center={[13.0827, 80.2707]} 
            zoom={12} 
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Hotspots Circles */}
            {hotspots.map((h) => (
              <Circle
                key={`h-${h.id}`}
                center={[h.center_lat, h.center_lng]}
                radius={250}
                pathOptions={{ 
                  color: h.risk_level === 'CRITICAL' ? '#dc2626' : '#f59e0b',
                  fillColor: h.risk_level === 'CRITICAL' ? '#dc2626' : '#f59e0b',
                  fillOpacity: 0.18
                }}>
                <Popup>
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-slate-900">{h.name}</p>
                    <p className="text-slate-600">{h.zone} • {h.dominant_waste_type}</p>
                    <p className="font-semibold text-red-600">Risk: {h.risk_level} ({h.report_count} complaints)</p>
                  </div>
                </Popup>
              </Circle>
            ))}

            {/* Reports Pins */}
            {filteredReports.map((r) => {
              const icon = r.status === 'VERIFIED' ? iconVerified :
                           r.priority_level === 'CRITICAL' ? iconCritical :
                           r.priority_level === 'HIGH' ? iconHigh : iconMedium;
              return (
                <Marker key={`r-${r.id}`} position={[r.location_lat, r.location_lng]} icon={icon}>
                  <Popup>
                    <div className="text-xs space-y-1">
                      <p className="font-bold text-slate-900">{r.report_code}: {r.title}</p>
                      <p className="text-slate-600">{r.address}</p>
                      <p className="text-slate-500">Waste: {r.ai_detected_category} ({r.severity})</p>
                      <p className="font-semibold text-emerald-700">Status: {r.status}</p>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>

        {/* Map Legend */}
        <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> Critical Priority</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span> High Priority</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Medium/Normal</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Verified Cleared</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full border border-purple-500 bg-purple-100"></span> Hotspot Radius</span>
          </div>
          <span>Showing {filteredReports.length} filtered pins</span>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Waste Distribution (Pie Chart) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">AI-Detected Waste Stream Distribution</h3>
            <p className="text-xs text-slate-500">Composition of complaints analyzed by the CV detection engine.</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={waste_distribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percentage }) => `${name} (${percentage}%)`}>
                  {waste_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 7-Day Trend of Complaints vs Clearances */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Daily Inflow vs Clearance Velocity</h3>
            <p className="text-xs text-slate-500">Volume of incoming citizen complaints against verified clearances.</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily_trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Area type="monotone" dataKey="reports" stroke="#f59e0b" fill="#fef3c7" name="Reported" />
                <Area type="monotone" dataKey="cleared" stroke="#10b981" fill="#d1fae5" name="Verified Cleared" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Zone Performance & SwachhAI Operational Score Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Zonal Performance & SwachhAI Operational Indices</h3>
          <p className="text-xs text-slate-500">Performance telemetry across municipal administrative zones.</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="pb-3">Municipal Zone</th>
                <th className="pb-3">Total Complaints</th>
                <th className="pb-3">Verified Cleared</th>
                <th className="pb-3">Clearance Rate</th>
                <th className="pb-3">Segregation Compliance</th>
                <th className="pb-3">SwachhAI Score</th>
                <th className="pb-3">Operational Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {zone_operational_scores.map((zs, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="py-3 font-bold text-slate-900">{zs.zone}</td>
                  <td className="py-3 text-slate-700">{zone_performance[idx]?.total || 0}</td>
                  <td className="py-3 text-emerald-700 font-semibold">{zone_performance[idx]?.verified || 0}</td>
                  <td className="py-3 text-slate-700">{zs.clearance_rate}%</td>
                  <td className="py-3 text-slate-700">{zs.segregation_compliance}%</td>
                  <td className="py-3">
                    <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                      {zs.score}/100
                    </span>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      zs.status === 'EXCELLENT' ? 'bg-emerald-100 text-emerald-800' :
                      zs.status === 'MODERATE' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {zs.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
