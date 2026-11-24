import React from 'react';
import { Calendar as CalendarIcon, CheckCircle2, Clock, AlertCircle, MapPin, Tag, ShieldCheck } from 'lucide-react';
import { Disposal } from '../types';

interface TimelineViewProps {
  disposals: Disposal[];
  onOpenDispose: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ disposals, onOpenDispose }) => {
  // Generate past 28 days for the calendar heatmap
  const days: Array<{ dateStr: string; dayNum: number; count: number }> = [];
  const now = new Date();
  for (let i = 27; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    const count = disposals.filter((disp) => disp.local_date === dateStr && disp.status === 'approved').length;
    days.push({ dateStr, dayNum: d.getDate(), count });
  }

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* 1. Heatmap Header */}
      <div className="rounded-3xl bg-white border border-gray-100 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">4-Week Activity Heatmap</h3>
              <p className="text-[11px] text-gray-500">Every green block is a verified disposal</p>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
            {disposals.filter((d) => d.status === 'approved').length} Total Verified
          </span>
        </div>

        {/* Heatmap Grid (7 columns x 4 rows) */}
        <div className="grid grid-cols-7 gap-1.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
            <span key={idx} className="text-[10px] font-bold text-gray-400 mb-1">
              {day}
            </span>
          ))}
          {days.map((item, idx) => {
            const hasDisposal = item.count > 0;
            return (
              <div
                key={idx}
                title={`${item.dateStr}: ${item.count} verified disposals`}
                className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                  hasDisposal
                    ? 'bg-emerald-500 text-white shadow-xs scale-95 hover:scale-105'
                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                }`}
              >
                {item.dayNum}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Photo Feed & Timeline Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-sm text-gray-900">Verified Disposals Feed</h3>
          <span className="text-xs text-gray-500">{disposals.length} recorded</span>
        </div>

        {disposals.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-gray-700">No disposals logged yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Snap your first dustbin photo today to start your CleanStreak and earn credits!
            </p>
            <button
              onClick={onOpenDispose}
              className="py-2.5 px-5 rounded-xl bg-emerald-600 text-white font-bold text-xs shadow-xs hover:bg-emerald-700 transition-colors"
            >
              Take First Photo
            </button>
          </div>
        ) : (
          disposals.map((item) => {
            const isApproved = item.status === 'approved';
            const isPending = item.status === 'pending' || item.status === 'review';

            return (
              <div
                key={item.id}
                className="rounded-2xl bg-white border border-gray-100 p-4 shadow-xs flex space-x-3.5 hover:border-gray-200 transition-all"
              >
                {/* Photo thumbnail */}
                <div className="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden shrink-0 border border-gray-200 relative">
                  {item.photo_key.startsWith('data:') ? (
                    <img src={item.photo_key} alt="Disposal" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-tr from-emerald-800 to-teal-700 flex flex-col items-center justify-center text-white text-[10px] font-bold p-1 text-center">
                      <span>♻️ Bin Photo</span>
                      <span className="text-[8px] opacity-75 mt-0.5">Verified</span>
                    </div>
                  )}
                  {isApproved && (
                    <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-0.5 rounded-full shadow-xs">
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-gray-900">{item.local_date}</span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : isPending
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 text-[11px] text-gray-500 mt-1">
                      <MapPin className="w-3 h-3 shrink-0 text-gray-400" />
                      <span className="truncate">
                        GPS: {item.location.lat.toFixed(4)}, {item.location.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 pt-2">
                    {item.waste_types.map((type: string, i: number) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 capitalize flex items-center space-x-1"
                      >
                        <Tag className="w-2.5 h-2.5 text-gray-400" />
                        <span>{type}</span>
                      </span>
                    ))}
                    {item.confidence && (
                      <span className="text-[10px] text-gray-400 ml-auto font-mono">
                        {Math.round(item.confidence * 100)}% conf
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
