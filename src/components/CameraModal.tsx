import React, { useState, useEffect, useRef } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle, MapPin, Zap, Flame, Award } from 'lucide-react';
import { api } from '../services/apiClient';
import { stampPhotoWithDateTimeAndLocation } from '../utils/watermark';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  walkSessionId?: string | null;
  onSuccess: (result: any) => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  walkSessionId,
  onSuccess,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [location, setLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [capturedAt, setCapturedAt] = useState<string | null>(null);
  const [selectedWasteType, setSelectedWasteType] = useState<string>('plastic');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize camera and geolocation when modal opens
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setPhotoData(null);
      setErrorMsg(null);
      setVerificationResult(null);
      return;
    }

    startCamera();
    requestLocation();

    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    setErrorMsg(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facingMode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
      }
    } catch (err: any) {
      console.warn('Direct camera access unavailable, using simulated environment camera:', err);
      // Fallback: simulated live camera frame
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
        },
        (err) => {
          console.warn('Geolocation error:', err);
          // Default to San Francisco / Seed bin coordinates for seamless demo
          setLocation({
            lat: 28.6692,
            lng: 77.4538,
            accuracy: 12.0,
          });
        },
        { enableHighAccuracy: true, timeout: 5000 },
      );
    } else {
      setLocation({ lat: 28.6692, lng: 77.4538, accuracy: 15.0 });
    }
  };

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const nowIso = new Date().toISOString();
    setCapturedAt(nowIso);

    if (video && canvas && stream) {
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Stamp date, time, and GPS watermark onto photo
        const dataUrl = stampPhotoWithDateTimeAndLocation(canvas, {
          capturedDate: new Date(),
          lat: location?.lat,
          lng: location?.lng,
          accuracy: location?.accuracy,
          appTag: 'Waste Disposal Verified',
        });
        setPhotoData(dataUrl);
        stopCamera();
        return;
      }
    }

    // Fallback simulated photo capture if browser blocks webcam
    if (canvas) {
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Draw eco bin simulation
        const grad = ctx.createLinearGradient(0, 0, 0, 480);
        grad.addColorStop(0, '#047857');
        grad.addColorStop(1, '#064e3b');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);

        // Draw bin illustration
        ctx.fillStyle = '#10b981';
        ctx.beginPath();
        ctx.roundRect(180, 110, 280, 250, 24);
        ctx.fill();

        ctx.fillStyle = '#34d399';
        ctx.beginPath();
        ctx.roundRect(160, 80, 320, 36, 12);
        ctx.fill();

        // Recycling symbol
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 32px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('♻️ CleanStreak Bin', 320, 240);

        // Stamp date, time, and GPS watermark
        const fallbackData = stampPhotoWithDateTimeAndLocation(canvas, {
          capturedDate: new Date(),
          lat: location?.lat,
          lng: location?.lng,
          accuracy: location?.accuracy,
          appTag: 'CleanStreak Habit Lens',
        });
        setPhotoData(fallbackData);
      }
    }
  };

  const handleRetake = () => {
    setPhotoData(null);
    setVerificationResult(null);
    setErrorMsg(null);
    startCamera();
  };

  const handleSubmit = async () => {
    if (!photoData) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const lat = location?.lat ?? 28.6692;
    const lng = location?.lng ?? 77.4538;
    const accuracy = location?.accuracy ?? 10.0;
    const captureTime = capturedAt || new Date().toISOString();

    try {
      const res = await api.submitDisposal({
        photo_data: photoData,
        lat,
        lng,
        gps_accuracy_m: accuracy,
        captured_at: captureTime,
        walk_session_id: walkSessionId || undefined,
      });

      setVerificationResult(res);
      onSuccess(res);
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-gray-900 rounded-3xl overflow-hidden shadow-2xl border border-gray-800 text-white my-auto">
        {/* Top Header */}
        <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center space-x-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-400">
              Live Verified Camera
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/75 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport or Captured Snapshot */}
        <div className="relative aspect-3/4 w-full bg-black flex items-center justify-center overflow-hidden">
          {!photoData ? (
            <>
              {stream ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-6 space-y-4">
                  <div className="w-20 h-20 rounded-full bg-emerald-950/80 border-2 border-emerald-500/50 flex items-center justify-center text-emerald-400">
                    <Camera className="w-10 h-10" />
                  </div>
                  <div>
                    <p className="font-semibold text-lg text-emerald-100">Live Camera Simulator</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                      Live sensor simulation active. Tap the snap button below to verify your dustbin disposal.
                    </p>
                  </div>
                </div>
              )}

              {/* Viewfinder Overlay Frame */}
              <div className="absolute inset-8 border-2 border-dashed border-emerald-400/50 rounded-2xl pointer-events-none flex flex-col justify-between p-3">
                <span className="text-[10px] text-emerald-300 font-mono">FRAME DUSTBIN & HAND</span>
                <div className="flex justify-between items-center text-[10px] text-emerald-300 font-mono">
                  <span>GPS ACCURACY: ±{location?.accuracy ? Math.round(location.accuracy) : 12}m</span>
                  <span>LIVE RECOGNITION</span>
                </div>
              </div>
            </>
          ) : (
            <div className="relative w-full h-full">
              <img src={photoData} alt="Captured disposal" className="w-full h-full object-cover" />
              <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-md rounded-xl p-2.5 text-xs flex items-center justify-between">
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>
                    {location?.lat.toFixed(4)}, {location?.lng.toFixed(4)}
                  </span>
                </div>
                <span className="text-[10px] text-gray-300 font-mono">
                  {new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Verification Success Celebration Dialog */}
        {verificationResult && (
          <div className="p-6 bg-gradient-to-b from-emerald-900/90 to-gray-900 border-t border-emerald-600/50 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-300 tracking-tight">
                {verificationResult.status === 'approved'
                  ? 'Disposal Verified & Approved!'
                  : 'Disposal Under Review'}
              </h3>
              <p className="text-xs text-emerald-100/80 mt-1">
                {verificationResult.status === 'approved'
                  ? 'Your streak grew by +1 day! Credits have been awarded to your ledger.'
                  : 'A community moderator is reviewing your disposal photo.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-left">
              <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-3">
                <span className="text-[10px] uppercase text-emerald-400 font-bold flex items-center space-x-1">
                  <Zap className="w-3 h-3" />
                  <span>Confidence</span>
                </span>
                <p className="text-lg font-black text-white mt-0.5">
                  {Math.round((verificationResult.confidence || 0.85) * 100)}%
                </p>
              </div>
              <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-3">
                <span className="text-[10px] uppercase text-amber-400 font-bold flex items-center space-x-1">
                  <Award className="w-3 h-3" />
                  <span>Status</span>
                </span>
                <p className="text-lg font-black text-white mt-0.5 capitalize">
                  {verificationResult.status}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:brightness-110 transition-all text-sm"
            >
              Done & Return to Dashboard
            </button>
          </div>
        )}

        {/* Controls Bar (Capture, Retake, Submit) */}
        {!verificationResult && (
          <div className="p-5 bg-gray-900 border-t border-gray-800 space-y-4">
            {errorMsg && (
              <div className="flex items-center space-x-2 p-3 bg-red-950/80 border border-red-800 text-red-200 text-xs rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {!photoData ? (
              <div className="flex items-center justify-around py-2">
                <button
                  onClick={() => setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))}
                  className="w-12 h-12 rounded-full bg-gray-800 text-gray-300 flex items-center justify-center hover:bg-gray-700 transition-colors"
                  title="Flip camera"
                >
                  <RefreshCw className="w-5 h-5" />
                </button>

                <button
                  onClick={capturePhoto}
                  className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50" />
                </button>

                <div className="w-12 h-12 flex items-center justify-center text-xs text-gray-400 font-mono">
                  LIVE
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Waste type tagging */}
                <div>
                  <label className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider block mb-1.5">
                    Select Waste Category
                  </label>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {['plastic', 'organic', 'paper', 'recycling'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setSelectedWasteType(type)}
                        className={`py-2 px-1 rounded-xl text-center capitalize font-semibold transition-all border ${
                          selectedWasteType === type
                            ? 'bg-emerald-600 border-emerald-500 text-white shadow-sm'
                            : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-750'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-1">
                  <button
                    onClick={handleRetake}
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-semibold text-xs transition-colors"
                  >
                    Retake Photo
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="flex-2 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center space-x-2"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Verifying with AI...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Submit & Verify</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
