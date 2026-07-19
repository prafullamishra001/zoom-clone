from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import logging

from database import engine, get_db, Base
from models import User, Meeting
from routers import users_router, meetings_router, participants_router, signaling_router
from config import settings
from utils import generate_meeting_id

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    debug=settings.DEBUG
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=settings.CORS_ALLOW_CREDENTIALS,
    allow_methods=settings.CORS_ALLOW_METHODS,
    allow_headers=settings.CORS_ALLOW_HEADERS,
)

# Include routers
app.include_router(users_router)
app.include_router(meetings_router)
app.include_router(participants_router)
app.include_router(signaling_router)


@app.get("/")
def read_root():
    return {"message": "Zoom Clone API", "version": settings.APP_VERSION}


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
