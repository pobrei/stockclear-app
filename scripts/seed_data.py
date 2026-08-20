#!/usr/bin/env python3
import sys
import os

# Add api directory to sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
API_DIR = os.path.join(os.path.dirname(BASE_DIR), "api")
sys.path.insert(0, API_DIR)

from seed import seed_database

if __name__ == "__main__":
    print("🌱 Seeding StockClear inventory database...")
    merchant = seed_database()
    print(f"✅ Demo merchant created: {merchant.name} ({merchant.email})")
