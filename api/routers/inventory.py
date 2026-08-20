import csv
import io
import random
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlmodel import Session, select, desc, asc

from database import get_session
from models import (
    Merchant,
    InventoryItem,
    SalesVelocity,
    MarkdownRecommendation,
    OverviewMetrics,
    CategoryBreakdown,
    SupplierBreakdown,
    StatusDistribution,
    InventoryItemResponse,
    PlaybookGroup,
    PlaybookItem,
    ApplyRecommendationRequest,
    BulkApplyRequest,
    SyncResponse,
    IntegrationStatus,
)
from services.analytics import (
    calculate_daily_velocity,
    calculate_days_of_supply,
    calculate_trapped_capital,
    calculate_gross_margin,
    calculate_sell_through_rate,
    determine_dead_stock_status,
    generate_markdown_strategy,
)

router = APIRouter(prefix="/api/v1", tags=["inventory"])

# Global state for mock sync timestamp
_LAST_SYNC_TIME = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")


@router.get("/overview", response_model=OverviewMetrics)
def get_overview(session: Session = Depends(get_session)):
    """Fetch high-level financial metrics, dead-stock capital, and category/supplier breakdowns."""
    items = session.exec(select(InventoryItem)).all()
    velocities = {v.item_id: v for v in session.exec(select(SalesVelocity)).all()}
    recommendations = session.exec(select(MarkdownRecommendation)).all()

    total_inventory_value = sum(i.current_stock * i.retail_price for i in items)
    total_cost_value = sum(i.current_stock * i.cost_price for i in items)
    
    trapped_dead_stock_capital = 0.0
    critical_dead_count = 0
    slow_count = 0
    healthy_count = 0
    dos_values = []

    category_stats = {}
    supplier_stats = {}

    for item in items:
        vel = velocities.get(item.id)
        status = vel.dead_stock_status if vel else "healthy"
        trapped = vel.trapped_capital if vel else (item.current_stock * item.cost_price)
        dos = vel.days_of_supply if vel else 0.0
        
        if dos < 999:
            dos_values.append(dos)

        if status == "critical_dead":
            trapped_dead_stock_capital += trapped
            critical_dead_count += 1
        elif status == "slow":
            slow_count += 1
        else:
            healthy_count += 1

        # Category aggregation
        cat = item.category
        if cat not in category_stats:
            category_stats[cat] = {"trapped": 0.0, "total": 0.0, "count": 0, "critical": 0}
        category_stats[cat]["total"] += item.current_stock * item.retail_price
        category_stats[cat]["count"] += 1
        if status == "critical_dead":
            category_stats[cat]["trapped"] += trapped
            category_stats[cat]["critical"] += 1

        # Supplier aggregation
        sup = item.supplier
        if sup not in supplier_stats:
            supplier_stats[sup] = {"trapped": 0.0, "total": 0.0, "count": 0}
        supplier_stats[sup]["total"] += item.current_stock * item.retail_price
        supplier_stats[sup]["count"] += 1
        if status == "critical_dead":
            supplier_stats[sup]["trapped"] += trapped

    avg_dos = round(sum(dos_values) / len(dos_values), 1) if dos_values else 45.0
    trapped_pct = round((trapped_dead_stock_capital / total_cost_value * 100), 1) if total_cost_value > 0 else 0.0
    projected_recovery = sum(r.projected_cash_recovery for r in recommendations if r.status in ["pending", "applied"])

    cat_breakdown = [
        CategoryBreakdown(
            category=cat,
            trapped_capital=round(data["trapped"], 2),
            total_value=round(data["total"], 2),
            items_count=data["count"],
            critical_count=data["critical"],
        )
        for cat, data in category_stats.items()
    ]

    sup_breakdown = [
        SupplierBreakdown(
            supplier=sup,
            trapped_capital=round(data["trapped"], 2),
            total_value=round(data["total"], 2),
            items_count=data["count"],
            risk_score=round((data["trapped"] / data["total"] * 100), 1) if data["total"] > 0 else 0.0,
        )
        for sup, data in sorted(supplier_stats.items(), key=lambda x: x[1]["trapped"], reverse=True)
    ]

    return OverviewMetrics(
        total_inventory_value=round(total_inventory_value, 2),
        trapped_dead_stock_capital=round(trapped_dead_stock_capital, 2),
        trapped_capital_pct=trapped_pct,
        average_days_of_supply=avg_dos,
        high_risk_skus_count=critical_dead_count,
        slow_skus_count=slow_count,
        healthy_skus_count=healthy_count,
        total_skus=len(items),
        projected_total_cash_recovery=round(projected_recovery, 2),
        category_breakdown=cat_breakdown,
        supplier_breakdown=sup_breakdown,
        status_distribution=StatusDistribution(
            healthy=healthy_count,
            slow=slow_count,
            critical_dead=critical_dead_count,
            total_skus=len(items),
        ),
        last_sync_timestamp=_LAST_SYNC_TIME,
    )


