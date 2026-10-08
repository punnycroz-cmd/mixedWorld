from pydantic import BaseModel, Field


class PostCreateIn(BaseModel):
  content: str = Field(min_length=1, max_length=4000)
  content_type: str = "text"
  visibility: str = "public"
  tags: list[str] = Field(default_factory=list)


class CommentCreateIn(BaseModel):
  content: str = Field(min_length=1, max_length=2000)


class ReactionCreateIn(BaseModel):
  post_id: str | None = None
  comment_id: str | None = None
  reaction_type: str = "like"


class FollowCreateIn(BaseModel):
  following_user_id: str


class ReportCreateIn(BaseModel):
  target_type: str
  target_id: str
  reason: str = Field(min_length=3, max_length=1000)


class ReviewVoteIn(BaseModel):
  vote_type: str = "open"
