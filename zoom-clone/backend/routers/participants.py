from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import Participant as ParticipantSchema, JoinMeetingRequest, User as UserSchema, Meeting as MeetingSchema
from services import ParticipantService, MeetingService, UserService
from typing import List

router = APIRouter(prefix="/api/participants", tags=["participants"])


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


@router.delete("/{meeting_id}/{user_id}")
def remove_participant(meeting_id: int, user_id: int, db: Session = Depends(get_db)):
    """Remove a participant from a meeting"""
    success = ParticipantService.remove_participant(db, meeting_id, user_id)
    if not success:
        raise HTTPException(status_code=404, detail="Participant not found")
    return {"message": "Participant removed successfully"}


@router.put("/{meeting_id}/{user_id}/mute")
def mute_participant(meeting_id: int, user_id: int, is_muted: bool, db: Session = Depends(get_db)):
    """Mute/unmute a participant"""
    participant = ParticipantService.update_participant_mute_status(db, meeting_id, user_id, is_muted)
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    return {"message": "Participant mute status updated", "participant": participant}


@router.post("/{meeting_id}/mute-all")
def mute_all_participants(meeting_id: int, except_user_id: int = None, db: Session = Depends(get_db)):
    """Mute all participants in a meeting"""
    count = ParticipantService.mute_all_participants(db, meeting_id, except_user_id)
    return {"message": f"Muted {count} participants"}
