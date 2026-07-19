from sqlalchemy.orm import Session
from typing import Optional, List
from datetime import datetime, timedelta
from models import Meeting, Participant
from schemas import MeetingCreate, Meeting as MeetingSchema, ScheduleMeetingRequest
from utils import generate_meeting_id


class MeetingService:
    """Service for meeting-related business logic"""
    
    @staticmethod
    def get_meeting_by_id(db: Session, meeting_id: int) -> Optional[Meeting]:
        """Get meeting by database ID"""
        return db.query(Meeting).filter(Meeting.id == meeting_id).first()
    
    @staticmethod
    def get_meeting_by_meeting_id(db: Session, meeting_id: str) -> Optional[Meeting]:
        """Get meeting by meeting ID (the 10-digit code)"""
        return db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    
    @staticmethod
    def create_instant_meeting(db: Session, host_id: int) -> MeetingSchema:
        """Create an instant meeting"""
        meeting_id = generate_meeting_id()
        
        db_meeting = Meeting(
            meeting_id=meeting_id,
            title="Instant Meeting",
            host_id=host_id,
            is_active=True
        )
        db.add(db_meeting)
        db.commit()
        db.refresh(db_meeting)
        return MeetingSchema.model_validate(db_meeting)
    
    @staticmethod
    def schedule_meeting(db: Session, meeting: ScheduleMeetingRequest, host_id: int) -> MeetingSchema:
        """Schedule a future meeting"""
        meeting_id = generate_meeting_id()
        
        db_meeting = Meeting(
            meeting_id=meeting_id,
            title=meeting.title,
            description=meeting.description,
            host_id=host_id,
            scheduled_time=meeting.scheduled_time,
            duration=meeting.duration,
            is_active=True
        )
        db.add(db_meeting)
        db.commit()
        db.refresh(db_meeting)
        return MeetingSchema.model_validate(db_meeting)
    
    @staticmethod
    def get_user_meetings(db: Session, user_id: int) -> List[Meeting]:
        """Get all meetings for a user (hosted)"""
        return db.query(Meeting).filter(Meeting.host_id == user_id).all()
    
    @staticmethod
    def get_upcoming_meetings(db: Session, user_id: int) -> List[Meeting]:
        """Get upcoming meetings for a user"""
        now = datetime.utcnow()
        return db.query(Meeting).filter(
            Meeting.host_id == user_id,
            Meeting.scheduled_time >= now,
            Meeting.is_active == True
        ).order_by(Meeting.scheduled_time).all()
    
    @staticmethod
    def get_recent_meetings(db: Session, user_id: int, limit: int = 5) -> List[Meeting]:
        """Get recent meetings for a user"""
        now = datetime.utcnow()
        return db.query(Meeting).filter(
            Meeting.host_id == user_id,
            Meeting.scheduled_time < now
        ).order_by(Meeting.scheduled_time.desc()).limit(limit).all()
    
    @staticmethod
    def end_meeting(db: Session, meeting_id: str) -> Optional[Meeting]:
        """End a meeting by setting is_active to False"""
        db_meeting = MeetingService.get_meeting_by_meeting_id(db, meeting_id)
        if db_meeting:
            db_meeting.is_active = False
            db.commit()
            db.refresh(db_meeting)
        return db_meeting
    
    @staticmethod
    def get_meeting_participants(db: Session, meeting_id: int) -> List[Participant]:
        """Get all participants for a meeting"""
        return db.query(Participant).filter(Participant.meeting_id == meeting_id).all()
