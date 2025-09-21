#!/usr/bin/env python3
"""
Configuration et connexion MongoDB
"""

from motor.motor_asyncio import AsyncIOMotorClient
from app.config import get_settings

settings = get_settings()

# Variables globales pour la connexion
client: AsyncIOMotorClient = None # type: ignore
database = None

async def connect_to_mongo():
    """Établit la connexion à MongoDB"""
    global client, database
    try:
        print(f"🔌 Connexion à MongoDB: {settings.MONGODB_URI}")
        client = AsyncIOMotorClient(settings.MONGODB_URI)
        database = client[settings.MONGODB_DB_NAME]
        
        # Test de connexion
        await database.command("ping")
        print(f"✅ MongoDB connecté à la base: {settings.MONGODB_DB_NAME}")
        
        # Créer les index si nécessaire
        await create_indexes()
        
    except Exception as e:
        print(f"❌ Erreur connexion MongoDB: {e}")
        database = None
        raise

async def close_mongo_connection():
    """Ferme la connexion à MongoDB"""
    global client, database
    try:
        if client is not None:  # ✅ CORRECT
            client.close()
            print("✅ Connexion MongoDB fermée")
    except Exception as e:
        print(f"⚠️ Erreur fermeture MongoDB: {e}")
    finally:
        client = None
        database = None

def get_database():
    """Retourne la base de données MongoDB"""
    if database is None:  # ✅ CORRECT
        print("⚠️ Base de données non connectée")
        return None
    return database

async def create_indexes():
    """Crée les index nécessaires"""
    try:
        if database is None:  # ✅ CORRECT
            return
        
        cvs_collection = database["cvs"]
        
        # Index sur l'ID
        await cvs_collection.create_index("id", unique=True)
        
        # Index sur le hash de fichier pour éviter les doublons
        await cvs_collection.create_index("file_hash", unique=True)
        
        # Index sur les compétences pour la recherche
        await cvs_collection.create_index("competences_techniques")
        
        # Index sur le nom/email pour la recherche
        await cvs_collection.create_index("informations_personnelles.nom")
        await cvs_collection.create_index("informations_personnelles.email")
        
        print("✅ Index MongoDB créés")
        
    except Exception as e:
        print(f"⚠️ Erreur création index: {e}")

async def check_connection():
    """Vérifie l'état de la connexion"""
    try:
        if database is None:  # ✅ CORRECT
            return False
        
        await database.command("ping")
        return True
        
    except Exception as e:
        print(f"❌ Connexion MongoDB perdue: {e}")
        return False