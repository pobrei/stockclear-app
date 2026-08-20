'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign,
  AlertTriangle,
  Clock,
  Flame,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Barcode,
  CheckCircle,
  Tag,
  Store,
  Layers,
  ChevronDown,
  Sparkles,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { Sidebar } from '../../components/Sidebar';
import { Header } from '../../components/Header';
import { MetricCard } from '../../components/MetricCard';
import { BarcodeModal } from '../../components/BarcodeModal';
import {
  fetchOverview,
  fetchInventory,
  applyRecommendation,
  applyBulkRecommendations,
  syncMockData,
  getClearanceCsvDownloadUrl,
} from '../../lib/api';
import { OverviewMetrics, InventoryItem } from '../../types';

export default function DashboardPage() {
  const [overview, setOverview] = useState<OverviewMetrics | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedBarcodeItem, setSelectedBarcodeItem] = useState<InventoryItem | null>(null);

  // Filters & Sorting state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('trapped_capital');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

  // Load initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [overviewData, inventoryData] = await Promise.all([
        fetchOverview(),
        fetchInventory(),
      ]);
      setOverview(overviewData);
      setInventory(inventoryData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Show transient toast
  const showToast = (message: string, type: 'success' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Sync handler
  const handleSync = async () => {
    try {
      setIsSyncing(true);
      const res = await syncMockData();
      await loadData();
      showToast(`Omnichannel Sync Complete: ${res.synced_items_count} SKUs updated across Shopify & POS!`, 'success');
    } catch (err) {
      console.error('Sync failed:', err);
      showToast('Sync failed. Please check backend connection.', 'info');
    } finally {
      setIsSyncing(false);
    }
  };

  // Apply single recommendation
  const handleApplyRecommendation = async (recId: string, currentStatus?: string) => {
    try {
      const nextStatus = currentStatus === 'applied' ? 'pending' : 'applied';
      await applyRecommendation(recId, nextStatus);
      await loadData();
      showToast(
        nextStatus === 'applied'
          ? 'Clearance markdown campaign applied to POS & Online channels!'
          : 'Markdown status reset to pending.',
        'success'
      );
    } catch (err) {
      console.error('Failed to update recommendation:', err);
    }
  };

  // Apply bulk recommendations
  const handleBulkApply = async () => {
    if (selectedIds.length === 0) return;
    try {
      const recIdsToApply = inventory
        .filter((item) => selectedIds.includes(item.id) && item.active_recommendation)
        .map((item) => item.active_recommendation!.id);

      if (recIdsToApply.length === 0) {
        showToast('No pending clearance strategies found for selected items.', 'info');
        return;
      }

      await applyBulkRecommendations(recIdsToApply, 'applied');
      setSelectedIds([]);
      await loadData();
      showToast(`Applied markdown campaigns to ${recIdsToApply.length} selected items!`, 'success');
    } catch (err) {
      console.error('Bulk apply failed:', err);
    }
  };

  // Filtered & Sorted inventory items
  const filteredItems = useMemo(() => {
    return inventory
      .filter((item) => {
        if (statusFilter !== 'all' && item.dead_stock_status !== statusFilter) return false;
        if (categoryFilter !== 'all' && item.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
        if (channelFilter !== 'all' && item.channel !== channelFilter && item.channel !== 'both') return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          return (
            item.title.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q) ||
            item.barcode.includes(q) ||
            item.supplier.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy as keyof InventoryItem];
        let valB: any = b[sortBy as keyof InventoryItem];

        if (typeof valA === 'string') {
          return sortOrder === 'desc'
            ? (valB || '').localeCompare(valA || '')
            : (valA || '').localeCompare(valB || '');
        }

        return sortOrder === 'desc' ? (valB || 0) - (valA || 0) : (valA || 0) - (valB || 0);
      });
  }, [inventory, statusFilter, categoryFilter, channelFilter, searchQuery, sortBy, sortOrder]);

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredItems.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredItems.map((i) => i.id));
    }
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSort = (columnKey: string) => {
    if (sortBy === columnKey) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(columnKey);
      setSortOrder('desc');
    }
  };

  // Chart data colors
  const PIE_COLORS = ['#f43f5e', '#f59e0b', '#6366f1', '#10b981', '#a855f7'];

  return (
    <div className="flex w-full min-h-screen bg-[#090d16] text-slate-100">
      {/* Sidebar */}
      <Sidebar onSync={handleSync} isSyncing={isSyncing} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          title="Dead-Stock Intelligence Dashboard"
          subtitle="Real-time sell-through velocity analytics, trapped capital detection, and clearance automation."
          lastSynced={overview?.last_sync_timestamp}
          onSync={handleSync}
          isSyncing={isSyncing}
        />

        {/* Transient Notification Toast */}
        {notification && (
          <div className="mx-8 mt-4 p-3 rounded-lg bg-indigo-950/80 border border-indigo-500/40 text-indigo-200 text-xs flex items-center justify-between shadow-lg shadow-indigo-950/50 animate-in slide-in-from-top duration-200">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>{notification.message}</span>
            </div>
            <button
              onClick={() => setNotification(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        <main className="p-8 space-y-8 max-w-7xl mx-auto w-full">
          {/* Top Urgency Dead-Stock Banner */}
          {overview && overview.trapped_dead_stock_capital > 0 && (
            <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-r from-rose-950/60 via-slate-900/90 to-indigo-950/60 border border-rose-500/40 shadow-xl shadow-rose-950/30 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-radar">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-extrabold text-base text-white tracking-tight">
                      €{overview.trapped_dead_stock_capital.toLocaleString('en-US', { minimumFractionDigits: 2 })} Working Capital Stagnant
                    </h3>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      {overview.trapped_capital_pct}% of total stock
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                    <strong>{overview.high_risk_skus_count} SKUs</strong> have stagnated with zero velocity for {'>'}60-90 days. Executing recommended clearance playbooks can unlock an estimated <strong className="text-emerald-400">€{overview.projected_total_cash_recovery.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> in cash recovery.
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3 flex-shrink-0">
                <a
                  href="/playbooks"
                  className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 rounded-lg shadow-md shadow-rose-950/50 flex items-center space-x-1.5 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Review AI Playbooks</span>
                </a>
              </div>
            </div>
          )}

          {/* 4 Metric Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <MetricCard
              title="Total Inventory Value"
              value={`€${(overview?.total_inventory_value || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              subtitle="Current retail value across 100 SKUs"
              icon={DollarSign}
              variant="indigo"
              badge={{
                text: `${overview?.total_skus || 0} Monitored SKUs`,
                type: 'info',
              }}
            />

            <MetricCard
              title="Trapped Dead-Stock"
              value={`€${(overview?.trapped_dead_stock_capital || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
              subtitle={`${overview?.trapped_capital_pct || 0}% of invested inventory capital`}
              icon={Flame}
              variant="rose"
              badge={{
                text: `${overview?.high_risk_skus_count || 0} Critical SKUs`,
                type: 'critical',
              }}
            />

            <MetricCard
              title="Avg Days of Supply"
              value={`${overview?.average_days_of_supply || 0}d`}
              subtitle="Target healthy benchmark: <45 days"
              icon={Clock}
              variant={overview && overview.average_days_of_supply > 60 ? 'amber' : 'emerald'}
              badge={{
                text: overview && overview.average_days_of_supply > 60 ? 'Excess Stagnation' : 'Within Target',
                type: overview && overview.average_days_of_supply > 60 ? 'warning' : 'success',
              }}
            />

            <MetricCard
              title="High-Risk SKUs"
              value={`${overview?.high_risk_skus_count || 0}`}
              subtitle={`${overview?.slow_skus_count || 0} slow movers / ${overview?.healthy_skus_count || 0} healthy`}
              icon={AlertTriangle}
              variant="rose"
              badge={{
                text: `Action Required`,
                type: 'critical',
              }}
            />
          </div>

          {/* Analytics Heatmaps & Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Trapped Capital by Category */}
            <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-white tracking-wide">
                    Trapped Capital by Category (€)
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">
                    Dead vs Total Retail Value
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-6">
                  Identifies retail departments with the largest volume of stagnant cash flow.
                </p>
              </div>

              <div className="h-64 w-full">
                {overview && overview.category_breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={overview.category_breakdown}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="category"
                        stroke="#64748b"
                        fontSize={12}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        tickFormatter={(v) => `€${(v / 1000).toFixed(0)}k`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`€${Number(value).toLocaleString()}`, '']}
                      />
                      <Bar
                        dataKey="trapped_capital"
                        name="Trapped Dead Capital"
                        fill="#f43f5e"
                        radius={[4, 4, 0, 0]}
                      />
                      <Bar
                        dataKey="total_value"
                        name="Total Department Value"
                        fill="#334155"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Loading analytics data...
                  </div>
                )}
              </div>
            </div>

            {/* Chart 2: Trapped Capital by Supplier Risk */}
            <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold text-sm text-white tracking-wide">
                    Supplier Dead-Stock Risk
                  </h3>
                  <span className="text-[11px] font-mono text-slate-400">Share %</span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Suppliers driving highest stagnant capital accumulation.
                </p>
              </div>

              <div className="h-56 w-full">
                {overview && overview.supplier_breakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={overview.supplier_breakdown}
                        dataKey="trapped_capital"
                        nameKey="supplier"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {overview.supplier_breakdown.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#090d16',
                          borderColor: '#334155',
                          borderRadius: '8px',
                          color: '#f8fafc',
                          fontSize: '12px',
                        }}
                        formatter={(value: any) => [`€${Number(value).toLocaleString()}`, 'Trapped Capital']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-500">
                    Loading chart...
                  </div>
                )}
              </div>

              {/* Supplier Legend List */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                {overview?.supplier_breakdown.slice(0, 3).map((sup, idx) => (
                  <div key={sup.supplier} className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                      ></span>
                      <span className="text-slate-300 font-medium truncate max-w-[120px]">
                        {sup.supplier}
                      </span>
                    </div>
                    <span className="font-mono text-rose-400 font-semibold text-[11px]">
                      €{sup.trapped_capital.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Interactive Inventory Table Section */}
          <div className="p-6 rounded-2xl bg-[#0f172a] border border-slate-800 shadow-2xl space-y-6">
            {/* Header & Status Tabs */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Store Inventory Intelligence</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                    {filteredItems.length} of {inventory.length} items
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Filter by velocity health, sort by trapped working capital, and trigger liquidation workflows.
                </p>
              </div>

              {/* Status Tabs */}
              <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 overflow-x-auto">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({overview?.total_skus || 0})
                </button>
                <button
                  onClick={() => setStatusFilter('critical_dead')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === 'critical_dead'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm'
                      : 'text-rose-400 hover:text-rose-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span>Critical Dead ({overview?.high_risk_skus_count || 0})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('slow')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === 'slow'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : 'text-amber-400 hover:text-amber-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  <span>Slow Moving ({overview?.slow_skus_count || 0})</span>
                </button>
                <button
                  onClick={() => setStatusFilter('healthy')}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    statusFilter === 'healthy'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span>Healthy ({overview?.healthy_skus_count || 0})</span>
                </button>
              </div>
            </div>

            {/* Filter Bar & Search */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search title, SKU, barcode, supplier..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">All Categories</option>
                  <option value="Footwear">Footwear</option>
                  <option value="Apparel">Apparel</option>
                  <option value="Hardware">Hardware / Accessories</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Channel Filter */}
              <div className="relative">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
                >
                  <option value="all">All Sales Channels</option>
                  <option value="pos">In-Store POS Only</option>
                  <option value="online">Shopify Online Only</option>
                  <option value="both">Omnichannel (Both)</option>
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 absolute right-3 top-2.5 pointer-events-none" />
              </div>

              {/* Action Bar (Bulk Apply & Export) */}
              <div className="flex items-center space-x-2">
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBulkApply}
                    className="flex-1 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow-md shadow-indigo-950/40 transition-colors cursor-pointer"
                  >
                    Apply Markdown ({selectedIds.length})
                  </button>
                )}
                <a
                  href={getClearanceCsvDownloadUrl()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                  title="Download POS clearance CSV"
                >
                  <Download className="w-3.5 h-3.5 text-rose-400" />
                  <span>CSV</span>
                </a>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900/90 text-slate-400 font-mono uppercase text-[11px] border-b border-slate-800">
                  <tr>
                    <th className="p-3.5 w-8">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                        onChange={toggleSelectAll}
                        className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                      />
                    </th>
                    <th className="p-3.5 cursor-pointer" onClick={() => handleSort('sku')}>
                      <div className="flex items-center space-x-1">
                        <span>Product / SKU</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5 cursor-pointer" onClick={() => handleSort('current_stock')}>
                      <div className="flex items-center space-x-1">
                        <span>Stock</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer" onClick={() => handleSort('retail_price')}>
                      <div className="flex items-center space-x-1">
                        <span>Pricing & Margin</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer" onClick={() => handleSort('days_of_supply')}>
                      <div className="flex items-center space-x-1">
                        <span>Velocity / DoS</span>
                        <ArrowUpDown className="w-3 h-3 text-slate-500" />
                      </div>
                    </th>
                    <th className="p-3.5 cursor-pointer" onClick={() => handleSort('trapped_capital')}>
                      <div className="flex items-center space-x-1 text-rose-400">
                        <span>Trapped Capital</span>
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </th>
                    <th className="p-3.5">AI Clearance Strategy</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/30">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 text-xs">
                        No inventory items match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const isSelected = selectedIds.includes(item.id);
                      const rec = item.active_recommendation;

                      return (
                        <tr
                          key={item.id}
                          className={`hover:bg-slate-900/60 transition-colors ${
                            isSelected ? 'bg-indigo-950/20' : ''
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="p-3.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelectItem(item.id)}
                              className="rounded bg-slate-800 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer"
                            />
                          </td>

                          {/* Title & SKU */}
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-200">{item.title}</div>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-0.5">
                              <span className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 text-indigo-300">
                                {item.sku}
                              </span>
                              <span>•</span>
                              <span className="text-slate-400">{item.supplier}</span>
                            </div>
                          </td>

                          {/* Category & Channel */}
                          <td className="p-3.5">
                            <div className="text-slate-300">{item.category}</div>
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 text-[10px] uppercase font-mono rounded bg-slate-900 border border-slate-800 text-slate-400">
                              {item.channel}
                            </span>
                          </td>

                          {/* Stock Qty */}
                          <td className="p-3.5 font-mono text-slate-200">
                            <span className="font-bold">{item.current_stock}</span> units
                          </td>

                          {/* Pricing & Gross Margin */}
                          <td className="p-3.5 font-mono">
                            <div className="text-slate-200 font-semibold">
                              €{item.retail_price.toFixed(2)}
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Cost: €{item.cost_price.toFixed(2)} ({(item.gross_margin * 100).toFixed(0)}% GM)
                            </div>
                          </td>

                          {/* Velocity / Days of Supply */}
                          <td className="p-3.5">
                            <div className="flex items-center space-x-1.5">
                              {item.dead_stock_status === 'critical_dead' && (
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                              )}
                              {item.dead_stock_status === 'slow' && (
                                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                              )}
                              {item.dead_stock_status === 'healthy' && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                              )}
                              <span className="font-mono font-bold text-slate-200">
                                {item.days_of_supply >= 999 ? '999d+' : `${item.days_of_supply}d`}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              {item.units_sold_30d} sold / 30d ({item.units_sold_60d} in 60d)
                            </div>
                          </td>

                          {/* Trapped Capital */}
                          <td className="p-3.5 font-mono">
                            <div className="font-extrabold text-rose-400 text-sm">
                              €{item.trapped_capital.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </div>
                            <span
                              className={`inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold uppercase ${
                                item.dead_stock_status === 'critical_dead'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : item.dead_stock_status === 'slow'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {item.dead_stock_status.replace('_', ' ')}
                            </span>
                          </td>

                          {/* Recommendation */}
                          <td className="p-3.5">
                            {rec ? (
                              <div className="space-y-1">
                                <div className="font-semibold text-indigo-300 text-xs flex items-center space-x-1">
                                  <span>{rec.liquidation_strategy}</span>
                                </div>
                                <div className="text-[11px] text-emerald-400 font-mono">
                                  Recovers: +€{rec.projected_cash_recovery.toFixed(2)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Normal Velocity</span>
                            )}
                          </td>

                          {/* Action Buttons */}
                          <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                            {rec && (
                              <button
                                onClick={() => handleApplyRecommendation(rec.id, rec.status)}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                  rec.status === 'applied'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                                    : 'bg-indigo-600/90 hover:bg-indigo-500 text-white shadow-sm shadow-indigo-950/40'
                                }`}
                              >
                                {rec.status === 'applied' ? '✓ Applied' : 'Apply'}
                              </button>
                            )}

                            <button
                              onClick={() => setSelectedBarcodeItem(item)}
                              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors inline-flex items-center cursor-pointer"
                              title="Preview in-store printable barcode label"
                            >
                              <Barcode className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* Barcode / Shelf Tag Modal */}
      {selectedBarcodeItem && (
        <BarcodeModal
          item={selectedBarcodeItem}
          onClose={() => setSelectedBarcodeItem(null)}
        />
      )}
    </div>
  );
}
