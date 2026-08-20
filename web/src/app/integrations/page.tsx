'use client';

import React, { useState, useEffect } from 'react';
import {
  Radio,
  Store,
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';

import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { fetchIntegrations, syncMockData } from '../../lib/api';
import { IntegrationStatus } from '../../types';

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchIntegrations();
      setIntegrations(data);
      if (data.length > 0) {
        setLastSyncTime(data[0].last_synced);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      const res = await syncMockData();
      setLastSyncTime(res.timestamp);
      await loadData();
      showToast(`Omnichannel Sync Complete: ${res.synced_items_count} items refreshed across Shopify, Square & Lightspeed!`);
    } catch (err) {
      console.error('Sync failed:', err);
      showToast('Sync request failed.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-[#090d16] text-slate-100">
      <Sidebar onSync={handleSyncNow} isSyncing={isSyncing} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Omnichannel Inventory Connectors"
          subtitle="Unified bidirectional inventory sync across e-commerce storefronts and physical point-of-sale systems."
          lastSynced={lastSyncTime}
          onSync={handleSyncNow}
          isSyncing={isSyncing}
        />

        {toastMessage && (
          <div className="mx-8 mt-4 p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between shadow-lg shadow-emerald-950/50">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{toastMessage}</span>
            </div>
            <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Sync Trigger Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 border border-slate-800 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-start space-x-4">
              <div className="p-3 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-bold text-white tracking-tight">
                    Real-Time Catalog Synchronization
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Active Webhooks
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  Fetches 30-day and 60-day sales order velocity from Shopify, pulls in-store barcode scans from Square & Lightspeed, and recalculates days-of-supply in milliseconds.
                </p>
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/50 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 flex-shrink-0 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Synchronizing All Channels...' : 'Sync Inventory Now'}</span>
            </button>
          </div>

          {/* Connected Channels Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Shopify */}
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <ShoppingBag className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Connected</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">Shopify Storefront</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Online sales channel & direct-to-consumer inventory sync.
                  </p>
                </div>

                <div className="space-y-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Channel:</span>
                    <span className="text-slate-200">Online Store</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Tracked SKUs:</span>
                    <span className="text-slate-200">100 Products</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Sync Protocol:</span>
                    <span className="text-indigo-400">GraphQL Webhooks</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Latency: ~42ms</span>
                <span className="text-emerald-400 font-medium">Healthy</span>
              </div>
            </div>

            {/* Square POS */}
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                    <Store className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Connected</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">Square POS (Flagship)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    In-store register terminal with automatic barcode scanner sync.
                  </p>
                </div>

                <div className="space-y-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Channel:</span>
                    <span className="text-slate-200">In-Store POS</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Tracked SKUs:</span>
                    <span className="text-slate-200">82 Products</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Sync Protocol:</span>
                    <span className="text-indigo-400">Square REST v2</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Latency: ~68ms</span>
                <span className="text-emerald-400 font-medium">Healthy</span>
              </div>
            </div>

            {/* Lightspeed POS */}
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 hover:border-indigo-500/50 transition-all shadow-xl flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Radio className="w-6 h-6" />
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Connected</span>
                  </span>
                </div>

                <div>
                  <h4 className="text-base font-bold text-white">Lightspeed Retail (Boutique #2)</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Secondary physical boutique location stock & clearance tags.
                  </p>
                </div>

                <div className="space-y-2 text-xs font-mono pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Channel:</span>
                    <span className="text-slate-200">In-Store POS</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Tracked SKUs:</span>
                    <span className="text-slate-200">64 Products</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Sync Protocol:</span>
                    <span className="text-indigo-400">Lightspeed API</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Latency: ~55ms</span>
                <span className="text-emerald-400 font-medium">Healthy</span>
              </div>
            </div>
          </div>

          {/* Sync Event History Log */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Omnichannel Sync Audit Trail</span>
            </h3>

            <div className="space-y-2 text-xs font-mono">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>[Shopify Webhook] Inventory level delta reconciled for 100 SKUs</span>
                </div>
                <span className="text-slate-400 text-[11px]">{lastSyncTime || 'Recent'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>[Square POS] Terminal barcode sales velocity refreshed (30-day window)</span>
                </div>
                <span className="text-slate-400 text-[11px]">{lastSyncTime || 'Recent'}</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-300">
                <div className="flex items-center space-x-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>[Analytics Engine] Dead-stock classification & markdown strategies evaluated</span>
                </div>
                <span className="text-slate-400 text-[11px]">{lastSyncTime || 'Recent'}</span>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
