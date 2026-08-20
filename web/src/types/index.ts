export interface InventoryItem {
  id: string;
  merchant_id: string;
  sku: string;
  barcode: string;
  title: string;
  category: string;
  supplier: string;
  cost_price: number;
  retail_price: number;
  current_stock: number;
  channel: 'pos' | 'online' | 'both';
  last_sold_date?: string | null;
  gross_margin: number;
  daily_velocity: number;
  units_sold_30d: number;
  units_sold_60d: number;
  days_of_supply: number;
  sell_through_rate: number;
  dead_stock_status: 'healthy' | 'slow' | 'critical_dead';
  trapped_capital: number;
  active_recommendation?: {
    id: string;
    suggested_discount_pct: number;
    liquidation_strategy: string;
    projected_cash_recovery: number;
    status: 'pending' | 'applied' | 'dismissed';
  } | null;
}

export interface CategoryBreakdown {
  category: string;
  trapped_capital: number;
  total_value: number;
  items_count: number;
  critical_count: number;
}

export interface SupplierBreakdown {
  supplier: string;
  trapped_capital: number;
  total_value: number;
  items_count: number;
  risk_score: number;
}

export interface StatusDistribution {
  healthy: number;
  slow: number;
  critical_dead: number;
  total_skus: number;
}

export interface OverviewMetrics {
  total_inventory_value: number;
  trapped_dead_stock_capital: number;
  trapped_capital_pct: number;
  average_days_of_supply: number;
  high_risk_skus_count: number;
  slow_skus_count: number;
  healthy_skus_count: number;
  total_skus: number;
  projected_total_cash_recovery: number;
  category_breakdown: CategoryBreakdown[];
  supplier_breakdown: SupplierBreakdown[];
  status_distribution: StatusDistribution;
  last_sync_timestamp: string;
}

export interface PlaybookItem {
  recommendation_id: string;
  item_id: string;
  sku: string;
  barcode: string;
  title: string;
  category: string;
  supplier: string;
  current_stock: number;
  cost_price: number;
  retail_price: number;
  discounted_price: number;
  suggested_discount_pct: number;
  liquidation_strategy: string;
  projected_cash_recovery: number;
  status: 'pending' | 'applied' | 'dismissed';
  days_of_supply: number;
  trapped_capital: number;
}

export interface PlaybookGroup {
  strategy_name: string;
  strategy_type: 'flash_sale' | 'bundle_bogo' | 'pos_markdown';
  description: string;
  discount_pct: number;
  eligible_items_count: number;
  pending_items_count: number;
  applied_items_count: number;
  total_projected_cash_recovery: number;
  items: PlaybookItem[];
}

export interface IntegrationStatus {
  id: string;
  name: string;
  type: 'ecom' | 'pos';
  logo: string;
  status: 'connected' | 'sync_pending' | 'error';
  channel: string;
  last_synced: string;
  item_count: number;
  health: string;
}
