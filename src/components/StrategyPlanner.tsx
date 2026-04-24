
import React from 'react';
import { Target, TrendingUp, ShieldCheck, Zap } from 'lucide-react';

interface StrategyProps {
  rank: number;
  category: string;
}

export const StrategyPlanner: React.FC<StrategyProps> = ({ rank }) => {
  // Mock logic for strategy
  const getProbabilityScore = () => {
    if (rank < 500) return 95;
    if (rank < 5000) return 80;
    if (rank < 15000) return 60;
    return 40;
  };

  const score = getProbabilityScore();

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Admission Strategy</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">AI-Powered Forecasting</p>
        </div>
        <div className="h-16 w-16 rounded-full border-4 border-slate-100 flex items-center justify-center relative">
           <svg className="absolute inset-0 transform -rotate-90">
             <circle
               cx="32"
               cy="32"
               r="28"
               stroke="currentColor"
               strokeWidth="4"
               fill="transparent"
               className="text-blue-600"
               style={{ strokeDasharray: 176, strokeDashoffset: 176 - (176 * score) / 100 }}
             />
           </svg>
           <span className="text-sm font-bold text-blue-700">{score}%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <ShieldCheck className="text-green-600 mb-2" size={18} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Safe Zone</p>
          <p className="text-xs font-bold text-slate-800 mt-1">Rank {'>'} {rank + 5000}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
          <Target className="text-blue-600 mb-2" size={18} />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Target Zone</p>
          <p className="text-xs font-bold text-slate-800 mt-1">+/- 2k Sensitivity</p>
        </div>
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Zap size={12} className="text-orange-500" /> Professional Insight
        </h4>
        <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50/50 p-4 rounded-lg border border-slate-100 italic">
          "Your current percentile suggests high competitive pressure in Round 1. We recommend prioritizing State Quota betterment over semi-government institutions."
        </p>
      </div>

      <button className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded text-[10px] uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 group">
        Download Priority List <TrendingUp size={14} className="group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
