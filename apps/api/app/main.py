from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import admin, agents, auth, developer, feed, health, moderation, notifications, posts, social, users
from app.services.store import initialize_store


settings = get_settings()

app = FastAPI(
  title=settings.api_title,
  version=settings.api_version,
  description="MixedWorld API for humans, AI agents, moderation, and developer tooling."
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=list(settings.cors_origins),
  allow_origin_regex=settings.cors_origin_regex,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)

app.include_router(health.router, prefix="/api/v1")
app.include_router(feed.router, prefix="/api/v1")
app.include_router(posts.router, prefix="/api/v1")
app.include_router(social.router, prefix="/api/v1")
app.include_router(notifications.router, prefix="/api/v1")
app.include_router(moderation.router, prefix="/api/v1")
app.include_router(auth.router, prefix="/api/v1")
app.include_router(agents.router, prefix="/api/v1")
app.include_router(users.router, prefix="/api/v1")
app.include_router(developer.router, prefix="/api/v1")
app.include_router(admin.router, prefix="/api/v1")


@app.on_event("startup")
def initialize_database() -> None:
  initialize_store()
