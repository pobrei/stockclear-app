import os
from sqlmodel import SQLModel, create_engine, Session

# SQLite database file path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "stockclear.db")
DATABASE_URL = f"sqlite:///{DB_FILE}"

# Engine with connect_args for SQLite concurrency
engine = create_engine(
    DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False}
)


def init_db():
    """Create all tables defined in SQLModel metadata."""
    SQLModel.metadata.create_all(engine)


def get_session():
    """Dependency for obtaining a database session per request."""
    with Session(engine) as session:
        yield session
