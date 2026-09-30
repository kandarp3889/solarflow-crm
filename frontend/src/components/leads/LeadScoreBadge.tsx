import React from 'react';
import { Flame, Sun, Snowflake } from 'lucide-react';
import { ScoreCategory } from '../../types';

interface LeadScoreBadgeProps {
  score: number;
  category: ScoreCategory;
}

export const LeadScoreBadge: React.FC<LeadScoreBadgeProps> = ({ score, category }) => {
  if (category === 'hot') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gradient-to-r from-red-500/20 to-orange-500/20 text-orange-400 border border-orange-500/30">
        <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
        <span>{score} • HOT</span>
      </span>
    );
  }

  if (category === 'warm') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
        <Sun className="w-3.5 h-3.5 text-amber-400" />
        <span>{score} • WARM</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700/30 text-slate-400 border border-slate-700">
      <Snowflake className="w-3.5 h-3.5 text-slate-400" />
      <span>{score} • COLD</span>
    </span>
  );
};
