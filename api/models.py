from datetime import datetime
from typing import Optional, List
import uuid
from sqlmodel import SQLModel, Field, Relationship


class Merchant(SQLModel, table=True):
    __tablename__ = "merchants"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    name: str
    email: str
    plan_tier: str = Field(default="boutique")  # trial, boutique, pro
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    items: List["InventoryItem"] = Relationship(back_populates="merchant")


class InventoryItem(SQLModel, table=True):
    __tablename__ = "inventory_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    merchant_id: str = Field(foreign_key="merchants.id", index=True)
    sku: str = Field(index=True)
    barcode: str = Field(index=True)
    title: str
    category: str = Field(index=True)  # Footwear, Apparel, Hardware/Accessories
    supplier: str = Field(index=True)
    cost_price: float
    retail_price: float
    current_stock: int
    channel: str = Field(default="both")  # pos, online, both
    last_sold_date: Optional[datetime] = None

    # Relationships
    merchant: Optional[Merchant] = Relationship(back_populates="items")
    velocity: Optional["SalesVelocity"] = Relationship(
        back_populates="item",
        sa_relationship_kwargs={"cascade": "all, delete-orphan", "uselist": False}
    )
    recommendations: List["MarkdownRecommendation"] = Relationship(
        back_populates="item",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"}
    )


class SalesVelocity(SQLModel, table=True):
    __tablename__ = "sales_velocity"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    item_id: str = Field(foreign_key="inventory_items.id", unique=True, index=True)
    units_sold_30d: int = Field(default=0)
    units_sold_60d: int = Field(default=0)
    days_of_supply: float = Field(default=0.0)
    sell_through_rate: float = Field(default=0.0)
    dead_stock_status: str = Field(default="healthy", index=True)  # healthy, slow, critical_dead
    trapped_capital: float = Field(default=0.0)

    # Relationship
    item: Optional[InventoryItem] = Relationship(back_populates="velocity")


class MarkdownRecommendation(SQLModel, table=True):
    __tablename__ = "markdown_recommendations"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    item_id: str = Field(foreign_key="inventory_items.id", index=True)
    suggested_discount_pct: int = Field(default=0)
    liquidation_strategy: str  # Flash Sale - 35% Off, Bundle Promo / BOGO 50%, 15% In-Store POS Markdown
    projected_cash_recovery: float = Field(default=0.0)
    status: str = Field(default="pending", index=True)  # pending, applied, dismissed
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationship
    item: Optional[InventoryItem] = Relationship(back_populates="recommendations")


# Non-table schemas for API serialization
class InventoryItemResponse(SQLModel):
    id: str
    merchant_id: str
    sku: str
    barcode: str
    title: str
    category: str
    supplier: str
    cost_price: float
    retail_price: float
    current_stock: int
    channel: str
    last_sold_date: Optional[datetime] = None
    
    # Calculated / joined fields
    gross_margin: float
    daily_velocity: float
    units_sold_30d: int
    units_sold_60d: int
    days_of_supply: float
    sell_through_rate: float
    dead_stock_status: str
    trapped_capital: float
    active_recommendation: Optional[dict] = None


class CategoryBreakdown(SQLModel):
    category: str
    trapped_capital: float
    total_value: float
    items_count: int
    critical_count: int


class SupplierBreakdown(SQLModel):
    supplier: str
    trapped_capital: float
    total_value: float
    items_count: int
    risk_score: float


class StatusDistribution(SQLModel):
    healthy: int
    slow: int
    critical_dead: int
    total_skus: int


class OverviewMetrics(SQLModel):
    total_inventory_value: float
    trapped_dead_stock_capital: float
    trapped_capital_pct: float
    average_days_of_supply: float
    high_risk_skus_count: int
    slow_skus_count: int
    healthy_skus_count: int
    total_skus: int
    projected_total_cash_recovery: float
    category_breakdown: List[CategoryBreakdown]
    supplier_breakdown: List[SupplierBreakdown]
    status_distribution: StatusDistribution
    last_sync_timestamp: str


class PlaybookItem(SQLModel):
    recommendation_id: str
    item_id: str
    sku: str
    barcode: str
    title: str
    category: str
    supplier: str
    current_stock: int
    cost_price: float
    retail_price: float
    discounted_price: float
    suggested_discount_pct: int
    liquidation_strategy: str
    projected_cash_recovery: float
    status: str
    days_of_supply: float
    trapped_capital: float


class PlaybookGroup(SQLModel):
    strategy_name: str
    strategy_type: str  # flash_sale, bundle_bogo, pos_markdown
    description: str
    discount_pct: int
    eligible_items_count: int
    pending_items_count: int
    applied_items_count: int
    total_projected_cash_recovery: float
    items: List[PlaybookItem]


class ApplyRecommendationRequest(SQLModel):
    status: str = "applied"  # applied or dismissed


class BulkApplyRequest(SQLModel):
    recommendation_ids: List[str]
    status: str = "applied"  # applied or dismissed


class SyncResponse(SQLModel):
    success: bool
    message: str
    synced_items_count: int
    trapped_capital: float
    timestamp: str


class IntegrationStatus(SQLModel):
    id: str
    name: str
    type: str  # ecom, pos
    logo: str
    status: str  # connected, sync_pending, error
    channel: str
    last_synced: str
    item_count: int
    health: str
