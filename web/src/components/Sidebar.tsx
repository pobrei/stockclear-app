'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Zap,
  Radio,
  Store,
  Boxes,
  Layers,
  ArrowUpRight,
  TrendingDown,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  onSync?: () => void;
  isSyncing?: boolean;
}

export function Sidebar({ onSync, isSyncing }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: 'Intelligence Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      name: 'Clearance Playbooks',
      href: '/playbooks',
      icon: Zap,
      badge: 'AI Active',
    },
    {
      name: 'Omnichannel Sync',
      href: '/integrations',
      icon: Radio,
      badge: '3 Live',
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0c1220] border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0">
      <div>
        {/* Logo & Brand */}
        <div className="p-6 border-b border-slate-800/80">
          <Link href="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-rose-500 to-amber-400 p-[1.5px] shadow-lg shadow-rose-950/40">
              <div className="w-full h-full bg-[#0c1220] rounded-[10px] flex items-center justify-center">
                <Boxes className="w-5 h-5 text-rose-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white font-mono">
                  Stock<span className="text-rose-500">Clear</span>
                </span>
                <span className="px-1.5 py-0.5 text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded">
                  v1.0
                </span>
              </div>
              <p className="text-[11px] text-slate-400 tracking-wide font-medium">
                Dead-Stock Intelligence SaaS
              </p>
            </div>
          </Link>
        </div>

        {/* Merchant Workspace Info */}
        <div className="px-4 py-3 m-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded-md bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-xs">
              SG
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">Stockholm Goods Co.</p>
              <p className="text-[10px] text-slate-400 font-mono">Boutique Plan</p>
            </div>
          </div>
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/80"></span>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
            Navigation
          </div>
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href === '/dashboard' && pathname === '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-rose-500/10 text-white border border-rose-500/30 shadow-sm shadow-rose-950/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-850/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-rose-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`px-1.5 py-0.5 text-[10px] rounded-full font-mono font-medium ${
                      item.badge === 'AI Active'
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom status & Quick sync */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
        {onSync && (
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-medium text-xs shadow-md shadow-rose-950/40 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing Feeds...' : 'Sync Store Inventories'}</span>
          </button>
        )}

        <div className="p-2.5 rounded-md bg-slate-900/60 border border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Engine: Online</span>
          </div>
          <span className="font-mono text-[10px] text-slate-300">Port 8000</span>
        </div>
      </div>
    </aside>
  );
}
