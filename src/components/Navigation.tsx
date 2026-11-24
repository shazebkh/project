import React from 'react';
import { Home, Calendar, Gift, AlertTriangle, BookOpen, MapPin, HeartHandshake } from 'lucide-react';

export type TabType = 'home' | 'timeline' | 'rewards' | 'report' | 'tips' | 'bins' | 'wildlife';

interface NavigationProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onOpenDispose: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onSelectTab,
  onOpenDispose,
}) => {
  const tabs = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'bins', label: 'Bins <3km', icon: MapPin },
    { id: 'wildlife', label: 'Wildlife', icon: HeartHandshake },
    { id: 'timeline', label: 'Timeline', icon: Calendar },
    { id: 'report', label: 'Report', icon: AlertTriangle },
    { id: 'rewards', label: 'Rewards', icon: Gift },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-lg pb-safe">
      <div className="max-w-md mx-auto px-2 py-1.5 flex items-center justify-between">
        {tabs.slice(0, 3).map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as TabType)}
              className={`flex-1 py-1 flex flex-col items-center transition-colors ${
                active ? 'text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}

        {/* Center Floating Dispose Action */}
        <div className="relative -top-3 px-1">
          <button
            onClick={onOpenDispose}
            className="w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 hover:scale-105 active:scale-95 transition-all border-4 border-white"
            title="Snap & Dispose"
          >
            <span className="text-xl font-black">📸</span>
          </button>
        </div>

        {tabs.slice(3).map((tab) => {
          const Icon = tab.icon;
          const active = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as TabType)}
              className={`flex-1 py-1 flex flex-col items-center transition-colors ${
                active ? 'text-emerald-700 font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
