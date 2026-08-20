'use client';

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  badge?: {
    text: string;
    type: 'critical' | 'warning' | 'success' | 'info';
  };
  icon: LucideIcon;
  variant?: 'rose' | 'amber' | 'emerald' | 'indigo';
}

export function MetricCard({
  title,
  value,
  subtitle,
  badge,
  icon: Icon,
  variant = 'indigo',
}: MetricCardProps) {
  const colorStyles = {
    rose: {
      border: 'border-rose-500/30 hover:border-rose-500/50',
      bg: 'bg-gradient-to-b from-rose-950/20 to-slate-900/90',
      iconBg: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
      glow: 'shadow-rose-950/30',
      valColor: 'text-rose-400',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      bg: 'bg-gradient-to-b from-amber-950/20 to-slate-900/90',
      iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
      glow: 'shadow-amber-950/30',
      valColor: 'text-amber-400',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      bg: 'bg-gradient-to-b from-emerald-950/20 to-slate-900/90',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
      glow: 'shadow-emerald-950/30',
      valColor: 'text-emerald-400',
    },
    indigo: {
      border: 'border-indigo-500/30 hover:border-indigo-500/50',
      bg: 'bg-gradient-to-b from-indigo-950/20 to-slate-900/90',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
      glow: 'shadow-indigo-950/30',
      valColor: 'text-white',
    },
  }[variant];

  const badgeStyles = {
    critical: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    info: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  };

  return (
    <div
      className={`relative p-5 rounded-xl border ${colorStyles.border} ${colorStyles.bg} shadow-lg ${colorStyles.glow} transition-all duration-300 flex flex-col justify-between overflow-hidden group`}
    >
      {/* Subtle background glow circle */}
      <div className="absolute -right-8 -top-8 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform duration-500" />

      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
            {title}
          </span>
          <div className={`p-2 rounded-lg border ${colorStyles.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>

        <div className="space-y-1">
          <div className={`text-2xl lg:text-3xl font-extrabold tracking-tight font-mono ${colorStyles.valColor}`}>
            {value}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-400 line-clamp-1">{subtitle}</p>
          )}
        </div>
      </div>

      {badge && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${badgeStyles[badge.type]}`}
          >
            {badge.text}
          </span>
        </div>
      )}
    </div>
  );
}
