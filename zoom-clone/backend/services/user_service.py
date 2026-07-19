from sqlalchemy.orm import Session
from typing import Optional
from models import User
from schemas import UserCreate, User as UserSchema


class UserService:
    """Service for user-related business logic"""
    
    @staticmethod
    def get_user_by_id(db: Session, user_id: int) -> Optional[User]:
        """Get user by ID"""
        return db.query(User).filter(User.id == user_id).first()
    
    @staticmethod
    def get_user_by_email(db: Session, email: str) -> Optional[User]:
        """Get user by email"""
        return db.query(User).filter(User.email == email).first()
    
    @staticmethod
    def get_user_by_display_name(db: Session, display_name: str) -> Optional[User]:
        """Get user by display name"""
        return db.query(User).filter(User.display_name == display_name).first()
    
    @staticmethod
    def create_user(db: Session, user: UserCreate) -> UserSchema:
        """Create a new user"""
        # Check if user already exists
        existing_user = UserService.get_user_by_email(db, user.email)
        if existing_user:
            raise ValueError("User with this email already exists")
        
        db_user = User(
            name=user.name,
            email=user.email,
            display_name=user.display_name
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return UserSchema.model_validate(db_user)
    
    @staticmethod
    def get_or_create_user_by_display_name(db: Session, display_name: str) -> User:
        """Get existing user or create new one by display name"""
        db_user = UserService.get_user_by_display_name(db, display_name)
        if not db_user:
            db_user = User(
                name=display_name,
                email=f"{display_name.lower().replace(' ', '.')}@example.com",
                display_name=display_name
            )
            db.add(db_user)
            db.commit()
            db.refresh(db_user)
        return db_user
