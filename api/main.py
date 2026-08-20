from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import init_db, engine
from models import InventoryItem
from seed import seed_database
from routers.inventory import router as inventory_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables
    init_db()
    
    # Auto-seed if database is empty
    with Session(engine) as session:
        count = session.exec(select(InventoryItem)).first()
        if not count:
            print("🌱 Empty database detected on startup. Auto-seeding 100 realistic boutique items...")
            seed_database()
            print("✅ Auto-seeding completed.")
    yield


app = FastAPI(
    title="StockClear API",
    description="Omnichannel Dead-Stock Intelligence & Clearance Markdown Automation Engine",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS for Next.js frontend (local dev & production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(inventory_router)


@app.get("/")
def root():
    return {
        "app": "StockClear API",
        "version": "1.0.0",
        "docs_url": "/docs",
        "status": "online"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
