from sqlalchemy.orm import Session
from typing import Optional, List
from models import Participant, User, Meeting
from schemas import Participant as ParticipantSchema
from services.user_service import UserService


class ParticipantService:
    """Service for participant-related business logic"""
    
    @staticmethod
    def add_participant(db: Session, meeting_id: int, user_id: int) -> ParticipantSchema:
        """Add a user as a participant to a meeting"""
        # Check if already a participant
        existing = db.query(Participant).filter(
            Participant.meeting_id == meeting_id,
            Participant.user_id == user_id
        ).first()
        
        if existing:
            return ParticipantSchema.model_validate(existing)
        
        participant = Participant(
            meeting_id=meeting_id,
            user_id=user_id
        )
        db.add(participant)
        db.commit()
        db.refresh(participant)
        return ParticipantSchema.model_validate(participant)
    
    @staticmethod
    def get_participant(db: Session, meeting_id: int, user_id: int) -> Optional[Participant]:
        """Get a specific participant"""
        return db.query(Participant).filter(
            Participant.meeting_id == meeting_id,
            Participant.user_id == user_id
        ).first()
    
    @staticmethod
    def remove_participant(db: Session, meeting_id: int, user_id: int) -> bool:
        """Remove a participant from a meeting"""
        participant = ParticipantService.get_participant(db, meeting_id, user_id)
        if participant:
            db.delete(participant)
            db.commit()
            return True
        return False
    
    @staticmethod
    def update_participant_mute_status(db: Session, meeting_id: int, user_id: int, is_muted: bool) -> Optional[Participant]:
        """Update participant mute status"""
        participant = ParticipantService.get_participant(db, meeting_id, user_id)
        if participant:
            participant.is_muted = is_muted
            db.commit()
            db.refresh(participant)
        return participant
    
    @staticmethod
    def mute_all_participants(db: Session, meeting_id: int, except_user_id: Optional[int] = None) -> int:
        """Mute all participants in a meeting"""
        query = db.query(Participant).filter(Participant.meeting_id == meeting_id)
        if except_user_id:
            query = query.filter(Participant.user_id != except_user_id)
        
        participants = query.all()
        for participant in participants:
            participant.is_muted = True
        
        db.commit()
        return len(participants)
    
    @staticmethod
    def get_meeting_participants_with_users(db: Session, meeting_id: int) -> List[dict]:
        """Get all participants for a meeting with user details"""
        participants = db.query(Participant).filter(
            Participant.meeting_id == meeting_id
        ).all()
        
        result = []
        for participant in participants:
            user = UserService.get_user_by_id(db, participant.user_id)
            if user:
                result.append({
                    "id": participant.id,
                    "user_id": user.id,
                    "display_name": user.display_name,
                    "is_muted": participant.is_muted,
                    "is_video_on": participant.is_video_on,
                    "joined_at": participant.joined_at
                })
        
        return result
