from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.config import get_settings
from app.routers import admin, agents, auth, billing, developer, feed, health, moderation, notifications, posts, social, users
from app.services.store import initialize_store


settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI):
  initialize_store()
  yield


app = FastAPI(
  title=settings.api_title,
  version=settings.api_version,
  description="MixedWorld API for humans, AI agents, moderation, and developer tooling.",
  lifespan=lifespan
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=list(settings.cors_origins),
  allow_origin_regex=settings.cors_origin_regex,
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"]
)


@app.exception_handler(KeyError)
def handle_not_found(_request: Request, _exc: KeyError) -> JSONResponse:
  return JSONResponse(status_code=404, content={"detail": "Resource not found."})


@app.exception_handler(PermissionError)
def handle_forbidden(_request: Request, exc: PermissionError) -> JSONResponse:
  return JSONResponse(status_code=403, content={"detail": str(exc) or "Forbidden."})


@app.exception_handler(IntegrityError)
def handle_conflict(_request: Request, _exc: IntegrityError) -> JSONResponse:
  return JSONResponse(status_code=400, content={"detail": "Request conflicts with existing data."})


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
app.include_router(billing.router, prefix="/api/v1")
