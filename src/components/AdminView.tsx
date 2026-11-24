import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Activity,
  Users,
  Coins,
  MapPin,
  RefreshCw,
  Truck,
  Stethoscope,
  PhoneCall,
  ExternalLink,
  Clock,
  HeartHandshake,
  X,
} from 'lucide-react';
import { Disposal, Report, WildlifeReport } from '../types';
import { api } from '../services/apiClient';

interface AdminViewProps {
  onRefresh: () => void;
  onExitAdmin?: () => void;
}

export const AdminView: React.FC<AdminViewProps> = ({ onRefresh, onExitAdmin }) => {
  const [activeTab, setActiveTab] = useState<'reviews' | 'reports' | 'wildlife' | 'stats'>('reviews');
  const [reviews, setReviews] = useState<Disposal[]>([]);
  const [adminReports, setAdminReports] = useState<Report[]>([]);
  const [wildlifeReports, setWildlifeReports] = useState<WildlifeReport[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Dispatch modal state
  const [dispatchModalReport, setDispatchModalReport] = useState<WildlifeReport | null>(null);
  const [dispatchTeamName, setDispatchTeamName] = useState('Paws & Claws Emergency Squad #1');
  const [dispatchPhone, setDispatchPhone] = useState('+1 (800) 555-PAWS');
  const [dispatchEta, setDispatchEta] = useState(15);

  // Diagnosis modal state
  const [diagnoseModalReport, setDiagnoseModalReport] = useState<WildlifeReport | null>(null);
  const [diagnosisNotes, setDiagnosisNotes] = useState('');
  const [rescueOutcome, setRescueOutcome] = useState('Stabilized and transferred to vet clinic');

  useEffect(() => {
    loadAll();
  }, [activeTab]);

  const loadAll = async () => {
    try {
      if (activeTab === 'reviews') {
        const res = await api.getAdminReviews();
        setReviews(res.reviews);
      } else if (activeTab === 'reports') {
        const res = await api.getAdminReports();
        setAdminReports(res.reports);
      } else if (activeTab === 'wildlife') {
        const res = await api.getWildlifeReports();
        setWildlifeReports(res.reports);
      } else if (activeTab === 'stats') {
        const res = await api.getAdminStats();
        setStats(res);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDecision = async (id: string, decision: 'approve' | 'reject') => {
    setIsProcessing(id);
    try {
      await api.submitReviewDecision(
        id,
        decision,
        decision === 'reject' ? 'Photo does not clearly show trash entering dustbin' : undefined,
      );
      await loadAll();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleUpdateReportStatus = async (id: string, status: Report['status']) => {
    setIsProcessing(id);
    try {
      await api.updateAdminReport(id, {
        status,
        note: `Status updated to ${status} via Moderator Dashboard`,
      });
      await loadAll();
      onRefresh();
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenDispatch = (rep: WildlifeReport) => {
    setDispatchModalReport(rep);
    setDispatchTeamName('Paws & Claws Emergency Squad #1');
    setDispatchPhone('+1 (800) 555-PAWS');
    setDispatchEta(15);
  };

  const submitDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dispatchModalReport) return;
    setIsProcessing(dispatchModalReport.id);
    try {
      await api.dispatchWildlifeRescue(dispatchModalReport.id, {
        team_name: dispatchTeamName,
        contact_phone: dispatchPhone,
        eta_minutes: Number(dispatchEta),
      });
      setDispatchModalReport(null);
      await loadAll();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  const handleOpenDiagnose = (rep: WildlifeReport) => {
    setDiagnoseModalReport(rep);
    setDiagnosisNotes(rep.diagnosis_notes || 'Physical exam conducted: wound cleaned and disinfected. Administered pain relief and antibiotic injection.');
    setRescueOutcome(rep.rescue_outcome || 'Stabilized on-site and safely released into monitored sanctuary area');
  };

  const submitDiagnosis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!diagnoseModalReport) return;
    setIsProcessing(diagnoseModalReport.id);
    try {
      await api.diagnoseWildlife(diagnoseModalReport.id, {
        diagnosis_notes: diagnosisNotes,
        rescue_outcome: rescueOutcome,
        status: 'treated_rescued',
      });
      setDiagnoseModalReport(null);
      await loadAll();
      onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* 1. Admin Header */}
      <div className="rounded-3xl bg-gradient-to-br from-purple-800 to-indigo-900 text-white p-5 shadow-xl border border-purple-700/50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-purple-200" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-purple-200">Moderator Portal</span>
              <h3 className="text-xl font-black">Admin & Review Queue</h3>
            </div>
          </div>
          <div className="flex items-center space-x-1.5">
            <button
              onClick={loadAll}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            {onExitAdmin && (
              <button
                onClick={onExitAdmin}
                className="py-1.5 px-3 rounded-xl bg-purple-950/80 hover:bg-purple-900 border border-purple-400/30 text-purple-200 hover:text-white font-bold text-xs flex items-center space-x-1 transition-all"
                title="Lock Admin Console & Exit"
              >
                <span>🔒 Lock & Exit</span>
              </button>
            )}
          </div>
        </div>

        {/* Tab switch */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-black/25 rounded-2xl text-[11px] font-bold">
          <button
            onClick={() => setActiveTab('reviews')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'reviews' ? 'bg-white text-purple-900 shadow-xs' : 'text-purple-200 hover:text-white'
            }`}
          >
            Reviews ({reviews.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'reports' ? 'bg-white text-purple-900 shadow-xs' : 'text-purple-200 hover:text-white'
            }`}
          >
            Waste ({adminReports.length})
          </button>
          <button
            onClick={() => setActiveTab('wildlife')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-0.5 ${
              activeTab === 'wildlife' ? 'bg-white text-purple-900 shadow-xs' : 'text-purple-200 hover:text-white'
            }`}
          >
            <span>🐾 Wildlife ({wildlifeReports.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'stats' ? 'bg-white text-purple-900 shadow-xs' : 'text-purple-200 hover:text-white'
            }`}
          >
            Stats
          </button>
        </div>
      </div>

      {/* 2. Review Queue */}
      {activeTab === 'reviews' && (
        <div className="space-y-3">
          {reviews.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">Review queue is empty!</p>
              <p className="text-xs text-gray-400">All disposal submissions have been verified.</p>
            </div>
          ) : (
            reviews.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-gray-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-gray-400">ID: {item.id}</span>
                    <h4 className="font-bold text-xs text-gray-900">
                      Disposal Date: {item.local_date}
                    </h4>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                    {item.status} ({Math.round((item.confidence || 0.6) * 100)}% conf)
                  </span>
                </div>

                <div className="aspect-16/9 w-full rounded-xl bg-gray-900 overflow-hidden relative">
                  {item.photo_key.startsWith('data:') ? (
                    <img src={item.photo_key} alt="Review" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs font-bold p-3 text-center bg-gradient-to-tr from-emerald-900 to-teal-900">
                      <span>📸 Live Photo Capture</span>
                      <span className="text-[10px] text-emerald-300 mt-1">
                        GPS: {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)} (±{item.gps_accuracy_m || 10}m)
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => handleDecision(item.id, 'reject')}
                    disabled={isProcessing === item.id}
                    className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center space-x-1 border border-red-200"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                  <button
                    onClick={() => handleDecision(item.id, 'approve')}
                    disabled={isProcessing === item.id}
                    className="flex-2 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve (+Streak & Credits)</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 3. Reports Triage */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {adminReports.map((rep) => (
            <div
              key={rep.id}
              className="rounded-2xl bg-white border border-gray-200 p-4 shadow-xs space-y-2.5"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-gray-400">Ref #{rep.external_ref || rep.id}</span>
                  <h4 className="font-bold text-xs text-gray-900 capitalize">
                    {rep.category.replace('_', ' ')}
                  </h4>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                  {rep.status}
                </span>
              </div>

              <p className="text-xs text-gray-600">{rep.description || 'No description'}</p>

              <div className="flex items-center space-x-2 pt-2 border-t border-gray-100 text-xs">
                <span className="text-gray-400">Update Status:</span>
                {(['acknowledged', 'in_progress', 'resolved'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleUpdateReportStatus(rep.id, s)}
                    className="px-2 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-[10px] capitalize"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Wildlife Rescue & Injury Triage */}
      {activeTab === 'wildlife' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-rose-50 to-amber-50 rounded-2xl p-3.5 border border-rose-200/60 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                🐾
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-950">Wildlife Emergency Center</h4>
                <p className="text-[11px] text-rose-700">Dispatch veterinary squads and record medical diagnoses</p>
              </div>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-200/60 text-rose-800">
              {wildlifeReports.length} Cases
            </span>
          </div>

          {wildlifeReports.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No active wildlife emergencies!</p>
              <p className="text-xs text-gray-400">All reported injured animals have been rescued or treated.</p>
            </div>
          ) : (
            wildlifeReports.map((rep) => {
              const statusBadges: Record<string, { bg: string; text: string; label: string }> = {
                reported: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: '🚨 Needs Dispatch' },
                team_dispatched: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700', label: '🚑 Squad En Route' },
                on_site_triage: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700', label: '🩺 On-Site Triage' },
                treated_rescued: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: '✅ Treated & Rescued' },
                closed: { bg: 'bg-gray-50 border-gray-200', text: 'text-gray-700', label: 'Closed' },
              };
              const badge = statusBadges[rep.status] || statusBadges.reported;

              const animalEmojis: Record<string, string> = {
                dog: '🐕 Dog',
                cat: '🐈 Cat',
                bird: '🐦 Bird',
                cow: '🐄 Cow / Cattle',
                monkey: '🐒 Monkey',
                wild_animal: '🦊 Wild Animal',
                reptile: '🦎 Reptile',
                other: '🐾 Other Animal',
              };

              return (
                <div
                  key={rep.id}
                  className="rounded-2xl bg-white border border-gray-200 p-4 shadow-xs space-y-3"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-gray-900 capitalize">
                          {animalEmojis[rep.animal_type] || rep.animal_type}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-gray-100 text-gray-600">
                          {rep.condition.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        Case ID: #{rep.id} • {new Date(rep.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border ${badge.bg} ${badge.text}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Watermarked Photo with Burnt-in Date/Time and GPS Overlay */}
                  <div className="aspect-16/9 w-full rounded-xl bg-gray-900 overflow-hidden relative border border-gray-200 shadow-inner group">
                    {rep.photo_url.startsWith('data:') ? (
                      <img
                        src={rep.photo_url}
                        alt="Injured Animal Report"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white text-xs p-4 text-center bg-gradient-to-tr from-slate-900 via-rose-950 to-slate-900">
                        <span className="text-2xl mb-1">🐾</span>
                        <span className="font-bold">Watermarked Photo Record</span>
                        <span className="text-[10px] text-rose-300 mt-1">
                          📍 {rep.location.lat.toFixed(5)}, {rep.location.lng.toFixed(5)}
                        </span>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-white flex items-center space-x-1 border border-white/20">
                      <Clock className="w-3 h-3 text-amber-300" />
                      <span>{rep.captured_at ? new Date(rep.captured_at).toLocaleTimeString() : 'Marked'}</span>
                    </div>
                    <div className="absolute top-2 right-2 bg-emerald-950/80 backdrop-blur-md px-2 py-1 rounded-md text-[10px] font-bold text-emerald-300 flex items-center space-x-1 border border-emerald-400/30">
                      <MapPin className="w-3 h-3 text-emerald-400" />
                      <span>GPS Stamped</span>
                    </div>
                  </div>

                  {/* Location & Address metadata */}
                  <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-slate-800 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-rose-600" />
                        <span>{rep.address_hint || 'Coordinates Recorded via GPS'}</span>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${rep.location.lat},${rep.location.lng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-0.5"
                      >
                        <span>Open Map</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    <div className="text-[10px] font-mono text-slate-500">
                      Lat: {rep.location.lat.toFixed(5)} • Lng: {rep.location.lng.toFixed(5)}
                    </div>
                  </div>

                  {/* Citizen Observation */}
                  {rep.description && (
                    <div className="text-xs text-gray-700 bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/50">
                      <span className="font-bold text-gray-900 block text-[11px] mb-0.5">Citizen Notes:</span>
                      {rep.description}
                    </div>
                  )}

                  {/* Dispatched Team Details Box (if assigned) */}
                  {rep.dispatched_team && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 text-xs space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-1.5 font-bold text-blue-900">
                          <Truck className="w-3.5 h-3.5 text-blue-600" />
                          <span>{rep.dispatched_team.team_name}</span>
                        </div>
                        {rep.dispatched_team.eta_minutes && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold">
                            ETA: ~{rep.dispatched_team.eta_minutes} mins
                          </span>
                        )}
                      </div>
                      {rep.dispatched_team.contact_phone && (
                        <div className="flex items-center space-x-1 text-[11px] text-blue-700 font-semibold">
                          <PhoneCall className="w-3 h-3" />
                          <a href={`tel:${rep.dispatched_team.contact_phone}`} className="hover:underline">
                            {rep.dispatched_team.contact_phone}
                          </a>
                        </div>
                      )}
                      <div className="text-[10px] text-blue-600">
                        Dispatched: {new Date(rep.dispatched_team.dispatched_at).toLocaleTimeString()}
                      </div>
                    </div>
                  )}

                  {/* Veterinary Diagnosis & Treatment Box (if diagnosed) */}
                  {rep.diagnosis_notes && (
                    <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5 text-xs space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-purple-900">
                        <Stethoscope className="w-3.5 h-3.5 text-purple-600" />
                        <span>Veterinary Diagnosis & Triage</span>
                      </div>
                      <p className="text-[11px] text-purple-900 leading-relaxed">
                        {rep.diagnosis_notes}
                      </p>
                      {rep.rescue_outcome && (
                        <div className="text-[10px] font-bold text-emerald-700 pt-1 border-t border-purple-200/60">
                          Outcome: {rep.rescue_outcome}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Moderator / Admin Actions: Dispatch Squad or Diagnose Animal */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                    <button
                      onClick={() => handleOpenDispatch(rep)}
                      disabled={isProcessing === rep.id}
                      className="py-2 px-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center space-x-1 border border-blue-200 shadow-xs transition-colors"
                    >
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      <span>{rep.dispatched_team ? 'Re-Dispatch' : 'Dispatch Squad'}</span>
                    </button>
                    <button
                      onClick={() => handleOpenDiagnose(rep)}
                      disabled={isProcessing === rep.id}
                      className="py-2 px-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs flex items-center justify-center space-x-1 shadow-xs transition-colors"
                    >
                      <Stethoscope className="w-3.5 h-3.5 text-purple-200" />
                      <span>Diagnose Animal</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. Stats & Audit */}
      {activeTab === 'stats' && stats && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400">Total Users</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalUsers}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-gray-400">Disposals Logged</span>
              <p className="text-2xl font-black text-gray-900 mt-1">{stats.totalDisposals}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-emerald-600">Approved Disposals</span>
              <p className="text-2xl font-black text-emerald-700 mt-1">{stats.approvedDisposals}</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-gray-100 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-500">Credits Awarded</span>
              <p className="text-2xl font-black text-amber-600 mt-1">{stats.totalCreditsAwarded}</p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: Dispatch Wildlife Rescue Squad */}
      {dispatchModalReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Dispatch Rescue Unit</h4>
                  <p className="text-[11px] text-gray-500">Assign animal ambulance or vet squad</p>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalReport(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-200/60 text-xs space-y-1">
              <div className="font-bold text-blue-950 capitalize">
                {dispatchModalReport.animal_type} • {dispatchModalReport.condition.replace(/_/g, ' ')}
              </div>
              <div className="text-[11px] text-blue-800">
                📍 {dispatchModalReport.address_hint || `${dispatchModalReport.location.lat.toFixed(4)}, ${dispatchModalReport.location.lng.toFixed(4)}`}
              </div>
            </div>

            <form onSubmit={submitDispatch} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Rescue Squad Name</label>
                <input
                  type="text"
                  value={dispatchTeamName}
                  onChange={(e) => setDispatchTeamName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="e.g. Rapid Vet Ambulance Squad #1"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Squad Emergency Hotline</label>
                <input
                  type="text"
                  value={dispatchPhone}
                  onChange={(e) => setDispatchPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  placeholder="+1 (800) 555-PAWS"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Estimated Arrival (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  value={dispatchEta}
                  onChange={(e) => setDispatchEta(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalReport(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === dispatchModalReport.id}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md shadow-blue-600/20"
                >
                  Confirm Dispatch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Veterinary Diagnosis & Medical Treatment */}
      {diagnoseModalReport && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-4 border border-gray-100 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-gray-900">Veterinary Diagnosis</h4>
                  <p className="text-[11px] text-gray-500">Record on-site medical treatment</p>
                </div>
              </div>
              <button
                onClick={() => setDiagnoseModalReport(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-200/60 text-xs space-y-1">
              <div className="font-bold text-purple-950 capitalize">
                Case #{diagnoseModalReport.id}: {diagnoseModalReport.animal_type}
              </div>
              <div className="text-[11px] text-purple-800">
                Condition: {diagnoseModalReport.condition.replace(/_/g, ' ')}
              </div>
            </div>

            <form onSubmit={submitDiagnosis} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Clinical Diagnosis & Procedures</label>
                <textarea
                  rows={3}
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
                  placeholder="Document physical examination, wounds, medication given, sutures, etc."
                  required
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Rescue & Recovery Outcome</label>
                <input
                  type="text"
                  value={rescueOutcome}
                  onChange={(e) => setRescueOutcome(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
                  placeholder="e.g. Stabilized and safely released / Transferred to vet clinic"
                  required
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDiagnoseModalReport(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === diagnoseModalReport.id}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold shadow-md shadow-purple-600/20"
                >
                  Save Diagnosis
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
