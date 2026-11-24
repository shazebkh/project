import React, { useState, useEffect } from 'react';
import {
  Gift,
  Coins,
  ShieldCheck,
  Lock,
  Sparkles,
  Ticket,
  Copy,
  Check,
  ExternalLink,
  Info,
} from 'lucide-react';
import { Reward, Redemption } from '../types';
import { api } from '../services/apiClient';

interface RewardsViewProps {
  balance: number;
  lifetime: number;
  tier: string;
  onRefresh: () => void;
}

export const RewardsView: React.FC<RewardsViewProps> = ({
  balance,
  lifetime,
  tier,
  onRefresh,
}) => {
  const [rewards, setRewards] = useState<Array<Reward & { locked: boolean; can_redeem: boolean }>>([]);
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [activeTab, setActiveTab] = useState<'catalog' | 'vouchers'>('catalog');
  const [selectedReward, setSelectedReward] = useState<Reward | null>(null);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [rRes, myRed] = await Promise.all([api.getRewards(), api.getMyRedemptions()]);
      setRewards(rRes.rewards);
      setRedemptions(myRed.redemptions);
    } catch (err) {
      console.error('Failed to load rewards:', err);
    }
  };

  const handleRedeem = async (reward: Reward) => {
    setSelectedReward(reward);
    setErrorMsg(null);
    setIssuedCode(null);
  };

  const confirmRedeem = async () => {
    if (!selectedReward) return;
    setIsRedeeming(true);
    setErrorMsg(null);
    try {
      const res = await api.redeemReward(selectedReward.id);
      setIssuedCode(res.code);
      await loadData();
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to redeem reward');
    } finally {
      setIsRedeeming(false);
    }
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Tier progression math
  const nextTierTarget =
    tier === 'bronze' ? 500 : tier === 'silver' ? 1500 : tier === 'gold' ? 4000 : 4000;
  const currentTierBase =
    tier === 'bronze' ? 0 : tier === 'silver' ? 500 : tier === 'gold' ? 1500 : 4000;
  const progressPct =
    tier === 'platinum'
      ? 100
      : Math.min(100, Math.round(((lifetime - currentTierBase) / (nextTierTarget - currentTierBase)) * 100));

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* 1. Lifetime Tier Progression Card */}
      <div className="rounded-3xl bg-gradient-to-br from-gray-900 to-slate-800 text-white p-5 shadow-xl border border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-gray-400">Lifetime Status</span>
              <h3 className="text-xl font-black capitalize text-amber-300">{tier} Tier</h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-semibold text-gray-400">Available Balance</span>
            <p className="text-xl font-black text-white flex items-center justify-end space-x-1">
              <Coins className="w-4 h-4 text-amber-400" />
              <span>{balance}</span>
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex justify-between text-xs text-gray-300">
            <span>{lifetime} lifetime credits</span>
            <span>
              {tier === 'platinum' ? 'Max Tier' : `${nextTierTarget - lifetime} to next tier`}
            </span>
          </div>
          <div className="w-full bg-gray-700 h-2.5 rounded-full overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 to-yellow-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Anti-demotion note */}
        <div className="mt-3.5 flex items-start space-x-1.5 p-2.5 rounded-xl bg-white/5 border border-white/10 text-[11px] text-gray-300">
          <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            <strong>Lifetime tier protection:</strong> Tiers are calculated on lifetime earned credits. Spending credits will never demote you!
          </span>
        </div>
      </div>

      {/* 2. Sub Tabs: Catalog vs My Vouchers */}
      <div className="flex rounded-2xl bg-gray-100 p-1 border border-gray-200">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === 'catalog' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Rewards Catalog
        </button>
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center space-x-1.5 ${
            activeTab === 'vouchers' ? 'bg-white text-emerald-800 shadow-xs' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          <span>My Vouchers</span>
          {redemptions.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-emerald-600 text-white text-[10px] flex items-center justify-center">
              {redemptions.length}
            </span>
          )}
        </button>
      </div>

      {/* 3. Catalog Tab */}
      {activeTab === 'catalog' && (
        <div className="space-y-3">
          {rewards.map((reward) => (
            <div
              key={reward.id}
              className={`rounded-2xl p-4 border transition-all ${
                reward.locked
                  ? 'bg-gray-50 border-gray-200 opacity-75'
                  : 'bg-white border-gray-100 shadow-xs hover:border-emerald-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-gray-100 text-gray-600">
                      {reward.tier_required} tier
                    </span>
                    {reward.partner && (
                      <span className="text-[10px] text-gray-500 truncate">
                        • {reward.partner}
                      </span>
                    )}
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 mt-1">{reward.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5 line-clamp-2">{reward.description}</p>
                </div>

                <div className="text-right shrink-0">
                  <div className="flex items-center justify-end space-x-1 font-black text-sm text-amber-600">
                    <Coins className="w-4 h-4" />
                    <span>{reward.cost_credits}</span>
                  </div>
                  {reward.stock !== null && (
                    <span className="text-[10px] text-gray-400 block mt-0.5">
                      {reward.stock} left
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-500">
                  {reward.locked ? `Requires ${reward.tier_required} tier` : 'Instant digital code'}
                </span>
                <button
                  onClick={() => handleRedeem(reward)}
                  disabled={reward.locked || !reward.can_redeem}
                  className={`py-1.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                    reward.locked
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : reward.can_redeem
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  }`}
                >
                  {reward.locked ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>Locked</span>
                    </>
                  ) : reward.can_redeem ? (
                    <>
                      <Gift className="w-3 h-3" />
                      <span>Redeem</span>
                    </>
                  ) : (
                    <span>Need More Credits</span>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. My Vouchers Tab */}
      {activeTab === 'vouchers' && (
        <div className="space-y-3">
          {redemptions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-gray-100 p-6 space-y-2">
              <Ticket className="w-10 h-10 text-gray-300 mx-auto" />
              <p className="text-sm font-semibold text-gray-700">No redeemed vouchers yet</p>
              <p className="text-xs text-gray-400">
                Redeem your earned credits in the catalog to unlock coupons and planting certificates.
              </p>
            </div>
          ) : (
            redemptions.map((red) => {
              const rDetails = rewards.find((r) => r.id === red.reward_id);
              return (
                <div
                  key={red.id}
                  className="rounded-2xl bg-white border border-emerald-100 p-4 shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">
                        {rDetails?.title || 'CleanStreak Partner Reward'}
                      </h4>
                      <p className="text-[11px] text-gray-500">
                        Redeemed on {new Date(red.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {red.status}
                    </span>
                  </div>

                  {/* Voucher Code Box */}
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-dashed border-gray-300">
                    <span className="font-mono font-bold text-sm text-gray-800 tracking-wider">
                      {red.code}
                    </span>
                    <button
                      onClick={() => copyToClipboard(red.code)}
                      className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-100 flex items-center space-x-1"
                    >
                      {copiedCode === red.code ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="text-emerald-600">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 5. Redemption Modal */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            {!issuedCode ? (
              <>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Gift className="w-6 h-6" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg text-gray-900">{selectedReward.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{selectedReward.description}</p>
                </div>

                <div className="p-3 bg-gray-50 rounded-2xl text-xs space-y-1.5 border border-gray-100">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Cost:</span>
                    <span className="font-bold text-amber-600">{selectedReward.cost_credits} credits</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Current Balance:</span>
                    <span className="font-semibold text-gray-800">{balance} credits</span>
                  </div>
                  <div className="flex justify-between border-t border-gray-200 pt-1.5">
                    <span className="text-gray-700 font-bold">Balance After:</span>
                    <span className="font-black text-gray-900">
                      {balance - selectedReward.cost_credits} credits
                    </span>
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs text-red-600 text-center font-medium">{errorMsg}</p>
                )}

                <div className="flex space-x-2 pt-1">
                  <button
                    onClick={() => setSelectedReward(null)}
                    disabled={isRedeeming}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmRedeem}
                    disabled={isRedeeming}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs"
                  >
                    {isRedeeming ? 'Redeeming...' : 'Confirm'}
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <Check className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">Redemption Successful!</h3>
                  <p className="text-xs text-gray-500 mt-1">Here is your unique redemption voucher code:</p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                  <span className="font-mono font-black text-lg text-emerald-800 tracking-wider">
                    {issuedCode}
                  </span>
                  <button
                    onClick={() => copyToClipboard(issuedCode)}
                    className="block mx-auto text-xs font-bold text-emerald-700 underline"
                  >
                    {copiedCode === issuedCode ? 'Copied to clipboard!' : 'Copy Voucher Code'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedReward(null);
                    setIssuedCode(null);
                    setActiveTab('vouchers');
                  }}
                  className="w-full py-3 rounded-xl bg-gray-900 text-white text-xs font-bold"
                >
                  View My Vouchers
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
