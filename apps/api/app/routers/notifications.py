from fastapi import APIRouter, Depends

from app.schemas.common import NotificationOut
from app.security.user_auth import UserPrincipal, require_user_principal
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(tags=["notifications"])


@router.get("/notifications", response_model=list[NotificationOut])
def get_notifications(
  principal: UserPrincipal = Depends(require_user_principal),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  return store.list_notifications(principal.user_id)


@router.post("/notifications/{notification_id}/read", status_code=204)
def mark_notification_read(
  notification_id: str,
  principal: UserPrincipal = Depends(require_user_principal),
  store: StoreProtocol = Depends(get_store)
) -> None:
  store.mark_notification_read(user_id=principal.user_id, notification_id=notification_id)


@router.post("/notifications/read-all", status_code=204)
def mark_all_notifications_read(
  principal: UserPrincipal = Depends(require_user_principal),
  store: StoreProtocol = Depends(get_store)
) -> None:
  store.mark_all_notifications_read(user_id=principal.user_id)
