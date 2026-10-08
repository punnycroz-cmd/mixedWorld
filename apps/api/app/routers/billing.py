from __future__ import annotations

import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status

from app.config import get_settings
from app.security.user_auth import UserPrincipal, require_human_principal
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/billing", tags=["billing"])

_ACTIVE_SUBSCRIPTION_STATUSES = {"active", "trialing"}


def _stripe_ready() -> bool:
  settings = get_settings()
  return bool(settings.stripe_secret_key and settings.stripe_price_id)


def _require_stripe() -> None:
  if not _stripe_ready():
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Billing is not configured on this server yet."
    )


@router.get("/plan")
def get_plan(
  principal: UserPrincipal = Depends(require_human_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  context = store.get_billing_context(principal.user_id)
  settings = get_settings()
  return {
    "plan": context["plan"],
    "billing_configured": _stripe_ready(),
    "price_id_configured": bool(settings.stripe_price_id)
  }


@router.post("/checkout", status_code=status.HTTP_201_CREATED)
def create_checkout_session(
  principal: UserPrincipal = Depends(require_human_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  _require_stripe()
  settings = get_settings()
  stripe.api_key = settings.stripe_secret_key

  context = store.get_billing_context(principal.user_id)
  customer_id = context["stripe_customer_id"]
  if not customer_id:
    customer = stripe.Customer.create(
      email=context["email"],
      metadata={"mixedworld_user_id": principal.user_id}
    )
    customer_id = customer["id"]
    store.link_stripe_customer(principal.user_id, customer_id)

  session = stripe.checkout.Session.create(
    mode="subscription",
    customer=customer_id,
    line_items=[{"price": settings.stripe_price_id, "quantity": 1}],
    success_url=f"{settings.web_base_url}/developer?billing=success",
    cancel_url=f"{settings.web_base_url}/developer?billing=cancelled",
    metadata={"mixedworld_user_id": principal.user_id}
  )
  return {"checkout_url": session["url"]}


@router.post("/portal", status_code=status.HTTP_201_CREATED)
def create_billing_portal_session(
  principal: UserPrincipal = Depends(require_human_principal),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  _require_stripe()
  settings = get_settings()
  stripe.api_key = settings.stripe_secret_key

  context = store.get_billing_context(principal.user_id)
  if not context["stripe_customer_id"]:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No billing account yet.")

  portal_session = stripe.billing_portal.Session.create(
    customer=context["stripe_customer_id"],
    return_url=f"{settings.web_base_url}/developer"
  )
  return {"portal_url": portal_session["url"]}


def _plan_from_subscription(subscription: dict) -> str:
  return "pro" if subscription.get("status") in _ACTIVE_SUBSCRIPTION_STATUSES else "free"


@router.post("/webhook")
async def stripe_webhook(
  request: Request,
  store: StoreProtocol = Depends(get_store),
  stripe_signature: str | None = Header(default=None, alias="Stripe-Signature")
) -> dict:
  settings = get_settings()
  if not settings.stripe_secret_key or not settings.stripe_webhook_secret:
    raise HTTPException(
      status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
      detail="Billing webhooks are not configured on this server."
    )
  if not stripe_signature:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing Stripe signature.")

  payload = await request.body()
  try:
    event = stripe.Webhook.construct_event(
      payload=payload,
      sig_header=stripe_signature,
      secret=settings.stripe_webhook_secret
    )
  except (ValueError, stripe.SignatureVerificationError) as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook payload.") from exc

  event_type = event.get("type", "")
  data = event.get("data", {}).get("object", {})

  if event_type == "checkout.session.completed":
    customer_id = data.get("customer")
    user_id = data.get("metadata", {}).get("mixedworld_user_id", "")
    if customer_id and user_id:
      store.link_stripe_customer(user_id, customer_id)
  elif event_type in {
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted"
  }:
    customer_id = data.get("customer")
    if customer_id:
      store.set_plan_by_stripe_customer(customer_id, _plan_from_subscription(data))

  return {"received": True}
