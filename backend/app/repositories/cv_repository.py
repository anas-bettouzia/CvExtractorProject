#!/usr/bin/env python3
"""
Repository CV - Accès aux données - Version complète
"""

from typing import List, Optional
from datetime import datetime
from bson import ObjectId
import traceback

from app.database.mongo_db import get_database
from app.models.cv_model import CVData

class CVRepository:
    """Repository pour la gestion complète des CV en base"""
    
    def __init__(self):
        self.collection_name = "cvs"
    
    def _get_collection(self):
        """Récupère la collection MongoDB"""
        try:
            db = get_database()
            if db is None:
                raise Exception("Base de données non connectée")
            
            collection = db[self.collection_name]
            return collection
        except Exception as e:
            print(f"❌ Erreur accès collection: {e}")
            raise


    
    async def create_cv(self, cv_data: CVData) -> Optional[CVData]:
        """Crée un nouveau CV en base"""
        try:
            print(f"💾 Sauvegarde CV: {cv_data.id}")
            collection = self._get_collection()
            
            # Convertir en dictionnaire pour MongoDB
            cv_dict = cv_data.dict()
            
            # Utiliser l'ID généré comme id, mais laisser MongoDB créer son propre _id
            # Ne pas définir _id manuellement, laisser MongoDB le générer
            if "_id" in cv_dict:
                cv_dict.pop("_id")
            
            # Sauvegarder
            result = await collection.insert_one(cv_dict)
            
            if result.inserted_id:
                print(f"✅ CV sauvegardé avec l'ID MongoDB: {result.inserted_id}")
                # Mettre à jour l'ID avec l'ObjectId généré par MongoDB
                cv_dict["_id"] = result.inserted_id
                return CVData(**cv_dict)
            else:
                print("❌ Échec de la sauvegarde")
                return None
                
        except Exception as e:
            print(f"❌ Erreur création CV: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def get_all_cvs(self) -> List[CVData]:
        """Récupère tous les CV"""
        try:
            print("📋 Récupération de tous les CV depuis MongoDB...")
            collection = self._get_collection()
            
            # Récupérer tous les documents
            cursor = collection.find({})
            cvs = []
            
            async for doc in cursor:
                try:
                    # Convertir _id en string si c'est un ObjectId
                    if isinstance(doc.get("_id"), ObjectId):
                        doc["id"] = str(doc["_id"])
                    elif "_id" in doc:
                        doc["id"] = doc["_id"]
                    
                    # Supprimer _id pour éviter les conflits avec le modèle Pydantic
                    doc.pop("_id", None)
                    
                    # Créer l'objet CVData
                    cv_data = CVData(**doc)
                    cvs.append(cv_data)
                    
                except Exception as e:
                    print(f"⚠️ Erreur conversion document: {e}")
                    continue
            
            print(f"✅ {len(cvs)} CV(s) récupéré(s)")
            return cvs
            
        except Exception as e:
            print(f"❌ Erreur récupération tous CV: {e}")
            return []
    
    async def get_cv_by_id(self, cv_id: str) -> Optional[CVData]:
        """Récupère un CV par son ID avec recherche flexible"""
        try:
            print(f"🔍 Repository: Recherche CV: {cv_id}")
            collection = self._get_collection()
            
            # Recherche avec plusieurs critères possibles
            query = {
                "$or": [
                    {"id": cv_id},
                    {"_id": cv_id}
                ]
            }
            
            # Si l'ID ressemble à un ObjectId, l'essayer aussi
            try:
                if ObjectId.is_valid(cv_id):
                    query["$or"].append({"_id": ObjectId(cv_id)})
            except Exception as e:
                print(f"⚠️ Erreur conversion ObjectId: {e}")
            
            cv_doc = await collection.find_one(query)
            
            if cv_doc:
                print(f"✅ CV trouvé en base: {cv_id}")
                # Normaliser l'ID
                if isinstance(cv_doc.get("_id"), ObjectId):
                    cv_doc["id"] = str(cv_doc["_id"])
                elif "_id" in cv_doc:
                    cv_doc["id"] = cv_doc["_id"]
                
                # Supprimer _id pour éviter les conflits avec Pydantic
                cv_doc.pop("_id", None)
                
                return CVData(**cv_doc)
                
            print(f"❌ CV non trouvé en base: {cv_id}")
            return None
            
        except Exception as e:
            print(f"❌ Erreur récupération CV {cv_id}: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            return None

    
    async def update_cv(self, cv_data: CVData) -> Optional[CVData]:
        """Met à jour un CV en base - VERSION CORRIGÉE"""
        try:
            print(f"💾 Mise à jour CV en base: {cv_data.id}")
            collection = self._get_collection()
            
            # Convertir en dictionnaire pour MongoDB
            cv_dict = cv_data.dict()
            
            # Gérer correctement l'ID - chercher par l'ID string
            # et conserver l'ObjectId original si existe
            query = {"id": cv_data.id}
            
            # Si on a un ObjectId valide, chercher aussi par _id
            try:
                if ObjectId.is_valid(cv_data.id):
                    query = {"_id": ObjectId(cv_data.id)}
            except:
                pass
            
            # Préparer les données pour la mise à jour
            update_data = {"$set": cv_dict}
            
            # Mise à jour avec update_one
            result = await collection.update_one(
                query,
                update_data,
                upsert=False  # Ne pas créer si n'existe pas
            )
            
            if result.modified_count > 0:
                print(f"✅ CV mis à jour en base: {cv_data.id}")
                return cv_data
            elif result.matched_count > 0:
                print(f"✅ CV trouvé mais inchangé: {cv_data.id}")
                return cv_data
            else:
                print(f"❌ CV non trouvé pour mise à jour: {cv_data.id}")
                # Essayer une recherche alternative
                alt_cv = await self.get_cv_by_id(cv_data.id)
                if alt_cv:
                    print(f"⚠️  CV trouvé avec recherche alternative, mais échec mise à jour")
                return None
                
        except Exception as e:
            print(f"❌ Erreur mise à jour CV en base {cv_data.id}: {e}")
            print(f"Traceback: {traceback.format_exc()}")
            return None

    async def update_cv_partial(self, cv_id: str, updates: dict) -> Optional[CVData]:
        """Met à jour partiellement un CV en base"""
        try:
            print(f"💾 Mise à jour partielle CV: {cv_id}")
            collection = self._get_collection()
            
            # Ajouter updated_at aux mises à jour
            updates["updated_at"] = datetime.now()
            
            # Mise à jour partielle avec $set
            result = await collection.update_one(
                {
                    "$or": [
                        {"_id": cv_id},
                        {"id": cv_id}
                    ]
                },
                {
                    "$set": updates
                }
            )
            
            if result.modified_count > 0:
                print(f"✅ CV partiellement mis à jour: {cv_id}")
                # Récupérer le CV mis à jour
                return await self.get_cv_by_id(cv_id)
            elif result.matched_count > 0:
                print(f"✅ CV trouvé mais inchangé: {cv_id}")
                return await self.get_cv_by_id(cv_id)
            else:
                print(f"❌ CV non trouvé pour mise à jour: {cv_id}")
                return None
                
        except Exception as e:
            print(f"❌ Erreur mise à jour partielle CV {cv_id}: {e}")
            return None
    
    async def delete_cv(self, cv_id: str) -> bool:
        """Supprime un CV"""
        try:
            print(f"🗑️ Suppression CV: {cv_id}")
            collection = self._get_collection()
            
            result = await collection.delete_one({
                "$or": [
                    {"_id": cv_id},
                    {"id": cv_id}
                ]
            })
            
            if result.deleted_count > 0:
                print(f"✅ CV supprimé: {cv_id}")
                return True
            else:
                print(f"❌ CV non trouvé pour suppression: {cv_id}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur suppression CV {cv_id}: {e}")
            return False
    
    async def update_cv_status(self, cv_id: str, status: str) -> bool:
        """Met à jour le statut d'un CV"""
        try:
            print(f"🔄 Mise à jour statut CV {cv_id}: {status}")
            collection = self._get_collection()
            
            result = await collection.update_one(
                {
                    "$or": [
                        {"_id": cv_id},
                        {"id": cv_id}
                    ]
                },
                {
                    "$set": {
                        "status": status,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            if result.modified_count > 0:
                print(f"✅ Statut mis à jour: {cv_id}")
                return True
            else:
                print(f"❌ Aucune modification pour: {cv_id}")
                return False
                
        except Exception as e:
            print(f"❌ Erreur mise à jour statut CV {cv_id}: {e}")
            return False
    
    async def search_by_skills(self, skills: List[str]) -> List[CVData]:
        """Recherche des CV par compétences"""
        try:
            print(f"🔍 Recherche par compétences: {skills}")
            collection = self._get_collection()
            
            # Recherche avec regex insensible à la casse
            query = {
                "competences_techniques": {
                    "$elemMatch": {
                        "$in": [
                            {"$regex": skill, "$options": "i"} for skill in skills
                        ]
                    }
                }
            }
            
            cursor = collection.find(query)
            cvs = []
            
            async for doc in cursor:
                try:
                    if isinstance(doc.get("_id"), ObjectId):
                        doc["id"] = str(doc["_id"])
                    elif "_id" in doc:
                        doc["id"] = doc["_id"]
                    
                    doc.pop("_id", None)
                    cv_data = CVData(**doc)
                    cvs.append(cv_data)
                    
                except Exception as e:
                    print(f"⚠️ Erreur conversion document: {e}")
                    continue
            
            print(f"✅ {len(cvs)} CV(s) trouvé(s) avec ces compétences")
            return cvs
            
        except Exception as e:
            print(f"❌ Erreur recherche par compétences: {e}")
            return []
    
    async def check_duplicate_hash(self, file_hash: str) -> Optional[CVData]:
        """Vérifie si un CV avec ce hash existe déjà"""
        try:
            print(f"🔍 Vérification doublon hash: {file_hash[:8]}...")
            collection = self._get_collection()
            
            doc = await collection.find_one({"file_hash": file_hash})
            
            if doc is None:
                return None
            
            if isinstance(doc.get("_id"), ObjectId):
                doc["id"] = str(doc["_id"])
            elif "_id" in doc:
                doc["id"] = doc["_id"]
            
            doc.pop("_id", None)
            return CVData(**doc)
            
        except Exception as e:
            print(f"❌ Erreur vérification doublon: {e}")
            return None
    
    async def get_cvs_by_status(self, status: str) -> List[CVData]:
        """Récupère les CV par statut"""
        try:
            print(f"🔍 Recherche CV par statut: {status}")
            collection = self._get_collection()
            
            cursor = collection.find({"status": status})
            cvs = []
            
            async for doc in cursor:
                try:
                    if isinstance(doc.get("_id"), ObjectId):
                        doc["id"] = str(doc["_id"])
                    elif "_id" in doc:
                        doc["id"] = doc["_id"]
                    
                    doc.pop("_id", None)
                    cv_data = CVData(**doc)
                    cvs.append(cv_data)
                    
                except Exception as e:
                    print(f"⚠️ Erreur conversion document: {e}")
                    continue
            
            print(f"✅ {len(cvs)} CV(s) trouvé(s) avec le statut: {status}")
            return cvs
            
        except Exception as e:
            print(f"❌ Erreur recherche par statut: {e}")
            return []
    
    async def get_cvs_by_date_range(self, start_date: datetime, end_date: datetime) -> List[CVData]:
        """Récupère les CV dans une plage de dates"""
        try:
            print(f"🔍 Recherche CV entre {start_date} et {end_date}")
            collection = self._get_collection()
            
            query = {
                "created_at": {
                    "$gte": start_date,
                    "$lte": end_date
                }
            }
            
            cursor = collection.find(query)
            cvs = []
            
            async for doc in cursor:
                try:
                    if isinstance(doc.get("_id"), ObjectId):
                        doc["id"] = str(doc["_id"])
                    elif "_id" in doc:
                        doc["id"] = doc["_id"]
                    
                    doc.pop("_id", None)
                    cv_data = CVData(**doc)
                    cvs.append(cv_data)
                    
                except Exception as e:
                    print(f"⚠️ Erreur conversion document: {e}")
                    continue
            
            print(f"✅ {len(cvs)} CV(s) trouvé(s) dans la plage de dates")
            return cvs
            
        except Exception as e:
            print(f"❌ Erreur recherche par date: {e}")
            return []
    
    async def count_cvs(self) -> int:
        """Compte le nombre total de CV"""
        try:
            collection = self._get_collection()
            count = await collection.count_documents({})
            print(f"📊 Nombre total de CV: {count}")
            return count
        except Exception as e:
            print(f"❌ Erreur comptage CV: {e}")
            return 0
    
    async def get_cv_stats(self) -> dict:
        """Récupère les statistiques des CV"""
        try:
            print("📊 Calcul des statistiques CV...")
            collection = self._get_collection()
            
            # Compter par statut
            pipeline = [
                {
                    "$group": {
                        "_id": "$status",
                        "count": {"$sum": 1}
                    }
                }
            ]
            
            cursor = collection.aggregate(pipeline)
            status_counts = {}
            
            async for doc in cursor:
                status_counts[doc["_id"]] = doc["count"]
            
            total_count = await self.count_cvs()
            
            stats = {
                "total": total_count,
                "by_status": status_counts,
                "success_rate": round(
                    (status_counts.get("completed", 0) / total_count * 100) if total_count > 0 else 0, 
                    2
                ),
                "last_updated": datetime.now().isoformat()
            }
            
            print(f"✅ Statistiques calculées: {stats}")
            return stats
            
        except Exception as e:
            print(f"❌ Erreur calcul statistiques: {e}")
            return {
                "total": 0,
                "by_status": {},
                "success_rate": 0,
                "last_updated": datetime.now().isoformat()
            }

    async def get_cv_by_any_id(self, cv_id: str) -> Optional[CVData]:
        """Récupère un CV par son ID avec recherche flexible"""
        try:
            print(f"🔍 Repository: Recherche flexible CV: {cv_id}")
            collection = self._get_collection()
            
            # Recherche avec plusieurs critères possibles
            query = {
                "$or": [
                    {"id": cv_id},
                    {"_id": cv_id}
                ]
            }
            
            # Si l'ID ressemble à un ObjectId, l'essayer aussi
            try:
                from bson import ObjectId
                if ObjectId.is_valid(cv_id):
                    query["$or"].append({"_id": ObjectId(cv_id)})
            except:
                pass
            
            cv_doc = await collection.find_one(query)
            
            if cv_doc:
                print(f"✅ Repository: CV trouvé avec recherche flexible: {cv_id}")
                # Normaliser l'ID
                if isinstance(cv_doc.get("_id"), ObjectId):
                    cv_doc["id"] = str(cv_doc["_id"])
                elif "_id" in cv_doc:
                    cv_doc["id"] = cv_doc["_id"]
                # Supprimer _id pour éviter les conflits avec le modèle Pydantic
                cv_doc.pop("_id", None)
                return CVData(**cv_doc)
            else:
                print(f"❌ Repository: CV non trouvé avec recherche flexible: {cv_id}")
                return None
                
        except Exception as e:
            print(f"❌ Erreur repository recherche flexible CV {cv_id}: {e}")
            return None
# 👉 Fonction utilitaire globale, hors classe
def get_cv_collection():
    db = get_database()
    return db["cvs"]
    