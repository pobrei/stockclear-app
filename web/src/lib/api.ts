import { OverviewMetrics, InventoryItem, PlaybookGroup, IntegrationStatus } from '../types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function fetchOverview(): Promise<OverviewMetrics> {
  const res = await fetch(`${API_BASE}/overview`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch overview metrics: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchInventory(params?: {
  status?: string;
  category?: string;
  supplier?: string;
  channel?: string;
  search?: string;
  sort_by?: string;
  order?: string;
}): Promise<InventoryItem[]> {
  const query = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, val]) => {
      if (val && val !== 'all') {
        query.append(key, val);
      }
    });
  }
  const url = `${API_BASE}/inventory${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch inventory: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchPlaybooks(): Promise<PlaybookGroup[]> {
  const res = await fetch(`${API_BASE}/playbooks`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch playbooks: ${res.statusText}`);
  }
  return res.json();
}

export async function applyRecommendation(
  recommendationId: string,
  status: 'applied' | 'dismissed' | 'pending'
): Promise<{ success: boolean; id: string; status: string }> {
  const res = await fetch(`${API_BASE}/recommendations/${recommendationId}/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to apply recommendation: ${res.statusText}`);
  }
  return res.json();
}

export async function applyBulkRecommendations(
  recommendationIds: string[],
  status: 'applied' | 'dismissed' | 'pending'
): Promise<{ success: boolean; updated_count: number; status: string }> {
  const res = await fetch(`${API_BASE}/recommendations/apply-bulk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recommendation_ids: recommendationIds, status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to bulk apply recommendations: ${res.statusText}`);
  }
  return res.json();
}

export async function syncMockData(): Promise<{
  success: boolean;
  message: string;
  synced_items_count: number;
  trapped_capital: number;
  timestamp: string;
}> {
  const res = await fetch(`${API_BASE}/sync-mock`, {
    method: 'POST',
  });
  if (!res.ok) {
    throw new Error(`Failed to sync inventory: ${res.statusText}`);
  }
  return res.json();
}

export async function fetchIntegrations(): Promise<IntegrationStatus[]> {
  const res = await fetch(`${API_BASE}/integrations`, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch integrations: ${res.statusText}`);
  }
  return res.json();
}

export function getClearanceCsvDownloadUrl(): string {
  return `${API_BASE}/export/clearance-csv`;
}
