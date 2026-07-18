from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import secrets
import uuid
import logging

from database import engine, get_db, Base
from models import User, Meeting, Participant
from schemas import (
    UserCreate, User as UserSchema,
    MeetingCreate, Meeting as MeetingSchema,
    ParticipantCreate, Participant as ParticipantSchema,
    JoinMeetingRequest, ScheduleMeetingRequest
)
from signaling import manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Zoom Clone API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_meeting_id():
    """Generate a unique 10-digit meeting ID"""
    while True:
        meeting_id = ''.join([str(secrets.randbelow(10)) for _ in range(10)])
        return meeting_id

@app.get("/")
def read_root():
    return {"message": "Zoom Clone API"}

# User endpoints
@app.post("/api/users/", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    db_user = User(
        name=user.name,
        email=user.email,
        display_name=user.display_name
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.get("/api/users/{user_id}", response_model=UserSchema)
def get_user(user_id: int, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == user_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user

# Meeting endpoints
@app.post("/api/meetings/instant", response_model=MeetingSchema)
def create_instant_meeting(host_id: int, db: Session = Depends(get_db)):
    """Create an instant meeting"""
    db_user = db.query(User).filter(User.id == host_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    meeting_id = generate_meeting_id()
    db_meeting = Meeting(
        meeting_id=meeting_id,
        host_id=host_id,
        title="Instant Meeting",
        is_active=True
    )
    db.add(db_meeting)
    db.commit()
    db.refresh(db_meeting)
    return db_meeting

@app.post("/api/meetings/schedule", response_model=MeetingSchema)
def schedule_meeting(meeting: ScheduleMeetingRequest, host_id: int, db: Session = Depends(get_db)):
    """Schedule a meeting"""
    db_user = db.query(User).filter(User.id == host_id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
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
    return db_meeting

@app.get("/api/meetings/{meeting_id}", response_model=MeetingSchema)
def get_meeting(meeting_id: str, db: Session = Depends(get_db)):
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    return db_meeting

@app.get("/api/meetings/user/{user_id}/upcoming")
def get_upcoming_meetings(user_id: int, db: Session = Depends(get_db)):
    """Get upcoming meetings for a user"""
    now = datetime.utcnow()
    meetings = db.query(Meeting).filter(
        Meeting.host_id == user_id,
        Meeting.scheduled_time >= now,
        Meeting.is_active == True
    ).order_by(Meeting.scheduled_time).all()
    return meetings

@app.get("/api/meetings/user/{user_id}/recent")
def get_recent_meetings(user_id: int, db: Session = Depends(get_db)):
    """Get recent meetings for a user"""
    now = datetime.utcnow()
    meetings = db.query(Meeting).filter(
        Meeting.host_id == user_id,
        Meeting.created_at >= now - timedelta(days=7)
    ).order_by(Meeting.created_at.desc()).all()
    return meetings

@app.get("/api/meetings/{meeting_id}/participants")
def get_meeting_participants(meeting_id: str, db: Session = Depends(get_db)):
    """Get all participants in a meeting"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    participants = db.query(Participant).filter(Participant.meeting_id == db_meeting.id).all()
    return participants

@app.post("/api/meetings/join")
def join_meeting(request: JoinMeetingRequest, db: Session = Depends(get_db)):
    """Join a meeting"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == request.meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    if not db_meeting.is_active:
        raise HTTPException(status_code=400, detail="Meeting is not active")
    
    # If display name is "Host", use the actual host user
    if request.display_name == "Host":
        db_user = db.query(User).filter(User.id == db_meeting.host_id).first()
        if not db_user:
            raise HTTPException(status_code=404, detail="Host user not found")
    else:
        # Create or get user
        db_user = db.query(User).filter(User.display_name == request.display_name).first()
        if not db_user:
            db_user = User(
                name=request.display_name,
                email=f"{request.display_name.lower().replace(' ', '.')}@example.com",
                display_name=request.display_name
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
    
    # Check if user already joined
    existing_participant = db.query(Participant).filter(
        Participant.meeting_id == db_meeting.id,
        Participant.user_id == db_user.id
    ).first()
    
    if existing_participant:
        return {"message": "Already joined", "meeting": db_meeting, "user": db_user}
    
    # Add participant
    participant = Participant(
        meeting_id=db_meeting.id,
        user_id=db_user.id
    )
    db.add(participant)
    db.commit()
    
    return {"message": "Successfully joined", "meeting": db_meeting, "user": db_user}

@app.post("/api/meetings/{meeting_id}/end")
def end_meeting(meeting_id: str, db: Session = Depends(get_db)):
    """End a meeting"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    db_meeting.is_active = False
    db.commit()
    return {"message": "Meeting ended"}

# Host control endpoints
@app.post("/api/meetings/{meeting_id}/mute-all")
def mute_all_participants(meeting_id: str, db: Session = Depends(get_db)):
    """Mute all participants in a meeting"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    participants = db.query(Participant).filter(Participant.meeting_id == db_meeting.id).all()
    for participant in participants:
        participant.is_muted = True
    db.commit()
    
    return {"message": "All participants muted"}

@app.post("/api/meetings/{meeting_id}/participants/{participant_id}/mute")
def mute_participant(meeting_id: str, participant_id: int, db: Session = Depends(get_db)):
    """Mute a specific participant"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    participant = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.meeting_id == db_meeting.id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    participant.is_muted = True
    db.commit()
    
    return {"message": "Participant muted"}

@app.post("/api/meetings/{meeting_id}/participants/{participant_id}/unmute")
def unmute_participant(meeting_id: str, participant_id: int, db: Session = Depends(get_db)):
    """Unmute a specific participant"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    participant = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.meeting_id == db_meeting.id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    participant.is_muted = False
    db.commit()
    
    return {"message": "Participant unmuted"}

@app.delete("/api/meetings/{meeting_id}/participants/{participant_id}")
def remove_participant(meeting_id: str, participant_id: int, db: Session = Depends(get_db)):
    """Remove a participant from the meeting"""
    db_meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id).first()
    if not db_meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    
    participant = db.query(Participant).filter(
        Participant.id == participant_id,
        Participant.meeting_id == db_meeting.id
    ).first()
    
    if not participant:
        raise HTTPException(status_code=404, detail="Participant not found")
    
    db.delete(participant)
    db.commit()
    
    return {"message": "Participant removed"}

# WebSocket signaling endpoint for WebRTC
@app.websocket("/ws/signaling/{meeting_id}/{user_id}")
async def websocket_signaling(websocket: WebSocket, meeting_id: str, user_id: str):
    await manager.connect(websocket, meeting_id, user_id)
    
    try:
        while True:
            data = await websocket.receive_json()
            message_type = data.get("type")
            
            if message_type == "offer":
                # Forward offer to target user
                target_user_id = data.get("target_user_id")
                if target_user_id:
                    await manager.send_to_user(meeting_id, target_user_id, {
                        "type": "offer",
                        "offer": data.get("offer"),
                        "sender_user_id": user_id
                    })
            
            elif message_type == "answer":
                # Forward answer to target user
                target_user_id = data.get("target_user_id")
                if target_user_id:
                    await manager.send_to_user(meeting_id, target_user_id, {
                        "type": "answer",
                        "answer": data.get("answer"),
                        "sender_user_id": user_id
                    })
            
            elif message_type == "ice_candidate":
                # Forward ICE candidate to target user
                target_user_id = data.get("target_user_id")
                if target_user_id:
                    await manager.send_to_user(meeting_id, target_user_id, {
                        "type": "ice_candidate",
                        "candidate": data.get("candidate"),
                        "sender_user_id": user_id
                    })
            
            elif message_type == "get_participants":
                # Send list of current participants
                participants = manager.get_participants(meeting_id)
                await manager.send_to_user(meeting_id, user_id, {
                    "type": "participants_list",
                    "participants": list(participants)
                })
    
    except WebSocketDisconnect:
        manager.disconnect(meeting_id, user_id)
        # Notify others that user left
        await manager.broadcast_to_meeting(meeting_id, {
            "type": "user_left",
            "user_id": user_id
        })
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(meeting_id, user_id)

# Seed data endpoint
@app.post("/api/seed")
def seed_database(db: Session = Depends(get_db)):
    """Seed database with sample data"""
    # Check if already seeded
    if db.query(User).count() > 0:
        return {"message": "Database already seeded"}
    
    # Create sample users
    users = [
        User(name="John Doe", email="john@example.com", display_name="John"),
        User(name="Jane Smith", email="jane@example.com", display_name="Jane"),
        User(name="Bob Johnson", email="bob@example.com", display_name="Bob"),
    ]
    for user in users:
        db.add(user)
    db.commit()
    
    # Create sample meetings
    now = datetime.utcnow()
    meetings = [
        Meeting(
            meeting_id=generate_meeting_id(),
            title="Team Standup",
            description="Daily team standup meeting",
            host_id=1,
            scheduled_time=now + timedelta(hours=2),
            duration=30,
            is_active=True
        ),
        Meeting(
            meeting_id=generate_meeting_id(),
            title="Project Review",
            description="Weekly project review",
            host_id=2,
            scheduled_time=now + timedelta(days=1),
            duration=60,
            is_active=True
        ),
        Meeting(
            meeting_id=generate_meeting_id(),
            title="Client Call",
            description="Client discussion",
            host_id=1,
            scheduled_time=now + timedelta(days=2),
            duration=45,
            is_active=True
        ),
    ]
    for meeting in meetings:
        db.add(meeting)
    db.commit()
    
    return {"message": "Database seeded successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
