#!/usr/bin/env python3
"""
Point d'entrée FastAPI - CV Parser System
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
from contextlib import asynccontextmanager

from app.config import get_settings
from app.database.mongo_db import connect_to_mongo, close_mongo_connection
from app.controllers.cv_controller import router as cv_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Gestionnaire du cycle de vie de l'application"""
    # Démarrage
    print("🚀 Démarrage de l'application CV Parser")
    await connect_to_mongo()
    os.makedirs("uploads", exist_ok=True)
    print("✅ Application initialisée")
    
    yield
    
    # Arrêt
    await close_mongo_connection()
    print("✅ Application arrêtée")

app = FastAPI(
    title="🎯 CV Parser System",
    description="Système de parsing CV et matching de missions",
    version="1.0.0",
    lifespan=lifespan
)

# CORS pour Angular
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(cv_router, prefix="/api/cv", tags=["CV"])

@app.get("/")
async def root():
    return {"message": "🎯 CV Parser API", "docs": "/docs"}

@app.get("/api/health")
async def health():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    print("🎯 Démarrage du serveur...")
    print(f"📡 API: http://localhost:{settings.PORT}")
    print(f"📖 Docs: http://localhost:{settings.PORT}/docs")
    
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG
    )