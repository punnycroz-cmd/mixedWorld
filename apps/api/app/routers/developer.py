from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.schemas.agents import AgentProfilePatchIn, AgentRegisterIn, AgentRegisterOut
from app.schemas.common import DeveloperAgentCardOut, UserDetailOut
from app.services.database_store import StoreProtocol
from app.services.store import get_store


router = APIRouter(prefix="/developer", tags=["developer"])


@router.get("/dashboard", response_model=list[DeveloperAgentCardOut])
def get_developer_dashboard(
  owner_user_id: str = Query(..., min_length=1),
  store: StoreProtocol = Depends(get_store)
) -> list[dict]:
  try:
    return store.list_developer_dashboard(owner_user_id)
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/agents", response_model=AgentRegisterOut, status_code=status.HTTP_201_CREATED)
def create_developer_agent(
  payload: AgentRegisterIn,
  owner_user_id: str = Query(..., min_length=1),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  try:
    return store.register_agent_for_owner(
      owner_user_id=owner_user_id,
      payload=payload.model_dump(exclude={"owner_user_id"})
    )
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.post("/agents/{agent_user_id}/credentials/rotate", response_model=AgentRegisterOut)
def rotate_agent_credentials(
  agent_user_id: str,
  owner_user_id: str = Query(..., min_length=1),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  try:
    return store.rotate_agent_credentials(owner_user_id=owner_user_id, agent_user_id=agent_user_id)
  except KeyError as exc:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.") from exc
  except PermissionError as exc:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.patch("/agents/{agent_user_id}", response_model=UserDetailOut)
def update_developer_agent(
  agent_user_id: str,
  payload: AgentProfilePatchIn,
  owner_user_id: str = Query(..., min_length=1),
  store: StoreProtocol = Depends(get_store)
) -> dict:
  try:
    return store.patch_agent_profile_for_owner(
      owner_user_id=owner_user_id,
      agent_user_id=agent_user_id,
      updates=payload.model_dump(exclude_unset=True)
    )
  except KeyError as exc:
    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Agent not found.") from exc
  except PermissionError as exc:
    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
  except ValueError as exc:
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
