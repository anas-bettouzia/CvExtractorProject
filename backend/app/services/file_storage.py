# app/services/file_storage.py
import os
import tempfile
from typing import Optional
import hashlib
from datetime import datetime
import aiofiles

class FileStorageService:
    """Service de gestion du stockage des fichiers"""
    
    def __init__(self, storage_path: str = "uploads"):
        self.storage_path = storage_path
        # Créer le dossier s'il n'existe pas
        os.makedirs(storage_path, exist_ok=True)
        print(f"📁 Service de stockage initialisé: {storage_path}")
    
    async def store_file(self, file_content: bytes, cv_id: str, original_filename: str, replace_existing: bool = False) -> bool:
        """Stocke un fichier sur disque"""
        try:
            # Déterminer l'extension du fichier
            file_ext = os.path.splitext(original_filename)[1]
            stored_filename = f"{cv_id}{file_ext}"
            file_path = os.path.join(self.storage_path, stored_filename)
            
            # Si le fichier existe et qu'on ne veut pas remplacer, vérifier
            if os.path.exists(file_path) and not replace_existing:
                print(f"⚠️ Fichier existe déjà: {file_path}")
                return True  # Considérer comme succès si le fichier existe déjà
            
            # Supprimer l'ancien fichier s'il existe (pour le remplacement)
            if replace_existing and os.path.exists(file_path):
                try:
                    os.remove(file_path)
                    print(f"🗑️ Ancien fichier supprimé pour remplacement: {file_path}")
                except Exception as e:
                    print(f"⚠️ Erreur suppression ancien fichier: {e}")
            
            # Écrire le fichier de manière asynchrone
            async with aiofiles.open(file_path, 'wb') as f:
                await f.write(file_content)
            
            action = "remplacé" if replace_existing else "stocké"
            print(f"✅ Fichier {action}: {file_path}")
            return True
            
        except Exception as e:
            print(f"❌ Erreur stockage fichier {cv_id}: {e}")
            return False
    
    async def get_file_content(self, cv_id: str, original_filename: str) -> Optional[bytes]:
        """Récupère le contenu d'un fichier"""
        try:
            # Déterminer l'extension du fichier
            file_ext = os.path.splitext(original_filename)[1]
            stored_filename = f"{cv_id}{file_ext}"
            file_path = os.path.join(self.storage_path, stored_filename)
            
            if not os.path.exists(file_path):
                print(f"❌ Fichier non trouvé: {file_path}")
                return None
            
            # Lire le fichier de manière asynchrone
            async with aiofiles.open(file_path, 'rb') as f:
                content = await f.read()
            
            print(f"✅ Fichier récupéré: {file_path} ({len(content)} bytes)")
            return content
            
        except Exception as e:
            print(f"❌ Erreur lecture fichier {cv_id}: {e}")
            return None
    
    async def delete_file(self, cv_id: str, original_filename: str) -> bool:
        """Supprime un fichier"""
        try:
            file_ext = os.path.splitext(original_filename)[1]
            stored_filename = f"{cv_id}{file_ext}"
            file_path = os.path.join(self.storage_path, stored_filename)
            
            if os.path.exists(file_path):
                os.remove(file_path)
                print(f"🗑️ Fichier supprimé: {file_path}")
                return True
            else:
                print(f"⚠️ Fichier déjà supprimé ou introuvable: {file_path}")
                return True
                
        except Exception as e:
            print(f"❌ Erreur suppression fichier {cv_id}: {e}")
            return False
    
    def file_exists(self, cv_id: str, original_filename: str) -> bool:
        """Vérifie si un fichier existe"""
        try:
            file_ext = os.path.splitext(original_filename)[1]
            stored_filename = f"{cv_id}{file_ext}"
            file_path = os.path.join(self.storage_path, stored_filename)
            return os.path.exists(file_path)
        except:
            return False
    
    def get_file_size(self, cv_id: str, original_filename: str) -> int:
        """Retourne la taille d'un fichier en bytes"""
        try:
            file_ext = os.path.splitext(original_filename)[1]
            stored_filename = f"{cv_id}{file_ext}"
            file_path = os.path.join(self.storage_path, stored_filename)
            if os.path.exists(file_path):
                return os.path.getsize(file_path)
            return 0
        except:
            return 0