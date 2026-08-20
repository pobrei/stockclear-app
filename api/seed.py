import random
import uuid
from datetime import datetime, timedelta
from sqlmodel import Session, select, delete

from database import engine, init_db
from models import Merchant, InventoryItem, SalesVelocity, MarkdownRecommendation
from services.analytics import (
    calculate_daily_velocity,
    calculate_days_of_supply,
    calculate_trapped_capital,
    calculate_gross_margin,
    calculate_sell_through_rate,
    determine_dead_stock_status,
    generate_markdown_strategy,
)

# Realistic product catalogs by category: (Title, Cost Price, Retail Price, Default Supplier)
HIGH_MARGIN_CATALOG = [
    ("Nordic Alpine Boot Pro", 95.0, 240.0, "Footwear", "Vanguard Footwear"),
    ("Chelsea Waterproof Suede Boot", 65.0, 185.0, "Footwear", "Atelier Nordic"),
    ("Retro Trainer Low-Top 88", 42.0, 120.0, "Footwear", "Pacific Outfitter"),
    ("Minimalist Leather Derby", 78.0, 210.0, "Footwear", "Heritage Loom"),
    ("Merino Wool Slip-On Lounger", 38.0, 110.0, "Footwear", "Atelier Nordic"),
    ("Vibram Sole Mountain Hiker", 110.0, 290.0, "Footwear", "Vanguard Footwear"),
    ("Classic Penny Loafer Calfskin", 89.0, 260.0, "Footwear", "Heritage Loom"),
    ("Merino Wool Heavy Crewneck", 48.0, 145.0, "Apparel", "Heritage Loom"),
    ("Waxed Cotton Field Parka", 115.0, 320.0, "Apparel", "Atelier Nordic"),
    ("Selvedge Japanese Denim 14oz", 58.0, 175.0, "Apparel", "Heritage Loom"),
    ("Heavyweight Canvas Overshirt", 42.0, 130.0, "Apparel", "Pacific Outfitter"),
    ("Thermal Waffle-Knit Henley", 22.0, 68.0, "Apparel", "Pacific Outfitter"),
    ("Silk-Linen Blend Camp Collar", 32.0, 98.0, "Apparel", "Atelier Nordic"),
    ("Cashmere Ribbed Beanie", 19.0, 65.0, "Apparel", "Heritage Loom"),
    ("French Terry Raglan Sweatshirt", 28.0, 89.0, "Apparel", "Pacific Outfitter"),
    ("Corduroy Relaxed Trousers", 39.0, 120.0, "Apparel", "Heritage Loom"),
    ("Wool-Blend Herringbone Overcoat", 140.0, 390.0, "Apparel", "Heritage Loom"),
    ("Full-Grain Horween Leather Wallet", 26.0, 85.0, "Hardware", "Heritage Loom"),
    ("Insulated Vacuum Growler 64oz", 20.0, 62.0, "Hardware", "Pacific Outfitter"),
    ("Tactical Pen with Glass Breaker", 14.0, 45.0, "Hardware", "Vanguard Hardware"),
    ("Waxed Canvas Tool Roll Organizer", 25.0, 78.0, "Hardware", "Heritage Loom"),
    ("Titanium Ultralight Camp Mug", 16.0, 48.0, "Hardware", "Vanguard Hardware"),
]