@router.get("/inventory", response_model=List[InventoryItemResponse])
def list_inventory(
    status: Optional[str] = Query(None, description="healthy, slow, critical_dead, or all"),
    category: Optional[str] = Query(None, description="Footwear, Apparel, Hardware, or all"),
    supplier: Optional[str] = Query(None),
    channel: Optional[str] = Query(None, description="pos, online, both, or all"),
    search: Optional[str] = Query(None, description="Search by title, SKU, barcode, supplier"),
    sort_by: str = Query("trapped_capital", description="trapped_capital, days_of_supply, current_stock, retail_price, units_sold_30d"),
    order: str = Query("desc", description="asc or desc"),
    session: Session = Depends(get_session),
):
    """Retrieve filterable, sortable inventory items with joined velocity and recommendations."""
    items = session.exec(select(InventoryItem)).all()
    velocities = {v.item_id: v for v in session.exec(select(SalesVelocity)).all()}
    recommendations = {r.item_id: r for r in session.exec(select(MarkdownRecommendation)).all()}

    results = []
    for item in items:
        vel = velocities.get(item.id)
        rec = recommendations.get(item.id)

        vel_status = vel.dead_stock_status if vel else "healthy"
        trapped_cap = vel.trapped_capital if vel else calculate_trapped_capital(item.current_stock, item.cost_price)
        dos = vel.days_of_supply if vel else 0.0
        daily_vel = calculate_daily_velocity(vel.units_sold_30d if vel else 0)
        u30 = vel.units_sold_30d if vel else 0
        u60 = vel.units_sold_60d if vel else 0
        str_rate = vel.sell_through_rate if vel else 0.0
        gm = calculate_gross_margin(item.retail_price, item.cost_price)

        # Filters
        if status and status != "all" and vel_status != status:
            continue
        if category and category != "all" and item.category.lower() != category.lower():
            continue
        if supplier and supplier != "all" and item.supplier.lower() != supplier.lower():
            continue
        if channel and channel != "all" and item.channel != channel and item.channel != "both":
            continue
        if search:
            q = search.lower().strip()
            match = (
                q in item.title.lower()
                or q in item.sku.lower()
                or q in item.barcode.lower()
                or q in item.supplier.lower()
                or q in item.category.lower()
            )
            if not match:
                continue

        rec_dict = None
        if rec:
            rec_dict = {
                "id": rec.id,
                "suggested_discount_pct": rec.suggested_discount_pct,
                "liquidation_strategy": rec.liquidation_strategy,
                "projected_cash_recovery": rec.projected_cash_recovery,
                "status": rec.status,
            }

        results.append(
            InventoryItemResponse(
                id=item.id,
                merchant_id=item.merchant_id,
                sku=item.sku,
                barcode=item.barcode,
                title=item.title,
                category=item.category,
                supplier=item.supplier,
                cost_price=item.cost_price,
                retail_price=item.retail_price,
                current_stock=item.current_stock,
                channel=item.channel,
                last_sold_date=item.last_sold_date,
                gross_margin=gm,
                daily_velocity=daily_vel,
                units_sold_30d=u30,
                units_sold_60d=u60,
                days_of_supply=dos,
                sell_through_rate=str_rate,
                dead_stock_status=vel_status,
                trapped_capital=trapped_cap,
                active_recommendation=rec_dict,
            )
        )

    # Sorting
    reverse = (order.lower() == "desc")
    if sort_by == "trapped_capital":
        results.sort(key=lambda x: x.trapped_capital, reverse=reverse)
    elif sort_by == "days_of_supply":
        results.sort(key=lambda x: x.days_of_supply, reverse=reverse)
    elif sort_by == "current_stock":
        results.sort(key=lambda x: x.current_stock, reverse=reverse)
    elif sort_by == "retail_price":
        results.sort(key=lambda x: x.retail_price, reverse=reverse)
    elif sort_by == "units_sold_30d":
        results.sort(key=lambda x: x.units_sold_30d, reverse=reverse)
    elif sort_by == "title":
        results.sort(key=lambda x: x.title.lower(), reverse=reverse)

    return results


