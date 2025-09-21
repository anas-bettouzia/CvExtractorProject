#!/usr/bin/env python3
"""
Controller CV - API Endpoints - Version complète
"""

from fastapi import APIRouter, File, UploadFile, HTTPException, Depends , Response
from fastapi.responses import JSONResponse, PlainTextResponse , StreamingResponse
import traceback
from typing import List, Dict, Any
import os
import tempfile
from datetime import datetime
from io import BytesIO
from app.services.cv_service import CVService
from app.models.cv_model import CVResponse, CVListResponse, CVData
from app.config import get_settings
from app.config import get_settings

settings = get_settings()

router = APIRouter()
cv_service = CVService() 

def get_cv_service() -> CVService:
    """Dependency injection pour CVService"""
    return cv_service

@router.post("/upload", response_model=CVResponse)
async def upload_cv(
    file: UploadFile = File(...),
    cv_service: CVService = Depends(get_cv_service)
):
    """Upload et parsing d'un CV avec vérification de doublon"""
    try:
        print(f"📤 Upload CV: {file.filename}")
        
        # Validation du fichier (code existant)
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nom de fichier manquant")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Format non supporté. Autorisés: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # Vérifier la taille
        content = await file.read()
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"Fichier trop volumineux. Max: {settings.MAX_FILE_SIZE_MB}MB"
            )



        # Vérifier les doublons et traiter
        cv_data, is_duplicate = await cv_service.check_and_process_cv(content, file.filename, file_ext)
        
        if is_duplicate:
            return CVResponse(
                success=False,
                message="Ce CV existe déjà dans la base de données",
                data=cv_data,
                is_duplicate=True


            )

        return CVResponse(
            success=True,
            message="CV traité avec succès",
            data=cv_data,
            is_duplicate=False  # ← Même quand ce n'est pas un doublon
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur upload CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))
        
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur upload CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/", response_model=CVListResponse)
async def get_all_cvs(cv_service: CVService = Depends(get_cv_service)):
    """Récupérer tous les CV"""
    try:
        print("📋 Récupération de tous les CV")
        cvs = await cv_service.get_all_cvs()
        return CVListResponse(
            success=True,
            data=cvs,
            total=len(cvs)
        )
    except Exception as e:
        print(f"❌ Erreur récupération CV: {e}")
        # Si MongoDB n'est pas connecté, retourner une liste vide
        return CVListResponse(
            success=True,
            data=[],
            total=0,
            message="Base de données non connectée"
        )

