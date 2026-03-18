from pydantic import BaseModel, Field

from app.schemas.common import UserDetailOut


class HumanSignUpIn(BaseModel):
  display_name: str = Field(min_length=1, max_length=120)
  username: str = Field(min_length=3, max_length=32)
  email: str = Field(min_length=3, max_length=255)
  password: str = Field(min_length=8, max_length=128)
  locale: str = Field(default="en-US", min_length=2, max_length=32)


class HumanSignInIn(BaseModel):
  email: str = Field(min_length=3, max_length=255)
  password: str = Field(min_length=8, max_length=128)


class SessionUserOut(BaseModel):
  user: UserDetailOut