@router.get("/playbooks", response_model=List[PlaybookGroup])
def get_playbooks(session: Session = Depends(get_session)):
    """Fetch liquidation playbooks grouped by campaign strategy with cash recovery metrics."""
    recs = session.exec(select(MarkdownRecommendation)).all()
    items_map = {i.id: i for i in session.exec(select(InventoryItem)).all()}
    vel_map = {v.item_id: v for v in session.exec(select(SalesVelocity)).all()}

    groups_data = {
        "Flash Sale - 35% Off": {
            "strategy_type": "flash_sale",
            "description": "High-margin stagnant inventory (>50% gross margin). Aggressive flash sale to liquidate trapped capital fast without margin destruction.",
            "discount_pct": 35,
            "items": [],
        },
        "Bundle Promo / BOGO 50%": {
            "strategy_type": "bundle_bogo",
            "description": "Lower-margin dead stock. Buy-One-Get-One 50% off bundle incentive to clear warehouse footprint while maintaining basket size.",
            "discount_pct": 25,
            "items": [],
        },
        "15% In-Store POS Markdown": {
            "strategy_type": "pos_markdown",
            "description": "Slow-moving inventory (45-90 days supply). Targeted in-store shelf tags to stimulate sell-through before becoming critical dead stock.",
            "discount_pct": 15,
            "items": [],
        },
    }

    for rec in recs:
        item = items_map.get(rec.item_id)
        if not item:
            continue
        vel = vel_map.get(item.id)

        strat_name = rec.liquidation_strategy
        if strat_name not in groups_data:
            continue

        discounted_price = round(item.retail_price * (1 - (rec.suggested_discount_pct / 100.0)), 2)

        playbook_item = PlaybookItem(
            recommendation_id=rec.id,
            item_id=item.id,
            sku=item.sku,
            barcode=item.barcode,
            title=item.title,
            category=item.category,
            supplier=item.supplier,
            current_stock=item.current_stock,
            cost_price=item.cost_price,
            retail_price=item.retail_price,
            discounted_price=discounted_price,
            suggested_discount_pct=rec.suggested_discount_pct,
            liquidation_strategy=rec.liquidation_strategy,
            projected_cash_recovery=rec.projected_cash_recovery,
            status=rec.status,
            days_of_supply=vel.days_of_supply if vel else 0.0,
            trapped_capital=vel.trapped_capital if vel else (item.current_stock * item.cost_price),
        )
        groups_data[strat_name]["items"].append(playbook_item)

    response_groups = []
    for strat_name, info in groups_data.items():
        items_list = info["items"]
        eligible_count = len(items_list)
        pending_count = sum(1 for x in items_list if x.status == "pending")
        applied_count = sum(1 for x in items_list if x.status == "applied")
        total_recovery = sum(x.projected_cash_recovery for x in items_list)

        response_groups.append(
            PlaybookGroup(
                strategy_name=strat_name,
                strategy_type=info["strategy_type"],
                description=info["description"],
                discount_pct=info["discount_pct"],
                eligible_items_count=eligible_count,
                pending_items_count=pending_count,
                applied_items_count=applied_count,
                total_projected_cash_recovery=round(total_recovery, 2),
                items=items_list,
            )
        )

    return response_groups


