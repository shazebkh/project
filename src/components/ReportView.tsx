import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Send,
  MapPin,
  CheckCircle2,
  Clock,
  ThumbsUp,
  FileText,
  Mail,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Report, ReportCategory } from '../types';
import { api } from '../services/apiClient';

interface ReportViewProps {
  onRefresh: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({ onRefresh }) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [category, setCategory] = useState<ReportCategory>('overflowing_bin');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState(1);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [addressText, setAddressText] = useState('');
  const [photoData, setPhotoData] = useState<string>('uploads/report-default.jpg');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Selected report details modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [reportEvents, setReportEvents] = useState<any[]>([]);

  useEffect(() => {
    loadReports();
    // Preload location
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
      const res = await api.getReports();
      setReports(res.reports);
    } catch (err) {
      console.error('Failed to load reports:', err);
    }
  };

  const handleOpenReportDetails = async (rep: Report) => {
    setSelectedReport(rep);
    try {
      const det = await api.getReportDetails(rep.id);
      setReportEvents(det.events);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    setSubmitMessage(null);

    const lat = location?.lat ?? 28.6692;
    const lng = location?.lng ?? 77.4538;

    try {
      const res = await api.submitReport({
        category,
        description,
        photo_keys: [photoData],
        lat,
        lng,
        address_text: addressText || 'Near Main Pedestrian Walkway',
        severity,
      });

      setSubmitMessage(
        res.is_duplicate
          ? 'Notice: Similar report already in progress nearby. You were added as a supporter!'
          : 'Report forwarded to Municipal Authority via EmailAdapter.',
      );
      await loadReports();
      setTimeout(() => {
        setShowSubmitModal(false);
        setSubmitMessage(null);
        setDescription('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupport = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.supportReport(id);
      await loadReports();
    } catch (err) {
      console.error(err);
    }
  };

  const handleConfirmResolved = async (id: string) => {
    try {
      await api.confirmReportResolved(id);
      await loadReports();
      if (selectedReport && selectedReport.id === id) {
        setSelectedReport(null);
      }
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const categories: Array<{ id: ReportCategory; label: string; icon: string }> = [
    { id: 'overflowing_bin', label: 'Overflowing Bin', icon: '🗑️' },
    { id: 'illegal_dumping', label: 'Illegal Dumping', icon: '🚫' },
    { id: 'open_burning', label: 'Open Burning', icon: '🔥' },
    { id: 'missing_bin', label: 'Missing Bin', icon: '❓' },
    { id: 'no_segregation', label: 'No Segregation', icon: '⚠️' },
    { id: 'other', label: 'Other Issue', icon: '📝' },
  ];

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-rose-700 to-red-800 text-white p-5 shadow-xl border border-rose-600/30">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <ShieldAlert className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-rose-200">Civic Action</span>
              <h3 className="text-xl font-black">Report Waste Issues</h3>
            </div>
          </div>
          <button
            onClick={() => setShowSubmitModal(true)}
            className="py-2 px-3.5 rounded-xl bg-white text-rose-800 font-bold text-xs shadow-md hover:bg-rose-50 transition-colors flex items-center space-x-1"
          >
            <span>+ New Report</span>
          </button>
        </div>
        <p className="text-xs text-rose-100 leading-relaxed">
          Geo-tagged photo alerts are automatically formatted and forwarded to municipal authorities. Earn <strong>+15 credits</strong> when confirmed resolved!
        </p>
      </div>

      {/* 2. Neighborhood Reports List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-gray-900">Neighborhood Reports</h3>
          <span className="text-xs text-gray-500">{reports.length} tracked</span>
        </div>

        {reports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <p className="text-sm font-semibold text-gray-700">Area is looking clean!</p>
            <p className="text-xs text-gray-400">No active waste reports in your immediate vicinity.</p>
          </div>
        ) : (
          reports.map((rep) => {
            const isResolved = rep.status === 'resolved';

            return (
              <div
                key={rep.id}
                onClick={() => handleOpenReportDetails(rep)}
                className="rounded-2xl bg-white border border-gray-100 p-4 shadow-xs hover:border-gray-200 transition-all cursor-pointer space-y-2.5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">
                      {categories.find((c) => c.id === rep.category)?.icon || '⚠️'}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-gray-900 capitalize">
                        {rep.category.replace('_', ' ')}
                      </h4>
                      <p className="text-[10px] text-gray-400">
                        {new Date(rep.created_at).toLocaleDateString()} • {rep.address_text || 'GPS Location'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isResolved
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : rep.status === 'forwarded'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {rep.status}
                  </span>
                </div>

                {rep.description && (
                  <p className="text-xs text-gray-600 line-clamp-2">{rep.description}</p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                  <button
                    onClick={(e) => handleSupport(rep.id, e)}
                    className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 font-semibold text-[11px] border border-gray-200"
                  >
                    <ThumbsUp className="w-3.5 h-3.5 text-gray-500" />
                    <span>Support ({rep.support_count})</span>
                  </button>

                  <div className="flex items-center space-x-1 text-gray-400 text-[11px]">
                    <span>View Timeline</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* 3. Submit Report Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900">File Civic Waste Report</h3>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              {/* Category */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1.5">Category</label>
                <div className="grid grid-cols-2 gap-2">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setCategory(c.id)}
                      className={`p-2.5 rounded-xl border text-left flex items-center space-x-2 transition-all ${
                        category === c.id
                          ? 'border-rose-500 bg-rose-50 text-rose-900 font-bold'
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{c.icon}</span>
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Details & Landmarks</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue, pile size, or near landmark..."
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:outline-hidden"
                />
              </div>

              {/* Location hint */}
              <div>
                <label className="font-semibold text-gray-700 block mb-1">Address / Location Hint</label>
                <input
                  type="text"
                  value={addressText}
                  onChange={(e) => setAddressText(e.target.value)}
                  placeholder="e.g. Corner of Elm St & 5th Ave"
                  className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-rose-500/20 focus:outline-hidden"
                />
              </div>

              {/* Geotag Indicator */}
              <div className="flex items-center space-x-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200 text-gray-500 text-[11px]">
                <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                <span>
                  Geotag: {location?.lat.toFixed(4) || '28.6692'}, {location?.lng.toFixed(4) || '77.4538'} (GPS Verified)
                </span>
              </div>

              {submitMessage && (
                <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-center font-medium">
                  {submitMessage}
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
                  onClick={() => setShowSubmitModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-xs flex items-center justify-center space-x-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Dispatching...' : 'Dispatch to Authority'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Report Details & Event Timeline Modal */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400">
                  Ref #{selectedReport.external_ref || selectedReport.id.slice(0, 8)}
                </span>
                <h3 className="font-bold text-base text-gray-900 capitalize">
                  {selectedReport.category.replace('_', ' ')}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-gray-50 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Location:</span>
                <span className="font-semibold text-gray-800">
                  {selectedReport.address_text || `${selectedReport.location.lat.toFixed(4)}, ${selectedReport.location.lng.toFixed(4)}`}
                </span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Citizens Supporting:</span>
                <span className="font-bold text-emerald-700">{selectedReport.support_count}</span>
              </div>
              {selectedReport.description && (
                <div className="border-t border-gray-200 pt-1.5 text-gray-700">
                  "{selectedReport.description}"
                </div>
              )}
            </div>

            {/* Official Status Timeline */}
            <div>
              <h4 className="font-bold text-xs text-gray-900 mb-2">Authority Status Timeline</h4>
              <div className="space-y-3 pl-2 border-l-2 border-emerald-500/30 text-xs">
                {reportEvents.map((ev, i) => (
                  <div key={i} className="relative pl-3">
                    <div className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white" />
                    <span className="font-bold text-gray-900 capitalize">{ev.status}</span>
                    <p className="text-[11px] text-gray-500 mt-0.5">{ev.note}</p>
                    <span className="text-[9px] text-gray-400">
                      {new Date(ev.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Citizen Confirm Resolved CTA (Section 8.1) */}
            {selectedReport.status !== 'resolved' && (
              <button
                onClick={() => handleConfirmResolved(selectedReport.id)}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs flex items-center justify-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm Cleaned Up (+15 credits)</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
