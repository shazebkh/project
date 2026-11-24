import React, { useState } from 'react';
import { User as UserIcon, Shield, Scale, Globe, Bell, Download, Trash2, X, Check } from 'lucide-react';
import { User } from '../types';
import { api } from '../services/apiClient';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onUpdate: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdate,
}) => {
  const [displayName, setDisplayName] = useState(user?.display_name || 'Alex Eco');
  const [weightKg, setWeightKg] = useState(user?.weight_kg || 70);
  const [timezone, setTimezone] = useState(user?.timezone || 'America/Los_Angeles');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateProfile({
        display_name: displayName,
        weight_kg: Number(weightKg),
        timezone,
      });
      setSaveSuccess(true);
      onUpdate();
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportData = () => {
    const dataStr = JSON.stringify(user, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanstreak-data-${user?.id || 'export'}.json`;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl space-y-4 my-auto text-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-gray-900">Profile & Settings</h3>
              <p className="text-[11px] text-gray-400">Manage habit goals & personal data</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="font-semibold text-gray-700 block mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="font-semibold text-gray-700 block mb-1">
              Body Weight (kg) — for MET Calorie Burn Calculations
            </label>
            <div className="relative">
              <input
                type="number"
                min="30"
                max="250"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
              />
              <span className="absolute right-3 top-2.5 text-gray-400 font-medium">kg</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Calories burned walking to bins are calculated using the Compendium of Physical Activities formula: MET × Weight × Hours.
            </p>
          </div>

          <div>
            <label className="font-semibold text-gray-700 block mb-1">Timezone (Day Boundaries)</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-emerald-500/20 focus:outline-hidden"
            >
              <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
              <option value="America/New_York">America/New_York (ET)</option>
              <option value="Europe/London">Europe/London (GMT)</option>
              <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
              <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              <option value="UTC">UTC</option>
            </select>
            <p className="text-[10px] text-gray-400 mt-1">
              Your daily streak resets at midnight in your selected timezone.
            </p>
          </div>

          {saveSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-center font-bold flex items-center justify-center space-x-1">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>Settings Saved!</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </form>

        {/* Privacy & GDPR export */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <span className="font-semibold text-gray-700 block">Privacy & Your Rights</span>
          <button
            onClick={handleExportData}
            className="w-full py-2 px-3 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold flex items-center justify-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-gray-500" />
            <span>Export Account Data (JSON)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