@router.post("/recommendations/{recommendation_id}/apply")
def apply_recommendation(
    recommendation_id: str,
    payload: ApplyRecommendationRequest,
    session: Session = Depends(get_session),
):
    """Mark a clearance recommendation as applied or dismissed."""
    rec = session.get(MarkdownRecommendation, recommendation_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    rec.status = payload.status
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return {"success": True, "id": rec.id, "status": rec.status}


@router.post("/recommendations/apply-bulk")
def apply_bulk_recommendations(
    payload: BulkApplyRequest,
    session: Session = Depends(get_session),
):
    """Bulk update markdown recommendations."""
    recs = session.exec(
        select(MarkdownRecommendation).where(MarkdownRecommendation.id.in_(payload.recommendation_ids))
    ).all()
    
    count = 0
    for rec in recs:
        rec.status = payload.status
        session.add(rec)
        count += 1

    session.commit()
    return {"success": True, "updated_count": count, "status": payload.status}


@router.post("/sync-mock", response_model=SyncResponse)
def sync_mock_data(session: Session = Depends(get_session)):
    """
    Simulate real-time omnichannel inventory synchronization from Shopify and Square/Lightspeed POS.
    Re-calculates velocity metrics and updates clearance strategies.
    """
    global _LAST_SYNC_TIME
    _LAST_SYNC_TIME = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

    items = session.exec(select(InventoryItem)).all()
    velocities = {v.item_id: v for v in session.exec(select(SalesVelocity)).all()}
    recommendations = {r.item_id: r for r in session.exec(select(MarkdownRecommendation)).all()}

    total_trapped = 0.0

    for item in items:
        vel = velocities.get(item.id)
        if not vel:
            continue

        # Simulate micro sales or stock adjustments
        if vel.dead_stock_status == "healthy":
            vel.units_sold_30d = max(1, vel.units_sold_30d + random.randint(-1, 3))
            vel.units_sold_60d = max(vel.units_sold_30d, vel.units_sold_60d + random.randint(0, 4))
            item.current_stock = max(2, item.current_stock - random.randint(0, 2))
        elif vel.dead_stock_status == "slow":
            vel.units_sold_30d = max(0, vel.units_sold_30d + random.randint(-1, 1))
            vel.units_sold_60d = max(vel.units_sold_30d, vel.units_sold_60d + random.randint(0, 2))

        # Recompute formulas
        daily_vel = calculate_daily_velocity(vel.units_sold_30d)
        dos = calculate_days_of_supply(item.current_stock, daily_vel)
        trapped = calculate_trapped_capital(item.current_stock, item.cost_price)
        gm = calculate_gross_margin(item.retail_price, item.cost_price)
        str_rate = calculate_sell_through_rate(vel.units_sold_30d, item.current_stock)
        status = determine_dead_stock_status(dos, vel.units_sold_60d, item.current_stock)

        vel.days_of_supply = dos
        vel.trapped_capital = trapped
        vel.sell_through_rate = str_rate
        vel.dead_stock_status = status
        session.add(vel)
        session.add(item)

        if status == "critical_dead":
            total_trapped += trapped

        # Update recommendation
        strat_info = generate_markdown_strategy(status, gm, item.current_stock, item.retail_price)
        rec = recommendations.get(item.id)

        if strat_info:
            if rec:
                rec.suggested_discount_pct = strat_info["suggested_discount_pct"]
                rec.liquidation_strategy = strat_info["liquidation_strategy"]
                rec.projected_cash_recovery = strat_info["projected_cash_recovery"]
                session.add(rec)
            else:
                new_rec = MarkdownRecommendation(
                    item_id=item.id,
                    suggested_discount_pct=strat_info["suggested_discount_pct"],
                    liquidation_strategy=strat_info["liquidation_strategy"],
                    projected_cash_recovery=strat_info["projected_cash_recovery"],
                    status="pending",
                )
                session.add(new_rec)
        elif rec:
            session.delete(rec)

    session.commit()

    return SyncResponse(
        success=True,
        message="Omnichannel inventory synced successfully across Shopify & POS channels.",
        synced_items_count=len(items),
        trapped_capital=round(total_trapped, 2),
        timestamp=_LAST_SYNC_TIME,
    )


@router.get("/export/clearance-csv")
def export_clearance_csv(session: Session = Depends(get_session)):
    """Export clearance markdown dataset formatted for in-store POS import and barcode label printing."""
    items = session.exec(select(InventoryItem)).all()
    velocities = {v.item_id: v for v in session.exec(select(SalesVelocity)).all()}
    recommendations = {r.item_id: r for r in session.exec(select(MarkdownRecommendation)).all()}

    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write CSV Header
    writer.writerow([
        "SKU",
        "Barcode",
        "Product Title",
        "Category",
        "Supplier",
        "Original Retail Price (€)",
        "Markdown Discount %",
        "Clearance Sale Price (€)",
        "Current Stock Qty",
        "Trapped Capital (€)",
        "Days of Supply",
        "Dead Stock Status",
        "Liquidation Strategy",
        "Channel",
        "POS Action Tag"
    ])

    for item in items:
        vel = velocities.get(item.id)
        rec = recommendations.get(item.id)
        status = vel.dead_stock_status if vel else "healthy"

        # Only export items eligible for clearance / markdown or flag accordingly
        discount_pct = rec.suggested_discount_pct if rec else 0
        sale_price = round(item.retail_price * (1 - (discount_pct / 100.0)), 2)
        pos_tag = "CLEARANCE_SALE" if status == "critical_dead" else ("SLOW_PROMO" if status == "slow" else "REGULAR")

        writer.writerow([
            item.sku,
            item.barcode,
            item.title,
            item.category,
            item.supplier,
            f"{item.retail_price:.2f}",
            f"{discount_pct}%",
            f"{sale_price:.2f}",
            item.current_stock,
            f"{(vel.trapped_capital if vel else 0.0):.2f}",
            f"{(vel.days_of_supply if vel else 0.0):.1f}",
            status.upper(),
            rec.liquidation_strategy if rec else "None",
            item.channel.upper(),
            pos_tag
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=StockClear_Clearance_Export_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.csv"
        }
    )


@router.get("/integrations", response_model=List[IntegrationStatus])
def get_integrations():
    """Return status of omnichannel inventory connectors."""
    return [
        IntegrationStatus(
            id="shopify-main",
            name="Shopify E-Commerce",
            type="ecom",
            logo="shopify",
            status="connected",
            channel="online",
            last_synced=_LAST_SYNC_TIME,
            item_count=100,
            health="operational",
        ),
        IntegrationStatus(
            id="square-pos-store1",
            name="Square POS (Main Flagship)",
            type="pos",
            logo="square",
            status="connected",
            channel="pos",
            last_synced=_LAST_SYNC_TIME,
            item_count=82,
            health="operational",
        ),
        IntegrationStatus(
            id="lightspeed-pos-store2",
            name="Lightspeed Retail (Boutique #2)",
            type="pos",
            logo="lightspeed",
            status="connected",
            channel="pos",
            last_synced=_LAST_SYNC_TIME,
            item_count=64,
            health="operational",
        ),
    ]
