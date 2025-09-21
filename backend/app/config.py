#!/usr/bin/env python3
"""
Configuration globale de l'application
"""

from pydantic_settings import BaseSettings
from typing import List
import os
from functools import lru_cache

class Settings(BaseSettings):
    """Configuration de l'application"""
    
    # Application
    DEBUG: bool = True
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # MongoDB
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "cv_parser_db"
    
    # Upload
    MAX_FILE_SIZE_MB: int = 16
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx", ".doc", ".txt", ".xlsx", ".xls", ".pptx", ".ppt"]
    UPLOAD_DIR: str = "uploads"
    
    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings() -> Settings:
    return Settings()