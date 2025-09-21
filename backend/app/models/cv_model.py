#!/usr/bin/env python3
"""
Modèles Pydantic pour les données CV - Version corrigée
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
import uuid

class PersonalInfo(BaseModel):
    """Informations personnelles - Champs optionnels"""
    nom: Optional[str] = Field(default="Non renseigné", description="Nom complet")
    email: Optional[str] = Field(default="Non renseigné", description="Adresse email")
    telephone: Optional[str] = Field(default="Non renseigné", description="Numéro de téléphone")
    adresse: Optional[str] = Field(default="Non renseigné", description="Adresse")

class Experience(BaseModel):
    """Expérience professionnelle"""
    periode: Optional[str] = Field(default="", description="Période de l'expérience")
    poste: Optional[str] = Field(default="", description="Intitulé du poste")
    entreprise: Optional[str] = Field(default="", description="Nom de l'entreprise")
    description: Optional[str] = Field(default="", description="Description des missions")

class Formation(BaseModel):
    """Formation académique"""
    annee: Optional[str] = Field(default="", description="Année de formation")
    diplome: Optional[str] = Field(default="", description="Nom du diplôme")
    etablissement: Optional[str] = Field(default="", description="Établissement")
    mention: Optional[str] = Field(default="", description="Mention obtenue")

class LanguageSkill(BaseModel):
    """Compétence linguistique"""
    langue: str = Field(description="Nom de la langue")
    niveau: Optional[str] = Field(default="Non spécifié", description="Niveau de maîtrise")

class CVMetadata(BaseModel):
    """Métadonnées du CV"""
    nombre_mots: int = Field(default=0, description="Nombre de mots dans le CV")
    date_extraction: str = Field(description="Date d'extraction en format string")  # CORRIGÉ: string au lieu de datetime
    apercu_texte: Optional[str] = Field(default="", description="Aperçu du texte")
    taille_fichier_kb: Optional[float] = Field(default=0.0, description="Taille du fichier en KB")

class CVData(BaseModel):
    """Structure complète d'un CV"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Identifiant unique du CV")
    
    # Informations personnelles
    informations_personnelles: PersonalInfo = Field(default_factory=PersonalInfo, description="Informations personnelles")
    
    # Compétences et expériences
    competences_techniques: List[str] = Field(default_factory=list, description="Liste des compétences techniques")
    experience_professionnelle: List[Experience] = Field(default_factory=list, description="Expériences professionnelles")
    formations_academiques: List[Formation] = Field(default_factory=list, description="Formations académiques")
    certifications: List[str] = Field(default_factory=list, description="Certifications")
    competences_linguistiques: List[LanguageSkill] = Field(default_factory=list, description="Compétences linguistiques")
    
    # Métadonnées
    type_document: str = Field(default="CV", description="Type de document")
    metadonnees: CVMetadata = Field(description="Métadonnées du CV")
    nlp_enrichment: Optional[dict] = Field(default=None, description="Enrichissement NLP")
    
    # Informations techniques
    filename_original: Optional[str] = Field(default=None, description="Nom du fichier original")
    file_hash: Optional[str] = Field(default=None, description="Hash MD5 du fichier")
    status: str = Field(default="processing", description="Statut du traitement")
    created_at: datetime = Field(default_factory=datetime.now, description="Date de création")
    updated_at: datetime = Field(default_factory=datetime.now, description="Date de mise à jour")

    class Config:
        """Configuration Pydantic"""
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

# === MODÈLES DE RÉPONSE API ===

class CVResponse(BaseModel):
    """Réponse API pour un CV"""
    success: bool
    message: Optional[str] = None
    data: Optional[CVData] = None
    error: Optional[str] = None
    is_duplicate: bool = False 

class CVListResponse(BaseModel):
    """Réponse API pour liste de CV"""
    success: bool
    data: List[CVData] = []
    total: int = 0
    message: Optional[str] = None