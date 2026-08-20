'use client';

import React from 'react';
import { Download, RefreshCw, Radio, Sparkles, CheckCircle2 } from 'lucide-react';
import { getClearanceCsvDownloadUrl } from '../lib/api';

interface HeaderProps {
  title: string;
  subtitle: string;
  lastSynced?: string;
  onSync?: () => void;
  isSyncing?: boolean;
}

export function Header({
  title,
  subtitle,
  lastSynced,
  onSync,
  isSyncing,
}: HeaderProps) {
  const handleExport = () => {
    window.location.href = getClearanceCsvDownloadUrl();
  };

  return (
    <header className="px-8 py-5 border-b border-slate-800 bg-[#090d16]/90 backdrop-blur-md sticky top-0 z-20 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          {title}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      <div className="flex items-center flex-wrap gap-3">
        {/* Live sync pill */}
        <div className="hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-400 font-mono text-[11px]">Last Synced:</span>
          <span className="font-mono text-slate-200 text-[11px]">
            {lastSynced ? lastSynced.split(' ')[1] + ' UTC' : 'Live'}
          </span>
        </div>

        {/* Sync Trigger */}
        {onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
            title="Fetch latest stock movements and recalculate dead-stock metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync Feeds'}</span>
          </button>
        )}

        {/* Export Clearance CSV */}
        <button
          onClick={handleExport}
          className="flex items-center space-x-2 px-3.5 py-1.5 rounded-lg bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-semibold shadow-md shadow-rose-950/40 transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Export Clearance CSV</span>
        </button>
      </div>
    </header>
  );
}
