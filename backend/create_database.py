"""
Database Creation & Initialization Script for SolarFlow CRM
Works for both PostgreSQL and SQLite.
"""
import sys
from urllib.parse import urlparse, unquote

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

from app.config import settings

def init_database(seed: bool = True):
    db_url = settings.DATABASE_URL
    print(f"[*] Target DATABASE_URL: {db_url}")

    if db_url.startswith("sqlite"):
        print("[+] SQLite detected. Creating tables...")
        from app.database import engine, Base
        from app.models import models
        Base.metadata.create_all(bind=engine)
        print("[OK] SQLite tables created successfully!")
        
        if seed:
            from app.seeds.seed_data import run_seed
            print("[*] Running seed data...")
            run_seed()
            print("[OK] Database seeded successfully!")
        return

    # PostgreSQL handling
    import psycopg
    from psycopg import sql

    # Normalize url if needed
    clean_url = db_url
    if clean_url.startswith("postgresql+psycopg://"):
        clean_url = clean_url.replace("postgresql+psycopg://", "postgresql://", 1)
    elif clean_url.startswith("postgres://"):
        clean_url = clean_url.replace("postgres://", "postgresql://", 1)

    parsed = urlparse(clean_url)
    target_db = parsed.path.lstrip("/")
    if not target_db:
        target_db = "solarflow_crm"

    # Connection parameters for the default maintenance database
    user = unquote(parsed.username or "postgres")
    password = unquote(parsed.password or "")
    host = parsed.hostname or "127.0.0.1"
    port = parsed.port or 5432

    print(f"[*] Connecting to PostgreSQL maintenance database at {host}:{port} as '{user}'...")
    try:
        conn = psycopg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname="postgres",
            autocommit=True
        )
    except Exception as e:
        print(f"\n[!] Failed to connect to PostgreSQL server: {e}")
        print("\nPlease ensure:")
        print(f" 1. PostgreSQL is running on {host}:{port}")
        print(f" 2. The password in backend/.env is correct for user '{user}'")
        sys.exit(1)

    with conn.cursor() as cur:
        cur.execute("SELECT 1 FROM pg_database WHERE datname = %s", (target_db,))
        exists = cur.fetchone()
        if not exists:
            print(f"[*] Database '{target_db}' does not exist. Creating it now...")
            cur.execute(sql.SQL("CREATE DATABASE {}").format(sql.Identifier(target_db)))
            print(f"[OK] Database '{target_db}' created successfully!")
        else:
            print(f"[OK] Database '{target_db}' already exists.")

    conn.close()

    # Now create all tables using SQLAlchemy models
    print(f"[*] Creating tables in '{target_db}' via SQLAlchemy...")
    from app.database import engine, Base
    from app.models import models
    Base.metadata.create_all(bind=engine)
    print("[OK] All tables and schema constraints created successfully!")

    if seed:
        print("[*] Seeding default company, users, and solar pipeline demo data...")
        from app.seeds.seed_data import run_seed
        run_seed()
        print("[OK] Real database initialization and seeding complete!")

if __name__ == "__main__":
    init_database(seed=True)
