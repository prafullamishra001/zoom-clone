from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from schemas import UserCreate, User as UserSchema
from services import UserService

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("/", response_model=UserSchema)
def create_user(user: UserCreate, db: Session = Depends(get_db)):
    """Create a new user"""
    try:
        return UserService.create_user(db, user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{user_id}", response_model=UserSchema)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Get user by ID"""
    user = UserService.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserSchema.model_validate(user)
