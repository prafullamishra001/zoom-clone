from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application configuration settings"""
    
    # Database
    DATABASE_URL: str = "sqlite:///./zoom_clone.db"
    
    # CORS
    CORS_ORIGINS: list = ["*"]
    CORS_ALLOW_CREDENTIALS: bool = True
    CORS_ALLOW_METHODS: list = ["*"]
    CORS_ALLOW_HEADERS: list = ["*"]
    
    # Application
    APP_NAME: str = "Zoom Clone API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True
    
    # Meeting settings
    MEETING_ID_LENGTH: int = 10
    DEFAULT_MEETING_DURATION: int = 60  # minutes
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
