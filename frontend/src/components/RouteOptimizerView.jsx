import React, { useState, useEffect } from 'react';
import { 
  Truck, MapPin, Navigation, Clock, ShieldCheck, 
  Layers, RefreshCw, AlertTriangle, ArrowRight
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import api from '../api';

const createStopIcon = (num, isDepot = false, isFacility = false) => {
  const bg = isDepot ? '#1e293b' : isFacility ? '#059669' : '#2563eb';
  const label = isDepot ? 'D' : isFacility ? 'F' : num;
  return L.divIcon({
    className: 'custom-stop-pin',
    html: `<div style="background-color: ${bg}; color: white; width: 22px; height: 22px; border-radius: 50%; border: 2px solid white; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; box-shadow: 0 2px 6px rgba(0,0,0,0.35);">${label}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
};

export default function RouteOptimizerView() {
  const [routeData, setRouteData] = useState(null);
  const [selectedZone, setSelectedZone] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchOptimizedRoute = async (zone = '') => {
    setLoading(true);
    try {
      const res = await api.post(`/tasks/optimize-route${zone ? `?zone=${encodeURIComponent(zone)}` : ''}`);
      setRouteData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimizedRoute();
  }, []);

  const handleZoneChange = (zone) => {
    setSelectedZone(zone);
    fetchOptimizedRoute(zone);
  };

  if (loading || !routeData) {
    return (
      <div className="p-16 text-center text-xs text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
        Calculating priority-weighted collection route...
      </div>
    );
  }

  const { total_distance_km, estimated_time_minutes, stops_count, priority_coverage, stops, routing_engine, capacity_utilization_pct } = routeData;

  const polylineCoords = stops.map(s => [s.lat, s.lng]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6">
      
      {/* Header & Zone Picker */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900">Intelligent Collection Route Planner</h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
              TSP Priority Solver
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Minimizes fuel consumption while prioritizing urgent hazard complaints across municipal wards.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedZone}
            onChange={(e) => handleZoneChange(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white font-medium outline-none">
            <option value="">All Municipal Zones</option>
            <option value="Zone 1 - Central Market">Zone 1 - Central Market</option>
            <option value="Zone 2 - Gandhi Nagar">Zone 2 - Gandhi Nagar</option>
            <option value="Zone 3 - Station Road">Zone 3 - Station Road</option>
            <option value="Zone 4 - Anna Salai">Zone 4 - Anna Salai</option>
          </select>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase">Total Distance</span>
          <p className="text-2xl font-bold text-slate-900 mt-1">{total_distance_km} km</p>
          <span className="text-[10px] text-slate-500">Urban Road Adjusted</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase">Est. Trip Duration</span>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{estimated_time_minutes} mins</p>
          <span className="text-[10px] text-slate-500">Includes 12m stop handling</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase">Stops Cleared</span>
          <p className="text-2xl font-bold text-blue-600 mt-1">{stops_count} Points</p>
          <span className="text-[10px] text-slate-500">Depot → Landfill</span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-400 font-medium uppercase">Truck Load Factor</span>
          <p className="text-2xl font-bold text-purple-600 mt-1">{capacity_utilization_pct || 42}%</p>
          <span className="text-[10px] text-slate-500">3000 kg Tipper Capacity</span>
        </div>
      </div>

      {/* Map & Sequence Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Map View */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Optimized Trajectory & Polyline
            </span>
            <span className="text-[11px] text-slate-400">{routing_engine}</span>
          </div>

          <div className="h-[460px] w-full rounded-xl overflow-hidden border border-slate-200 relative">
            <MapContainer
              center={[13.0827, 80.2707]}
              zoom={12}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Route Polyline */}
              <Polyline 
                positions={polylineCoords} 
                pathOptions={{ color: '#059669', weight: 4, opacity: 0.8, dashArray: '6, 8' }} 
              />

              {/* Waypoint Markers */}
              {stops.map((st, i) => {
                const isDepot = st.type === 'DEPOT';
                const isFacility = st.type === 'PROCESSING_CENTER';
                const icon = createStopIcon(st.stop_number || i, isDepot, isFacility);
                return (
                  <Marker key={i} position={[st.lat, st.lng]} icon={icon}>
                    <Popup>
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-slate-900">{isDepot ? "DEPOT START" : isFacility ? "TRANSFER FACILITY END" : `Stop ${st.stop_number}: ${st.task_code}`}</p>
                        <p className="text-slate-600">{st.name || st.title || st.address}</p>
                        {!isDepot && !isFacility && (
                          <p className="font-semibold text-emerald-700">Priority: {st.priority_level} ({st.waste_category})</p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Turn-by-Turn Stop Sequence */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 max-h-[540px] overflow-y-auto">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Stop-by-Stop Navigation Sequence</h3>
            <p className="text-xs text-slate-500">Ordered by proximity and critical priority weights.</p>
          </div>

          <div className="space-y-3">
            {stops.map((st, idx) => {
              const isDepot = st.type === 'DEPOT';
              const isFacility = st.type === 'PROCESSING_CENTER';
              return (
                <div key={idx} className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/70 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] ${
                      isDepot ? 'bg-slate-900 text-white' :
                      isFacility ? 'bg-emerald-700 text-white' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isDepot ? 'START: DEPOT' : isFacility ? 'END: FACILITY' : `STOP ${st.stop_number}`}
                    </span>
                    {st.distance_from_prev_km !== undefined && st.distance_from_prev_km > 0 && (
                      <span className="text-[10px] text-slate-500 font-semibold">
                        +{st.distance_from_prev_km} km
                      </span>
                    )}
                  </div>

                  <h4 className="font-bold text-slate-800 text-xs line-clamp-1">{st.name || st.title || st.address}</h4>
                  
                  {!isDepot && !isFacility && (
                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <span className="text-slate-500">{st.waste_category}</span>
                      <span className="font-bold text-red-600">{st.priority_level}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