# Lower margin catalog (<50% gross margin) for BOGO / Bundle liquidation strategy
LOWER_MARGIN_CATALOG = [
    ("Winter Insulated Snow Runner", 125.0, 195.0, "Footwear", "Atelier Nordic"),        # 35.9% margin
    ("Hydro-Shield Waterproof Sneaker", 95.0, 150.0, "Footwear", "Pacific Outfitter"),    # 36.7% margin
    ("Technical Commuter Chino", 68.0, 110.0, "Apparel", "Vanguard Hardware"),            # 38.2% margin
    ("Storm-Proof Ripstop Anorak", 145.0, 220.0, "Apparel", "Vanguard Footwear"),        # 34.1% margin
    ("Quilted PrimaLoft Liner Vest", 92.0, 145.0, "Apparel", "Atelier Nordic"),          # 36.5% margin
    ("Moisture-Wicking Base Layer Top", 36.0, 55.0, "Apparel", "Pacific Outfitter"),     # 34.5% margin
    ("Titanium Pocket Multi-Tool v2", 58.0, 88.0, "Hardware", "Vanguard Hardware"),       # 34.1% margin
    ("Cordura 500D Roll-Top Duffle 45L", 98.0, 155.0, "Hardware", "Pacific Outfitter"),   # 36.8% margin
    ("Brass Compass & Clinometer", 48.0, 75.0, "Hardware", "Vanguard Hardware"),         # 36.0% margin
    ("Stainless Steel Camp French Press", 45.0, 69.0, "Hardware", "Pacific Outfitter"),   # 34.8% margin
    ("High-Lumen Rechargeable Headlamp", 58.0, 89.0, "Hardware", "Vanguard Hardware"),    # 34.8% margin
    ("Anodized Aluminum Carabiner Set", 24.0, 38.0, "Hardware", "Vanguard Hardware"),     # 36.8% margin
]

SUPPLIERS = [
    "Vanguard Footwear",
    "Atelier Nordic",
    "Pacific Outfitter",
    "Heritage Loom",
    "Vanguard Hardware",
]

CHANNELS = ["both", "pos", "online"]


def generate_sku(category: str, index: int) -> str:
    prefix = {
        "Footwear": "FTW",
        "Apparel": "APP",
        "Hardware": "HDW",
    }.get(category, "GEN")
    return f"{prefix}-{1000 + index}"


def generate_barcode(index: int) -> str:
    return f"5901234{index:06d}"


