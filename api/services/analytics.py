from typing import Tuple, Optional, Dict, Any


def calculate_daily_velocity(units_sold_30d: int) -> float:
    """Daily sell-through velocity based on last 30 days."""
    return round(units_sold_30d / 30.0, 4)


def calculate_days_of_supply(current_stock: int, daily_velocity: float) -> float:
    """
    Days of supply estimation.
    Set to 999.0 if daily velocity is zero or stock is stagnant.
    """
    if daily_velocity <= 0:
        return 999.0 if current_stock > 0 else 0.0
    dos = current_stock / daily_velocity
    return round(min(dos, 999.0), 1)


def calculate_trapped_capital(current_stock: int, cost_price: float) -> float:
    """Total merchant working capital trapped in current unsold inventory."""
    return round(current_stock * cost_price, 2)


def calculate_gross_margin(retail_price: float, cost_price: float) -> float:
    """Gross margin percentage."""
    if retail_price <= 0:
        return 0.0
    return round((retail_price - cost_price) / retail_price, 4)


def calculate_sell_through_rate(units_sold_30d: int, current_stock: int) -> float:
    """Sell through rate over 30d period."""
    total_inventory = current_stock + units_sold_30d
    if total_inventory <= 0:
        return 0.0
    return round(units_sold_30d / total_inventory, 4)


def determine_dead_stock_status(
    days_of_supply: float,
    units_sold_60d: int,
    current_stock: int
) -> str:
    """
    Status Categorization:
    - healthy: days_of_supply <= 45
    - slow: 45 < days_of_supply <= 90
    - critical_dead: days_of_supply > 90 OR (units_sold_60d == 0 AND current_stock > 0)
    """
    if (units_sold_60d == 0 and current_stock > 0) or days_of_supply > 90.0:
        return "critical_dead"
    elif 45.0 < days_of_supply <= 90.0:
        return "slow"
    else:
        return "healthy"


def generate_markdown_strategy(
    status: str,
    gross_margin: float,
    current_stock: int,
    retail_price: float
) -> Optional[Dict[str, Any]]:
    """
    Clearance Strategy Engine:
    - critical_dead & gross_margin >= 0.50 -> Flash Sale - 35% Off
    - critical_dead & gross_margin < 0.50 -> Bundle Promo / BOGO 50%
    - slow -> 15% In-Store POS Markdown
    """
    if current_stock <= 0:
        return None

    if status == "critical_dead":
        if gross_margin >= 0.50:
            discount_pct = 35
            strategy = "Flash Sale - 35% Off"
            projected_recovery = round(current_stock * retail_price * (1.0 - 0.35), 2)
            strategy_type = "flash_sale"
        else:
            discount_pct = 25  # Effective markdown on inventory volume
            strategy = "Bundle Promo / BOGO 50%"
            projected_recovery = round(current_stock * retail_price * (1.0 - 0.25), 2)
            strategy_type = "bundle_bogo"
            
        return {
            "suggested_discount_pct": discount_pct,
            "liquidation_strategy": strategy,
            "strategy_type": strategy_type,
            "projected_cash_recovery": projected_recovery,
        }

    elif status == "slow":
        discount_pct = 15
        strategy = "15% In-Store POS Markdown"
        projected_recovery = round(current_stock * retail_price * (1.0 - 0.15), 2)
        return {
            "suggested_discount_pct": discount_pct,
            "liquidation_strategy": strategy,
            "strategy_type": "pos_markdown",
            "projected_cash_recovery": projected_recovery,
        }

    return None
