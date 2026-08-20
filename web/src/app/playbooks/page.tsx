'use client';

import React, { useState, useEffect } from 'react';
import {
  Zap,
  Tag,
  Package,
  Layers,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  Barcode,
  Printer,
  Download,
  Flame,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { BarcodeModal } from '../../components/BarcodeModal';
import {
  fetchPlaybooks,
  applyRecommendation,
  applyBulkRecommendations,
  syncMockData,
  getClearanceCsvDownloadUrl,
} from '../../lib/api';
import { PlaybookGroup, PlaybookItem, InventoryItem } from '../../types';

export default function PlaybooksPage() {
  const [playbooks, setPlaybooks] = useState<PlaybookGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState<InventoryItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPlaybooks();
      setPlaybooks(data);
    } catch (err) {
      console.error('Failed to load playbooks:', err);
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

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncMockData();
      await loadData();
      showToast('Synced latest inventory data and updated campaign recommendations.');
    } catch (err) {
      console.error('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApplySingle = async (recId: string, currentStatus: string) => {
    try {
      const nextStatus = currentStatus === 'applied' ? 'pending' : 'applied';
      await applyRecommendation(recId, nextStatus);
      await loadData();
      showToast(nextStatus === 'applied' ? 'Markdown campaign activated!' : 'Markdown reset.');
    } catch (err) {
      console.error('Failed to update recommendation:', err);
    }
  };

  const handleBatchApplyCampaign = async (group: PlaybookGroup) => {
    const pendingIds = group.items.filter((i) => i.status === 'pending').map((i) => i.recommendation_id);
    if (pendingIds.length === 0) {
      showToast('All items in this campaign are already applied.');
      return;
    }

    try {
      await applyBulkRecommendations(pendingIds, 'applied');
      await loadData();
      showToast(`Batch activated ${pendingIds.length} markdown items for ${group.strategy_name}!`);
    } catch (err) {
      console.error('Batch apply failed:', err);
    }
  };

  // Convert PlaybookItem to InventoryItem for the BarcodeModal
  const openBarcode = (item: PlaybookItem) => {
    const mockInvItem: InventoryItem = {
      id: item.item_id,
      merchant_id: '',
      sku: item.sku,
      barcode: item.barcode,
      title: item.title,
      category: item.category,
      supplier: item.supplier,
      cost_price: item.cost_price,
      retail_price: item.retail_price,
      current_stock: item.current_stock,
      channel: 'pos',
      gross_margin: (item.retail_price - item.cost_price) / item.retail_price,
      daily_velocity: 0,
      units_sold_30d: 0,
      units_sold_60d: 0,
      days_of_supply: item.days_of_supply,
      sell_through_rate: 0,
      dead_stock_status: 'critical_dead',
      trapped_capital: item.trapped_capital,
      active_recommendation: {
        id: item.recommendation_id,
        suggested_discount_pct: item.suggested_discount_pct,
        liquidation_strategy: item.liquidation_strategy,
        projected_cash_recovery: item.projected_cash_recovery,
        status: item.status as any,
      },
    };
    setSelectedBarcodeItem(mockInvItem);
  };

  // Overall aggregates
  const totalRecovery = playbooks.reduce((acc, g) => acc + g.total_projected_cash_recovery, 0);
  const totalEligible = playbooks.reduce((acc, g) => acc + g.eligible_items_count, 0);
  const totalApplied = playbooks.reduce((acc, g) => acc + g.applied_items_count, 0);

  return (
    <div className="flex w-full min-h-screen bg-[#090d16] text-slate-100">
      <Sidebar onSync={handleSync} isSyncing={isSyncing} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Liquidation Playbooks & Campaigns"
          subtitle="AI-driven clearance pricing strategies tailored to item gross margins and sell-through velocity."
          onSync={handleSync}
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
          {/* Recovery Hero Banner */}
          <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/60 via-slate-900/90 to-rose-950/60 border border-indigo-500/30 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <span className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  <Zap className="w-5 h-5" />
                </span>
                <span className="text-xs uppercase font-mono font-bold tracking-wider text-indigo-400">
                  Total Projected Capital Recovery
                </span>
              </div>
              <div className="text-3xl lg:text-4xl font-extrabold text-white font-mono tracking-tight">
                €{totalRecovery.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-slate-300 max-w-xl">
                Calculated across <strong>{totalEligible} stagnant items</strong>. Markdown campaigns protect margins while accelerating sell-through velocity to clear warehouse footprint.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
              <div className="text-center px-3">
                <div className="text-2xl font-bold font-mono text-white">{totalEligible}</div>
                <div className="text-[11px] text-slate-400">Eligible SKUs</div>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="text-center px-3">
                <div className="text-2xl font-bold font-mono text-emerald-400">{totalApplied}</div>
                <div className="text-[11px] text-slate-400">Active / Applied</div>
              </div>
              <div className="h-8 w-[1px] bg-slate-800" />
              <div className="text-center px-3">
                <div className="text-2xl font-bold font-mono text-amber-400">
                  {totalEligible - totalApplied}
                </div>
                <div className="text-[11px] text-slate-400">Pending Review</div>
              </div>
            </div>
          </div>

          {/* Kanban / Cards of Campaigns */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {playbooks.map((group) => {
              const isFlash = group.strategy_type === 'flash_sale';
              const isBogo = group.strategy_type === 'bundle_bogo';
              const isPos = group.strategy_type === 'pos_markdown';

              const cardBorder = isFlash
                ? 'border-rose-500/40 hover:border-rose-500/60'
                : isBogo
                ? 'border-indigo-500/40 hover:border-indigo-500/60'
                : 'border-amber-500/40 hover:border-amber-500/60';

              const badgeColor = isFlash
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                : isBogo
                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

              return (
                <div
                  key={group.strategy_name}
                  className={`p-6 rounded-2xl bg-[#0f172a] border ${cardBorder} shadow-2xl flex flex-col justify-between space-y-6 transition-all`}
                >
                  {/* Campaign Header */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold uppercase border ${badgeColor}`}
                      >
                        {group.discount_pct}% Discount Rate
                      </span>
                      <span className="text-xs font-mono text-slate-400">
                        {group.eligible_items_count} SKUs
                      </span>
                    </div>

                    <div>
                      <h3 className="text-lg font-bold text-white tracking-tight">
                        {group.strategy_name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {group.description}
                      </p>
                    </div>

                    {/* Financial Metric */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">
                          Projected Cash Recovery
                        </span>
                        <span className="text-lg font-black text-emerald-400 font-mono">
                          €{group.total_projected_cash_recovery.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-slate-400 block">
                          Campaign Progress
                        </span>
                        <span className="text-xs font-bold text-slate-200 font-mono">
                          {group.applied_items_count} / {group.eligible_items_count} Applied
                        </span>
                      </div>
                    </div>

                    {/* Batch Action */}
                    <button
                      onClick={() => handleBatchApplyCampaign(group)}
                      disabled={group.pending_items_count === 0}
                      className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-md shadow-indigo-950/40 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>
                        {group.pending_items_count > 0
                          ? `Activate All (${group.pending_items_count} Pending)`
                          : '✓ All Applied'}
                      </span>
                    </button>
                  </div>

                  {/* Items List in this Campaign */}
                  <div className="space-y-2 border-t border-slate-800 pt-4 max-h-[380px] overflow-y-auto pr-1">
                    <div className="text-[11px] font-bold uppercase font-mono text-slate-400 mb-2">
                      Eligible Inventory Items
                    </div>

                    {group.items.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-500">
                        No items currently routed to this strategy.
                      </div>
                    ) : (
                      group.items.map((item) => (
                        <div
                          key={item.item_id}
                          className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors flex items-center justify-between gap-3 text-xs"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-slate-200 truncate">{item.title}</div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span className="text-indigo-400">{item.sku}</span>
                              <span>•</span>
                              <span>{item.current_stock} in stock</span>
                              <span>•</span>
                              <span className="line-through text-slate-500">€{item.retail_price.toFixed(0)}</span>
                              <span className="text-emerald-400 font-bold">€{item.discounted_price.toFixed(2)}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5 flex-shrink-0">
                            <button
                              onClick={() => handleApplySingle(item.recommendation_id, item.status)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer ${
                                item.status === 'applied'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                              }`}
                            >
                              {item.status === 'applied' ? '✓' : 'Apply'}
                            </button>

                            <button
                              onClick={() => openBarcode(item)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                              title="Print Barcode Tag"
                            >
                              <Barcode className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      </div>

      {selectedBarcodeItem && (
        <BarcodeModal
          item={selectedBarcodeItem}
          onClose={() => setSelectedBarcodeItem(null)}
        />
      )}
    </div>
  );
}
