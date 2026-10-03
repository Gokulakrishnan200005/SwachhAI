import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, AlertTriangle, Camera, Upload, MapPin, 
  Clock, ShieldCheck, RefreshCw, AlertCircle, ArrowRight, ShieldAlert
} from 'lucide-react';
import api from '../api';

export default function WorkerDashboardView({ currentRole }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  
  // Photo upload states
  const [beforeFile, setBeforeFile] = useState(null);
  const [beforePreview, setBeforePreview] = useState(null);
  const [afterFile, setAfterFile] = useState(null);
  const [afterPreview, setAfterPreview] = useState(null);

  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideSubmitting, setOverrideSubmitting] = useState(false);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/');
      setTasks(res.data);
      if (res.data.length > 0 && !selectedTask) {
        handleSelectTask(res.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleSelectTask = async (taskId) => {
    setSelectedTask(taskId);
    setVerificationResult(null);
    setBeforeFile(null);
    setBeforePreview(null);
    setAfterFile(null);
    setAfterPreview(null);

    try {
      const res = await api.get(`/tasks/${taskId}`);
      setTaskDetail(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkArrived = async () => {
    if (!selectedTask) return;
    try {
      await api.post(`/tasks/${selectedTask}/start`);
      handleSelectTask(selectedTask);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  // Helper to simulate Before photo
  const handleSimulateBefore = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6e6e69';
    ctx.fillRect(0, 0, 640, 480);
    // Draw heavy garbage
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = ['#38761d', '#783f04', '#1d63ed', '#e02424'][i % 4];
      ctx.fillRect(180 + (i * 9) % 280, 180 + (i * 7) % 200, 35, 25);
    }
    canvas.toBlob((blob) => {
      const file = new File([blob], 'worker_before.jpg', { type: 'image/jpeg' });
      setBeforeFile(file);
      setBeforePreview(URL.createObjectURL(blob));
    }, 'image/jpeg');
  };

  // Helper to simulate Clean After photo (Pass Verification)
  const handleSimulateAfterClean = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#82827d';
    ctx.fillRect(0, 0, 640, 480);
    ctx.strokeStyle = '#505050';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(640, 420);
    ctx.stroke();
    // Swept lines
    for (let y = 120; y < 400; y += 30) {
      ctx.strokeStyle = '#8c8c87';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, y, 640, 1);
    }
    canvas.toBlob((blob) => {
      const file = new File([blob], 'worker_after_clean.jpg', { type: 'image/jpeg' });
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(blob));
    }, 'image/jpeg');
  };

  // Helper to simulate Uncleaned/Failed After photo (Trigger Escalation)
  const handleSimulateAfterDirty = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#6e6e69';
    ctx.fillRect(0, 0, 640, 480);
    // Residual garbage remains
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = ['#38761d', '#783f04', '#1d63ed'][i % 3];
      ctx.fillRect(200 + (i * 8) % 250, 200 + (i * 6) % 180, 30, 20);
    }
    canvas.toBlob((blob) => {
      const file = new File([blob], 'worker_after_uncleaned.jpg', { type: 'image/jpeg' });
      setAfterFile(file);
      setAfterPreview(URL.createObjectURL(blob));
    }, 'image/jpeg');
  };

  // Helper to simulate Fraud Attempt (Upload identical photo for both before and after)
  const handleSimulateDuplicateFraud = () => {
    handleSimulateBefore();
    setTimeout(() => {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#6e6e69';
      ctx.fillRect(0, 0, 640, 480);
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = ['#38761d', '#783f04', '#1d63ed', '#e02424'][i % 4];
        ctx.fillRect(180 + (i * 9) % 280, 180 + (i * 7) % 200, 35, 25);
      }
      canvas.toBlob((blob) => {
        const file = new File([blob], 'worker_duplicate_after.jpg', { type: 'image/jpeg' });
        setAfterFile(file);
        setAfterPreview(URL.createObjectURL(blob));
      }, 'image/jpeg');
    }, 100);
  };

  const handleUploadBefore = async () => {
    if (!beforeFile || !selectedTask) return;
    const fd = new FormData();
    fd.append('image', beforeFile);
    fd.append('worker_lat', taskDetail?.report?.location_lat || 13.0827);
    fd.append('worker_lng', taskDetail?.report?.location_lng || 80.2707);

    try {
      await api.post(`/tasks/${selectedTask}/upload-before`, fd);
      handleSelectTask(selectedTask);
      fetchTasks();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitVerification = async () => {
    if (!afterFile || !selectedTask) return;
    setIsVerifying(true);
    const fd = new FormData();
    fd.append('image', afterFile);
    fd.append('worker_lat', taskDetail?.report?.location_lat || 13.0827);
    fd.append('worker_lng', taskDetail?.report?.location_lng || 80.2707);

    try {
      const res = await api.post(`/tasks/${selectedTask}/submit-verification`, fd);
      setVerificationResult(res.data);
      handleSelectTask(selectedTask);
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSupervisorOverride = async (overrideStatus) => {
    if (!selectedTask) return;
    setOverrideSubmitting(true);
    const fd = new FormData();
    fd.append('override_result', overrideStatus);
    fd.append('notes', overrideNotes || `Manual supervisor override applied (${overrideStatus}).`);

    try {
      await api.post(`/tasks/${selectedTask}/override`, fd);
      setOverrideNotes('');
      handleSelectTask(selectedTask);
      fetchTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setOverrideSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 sm:px-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Sanitation Worker & Supervisor Portal</h1>
        <p className="text-sm text-slate-500">Live task execution, Before/After image evidence capture, and automated AI collection verification.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Today's Tasks List */}
        <div className="lg:col-span-1 space-y-3 max-h-[780px] overflow-y-auto pr-1">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Today's Assigned Tasks</span>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full">
              {tasks.length} Total
            </span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading assigned tasks...</div>
          ) : (
            tasks.map((t) => {
              const isSelected = selectedTask === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => handleSelectTask(t.id)}
                  className={`p-4 rounded-2xl border transition cursor-pointer bg-white shadow-sm ${
                    isSelected ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
                  }`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-slate-700">{t.task_code}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      t.priority_level === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                      t.priority_level === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {t.priority_level}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 mt-2 line-clamp-1">{t.title}</h3>
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{t.address}</span>
                  </p>

                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 text-[10px]">
                    <span className="font-semibold text-slate-600">{t.waste_category}</span>
                    <span className={`font-bold px-2 py-0.5 rounded ${
                      t.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                      t.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {t.status}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Task Detail & Collection Verification Flow */}
        <div className="lg:col-span-2 space-y-6">
          {taskDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
              
              {/* Task Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold text-slate-900">{taskDetail.task_code}</h2>
                    <span className="text-xs px-2.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded-md">
                      Ref: {taskDetail.report?.report_code}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{taskDetail.report?.address}</p>
                </div>

                <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                  taskDetail.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                  taskDetail.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  Status: {taskDetail.status}
                </span>
              </div>

              {/* Workflow Step Tracker */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                <span className={taskDetail.started_at ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                  1. Arrive On Site
                </span>
                <span className="text-slate-300">→</span>
                <span className={taskDetail.evidence?.before_image_url ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                  2. Before Photo
                </span>
                <span className="text-slate-300">→</span>
                <span className={taskDetail.status !== 'ASSIGNED' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                  3. Clean Site
                </span>
                <span className="text-slate-300">→</span>
                <span className={taskDetail.evidence?.after_image_url ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                  4. After Photo
                </span>
                <span className="text-slate-300">→</span>
                <span className={taskDetail.status === 'VERIFIED' ? 'text-emerald-700 font-bold' : 'text-slate-500 font-medium'}>
                  5. AI Verified
                </span>
              </div>

              {/* Arrive Button if not started */}
              {!taskDetail.started_at && (
                <button
                  onClick={handleMarkArrived}
                  className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span>Mark Crew Arrived on Site</span>
                </button>
              )}

              {/* Live Verification Result Banner */}
              {taskDetail.evidence?.verification_result && (
                <div className={`p-4 rounded-xl border space-y-2 ${
                  taskDetail.evidence.verification_result === 'VERIFIED' 
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-900' 
                    : 'bg-red-50 border-red-300 text-red-900'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5" />
                      <span className="font-bold text-sm">
                        AI-ASSISTED VERIFICATION: {taskDetail.evidence.verification_result}
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 bg-white/80 rounded border">
                      Clearance: {taskDetail.evidence.clearance_percentage}%
                    </span>
                  </div>

                  <p className="text-xs leading-relaxed">{taskDetail.evidence.verification_notes}</p>
                  
                  {/* Evidence Validation Anti-Fraud Badge */}
                  <div className="pt-2 border-t border-black/10 flex items-center justify-between text-[11px]">
                    <span className="font-semibold">
                      Validation Status: {taskDetail.evidence.validation_status}
                    </span>
                    <span className="italic text-slate-500">AI-assisted evidence validation</span>
                  </div>

                  {taskDetail.evidence.supervisor_override && (
                    <div className="p-2 bg-purple-100 text-purple-900 rounded-lg text-xs font-medium mt-2">
                      Supervisor Override: {taskDetail.evidence.override_result} by {taskDetail.evidence.override_by}.
                    </div>
                  )}
                </div>
              )}

              {/* Photo Upload & Simulation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Before Photo Card */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <span className="text-xs font-bold text-slate-600 uppercase">BEFORE COLLECTION PHOTO</span>
                  
                  <div className="relative aspect-video rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center">
                    {beforePreview || taskDetail.evidence?.before_image_url ? (
                      <img 
                        src={beforePreview || `http://localhost:8000${taskDetail.evidence.before_image_url}`} 
                        alt="Before Collection" 
                        className="object-cover w-full h-full"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=600"; }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Camera className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-[11px]">No Before Photo</p>
                      </div>
                    )}
                  </div>

                  {!taskDetail.evidence?.before_image_url && (
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={handleSimulateBefore}
                        className="w-full py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold">
                        + Simulate Before Photo
                      </button>
                      {beforeFile && (
                        <button
                          type="button"
                          onClick={handleUploadBefore}
                          className="w-full py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                          Submit Before Photo
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* After Photo Card */}
                <div className="border border-slate-200 rounded-xl p-4 space-y-3 bg-slate-50">
                  <span className="text-xs font-bold text-slate-600 uppercase">AFTER COLLECTION PHOTO</span>
                  
                  <div className="relative aspect-video rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center">
                    {afterPreview || taskDetail.evidence?.after_image_url ? (
                      <img 
                        src={afterPreview || `http://localhost:8000${taskDetail.evidence.after_image_url}`} 
                        alt="After Collection" 
                        className="object-cover w-full h-full"
                        onError={(e) => { e.target.src = "https://images.unsplash.com/photo-1517646287270-a5a9ca602e5c?w=600"; }}
                      />
                    ) : (
                      <div className="text-center p-2 text-slate-400">
                        <Camera className="w-6 h-6 mx-auto mb-1" />
                        <p className="text-[11px]">No After Photo</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-500">Hackathon Verification Test Controls:</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={handleSimulateAfterClean}
                        className="py-1.5 px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 rounded-lg text-[10px] font-bold">
                        ✓ Clean Site (Pass)
                      </button>
                      <button
                        type="button"
                        onClick={handleSimulateAfterDirty}
                        className="py-1.5 px-2 bg-red-100 hover:bg-red-200 text-red-900 rounded-lg text-[10px] font-bold">
                        ✗ Dirty Site (Fail)
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={handleSimulateDuplicateFraud}
                      className="w-full py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-bold">
                      ⚠ Duplicate Photo (Fraud Test)
                    </button>

                    {afterFile && (
                      <button
                        type="button"
                        disabled={isVerifying}
                        onClick={handleSubmitVerification}
                        className="w-full py-2.5 mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2">
                        {isVerifying ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>AI Comparing Photos...</span>
                          </>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            <span>Submit for AI Verification</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

              </div>

              {/* Automatic Escalation Timeline if failures exist */}
              {taskDetail.escalations && taskDetail.escalations.length > 0 && (
                <div className="border border-red-200 bg-red-50/50 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    <span>Automatic Escalation Timeline</span>
                  </div>

                  <div className="space-y-2">
                    {taskDetail.escalations.map((esc) => (
                      <div key={esc.id} className="p-3 bg-white rounded-lg border border-red-200 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-red-900">{esc.escalation_level}</span>
                          <span className="text-[10px] text-slate-500 font-mono">Failure #{esc.failure_count}</span>
                        </div>
                        <p className="text-slate-700">{esc.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Supervisor / Admin Manual Override Panel */}
              {(currentRole === 'supervisor' || currentRole === 'admin') && taskDetail.evidence && (
                <div className="border-t border-slate-200 pt-4 space-y-3">
                  <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                    Supervisor Manual Override Authority
                  </span>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add supervisor inspection notes..."
                      value={overrideNotes}
                      onChange={(e) => setOverrideNotes(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs outline-none"
                    />
                    <button
                      onClick={() => handleSupervisorOverride('VERIFIED')}
                      disabled={overrideSubmitting}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold">
                      Override → VERIFY
                    </button>
                    <button
                      onClick={() => handleSupervisorOverride('NOT_CLEARED')}
                      disabled={overrideSubmitting}
                      className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold">
                      Override → REJECT
                    </button>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-xs text-slate-400">
              Select a task from the list on the left to start collection or upload evidence.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
