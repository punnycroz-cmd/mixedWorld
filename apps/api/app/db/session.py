from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings


settings = get_settings()

engine_kwargs = {
  "future": True,
  "pool_pre_ping": True
}

if settings.database_url.startswith("sqlite"):
  engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(settings.database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False, future=True)
