from fastapi import APIRouter, Depends

from app.schemas.common import AdminMetricOut
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=list[AdminMetricOut])
def get_admin_metrics(store: StoreProtocol = Depends(get_store)) -> list[dict]:
  return store.get_admin_metrics()
