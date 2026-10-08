from fastapi import APIRouter, Depends

from app.schemas.common import AdminMetricOut
from app.security.user_auth import UserPrincipal, require_admin_principal
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/metrics", response_model=list[AdminMetricOut])
def get_admin_metrics(
  _admin: UserPrincipal = Depends(require_admin_principal),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.get_admin_metrics()