def seed_database(num_items: int = 100) -> Merchant:
    """Wipes and seeds the database with 100 realistic boutique inventory items."""
    init_db()

    with Session(engine) as session:
        # Clear existing data using SQLModel delete
        session.exec(delete(MarkdownRecommendation))
        session.exec(delete(SalesVelocity))
        session.exec(delete(InventoryItem))
        session.exec(delete(Merchant))
        session.commit()

        # Create primary demo merchant
        merchant = Merchant(
            name="Stockholm Goods Co.",
            email="founder@stockholmgoods.se",
            plan_tier="boutique",
            created_at=datetime.utcnow() - timedelta(days=120)
        )
        session.add(merchant)
        session.commit()
        session.refresh(merchant)

        random.seed(42)  # Deterministic seed for reproducible testing
        item_counter = 0

        # Profiles distribution
        # - critical_dead_high_margin: 22 items (Flash Sale 35%)
        # - critical_dead_low_margin: 16 items (Bundle Promo / BOGO 50%)
        # - slow: 30 items (15% POS Markdown)
        # - healthy: 32 items
        profile_list = (
            ["critical_dead_high"] * 22
            + ["critical_dead_low"] * 16
            + ["slow"] * 30
            + ["healthy"] * 32
        )
        random.shuffle(profile_list)

        for profile in profile_list:
            item_counter += 1
            
            if profile == "critical_dead_low":
                base_title, base_cost, base_retail, cat_name, default_supplier = random.choice(LOWER_MARGIN_CATALOG)
            elif profile == "critical_dead_high":
                base_title, base_cost, base_retail, cat_name, default_supplier = random.choice(HIGH_MARGIN_CATALOG)
            else:
                combined = HIGH_MARGIN_CATALOG + LOWER_MARGIN_CATALOG
                base_title, base_cost, base_retail, cat_name, default_supplier = random.choice(combined)

            # Variant variations for realism
            variant_suffix = ""
            if cat_name == "Footwear":
                size = random.choice(["EU 41", "EU 42", "EU 43", "EU 44", "EU 45"])
                color = random.choice(["Onyx Black", "Sand Suede", "Forest Green", "Amber Tan"])
                variant_suffix = f" - {color} / {size}"
            elif cat_name == "Apparel":
                size = random.choice(["S", "M", "L", "XL", "XXL"])
                color = random.choice(["Navy", "Charcoal", "Olive", "Oatmeal", "Black"])
                variant_suffix = f" - {color} / {size}"
            else:
                finish = random.choice(["Matte Black", "Brushed Silver", "Olive Drab", "Desert Tan"])
                variant_suffix = f" ({finish})"

            title = f"{base_title}{variant_suffix}"
            sku = generate_sku(cat_name, item_counter)
            barcode = generate_barcode(item_counter)
            supplier = default_supplier
            channel = random.choice(CHANNELS)
            
            cost_price = round(base_cost * random.uniform(0.98, 1.02), 2)
            retail_price = round(base_retail * random.uniform(0.98, 1.02), 2)

            now = datetime.utcnow()

            if "critical_dead" in profile:
                current_stock = random.randint(14, 45)
                units_sold_30d = 0 if random.random() < 0.85 else 1
                units_sold_60d = units_sold_30d
                days_ago = random.randint(70, 160)
                last_sold_date = now - timedelta(days=days_ago)

            elif profile == "slow":
                current_stock = random.randint(10, 24)
                # Ensure daily velocity gives 45 < DoS <= 90
                # If current_stock = 15, daily_velocity = 0.23 -> units_sold_30d = 7 -> DoS = 65.2
                units_sold_30d = random.randint(5, 9)
                units_sold_60d = units_sold_30d + random.randint(5, 10)
                days_ago = random.randint(18, 42)
                last_sold_date = now - timedelta(days=days_ago)

            else:  # healthy
                current_stock = random.randint(12, 28)
                # Ensure daily velocity gives DoS <= 45
                units_sold_30d = random.randint(18, 38)
                units_sold_60d = units_sold_30d + random.randint(18, 35)
                days_ago = random.randint(1, 5)
                last_sold_date = now - timedelta(days=days_ago)

            # Create InventoryItem
            item = InventoryItem(
                merchant_id=merchant.id,
                sku=sku,
                barcode=barcode,
                title=title,
                category=cat_name,
                supplier=supplier,
                cost_price=cost_price,
                retail_price=retail_price,
                current_stock=current_stock,
                channel=channel,
                last_sold_date=last_sold_date,
            )
            session.add(item)
            session.commit()
            session.refresh(item)

            # Run analytics calculations
            daily_velocity = calculate_daily_velocity(units_sold_30d)
            days_of_supply = calculate_days_of_supply(current_stock, daily_velocity)
            trapped_capital = calculate_trapped_capital(current_stock, cost_price)
            gross_margin = calculate_gross_margin(retail_price, cost_price)
            sell_through_rate = calculate_sell_through_rate(units_sold_30d, current_stock)
            dead_stock_status = determine_dead_stock_status(days_of_supply, units_sold_60d, current_stock)

            velocity = SalesVelocity(
                item_id=item.id,
                units_sold_30d=units_sold_30d,
                units_sold_60d=units_sold_60d,
                days_of_supply=days_of_supply,
                sell_through_rate=sell_through_rate,
                dead_stock_status=dead_stock_status,
                trapped_capital=trapped_capital,
            )
            session.add(velocity)

            # Generate markdown strategy if dead or slow
            strat_info = generate_markdown_strategy(
                dead_stock_status,
                gross_margin,
                current_stock,
                retail_price
            )
            if strat_info:
                rec = MarkdownRecommendation(
                    item_id=item.id,
                    suggested_discount_pct=strat_info["suggested_discount_pct"],
                    liquidation_strategy=strat_info["liquidation_strategy"],
                    projected_cash_recovery=strat_info["projected_cash_recovery"],
                    status="pending",
                )
                session.add(rec)

            session.commit()

        print(f"✅ Successfully seeded {num_items} inventory items with velocity and clearance strategies.")
        return merchant


if __name__ == "__main__":
    seed_database()
