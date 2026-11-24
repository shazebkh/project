import React, { useState, useEffect, useRef } from 'react';
import {
  HeartHandshake,
  AlertOctagon,
  Camera,
  MapPin,
  Clock,
  Send,
  PhoneCall,
  CheckCircle2,
  Truck,
  Stethoscope,
  Activity,
  Flame,
  ChevronRight,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { WildlifeReport, WildlifeAnimalType, WildlifeCondition } from '../types';
import { api } from '../services/apiClient';
import { stampPhotoWithDateTimeAndLocation } from '../utils/watermark';

interface WildlifeReportViewProps {
  onRefresh: () => void;
}

export const WildlifeReportView: React.FC<WildlifeReportViewProps> = ({ onRefresh }) => {
  const [reports, setReports] = useState<WildlifeReport[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [animalType, setAnimalType] = useState<WildlifeAnimalType>('dog');
  const [condition, setCondition] = useState<WildlifeCondition>('bleeding_fracture');
  const [description, setDescription] = useState('');
  const [addressHint, setAddressHint] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedReport, setSelectedReport] = useState<WildlifeReport | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadReports();
    // Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setLocation({ lat: 28.6692, lng: 77.4538 }),
      );
    } else {
      setLocation({ lat: 28.6692, lng: 77.4538 });
    }
  }, []);

  const loadReports = async () => {
    try {
      const res = await api.getWildlifeReports();
      setReports(res.reports);
    } catch (err) {
      console.error('Failed to load wildlife reports:', err);
    }
  };

  const startCamera = async () => {
    setIsCapturing(true);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }
    } catch (err) {
      console.warn('Camera stream blocked or unavailable, using simulated capture:', err);
    }
  };

  const handleCapturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const date = new Date();

    if (canvas) {
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (video && video.videoWidth > 0) {
          ctx.drawImage(video, 0, 0, 640, 480);
        } else {
          // Simulated animal snapshot
          const grad = ctx.createLinearGradient(0, 0, 0, 480);
          grad.addColorStop(0, '#1e293b');
          grad.addColorStop(1, '#0f172a');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 640, 480);

          // Simulated wildlife subject
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(320, 220, 90, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🐾 Injured Animal Lens', 320, 225);

          ctx.font = '16px sans-serif';
          ctx.fillStyle = '#cbd5e1';
          ctx.fillText(`Type: ${animalType.toUpperCase()}`, 320, 260);
        }

        // Apply permanent Date, Time, and GPS Watermark!
        const watermarked = stampPhotoWithDateTimeAndLocation(canvas, {
          capturedDate: date,
          lat: location?.lat || 28.6692,
          lng: location?.lng || 77.4538,
          accuracy: 8,
          appTag: `Wildlife Alert: ${animalType.toUpperCase()}`,
        });

        setPhotoData(watermarked);
        setIsCapturing(false);

        // Stop video tracks
        if (video && video.srcObject) {
          const s = video.srcObject as MediaStream;
          s.getTracks().forEach((t) => t.stop());
        }
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoData) {
      setErrorMsg('Please click or capture a photo of the injured animal.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSubmitSuccess(null);

    try {
      const res = await api.submitWildlifeReport({
        animal_type: animalType,
        condition,
        description,
        photo_url: photoData,
        lat: location?.lat || 28.6692,
        lng: location?.lng || 77.4538,
        address_hint: addressHint || 'Near main pedestrian path',
      });

      setSubmitSuccess('Report dispatched! An emergency veterinary rescue team has been notified.');
      await loadReports();
      onRefresh();

      setTimeout(() => {
        setShowModal(false);
        setSubmitSuccess(null);
        setPhotoData(null);
        setDescription('');
        setAddressHint('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit wildlife emergency report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const animalOptions: Array<{ id: WildlifeAnimalType; label: string; icon: string }> = [
    { id: 'dog', label: 'Stray Dog', icon: '🐕' },
    { id: 'cat', label: 'Cat', icon: '🐈' },
    { id: 'bird', label: 'Bird', icon: '🕊️' },
    { id: 'cow', label: 'Cow / Cattle', icon: '🐄' },
    { id: 'monkey', label: 'Monkey', icon: '🐒' },
    { id: 'wild_animal', label: 'Wild Animal', icon: '🦌' },
    { id: 'reptile', label: 'Reptile / Snake', icon: '🦎' },
    { id: 'other', label: 'Other Species', icon: '🐾' },
  ];

  const conditionOptions: Array<{ id: WildlifeCondition; label: string; severity: string }> = [
    { id: 'critical', label: '🚨 Critical (Life Threatening / Unconscious)', severity: 'Critical' },
    { id: 'bleeding_fracture', label: '🩸 Bleeding / Fracture / Limping', severity: 'High' },
    { id: 'trapped', label: '🪤 Trapped in Net / Wire / Grate', severity: 'High' },
    { id: 'sick_malnourished', label: '🥀 Severely Sick / Shivering', severity: 'Moderate' },
    { id: 'minor_injury', label: '🩹 Minor Injury / Scratches', severity: 'Low' },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'team_dispatched':
        return {
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          label: 'Rescue Team Dispatched',
          icon: Truck,
        };
      case 'on_site_triage':
        return {
          bg: 'bg-purple-50 text-purple-700 border-purple-200',
          label: 'Vet On-Site / Diagnosing',
          icon: Stethoscope,
        };
      case 'treated_rescued':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Diagnosed & Rescued',
          icon: CheckCircle2,
        };
      case 'closed':
        return {
          bg: 'bg-gray-100 text-gray-700 border-gray-200',
          label: 'Case Closed',
          icon: CheckCircle2,
        };
      default:
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Emergency Reported',
          icon: Clock,
        };
    }
  };

  return (
    <div className="space-y-5 pb-24 max-w-lg mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-amber-700 via-orange-800 to-rose-900 text-white p-5 shadow-xl border border-orange-500/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl">
              🐾
            </div>
            <div>
              <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-amber-200">
                24/7 Wildlife Emergency
              </span>
              <h3 className="text-xl font-black">Injured Animal Rescue</h3>
            </div>
          </div>
          <button
            onClick={() => {
              setShowModal(true);
              startCamera();
            }}
            className="py-2 px-3.5 rounded-xl bg-white text-orange-900 font-extrabold text-xs shadow-md hover:bg-orange-50 transition-colors flex items-center space-x-1"
          >
            <span>+ Report Animal</span>
          </button>
        </div>

        <p className="text-xs text-amber-100/90 leading-relaxed">
          Found an injured or distressed animal? Snap a photo with <strong>automatic date, time & GPS coordinates</strong>. Our admin triage team dispatches a veterinary rescue unit to diagnose and treat them.
        </p>

        <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-amber-200">
          <span className="flex items-center space-x-1">
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Earn +20 Stewardship Credits</span>
          </span>
          <span className="text-[11px] opacity-90">Hotline: 1-800-RESCUE-WILD</span>
        </div>
      </div>

      {/* 2. Reported Cases List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
            Active Wildlife Rescue Cases ({reports.length})
          </h4>
          <span className="text-[11px] text-gray-500">Live GPS & Status</span>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">No active animal emergencies</p>
            <p className="text-xs text-gray-400">All recent cases have been diagnosed and safely treated.</p>
          </div>
        ) : (
          reports.map((report) => {
            const statusConfig = getStatusBadge(report.status);
            const StatusIcon = statusConfig.icon;
            const animalOpt = animalOptions.find((a) => a.id === report.animal_type);

            return (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs hover:border-orange-200 transition-all cursor-pointer space-y-3"
              >
                {/* Top Details */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-2xl">{animalOpt?.icon || '🐾'}</span>
                    <div>
                      <h5 className="font-bold text-sm text-gray-900 capitalize">
                        Injured {animalOpt?.label || report.animal_type}
                      </h5>
                      <p className="text-[11px] text-gray-500">
                        {report.address_hint || 'GPS Location'} • {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase tracking-wider border flex items-center space-x-1 ${statusConfig.bg}`}
                  >
                    <StatusIcon className="w-3 h-3" />
                    <span>{statusConfig.label}</span>
                  </span>
                </div>

                {/* Photo Thumbnail with Watermarked Badge */}
                <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden bg-gray-900 border border-gray-200">
                  {report.photo_url.startsWith('data:') ? (
                    <img
                      src={report.photo_url}
                      alt="Injured animal"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-amber-950 to-orange-900 flex flex-col items-center justify-center text-white p-3 text-center">
                      <span className="text-2xl mb-1">🐾</span>
                      <span className="text-xs font-bold">Animal Injury Photo</span>
                      <span className="text-[10px] text-amber-200">
                        Watermarked with Date, Time & Coordinates
                      </span>
                    </div>
                  )}

                  {/* Date & Time pill on thumbnail */}
                  <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-0.5 rounded-md text-[10px] font-mono text-white flex items-center space-x-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    <span>{new Date(report.captured_at).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  <div className="absolute bottom-2 left-2 right-2 bg-black/75 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-mono text-emerald-300 flex items-center justify-between">
                    <span>GPS: {report.location.lat.toFixed(4)}, {report.location.lng.toFixed(4)}</span>
                    <span className="text-amber-400 font-bold capitalize">{report.condition.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-gray-700 line-clamp-2">"{report.description}"</p>

                {/* Dispatch Status Card */}
                {report.dispatched_team && (
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-xs flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Truck className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <span className="font-bold text-blue-900">{report.dispatched_team.team_name}</span>
                        {report.dispatched_team.eta_minutes !== undefined && report.dispatched_team.eta_minutes > 0 && (
                          <p className="text-[10px] text-blue-600">
                            Estimated Arrival: ~{report.dispatched_team.eta_minutes} mins
                          </p>
                        )}
                      </div>
                    </div>
                    {report.dispatched_team.contact_phone && (
                      <a
                        href={`tel:${report.dispatched_team.contact_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded-lg bg-blue-600 text-white font-bold text-[10px] flex items-center space-x-1"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                    )}
                  </div>
                )}

                {/* Diagnosis Notes if Treated */}
                {report.diagnosis_notes && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-emerald-800 flex items-center space-x-1">
                      <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Veterinary Diagnosis & Treatment</span>
                    </span>
                    <p className="text-gray-800 text-[11px]">{report.diagnosis_notes}</p>
                    {report.rescue_outcome && (
                      <p className="text-emerald-700 font-bold text-[10px]">
                        Outcome: {report.rescue_outcome}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 3. Report Animal Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto text-xs">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600">
                  Emergency Dispatch
                </span>
                <h3 className="font-bold text-base text-gray-900">Report Injured Animal</h3>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setPhotoData(null);
                }}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Camera Photo with Watermark */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">
                  Click Picture (Watermarked with Time, Date & GPS)
                </label>

                {!photoData ? (
                  <div className="relative aspect-4/3 w-full rounded-2xl bg-gray-900 overflow-hidden flex flex-col items-center justify-center p-3 border border-gray-700 text-center">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="absolute inset-0 w-full h-full object-cover"
                    />

                    {/* Viewfinder frame */}
                    <div className="absolute inset-4 border-2 border-dashed border-amber-400/50 rounded-xl pointer-events-none flex flex-col justify-between p-2">
                      <span className="text-[9px] text-amber-300 font-mono">FRAME INJURED ANIMAL</span>
                      <span className="text-[9px] text-amber-300 font-mono text-right">
                        GPS & TIME STAMP ACTIVE
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCapturePhoto}
                      className="absolute bottom-3 py-2 px-5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold rounded-full shadow-lg flex items-center space-x-1.5 transition-all active:scale-95 z-20"
                    >
                      <Camera className="w-4 h-4" />
                      <span>Click Photo & Stamp</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden border border-emerald-300 shadow-sm">
                    <img src={photoData} alt="Captured" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setPhotoData(null);
                        startCamera();
                      }}
                      className="absolute top-2 right-2 px-3 py-1 bg-black/70 text-white rounded-lg text-[10px] font-bold hover:bg-black"
                    >
                      Retake
                    </button>
                  </div>
                )}
                <canvas ref={canvasRef} className="hidden" />
              </div>

              {/* Animal Type */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Animal Species</label>
                <div className="grid grid-cols-4 gap-1.5 text-center">
                  {animalOptions.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAnimalType(opt.id)}
                      className={`p-2 rounded-xl border flex flex-col items-center transition-all ${
                        animalType === opt.id
                          ? 'border-amber-500 bg-amber-50 text-amber-900 font-bold shadow-xs'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl mb-0.5">{opt.icon}</span>
                      <span className="text-[10px] truncate w-full">{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition / Severity */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Observed Injury Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as WildlifeCondition)}
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden font-medium"
                >
                  {conditionOptions.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Injury Details & Animal Behavior</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Limping on back right leg, deep cut, scared but not aggressive..."
                  required
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                />
              </div>

              {/* Location Hint */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Address / Landmark Hint</label>
                <input
                  type="text"
                  value={addressHint}
                  onChange={(e) => setAddressHint(e.target.value)}
                  placeholder="e.g. Under large banyan tree, beside community center park"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-amber-500/20 focus:outline-hidden"
                />
              </div>

              {/* Geotag Indicator */}
              <div className="flex items-center space-x-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-600 text-[11px]">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  Exact Geotag: {location?.lat.toFixed(5) || '28.66920'}, {location?.lng.toFixed(5) || '77.45380'}
                </span>
              </div>

              {submitSuccess && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-center font-bold">
                  {submitSuccess}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-800 rounded-xl border border-red-200 text-center font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="pt-2 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-2.5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold shadow-md flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Dispatching...' : 'Dispatch Rescue Alert'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Selected Case Details Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto text-xs">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-600">
                  Case #{selectedReport.id}
                </span>
                <h3 className="font-bold text-base text-gray-900 capitalize">
                  {selectedReport.animal_type} Rescue Mission
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Photo preview with watermark */}
            <div className="rounded-2xl overflow-hidden border border-gray-200 aspect-16/9 bg-gray-900">
              <img src={selectedReport.photo_url} alt="Injured animal" className="w-full h-full object-cover" />
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl space-y-1.5">
              <div className="flex justify-between text-gray-600">
                <span>Reporter:</span>
                <span className="font-semibold text-gray-800">{selectedReport.reporter_name || 'Citizen'}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Location:</span>
                <span className="font-semibold text-gray-800">
                  {selectedReport.address_hint || `${selectedReport.location.lat.toFixed(4)}, ${selectedReport.location.lng.toFixed(4)}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Captured Timestamp:</span>
                <span className="font-mono text-gray-800">
                  {new Date(selectedReport.captured_at).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex space-x-2">
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedReport.location.lat},${selectedReport.location.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-2.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-800 font-bold text-xs flex items-center justify-center space-x-1 hover:bg-orange-100"
              >
                <span>Navigate to Animal GPS</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
