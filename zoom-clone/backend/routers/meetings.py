from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from database import get_db
from schemas import MeetingCreate, Meeting as MeetingSchema, ScheduleMeetingRequest, JoinMeetingRequest, User as UserSchema
from services import MeetingService, UserService, ParticipantService
from typing import List

router = APIRouter(prefix="/api/meetings", tags=["meetings"])


@router.post("/instant", response_model=MeetingSchema)
def create_instant_meeting(host_id: int = Query(...), db: Session = Depends(get_db)):
    """Create an instant meeting"""
    return MeetingService.create_instant_meeting(db, host_id)


@router.post("/schedule", response_model=MeetingSchema)
def schedule_meeting(meeting: ScheduleMeetingRequest, host_id: int = Query(...), db: Session = Depends(get_db)):
    """Schedule a future meeting"""
    return MeetingService.schedule_meeting(db, meeting, host_id)


@router.post("/join")
def join_meeting(request: JoinMeetingRequest, db: Session = Depends(get_db)):
    """Join a meeting"""
    # Get meeting
    db_meeting = MeetingService.get_meeting_by_meeting_id(db, request.meeting_id)
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not db_meeting.is_active:
        raise HTTPException(status_code=400, detail="Meeting is not active")
    
    # Get or create user
    if request.display_name == "Host":
        db_user = UserService.get_user_by_id(db, db_meeting.host_id)
        if not db_user:
            raise HTTPException(status_code=404, detail="Host user not found")
    else:
        db_user = UserService.get_or_create_user_by_display_name(db, request.display_name)
    
    # Add participant
    participant = ParticipantService.add_participant(db, db_meeting.id, db_user.id)
    
    return {
        "message": "Successfully joined",
        "meeting": MeetingSchema.model_validate(db_meeting),
        "user": UserSchema.model_validate(db_user)
    }


@router.get("/{meeting_id}", response_model=MeetingSchema)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """Get meeting by meeting ID"""
    meeting = MeetingService.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return MeetingSchema.model_validate(meeting)


@router.get("/user/{user_id}/upcoming", response_model=List[MeetingSchema])
def get_upcoming_meetings(user_id: int, db: Session = Depends(get_db)):
    """Get upcoming meetings for a user"""
    meetings = MeetingService.get_upcoming_meetings(db, user_id)
    return [MeetingSchema.model_validate(m) for m in meetings]


@router.get("/user/{user_id}/recent", response_model=List[MeetingSchema])
def get_recent_meetings(user_id: int, db: Session = Depends(get_db)):
    """Get recent meetings for a user"""
    meetings = MeetingService.get_recent_meetings(db, user_id)
    return [MeetingSchema.model_validate(m) for m in meetings]


@router.post("/{meeting_id}/end")
def end_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """End a meeting"""
    meeting = MeetingService.end_meeting(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return {"message": "Meeting ended successfully", "meeting": MeetingSchema.model_validate(meeting)}


@router.get("/{meeting_id}/participants")
def get_meeting_participants(meeting_id: str, db: Session = Depends(get_db)):
    """Get all participants for a meeting"""
    meeting = MeetingService.get_meeting_by_meeting_id(db, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    participants = MeetingService.get_meeting_participants(db, meeting.id)
    return participants
