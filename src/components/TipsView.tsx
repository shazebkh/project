import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Sparkles, CheckCircle2, HelpCircle, Award, Tag } from 'lucide-react';
import { Tip, TipCategory } from '../types';
import { api } from '../services/apiClient';

interface TipsViewProps {
  onRefresh: () => void;
}

export const TipsView: React.FC<TipsViewProps> = ({ onRefresh }) => {
  const [tips, setTips] = useState<Tip[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [showQuiz, setShowQuiz] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  useEffect(() => {
    loadTips();
  }, [selectedCategory]);

  const loadTips = async () => {
    try {
      const cat = selectedCategory === 'all' ? undefined : selectedCategory;
      const res = await api.getTips(cat);
      setTips(res.tips);
    } catch (err) {
      console.error(err);
    }
  };

  const categories = [
    { id: 'all', label: 'All Tips' },
    { id: 'segregation', label: 'Segregation' },
    { id: 'plastic', label: 'Plastic Reduction' },
    { id: 'composting', label: 'Composting' },
    { id: 'ewaste', label: 'E-Waste' },
    { id: 'hazardous', label: 'Hazardous' },
  ];

  const filteredTips = tips.filter((t) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || t.body_md.toLowerCase().includes(q);
  });

  const handleQuizSubmit = () => {
    if (selectedAnswer === 1) {
      setQuizScore(3);
      onRefresh();
    } else {
      setQuizScore(0);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-lg mx-auto">
      {/* 1. Header Banner */}
      <div className="rounded-3xl bg-gradient-to-br from-teal-700 to-emerald-800 text-white p-5 shadow-xl">
        <div className="flex items-center space-x-2 mb-2">
          <BookOpen className="w-5 h-5 text-teal-300" />
          <span className="text-[10px] uppercase font-bold text-teal-200">Knowledge Hub</span>
        </div>
        <h3 className="text-xl font-black">Waste Management Guide</h3>
        <p className="text-xs text-teal-100 mt-1 leading-relaxed">
          Learn expert segregation rules, backyard composting methods, and battery safety.
        </p>

        {/* Quiz Banner */}
        <div className="mt-4 p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="text-xs font-semibold">Daily Waste Quiz</span>
          </div>
          <button
            onClick={() => setShowQuiz(true)}
            className="py-1 px-3 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs hover:bg-amber-300 transition-colors"
          >
            Play (+3 credits)
          </button>
        </div>
      </div>

      {/* 2. Interactive Quiz Modal */}
      {showQuiz && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
                Daily Quiz (+3 credits)
              </span>
              <button
                onClick={() => {
                  setShowQuiz(false);
                  setQuizScore(null);
                  setSelectedAnswer(null);
                }}
                className="text-gray-400 hover:text-gray-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {quizScore === null ? (
              <div className="space-y-3 text-xs">
                <p className="font-bold text-gray-900 text-sm">
                  Which bin should greasy pizza cardboard with melted cheese go into?
                </p>
                <div className="space-y-2">
                  {[
                    'Clean Dry Paper Recycling',
                    'Wet Compost / Organics (or General Waste)',
                    'Plastic Recycling Bin',
                  ].map((option, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedAnswer(idx)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        selectedAnswer === idx
                          ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                          : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleQuizSubmit}
                  disabled={selectedAnswer === null}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold disabled:opacity-50"
                >
                  Submit Answer
                </button>
              </div>
            ) : (
              <div className="text-center space-y-3 py-2">
                {quizScore > 0 ? (
                  <>
                    <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                    <h4 className="font-black text-lg text-emerald-900">Correct!</h4>
                    <p className="text-xs text-gray-600">
                      Food grease ruins paper recycling batches. Greasy cardboard belongs in organics or wet compost!
                    </p>
                    <span className="inline-block py-1 px-3 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                      +3 Credits Awarded
                    </span>
                  </>
                ) : (
                  <>
                    <HelpCircle className="w-12 h-12 text-amber-500 mx-auto" />
                    <h4 className="font-bold text-base text-gray-900">Almost!</h4>
                    <p className="text-xs text-gray-600">
                      Grease and cheese contaminate paper pulping machines. Next time, tear off the clean lid for recycling and compost the greasy base!
                    </p>
                  </>
                )}
                <button
                  onClick={() => {
                    setShowQuiz(false);
                    setQuizScore(null);
                    setSelectedAnswer(null);
                  }}
                  className="w-full py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Search and Category Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recycling tips, battery disposal..."
            className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs focus:ring-2 focus:ring-teal-500/20 focus:outline-hidden"
          />
        </div>

        <div className="flex space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedCategory === c.id
                  ? 'bg-teal-700 text-white shadow-xs'
                  : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Tips Card List */}
      <div className="space-y-3">
        {filteredTips.map((tip) => (
          <div
            key={tip.id}
            className="rounded-2xl bg-white border border-gray-100 p-4 shadow-xs space-y-2 hover:border-teal-200 transition-all"
          >
            <div className="flex items-center space-x-1.5">
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-teal-50 text-teal-700 border border-teal-100">
                {tip.category}
              </span>
            </div>
            <h4 className="font-bold text-sm text-gray-900">{tip.title}</h4>
            <p className="text-xs text-gray-600 leading-relaxed">{tip.body_md}</p>

            {tip.tags && tip.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {tip.tags.map((t: string, i: number) => (
                  <span
                    key={i}
                    className="text-[9px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-400 font-medium"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
