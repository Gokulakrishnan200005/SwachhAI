import React, { useState } from 'react';
import { 
  Camera, Upload, MapPin, AlertTriangle, CheckCircle2, 
  HelpCircle, ArrowRight, Sparkles, RefreshCw, FileText, Info
} from 'lucide-react';
import api from '../api';
import { translations } from '../translations';

export default function CitizenReportView({ language, onReportSubmitted }) {
  const t = translations[language] || translations.en;
  
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wasteClaimed, setWasteClaimed] = useState('Mixed Waste');
  const [selectedZone, setSelectedZone] = useState('Zone 1 - Central Market');
  const [locationName, setLocationName] = useState('M.G. Market North Gate');
  const [lat, setLat] = useState(13.0835);
  const [lng, setLng] = useState(80.2715);
  const [citizenName, setCitizenName] = useState('Aarav Sharma');
  const [citizenContact, setCitizenContact] = useState('+91 98401 22345');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Pre-configured realistic municipal demo locations
  const sampleLocations = [
    { name: "M.G. Market North Gate", zone: "Zone 1 - Central Market", lat: 13.0835, lng: 80.2715 },
    { name: "Flower Bazaar Junction", zone: "Zone 1 - Central Market", lat: 13.0848, lng: 80.2740 },
    { name: "Gandhi Nagar 4th Main", zone: "Zone 2 - Gandhi Nagar", lat: 13.0720, lng: 80.2520 },
    { name: "Central Railway Subway West", zone: "Zone 3 - Station Road", lat: 13.0820, lng: 80.2760 },
    { name: "Anna Salai Commercial Corridors", zone: "Zone 4 - Anna Salai", lat: 13.0610, lng: 80.2600 },
    { name: "SIDCO Industrial Phase 2 Canal", zone: "Zone 5 - Industrial Area", lat: 13.0120, lng: 80.2010 },
  ];

  const wasteCategories = [
    "Organic/Wet Waste",
    "Plastic",
    "Paper",
    "Metal",
    "Glass",
    "E-Waste",
    "Sanitary Waste",
    "Mixed Waste",
    "Other"
  ];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      setPreviewUrl(URL.createObjectURL(selected));
    }
  };

  // Helper to load sample demo garbage image if user doesn't have an image on hand
  const handleLoadSamplePhoto = async (category) => {
    // Generate sample canvas image blob in memory
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    
    // Background pavement
    ctx.fillStyle = '#6e6e69';
    ctx.fillRect(0, 0, 640, 480);
    ctx.strokeStyle = '#4a4a4a';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, 420);
    ctx.lineTo(640, 420);
    ctx.stroke();

    if (category === 'Organic/Wet Waste') {
      setTitle("Vegetable & Kitchen Waste Dump");
      setDescription("Foul smelling organic food waste and rotten fruit piles dumped on roadside.");
      // Draw organic clusters
      for (let i = 0; i < 40; i++) {
        ctx.fillStyle = ['#38761d', '#783f04', '#bf9000', '#5b5b00'][i % 4];
        ctx.beginPath();
        ctx.arc(200 + (i * 7) % 260, 200 + (i * 9) % 180, 20 + (i % 25), 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (category === 'Plastic') {
      setTitle("Plastic Bottles & Packaging Debris");
      setDescription("Discarded single-use water bottles and food wrappers clogging pedestrian drain.");
      for (let i = 0; i < 35; i++) {
        ctx.fillStyle = ['#1d63ed', '#e02424', '#f59e0b', '#f3f4f6'][i % 4];
        ctx.fillRect(180 + (i * 9) % 280, 220 + (i * 6) % 160, 35, 20);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(185 + (i * 9) % 280, 222 + (i * 6) % 160, 8, 6);
      }
    } else { // Mixed Waste
      setTitle("Unsegregated Market Waste Overflow");
      setDescription("Severe mixed accumulation of food waste, plastic packets, and wet cardboard cartons.");
      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = ['#38761d', '#783f04'][i % 2];
        ctx.beginPath();
        ctx.arc(180 + (i * 8) % 280, 210 + (i * 7) % 170, 25, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 25; i++) {
        ctx.fillStyle = ['#1d63ed', '#e02424', '#e5e7eb'][i % 3];
        ctx.fillRect(190 + (i * 11) % 270, 230 + (i * 8) % 150, 40, 22);
      }
    }

    canvas.toBlob((blob) => {
      const generatedFile = new File([blob], `sample_${category.toLowerCase().replace(/[^a-z0-9]/g, '_')}.jpg`, { type: 'image/jpeg' });
      setFile(generatedFile);
      setPreviewUrl(URL.createObjectURL(blob));
      setWasteClaimed(category);
    }, 'image/jpeg');
  };

  const handleLocationSelect = (loc) => {
    setLocationName(loc.name);
    setSelectedZone(loc.zone);
    setLat(loc.lat);
    setLng(loc.lng);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setErrorMessage("Please capture or select an image of the waste.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append('title', title || `Garbage Complaint at ${locationName}`);
    formData.append('description', description);
    formData.append('location_lat', lat);
    formData.append('location_lng', lng);
    formData.append('address', `${locationName}, ${selectedZone}`);
    formData.append('zone', selectedZone);
    formData.append('language', language);
    formData.append('waste_category_claimed', wasteClaimed);
    formData.append('citizen_name', citizenName);
    formData.append('citizen_contact', citizenContact);
    formData.append('image', file);

    try {
      const res = await api.post('/reports/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setSubmissionResult(res.data);
      if (onReportSubmitted) onReportSubmitted(res.data);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.response?.data?.detail || "Failed to submit report. Please check server connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 px-4 sm:px-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t.report_heading}</h1>
        <p className="text-sm text-slate-500 mt-1">{t.report_subheading}</p>
      </div>

      {/* Submission Success Modal Card */}
      {submissionResult && (
        <div className="bg-white border-2 border-emerald-500 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in zoom-in-95">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Complaint Successfully Logged!</h2>
                <p className="text-xs font-mono text-emerald-700 font-semibold">Report ID: {submissionResult.report_code}</p>
              </div>
            </div>
            <span className="px-3 py-1 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-full border border-emerald-200">
              {submissionResult.status}
            </span>
          </div>

          {/* AI Analysis Output */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Visual AI Detection */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.ai_detected_waste}</span>
                <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                  {Math.round(submissionResult.confidence * 100)}% Confidence
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-slate-900">{submissionResult.ai_detected_category}</p>
                <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                  submissionResult.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                  submissionResult.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {submissionResult.severity} SEVERITY
                </span>
              </div>

              {submissionResult.detected_objects && submissionResult.detected_objects.length > 0 && (
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-semibold text-slate-500">Detected Visual Components:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {submissionResult.detected_objects.map((obj, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700">
                        {obj.name} ({Math.round(obj.confidence * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {submissionResult.model_uncertainty && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p>{t.model_uncertainty_note}</p>
                </div>
              )}
            </div>

            {/* Segregation Analysis */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t.segregation_status}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                  submissionResult.segregation_status === 'PROPER' ? 'bg-emerald-100 text-emerald-800' :
                  submissionResult.segregation_status === 'IMPROPER' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {submissionResult.segregation_status}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">
                {submissionResult.segregation_recommendation || "Maintain source segregation into green organic and blue dry recycling bins."}
              </p>

              {/* Priority Score Breakdown */}
              <div className="border-t border-slate-200 pt-3 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600">{t.priority_score}:</span>
                  <span className="text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {submissionResult.priority_score}/100 ({submissionResult.priority_level})
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 whitespace-pre-line leading-tight">
                  {submissionResult.priority_reason}
                </p>
              </div>

            </div>

          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setSubmissionResult(null)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold">
              File Another Report
            </button>
          </div>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Image Upload / Capture Section */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t.upload_photo} <span className="text-red-500">*</span>
          </label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Upload Area */}
            <div className="relative border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-50/80 transition cursor-pointer min-h-[200px]">
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <div className="w-12 h-12 rounded-xl bg-white shadow-sm flex items-center justify-center text-emerald-600 mb-3 border border-slate-200">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-slate-700">{t.take_photo}</p>
              <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, WEBP up to 15MB</p>
            </div>

            {/* Preview or Quick Demo Sample Selection */}
            <div className="border border-slate-200 rounded-2xl p-4 flex flex-col justify-between bg-slate-50/50 min-h-[200px]">
              {previewUrl ? (
                <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-xl bg-black/5">
                  <img src={previewUrl} alt="Garbage Preview" className="object-cover max-h-44 rounded-xl shadow-sm" />
                  <span className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 text-white text-[10px] font-semibold rounded-md">
                    Photo Ready
                  </span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center items-center text-center p-2">
                  <Camera className="w-8 h-8 text-slate-400 mb-2" />
                  <p className="text-xs font-medium text-slate-600">No Photo Selected</p>
                  <p className="text-[11px] text-slate-400 mt-1">Or click one of these 1-click hackathon test samples:</p>
                  
                  <div className="flex flex-wrap gap-2 mt-3 justify-center">
                    <button
                      type="button"
                      onClick={() => handleLoadSamplePhoto('Organic/Wet Waste')}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 text-emerald-800 border border-slate-200 rounded-lg text-[11px] font-semibold transition">
                      + Wet Food Waste
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSamplePhoto('Plastic')}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-800 border border-slate-200 rounded-lg text-[11px] font-semibold transition">
                      + Plastic Bottles
                    </button>
                    <button
                      type="button"
                      onClick={() => handleLoadSamplePhoto('Mixed Waste')}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 text-amber-800 border border-slate-200 rounded-lg text-[11px] font-semibold transition">
                      + Mixed Pile
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* Location Selection */}
        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            {t.location_label} <span className="text-red-500">*</span>
          </label>

          {/* Quick Municipal Landmark Pills */}
          <div className="flex flex-wrap gap-1.5">
            {sampleLocations.map((loc, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => handleLocationSelect(loc)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                  locationName === loc.name 
                    ? 'bg-emerald-600 text-white border-emerald-600' 
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}>
                <MapPin className="w-3 h-3 inline mr-1" />
                {loc.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <input
                type="text"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                placeholder="Specific Street or Landmark"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                required
              />
            </div>
            <div>
              <select
                value={selectedZone}
                onChange={(e) => setSelectedZone(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="Zone 1 - Central Market">Zone 1 - Central Market</option>
                <option value="Zone 2 - Gandhi Nagar">Zone 2 - Gandhi Nagar</option>
                <option value="Zone 3 - Station Road">Zone 3 - Station Road</option>
                <option value="Zone 4 - Anna Salai">Zone 4 - Anna Salai</option>
                <option value="Zone 5 - Industrial Area">Zone 5 - Industrial Area</option>
                <option value="Zone 6 - Lakeview Colony">Zone 6 - Lakeview Colony</option>
              </select>
            </div>
          </div>
        </div>

        {/* Claimed Waste Category & Description */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t.claimed_category}
            </label>
            <select
              value={wasteClaimed}
              onChange={(e) => setWasteClaimed(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-emerald-500 outline-none">
              {wasteCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              {t.description_label}
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.description_placeholder}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Contact Info (Optional) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.contact_name}</label>
            <input
              type="text"
              value={citizenName}
              onChange={(e) => setCitizenName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">{t.contact_phone}</label>
            <input
              type="text"
              value={citizenContact}
              onChange={(e) => setCitizenContact(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2">
          {isSubmitting ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{t.analyzing_ai}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>{t.submit_btn}</span>
            </>
          )}
        </button>

      </form>

    </div>
  );
}
