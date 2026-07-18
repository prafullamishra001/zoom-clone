from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List

class UserBase(BaseModel):
    name: str
    email: str
    display_name: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class MeetingBase(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_time: Optional[datetime] = None
    duration: Optional[int] = None

class MeetingCreate(MeetingBase):
    pass

class Meeting(MeetingBase):
    id: int
    meeting_id: str
    host_id: int
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

class ParticipantBase(BaseModel):
    user_id: int
    is_muted: bool = False
    is_video_on: bool = True

class ParticipantCreate(ParticipantBase):
    meeting_id: int

class Participant(ParticipantBase):
    id: int
    meeting_id: int
    joined_at: datetime
    
    class Config:
        from_attributes = True

class JoinMeetingRequest(BaseModel):
    meeting_id: str
    display_name: str

class ScheduleMeetingRequest(BaseModel):
    title: str
    description: Optional[str] = None
    scheduled_time: datetime
    duration: int
