# StockClear — Omnichannel Dead-Stock Intelligence SaaS

> **StockClear** is an inventory intelligence platform for hybrid retail and e-commerce brands. It connects to store inventories across Shopify and in-store POS (Square / Lightspeed), computes sell-through velocity in real time, flags working capital trapped in stagnant stock (>60–90 days), and generates clearance markdown campaigns with in-store barcode/label exports.

---

## Key Features

1. **Dead-Stock & Trapped Capital Analytics**:
   - Computes daily sell-through velocity, days of supply (DoS), gross margins, and trapped capital.
   - Categorizes catalog items into `healthy` (DoS ≤ 45d), `slow` (45d < DoS ≤ 90d), and `critical_dead` (DoS > 90d or zero sales in 60d).
2. **Clearance Strategy Engine**:
   - **Flash Sale (35% Off)**: High-margin stagnant inventory (>50% gross margin) for rapid cash recovery.
   - **Bundle Promo / BOGO 50%**: Lower-margin dead stock (<50% gross margin) to protect unit margins.
   - **15% In-Store POS Markdown**: Early intervention for slow-moving stock before turning into dead stock.
3. **Omnichannel Store Connectors**:
   - Bidirectional inventory sync across Shopify Online and physical POS registers (Square / Lightspeed).
4. **Thermal POS Barcode / Shelf Tag Generator**:
   - Live SVG barcode preview and print view for physical store shelf talkers and product stickers.
5. **Clearance CSV Exporter**:
   - One-click export formatted for bulk POS price updates and inventory managers.

---

## Technology Stack

- **Frontend (`/web`)**: Next.js 15 (App Router), TypeScript, Tailwind CSS, Lucide Icons, Recharts.
- **Backend (`/api`)**: FastAPI (Python 3.9+), SQLModel / SQLAlchemy, Pydantic v2, SQLite (`stockclear.db`).
- **Data Seeder (`/scripts`)**: Deterministic seeder generating 100 realistic boutique retail SKUs across Footwear, Apparel, and Hardware with €60,000+ in trapped capital.

---

## Directory Structure

```
stockclear-app/
├── api/
│   ├── .venv/                      # Python virtual environment
│   ├── database.py                 # SQLite engine & session management
│   ├── main.py                     # FastAPI application & CORS config
│   ├── models.py                   # SQLModel relational schema & Pydantic DTOs
│   ├── seed.py                     # 100-item realistic retail catalog seeder
│   ├── requirements.txt            # Python dependencies
│   ├── routers/
│   │   └── inventory.py            # Overview, inventory, playbooks, CSV export, sync
│   └── services/
│       └── analytics.py            # Mathematical velocity & liquidation formulas
├── web/
│   ├── src/
│   │   ├── app/
│   │   │   ├── dashboard/page.tsx  # KPI cards, heatmaps, interactive table
│   │   │   ├── playbooks/page.tsx  # Liquidation campaigns & cash recovery
│   │   │   ├── integrations/page.tsx# Shopify & POS connector cards
│   │   │   ├── globals.css         # Styling design tokens & print styles
│   │   │   └── layout.tsx          # App layout shell
│   │   ├── components/
│   │   │   ├── Sidebar.tsx         # Navigation & merchant workspace
│   │   │   ├── Header.tsx          # Title bar, live sync, export actions
│   │   │   ├── MetricCard.tsx      # High-contrast KPI metric cards
│   │   │   └── BarcodeModal.tsx    # Printable clearance barcode tag
│   │   ├── lib/
│   │   │   └── api.ts              # API client methods
│   │   └── types/
│   │       └── index.ts            # TypeScript interfaces
│   ├── package.json
│   └── tailwind.config.ts
├── scripts/
│   ├── seed_data.py                # Standalone seeder runner
│   └── test_api.py                 # Automated backend API integration tests
└── package.json                    # Monorepo orchestration scripts
```

---

## Mathematical Business Logic Formulas

| Metric | Formula | Description |
| :--- | :--- | :--- |
| **Daily Velocity** | `units_sold_30d / 30.0` | Units sold per day over 30d window |
| **Days of Supply (DoS)** | `current_stock / daily_velocity` | Days of remaining inventory (capped at `999.0` if velocity = 0) |
| **Trapped Capital** | `current_stock * cost_price` | Working capital locked in stagnant stock |
| **Gross Margin** | `(retail_price - cost_price) / retail_price` | Product profit margin % |
| **Sell-Through Rate** | `units_sold_30d / (current_stock + units_sold_30d)` | Rate of stock turnover |
| **Healthy Stock** | `days_of_supply <= 45` | Normal stock turnover |
| **Slow Moving** | `45 < days_of_supply <= 90` | 15% POS Markdown recommendation |
| **Critical Dead Stock** | `days_of_supply > 90` OR (`units_sold_60d == 0` AND `current_stock > 0`) | Flash Sale 35% (GM ≥ 50%) or Bundle BOGO 50% (GM < 50%) |

---

## How to Run Locally

### 1. Start the FastAPI Backend Server

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
*API will run on `http://localhost:8000` (Swagger Docs available at `http://localhost:8000/docs`).*

### 2. Start the Next.js Frontend Server

In a new terminal window:
```bash
cd web
npm install
npm run dev
```
*Frontend will run on `http://localhost:3000`.*

### 3. Run Automated API Tests

```bash
api/.venv/bin/python scripts/test_api.py
```

### 4. Re-seed Database

```bash
PYTHONPATH=api api/.venv/bin/python api/seed.py
```
