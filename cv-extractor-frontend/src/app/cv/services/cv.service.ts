// src/app/cv/services/cv.service.ts
import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpHeaders,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { CVData, CVResponse, CVListResponse } from '../models/cv.model';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
// import { environment } from '../../environments/environment'; // Décommentez si vous avez ce fichier

interface DocumentInfo {
  available: boolean;
  filename: string;
  size: number;
  type: string;
  can_preview: boolean;
  needs_conversion: boolean;
  conversion_available: boolean;
  lastModified?: string;
  url?: string;
}
interface ConversionStatus {
  conversion_available: boolean;
  supported_formats: string[];
  timestamp: string;
}
@Injectable({
  providedIn: 'root',
})
export class CvService {
  private apiUrl = 'http://localhost:8000/api/cv';
  private currentCVSubject = new BehaviorSubject<CVData | null>(null);
  public currentCV$ = this.currentCVSubject.asObservable();

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {}

  // === MÉTHODES EXISTANTES ===

  uploadCV(file: File): Observable<CVResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post<CVResponse>(`${this.apiUrl}/upload`, formData).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentCVSubject.next(response.data);
        }
      }),
      catchError(this.handleError)
    );
  }

  getAllCVs(): Observable<CVListResponse> {
    return this.http
      .get<CVListResponse>(this.apiUrl)
      .pipe(catchError(this.handleError));
  }

  getCVById(id: string): Observable<CVResponse> {
    return this.http.get<CVResponse>(`${this.apiUrl}/${id}`).pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentCVSubject.next(response.data);
        }
      }),
      catchError(this.handleError)
    );
  }

  deleteCV(id: string): Observable<any> {
    return this.http
      .delete(`${this.apiUrl}/${id}`)
      .pipe(catchError(this.handleError));
  }

  extractText(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http
      .post(`${this.apiUrl}/extract-text`, formData)
      .pipe(catchError(this.handleError));
  }

  getPdfPreview(filename: string): Observable<Blob> {
    return this.http
      .get(`${this.apiUrl}/preview/${filename}`, {
        responseType: 'blob',
      })
      .pipe(catchError(this.handleError));
  }

  createPdfUrl(blob: Blob): SafeResourceUrl {
    const url = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
// Dans cv.service.ts
replaceCV(cvId: string, file: File): Observable<CVResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return this.http.post<CVResponse>(
    `${this.apiUrl}/${cvId}/replace`, 
    formData,
    {
      headers: this.getAuthHeaders()
    }
  ).pipe(
    tap((response) => {
      if (response.success && response.data) {
        this.currentCVSubject.next(response.data);
        console.log('✅ CV remplacé avec succès:', cvId);
      }
    }),
    catchError(this.handleError)
  );
}
  // === NOUVELLES MÉTHODES CORRIGÉES ===



  // 🔧 CORRIGÉ: Vérifier la disponibilité du document original
  checkDocumentAvailability(cvId: string): Observable<DocumentInfo> {
    const url = `${this.apiUrl}/${cvId}/document/info`;

    return this.http
      .get<DocumentInfo>(url, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((info) => {
          console.log(`ℹ️ Info document CV ${cvId}:`, info);
        }),
        catchError(this.handleError)
      );
  }

  // 🔧 CORRIGÉ: Mise à jour complète d'un CV (sans duplication)
updateCV(cvData: CVData): Observable<CVResponse> {
  // S'assurer que les dates sont correctement formatées
  const payload = {
    ...cvData,
    created_at: cvData.created_at ? new Date(cvData.created_at).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  return this.http
    .put<CVResponse>(`${this.apiUrl}/${cvData.id}`, payload, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentCVSubject.next(response.data);
          console.log('✅ CV mis à jour avec succès:', response.data.id);
        }
      }),
      catchError(this.handleError)
    );
}

  // 🔧 CORRIGÉ: Mise à jour partielle d'un CV (sans duplication)
updateCVFields(cvId: string, fields: Partial<CVData>): Observable<CVResponse> {
  // Ajouter la date de mise à jour
  const payload = {
    ...fields,
    updated_at: new Date().toISOString()
  };

  return this.http
    .patch<CVResponse>(`${this.apiUrl}/${cvId}`, payload, {
      headers: this.getAuthHeaders(),
    })
    .pipe(
      tap((response) => {
        if (response.success && response.data) {
          this.currentCVSubject.next(response.data);
          console.log(`✅ Champs CV ${cvId} mis à jour:`, Object.keys(fields));
        }
      }),
      catchError(this.handleError)
    );
}

  // === MÉTHODES UTILITAIRES ===

  setCurrentCV(cv: CVData | null): void {
    this.currentCVSubject.next(cv);
  }

  getCurrentCV(): CVData | null {
    return this.currentCVSubject.value;
  }

  hasCurrentCV(): boolean {
    return this.currentCVSubject.value !== null;
  }

  clearCurrentCV(): void {
    this.currentCVSubject.next(null);
  }

  // 🔧 CORRIGÉ: Vérifier la connexion au backend
  checkBackendConnection(): Observable<boolean> {
    return this.http
      .get(`${this.apiUrl}/health`, { responseType: 'text' })
      .pipe(
        tap(() => console.log('✅ Backend connecté')),
        map(() => true), // Convertir la réponse string en boolean
        catchError((error) => {
          console.warn('⚠️ Backend non disponible:', error.message);
          return of(false);
        })
      );
  }

  // 🔧 CORRIGÉ: Obtenir les en-têtes d'authentification
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('authToken');

    let headers = new HttpHeaders();

    // Ne pas définir Content-Type pour les requêtes multipart/form-data
    // Angular le fera automatiquement avec la bonne boundary

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  // 🔧 CORRIGÉ: Gestion des erreurs améliorée
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 400:
          errorMessage =
            error.error?.detail || error.error?.message || 'Requête invalide';
          break;
        case 401:
          errorMessage = 'Non autorisé - Veuillez vous reconnecter';
          break;
        case 403:
          errorMessage = 'Accès interdit';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 422:
          errorMessage =
            error.error?.detail || error.error?.message || 'Données invalides';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${
            error.error?.detail || error.error?.message || error.message
          }`;
      }
    }

    console.error('❌ Erreur service CV:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  };

  // === MÉTHODES UTILITAIRES SPÉCIALISÉES ===

getFileType(filename: string): 'pdf' | 'word' | 'other' {
  if (!filename) return 'other';
  
  const extension = filename.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'doc':
    case 'docx':
      return 'word';
    default:
      return 'other';
  }
}

  isPreviewSupported(filename: string): boolean {
    const fileType = this.getFileType(filename);
    return fileType === 'pdf' || fileType === 'word';
  }

  getDocumentApiUrl(
    cvId: string,
    action: 'view' | 'download' = 'view'
  ): string {
    const endpoint = action === 'download' ? 'download' : '';
    return `${this.apiUrl}/${cvId}/document${endpoint ? '/' + endpoint : ''}`;
  }

  validateCVData(cvData: Partial<CVData>): string[] {
    const errors: string[] = [];

    // Validation des informations personnelles
    if (cvData.informations_personnelles) {
      const info = cvData.informations_personnelles;

      if (!info.nom?.trim()) {
        errors.push('Le nom est requis');
      }

      if (info.email && !this.isValidEmail(info.email)) {
        errors.push("L'adresse email n'est pas valide");
      }
    }

    // Validation des expériences
    if (cvData.experience_professionnelle) {
      cvData.experience_professionnelle.forEach((exp, index) => {
        if (!exp.poste?.trim()) {
          errors.push(`Expérience ${index + 1}: Le poste est requis`);
        }
        if (!exp.entreprise?.trim()) {
          errors.push(`Expérience ${index + 1}: L'entreprise est requise`);
        }
      });
    }

    // Validation des formations
    if (cvData.formations_academiques) {
      cvData.formations_academiques.forEach((form, index) => {
        if (!form.diplome?.trim()) {
          errors.push(`Formation ${index + 1}: Le diplôme est requis`);
        }
        if (!form.etablissement?.trim()) {
          errors.push(`Formation ${index + 1}: L'établissement est requis`);
        }
      });
    }

    return errors;
  }

  formatFileSize(sizeInKB: number): string {
    if (sizeInKB < 1024) {
      return `${sizeInKB.toFixed(0)} KB`;
    } else if (sizeInKB < 1024 * 1024) {
      return `${(sizeInKB / 1024).toFixed(1)} MB`;
    } else {
      return `${(sizeInKB / (1024 * 1024)).toFixed(1)} GB`;
    }
  }

  // 🔧 CORRIGÉ: Validation email
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  // 🔧 CORRIGÉ: Log des actions pour debug (optionnel)
  private logAction(action: string, data?: any): void {
    // Commenté pour éviter l'erreur environment
    // if (environment.production) return;

    // En développement seulement
    if (window.location.hostname === 'localhost') {
      console.log(`🔧 CvService.${action}`, data || '');
    }
  }



  

  storeCvInLocalStorage(file: File): void {
  const reader = new FileReader();
  reader.onload = (event) => {
    const fileData = event.target?.result as string;
    localStorage.setItem('uploadedCv', fileData);
    localStorage.setItem('uploadedCvName', file.name);
  };
  reader.readAsDataURL(file);
}

getStoredCv(): { data: string, name: string } | null {
  const data = localStorage.getItem('uploadedCv');
  const name = localStorage.getItem('uploadedCvName');
  return data && name ? { data, name } : null;
}


// Export en JSON
// Dans cv.service.ts
exportCVasJSON(cvId: string): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/${cvId}/export/json`, {
    responseType: 'blob',
    headers: this.getAuthHeaders(),
    observe: 'response'
  }).pipe(
    map(response => {
      if (!response.ok) throw new Error('Erreur lors de l\'export JSON');
      if (!response.body) throw new Error('Réponse vide');
      return new Blob([response.body], { type: 'application/json' });
    }),
    tap(() => console.log(`📤 Export JSON des données structurées CV ${cvId}`)),
    catchError(this.handleError)
  );
}

exportCVasText(cvId: string): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/${cvId}/export/text`, {
    responseType: 'blob',
    headers: this.getAuthHeaders(),
    observe: 'response'
  }).pipe(
    map(response => {
      if (!response.ok) throw new Error('Erreur lors de l\'export texte');
      if (!response.body) throw new Error('Réponse vide');
      return new Blob([response.body], { type: 'text/plain' });
    }),
    tap(() => console.log(`📤 Export texte des données structurées CV ${cvId}`)),
    catchError(this.handleError)
  );
}

exportCVasOneTech(cvId: string): Observable<Blob> {
  return this.http.get(`${this.apiUrl}/${cvId}/export/onetech`, {
    responseType: 'blob',
    headers: this.getAuthHeaders()
  }).pipe(
    map(blob => {
      if (!blob) throw new Error("Réponse vide");
      return new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    }),
    tap(() => console.log(`📤 Export OneTech Word du CV ${cvId}`)),
    catchError(this.handleError)
  );
}
checkConversionCapabilities(): Observable<ConversionStatus> {
    return this.http
      .get<ConversionStatus>(`${this.apiUrl}/conversion/status`)
      .pipe(
        tap((status) => {
          console.log('Capacités de conversion:', status);
        }),
        catchError((error) => {
          console.warn('Erreur vérification conversion:', error);
          // Retourner un état par défaut en cas d'erreur
          return of({
            conversion_available: false,
            supported_formats: [],
            timestamp: new Date().toISOString()
          });
        })
      );
  }

  /**
   * Récupère les informations détaillées sur un document
   */
  getDocumentInfo(cvId: string): Observable<DocumentInfo> {
    return this.http
      .get<DocumentInfo>(`${this.apiUrl}/${cvId}/document/info`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap((info) => {
          console.log(`Document info pour CV ${cvId}:`, info);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Récupère le document original pour aperçu (avec conversion auto si nécessaire)
   */
getOriginalDocument(cvId: string): Observable<Blob> {
  const url = `${this.apiUrl}/${cvId}/document`;

  return this.http
    .get(url, {
      responseType: 'blob',
      headers: this.getAuthHeaders(),
      observe: 'response' // Permet de récupérer les headers de réponse
    })
    .pipe(
      map(response => {
        if (!response.body) {
          throw new Error('Réponse vide du serveur');
        }
        
        // Vérifier le content-type pour s'assurer que c'est un document valide
        const contentType = response.headers.get('content-type');
        console.log(`Document récupéré pour aperçu CV ${cvId}, type: ${contentType}`);
        
        return response.body;
      }),
      tap(() => {
        console.log(`✅ Document récupéré pour aperçu CV ${cvId}`);
      }),
      catchError((error) => {
        console.error(`❌ Erreur récupération document ${cvId}:`, error);
        
        // Gestion d'erreur améliorée
        let errorMessage = 'Erreur lors de la récupération du document';
        
        if (error.status === 404) {
          errorMessage = 'Document non trouvé ou non disponible';
        } else if (error.status === 500) {
          errorMessage = 'Erreur serveur lors de la récupération du document';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    );
}


  /**
   * Télécharge le document original (sans conversion)
   */
  downloadOriginalDocument(cvId: string): Observable<Blob> {
    const url = `${this.apiUrl}/${cvId}/document/download`;

    return this.http
      .get(url, {
        responseType: 'blob',
        headers: this.getAuthHeaders(),
      })
      .pipe(
        tap(() => {
          console.log(`Téléchargement document original CV ${cvId}`);
        }),
        catchError(this.handleError)
      );
  }

  /**
   * Crée une URL sécurisée pour affichage d'un blob
   */
  createSecureUrl(blob: Blob): SafeResourceUrl {
    const url = URL.createObjectURL(blob);
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }

 replaceCVWithFile(cvId: string, file: File): Observable<CVResponse> {
  const formData = new FormData();
  formData.append('file', file);

  return this.http.post<CVResponse>(
    `${this.apiUrl}/${cvId}/replace`, 
    formData,
    {
      headers: this.getAuthHeaders()
    }
  ).pipe(
    tap((response) => {
      if (response.success && response.data) {
        this.currentCVSubject.next(response.data);
        console.log('✅ CV et fichier remplacés avec succès:', cvId);
      }
    }),
    catchError(this.handleError)
  );
}

/**
 * Vérifie si un CV a un fichier associé disponible
 */
checkCVFileAvailability(cvId: string): Observable<{hasFile: boolean, canPreview: boolean}> {
  return this.getDocumentInfo(cvId).pipe(
    map(docInfo => ({
      hasFile: docInfo.available,
      canPreview: docInfo.can_preview
    })),
    catchError(() => of({hasFile: false, canPreview: false}))
  );
}
 
}


// === INTERFACES ===

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}