@router.get("/{cv_id}", response_model=CVResponse)
async def get_cv_by_id(
    cv_id: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """Récupérer un CV par ID"""
    try:
        print(f"🔍 Récupération CV: {cv_id}")
        cv_data = await cv_service.get_cv_by_id(cv_id)
        if not cv_data:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        return CVResponse(
            success=True,
            data=cv_data
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur récupération CV {cv_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{cv_id}", response_model=CVResponse)
async def update_cv(
    cv_id: str,
    cv_data: CVData,
    cv_service: CVService = Depends(get_cv_service)
):
    """Mise à jour complète d'un CV"""
    try:
        print(f"🔄 Mise à jour CV: {cv_id}")
        
        # Vérifier que l'ID correspond
        if cv_data.id != cv_id:
            raise HTTPException(status_code=400, detail="L'ID du CV ne correspond pas")
        
        # Mettre à jour la date de modification
        cv_data.updated_at = datetime.now()
        
        # Sauvegarder via le service
        updated_cv = await cv_service.update_cv(cv_data)
        
        if not updated_cv:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        return CVResponse(
            success=True,
            message="CV mis à jour avec succès",
            data=updated_cv
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur mise à jour CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{cv_id}", response_model=CVResponse)
async def update_cv_partial(
    cv_id: str,
    updates: Dict[str, Any],
    cv_service: CVService = Depends(get_cv_service)
):
    """Mise à jour partielle d'un CV - VERSION CORRIGÉE"""
    try:
        print(f"🔄 Mise à jour partielle CV: {cv_id}")
        print(f"📝 Champs à mettre à jour: {list(updates.keys())}")
        
        # Utiliser le service pour la mise à jour partielle
        updated_cv = await cv_service.update_cv_fields(cv_id, updates)
        
        if not updated_cv:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        return CVResponse(
            success=True,
            message="Champs mis à jour avec succès",
            data=updated_cv
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur mise à jour partielle CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{cv_id}")
async def delete_cv(
    cv_id: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """Supprimer un CV"""
    try:
        print(f"🗑️ Suppression CV: {cv_id}")
        result = await cv_service.delete_cv(cv_id)
        if not result:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        return {"success": True, "message": "CV supprimé"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur suppression CV: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/extract-text")
async def extract_text_only(
    file: UploadFile = File(...),
    cv_service: CVService = Depends(get_cv_service)
):
    """Extraire seulement le texte d'un fichier"""
    try:
        print(f"📄 Extraction texte: {file.filename}")
        
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nom de fichier manquant")

        content = await file.read()
        file_ext = os.path.splitext(file.filename)[1].lower()
        
        text = await cv_service.extract_text_only(content, file_ext)
        
        return {
            "success": True,
            "text": text,
            "length": len(text),
            "word_count": len(text.split()) if text else 0
        }
        
    except Exception as e:
        print(f"❌ Erreur extraction texte: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """Endpoint de vérification de santé"""
    return {
        "status": "healthy", 
        "timestamp": datetime.now().isoformat(),
        "service": "cv-extractor-api",
        "version": "1.0.0"
    }

@router.get("/search/skills")
async def search_cvs_by_skills(
    skills: str,  # Compétences séparées par des virgules
    cv_service: CVService = Depends(get_cv_service)
):
    """Rechercher des CV par compétences"""
    try:
        skills_list = [skill.strip() for skill in skills.split(',') if skill.strip()]
        if not skills_list:
            raise HTTPException(status_code=400, detail="Aucune compétence fournie")
        
        print(f"🔍 Recherche CV par compétences: {skills_list}")
        cvs = await cv_service.search_cvs_by_skills(skills_list)
        
        return CVListResponse(
            success=True,
            data=cvs,
            total=len(cvs),
            message=f"Trouvé {len(cvs)} CV(s) avec ces compétences"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur recherche par compétences: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{cv_id}/status")
async def update_cv_status(
    cv_id: str,
    status: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """Mettre à jour le statut d'un CV"""
    try:
        print(f"🔄 Mise à jour statut CV {cv_id}: {status}")
        
        valid_statuses = ["pending", "processing", "completed", "error", "not_saved"]
        if status not in valid_statuses:
            raise HTTPException(
                status_code=400, 
                detail=f"Statut invalide. Autorisés: {', '.join(valid_statuses)}"
            )
        
        result = await cv_service.update_cv_status(cv_id, status)
        if not result:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        return {"success": True, "message": f"Statut mis à jour: {status}"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur mise à jour statut: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    
@router.get("/{cv_id}/export/onetech")
async def export_cv_onetech(cv_id: str, service=Depends(CVService)):
    result = await service.export_cv_onetech(cv_id)
    if not result:
        raise HTTPException(status_code=404, detail="CV non trouvé")
    return result


@router.get("/{cv_id}/export/json")
async def export_cv_json(cv_id: str):
    cv_doc = await cv_service.export_cv_json(cv_id)
    return cv_doc

@router.get("/{cv_id}/export/text")
async def export_cv_text(
    cv_id: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """Exporte un CV au format texte"""
    try:
        print(f"📤 Export texte pour CV: {cv_id}")
        result = await cv_service.export_cv_text(cv_id)
        if not result:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        # Return as plain text with proper content type
        return PlainTextResponse(
            content=result,
            media_type="text/plain"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur export texte: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
    
# Remplacez la méthode replace_cv dans votre contrôleur par cette version corrigée :

@router.post("/{cv_id}/replace")
async def replace_cv(
    cv_id: str,
    file: UploadFile = File(...),
    cv_service: CVService = Depends(get_cv_service)
):
    """Remplacer un CV existant par un nouveau fichier - VERSION CORRIGÉE"""
    try:
        print(f"🔄 API: Remplacement du CV: {cv_id}")
        
        # Validation du fichier
        if not file.filename:
            raise HTTPException(status_code=400, detail="Nom de fichier manquant")
        
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"Format non supporté. Autorisés: {', '.join(settings.ALLOWED_EXTENSIONS)}"
            )

        # Vérifier la taille
        content = await file.read()
        if len(content) > settings.max_file_size_bytes:
            raise HTTPException(
                status_code=400,
                detail=f"Fichier trop volumineux. Max: {settings.MAX_FILE_SIZE_MB}MB"
            )

        # Utiliser la nouvelle méthode du service qui gère le fichier
        updated_cv = await cv_service.replace_cv_with_file(cv_id, content, file.filename, file_ext)
        
        if not updated_cv:
            raise HTTPException(status_code=404, detail="CV à remplacer non trouvé ou erreur lors du remplacement")
        
        updated_cv.status = "completed"

        return CVResponse(
            success=True,
            message="CV et fichier remplacés avec succès",
            data=updated_cv,
            is_duplicate=False
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ API: Erreur remplacement CV: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/{cv_id}/document")
async def get_original_document(
    cv_id: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """
    Récupère le document original pour aperçu (avec conversion automatique DOCX->PDF)
    """
    try:
        print(f"📄 API: Récupération document original: {cv_id}")
        
        # Récupérer le CV pour vérifier qu'il existe
        cv_data = await cv_service.get_cv_by_id(cv_id)
        if not cv_data:
            print(f"❌ API: CV non trouvé: {cv_id}")
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        if not cv_data.filename_original:
            print(f"❌ API: Nom de fichier manquant pour CV: {cv_id}")
            raise HTTPException(status_code=404, detail="Fichier original non disponible")
        
        print(f"📁 API: Fichier original: {cv_data.filename_original}")
        
        # Utiliser la méthode du service pour récupérer le document
        try:
            content, content_type, filename = await cv_service.get_document_for_preview(cv_id)
            print(f"📄 API: Service retourné - Content: {len(content) if content else 0} bytes, Type: {content_type}")
        except Exception as service_error:
            print(f"❌ API: Erreur service get_document_for_preview: {service_error}")
            raise HTTPException(status_code=500, detail=f"Erreur service: {str(service_error)}")
        
        if not content:
            print(f"❌ API: Contenu vide pour CV: {cv_id}")
            raise HTTPException(status_code=404, detail="Contenu du document non disponible")
        
        # Créer la réponse streaming
        print(f"✅ API: Envoi document - {len(content)} bytes, type: {content_type}")
        return StreamingResponse(
            BytesIO(content),
            media_type=content_type,
            headers={
                "Content-Disposition": f"inline; filename={filename}",
                "Cache-Control": "no-cache",
                "Content-Length": str(len(content))
            }
        )
        
    except HTTPException:
        # Relancer les HTTPException sans modification
        raise
    except Exception as e:
        print(f"❌ API: Erreur inattendue récupération document {cv_id}: {e}")
        print(f"Traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Erreur interne: {str(e)}")


@router.get("/{cv_id}/document/info")
async def get_document_info(
    cv_id: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """Récupère les informations sur le document"""
    try:
        cv_data = await cv_service.get_cv_by_id(cv_id)
        if not cv_data:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        file_ext = os.path.splitext(cv_data.filename_original or "")[1].lower()
        
        # Vérifier si la conversion est supportée
        conversion_available = False
        if hasattr(cv_service, 'document_converter'):
            conversion_available = cv_service.document_converter.is_conversion_available()
        
        return {
            "available": True,
            "filename": cv_data.filename_original,
            "size": getattr(cv_data.metadonnees, 'taille_fichier_kb', 0) if cv_data.metadonnees else 0,
            "type": file_ext,
            "can_preview": file_ext == '.pdf' or (file_ext in ['.docx', '.doc'] and conversion_available),
            "needs_conversion": file_ext in ['.docx', '.doc'],
            "conversion_available": conversion_available,
            "lastModified": cv_data.updated_at.isoformat() if cv_data.updated_at else None,
            "url": f"/api/cv/{cv_id}/document"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Erreur info document: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{cv_id}/document/download")
async def download_original_document(
    cv_id: str,
    cv_service: CVService = Depends(get_cv_service)
):
    """Télécharge le document original (sans conversion)"""
    try:
        print(f"⬇️ API: Téléchargement document original: {cv_id}")
        
        # Récupérer les métadonnées du CV
        cv_data = await cv_service.get_cv_by_id(cv_id)
        if not cv_data:
            raise HTTPException(status_code=404, detail="CV non trouvé")
        
        if not cv_data.filename_original:
            raise HTTPException(status_code=404, detail="Nom de fichier original non disponible")
        
        # Récupérer le contenu original directement
        original_content = await cv_service._get_original_file_content(cv_id)
        
        if not original_content:
            raise HTTPException(status_code=404, detail="Fichier original non disponible sur le serveur")
        
        # Déterminer le content-type
        file_ext = os.path.splitext(cv_data.filename_original)[1].lower()
        content_type = _get_content_type(file_ext)
        
        print(f"✅ API: Téléchargement - {len(original_content)} bytes")
        return StreamingResponse(
            BytesIO(original_content),
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename={cv_data.filename_original}",
                "Content-Length": str(len(original_content))
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ API: Erreur téléchargement: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Gardez uniquement la fonction utilitaire _get_content_type
def _get_content_type(file_extension: str) -> str:
    """Détermine le content-type selon l'extension"""
    content_types = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain',
    }
    return content_types.get(file_extension.lower(), 'application/octet-stream')



def _get_content_type(file_extension: str) -> str:
    """Détermine le content-type selon l'extension"""
    content_types = {
        '.pdf': 'application/pdf',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.doc': 'application/msword',
        '.txt': 'text/plain',
    }
    return content_types.get(file_extension.lower(), 'application/octet-stream')

# Endpoint pour vérifier les capacités de conversion
@router.get("/conversion/status")
async def get_conversion_status():
    """Vérifie le statut des capacités de conversion"""
    try:
        conversion_available = False
        supported_formats = []
        
        # Si le service a le converter
        if hasattr(cv_service, 'document_converter'):
            conversion_available = cv_service.document_converter.is_conversion_available()
            supported_formats = cv_service.document_converter.get_supported_formats()
        
        return {
            "conversion_available": conversion_available,
            "supported_formats": supported_formats,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        return {
            "conversion_available": False,
            "supported_formats": [],
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }
