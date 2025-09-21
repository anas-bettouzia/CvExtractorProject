// src/app/cv/components/cv-display/cv-display.component.ts
import {
  Component,
  Input,
  OnDestroy,
  OnInit,
  HostListener,
} from '@angular/core';
import { CVData } from '../../models/cv.model';
import * as fileSaver from 'file-saver';
import { FormArray, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject, takeUntil, Observable } from 'rxjs';
import { CvService } from '../../services/cv.service';
import { firstValueFrom } from 'rxjs';

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

@Component({
  selector: 'app-cv-display',
  templateUrl: './cv-display.component.html',
  styleUrls: ['./cv-display.component.scss'],
})
export class CvDisplayComponent implements OnInit, OnDestroy {
  // Propriétés existantes
  @Input() currentCV: CVData | null = null;
  cvForm!: FormGroup;
  isEditMode = false;
  isFullscreen = false;

  // 🆕 Nouvelles propriétés pour la gestion de l'affichage des documents
 documentUrl: SafeResourceUrl | null = null;
  documentType: 'pdf' | 'word' | 'other' | null = null;
  isDocumentLoading = false;
  documentLoadError: string | null = null;
  documentInfo: DocumentInfo | null = null;
  conversionSupported = false;
  showConversionMessage = false;

  // Propriétés de sauvegarde
  isSaving = false;
  saveError: string | null = null;
  lastSavedData: CVData | null = null;
  saveSuccess = false;

  // Propriété pour le dropdown d'export
  isExportDropdownOpen = false;

  private destroy$ = new Subject<void>();

  constructor(
    private cvService: CvService,
    private fb: FormBuilder,
    private sanitizer: DomSanitizer
  ) {
    this.initializeForm();
  }

ngOnInit(): void {
  this.loadStoredDocument();
  this.checkConversionCapabilities();
  
  this.cvService.currentCV$.pipe(takeUntil(this.destroy$)).subscribe((cv) => {
    if (cv) {
      this.currentCV = cv;
      this.lastSavedData = { ...cv };
      this.populateForm();
      
      console.log('CV chargé, début chargement document...');
      
      // Reset des états avant rechargement
      this.resetDocumentDisplay();
      
      // Recharger le document quand le CV change
      setTimeout(() => {
        this.loadDocumentPreview();
      }, 500); // Petit délai pour laisser l'interface se stabiliser
    }
  });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    // Nettoyer les URLs d'objet
    if (this.documentUrl && typeof this.documentUrl === 'string') {
      URL.revokeObjectURL(this.documentUrl);
    }
  }



private checkConversionCapabilities(): void {
    this.cvService.checkConversionCapabilities().subscribe({
      next: (response) => {
        this.conversionSupported = response.conversion_available;
        console.log('Conversion supportée:', this.conversionSupported);
      },
      error: (error) => {
        console.warn('Impossible de vérifier les capacités de conversion:', error);
        this.conversionSupported = false;
      }
    });
  }

  // === NOUVELLES MÉTHODES POUR L'EXPORT ===

  // Méthode pour exporter dans différents formats
// Dans cv-display.component.ts
exportCV(format: 'json' | 'text' | 'onetech'): void {
  if (!this.currentCV?.id) {
    this.showErrorMessage('Aucun CV sélectionné pour l\'export');
    return;
  }

  // Ajouter la classe d'animation
  const exportBtn = document.querySelector('.btn-export');
  exportBtn?.classList.add('downloading');

  let exportObservable: Observable<Blob>;
  let filename: string;
  let fileType: string;

  switch (format) {
    case 'json':
      exportObservable = this.cvService.exportCVasJSON(this.currentCV.id);
      filename = `CV_${this.currentCV.informations_personnelles?.nom || 'export'}_${this.formatDate(new Date())}.json`;
      fileType = 'application/json';
      break;
    
    case 'text':
      exportObservable = this.cvService.exportCVasText(this.currentCV.id);
      filename = `CV_${this.currentCV.informations_personnelles?.nom || 'export'}_${this.formatDate(new Date())}.txt`;
      fileType = 'text/plain';
      break;
    
    case 'onetech':
      exportObservable = this.cvService.exportCVasOneTech(this.currentCV.id);
      filename = `CV_${this.currentCV.informations_personnelles?.nom || 'export'}_OneTech_${this.formatDate(new Date())}.docx`;
      fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      break;
    
    default:
      return;
  }

  exportObservable.subscribe({
    next: (blob: Blob) => {
      const file = new Blob([blob], { type: fileType });
      fileSaver.saveAs(file, filename);

      // Retirer l'animation
      exportBtn?.classList.remove('downloading');

      this.showSuccessMessage(`Export ${format} réussi !`);
      this.isExportDropdownOpen = false;
    },
    error: (error) => {
      exportBtn?.classList.remove('downloading');
      console.error(`Erreur export ${format}:`, error);
      this.showErrorMessage(`Erreur lors de l'export ${format}`);
      this.isExportDropdownOpen = false;
    }
  });
}

  // Méthode pour basculer le dropdown d'export
  toggleExportDropdown(): void {
    this.isExportDropdownOpen = !this.isExportDropdownOpen;
  }

  // Méthode pour fermer le dropdown d'export
  closeExportDropdown(): void {
    this.isExportDropdownOpen = false;
  }

  // Méthode utilitaire pour formater la date
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

private async getDocumentInfo(): Promise<DocumentInfo | null> {
  if (!this.currentCV?.id) {
    return null;
  }

  try {
    const info = await firstValueFrom(this.cvService.getDocumentInfo(this.currentCV.id));
    console.log('Info document récupérée:', info);
    return info;
  } catch (error) {
    console.error('Erreur récupération info document:', error);
    return null;
  }
}

  // 🆕 NOUVELLE MÉTHODE: Chargement du document original
private async loadDocumentPreview(): Promise<void> {
  if (!this.currentCV?.id || !this.currentCV?.filename_original) {
    console.log('Pas de CV ou filename pour preview');
    this.resetDocumentDisplay();
    return;
  }

  console.log(`Début chargement document: ${this.currentCV.filename_original}`);

  this.isDocumentLoading = true;
  this.documentLoadError = null;
  this.showConversionMessage = false;

  try {
    // 1. Récupérer les informations du document
    console.log('Récupération infos document...');
    const documentInfo = await this.getDocumentInfo();
    this.documentInfo = documentInfo;

    if (!documentInfo) {
      throw new Error('Informations du document non disponibles');
    }

    console.log('Infos document récupérées:', documentInfo);

    // 2. Déterminer le type de document
    const fileName = documentInfo.filename.toLowerCase();
    if (fileName.endsWith('.pdf')) {
      this.documentType = 'pdf';
    } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
      this.documentType = 'word';
    } else {
      this.documentType = 'other';
    }

    console.log('Type document détecté:', this.documentType);

    // 3. Gérer l'affichage selon le type et les capacités
    if (this.documentType === 'pdf') {
      console.log('Chargement direct PDF...');
      await this.loadDocumentForPreview();
    } else if (this.documentType === 'word') {
      if (documentInfo.can_preview && this.conversionSupported) {
        console.log('Chargement Word avec conversion...');
        await this.loadDocumentForPreview();
      } else {
        console.log('Word sans conversion disponible');
        this.handleWordDocumentWithoutConversion(documentInfo);
      }
    } else {
      console.log('Type de document non supporté:', this.documentType);
      this.documentLoadError = 'Aperçu non disponible pour ce format de fichier';
    }

  } catch (error) {
    console.error('Erreur chargement document:', error);
    this.documentLoadError = error instanceof Error ? error.message : 'Impossible de charger le document';
  } finally {
    this.isDocumentLoading = false;
  }
}

private async loadDocumentForPreview(): Promise<void> {
  if (!this.currentCV?.id) {
    return;
  }

  this.cvService.getOriginalDocument(this.currentCV.id).subscribe({
    next: (response: Blob) => {
      try {
        console.log(`Document reçu: ${response.size} bytes, type: ${response.type}`);
        
        // Vérifier que le blob contient des données
        if (response.size === 0) {
          throw new Error('Document vide reçu du serveur');
        }
        
        // Créer l'URL d'objet pour l'aperçu
        const objectUrl = URL.createObjectURL(response);
        this.documentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(objectUrl);

        // Déterminer le type final du document reçu
        if (response.type.includes('pdf') || this.documentInfo?.can_preview) {
          console.log('Document PDF affiché (original ou converti)');
          
          // Si c'était un document Word converti, afficher le message
          if (this.documentType === 'word' && this.documentInfo?.needs_conversion) {
            this.showConversionMessage = true;
            console.log('Document Word converti en PDF pour aperçu');
          }
        } else {
          console.log('Document reçu mais type non-PDF:', response.type);
        }

      } catch (error) {
        console.error("Erreur création URL document:", error);
        this.documentLoadError = 'Erreur lors du chargement du document';
      }
    },
    error: (error) => {
      console.error('Erreur chargement document:', error);
      
      // Gestion d'erreur améliorée selon le type
      if (error.message?.includes('Document non trouvé')) {
        this.documentLoadError = 'Le document original n\'est pas disponible sur le serveur';
      } else if (error.message?.includes('Backend non disponible')) {
        this.documentLoadError = 'Le serveur backend n\'est pas accessible';
      } else if (this.documentType === 'word' && !this.conversionSupported) {
        this.documentLoadError = 'Les documents Word ne peuvent pas être prévisualisés. La conversion PDF n\'est pas disponible.';
      } else {
        this.documentLoadError = error.message || 'Impossible de charger le document';
      }
    }
  });
}
async debugDocumentLoading(): Promise<void> {
  if (!this.currentCV?.id) {
    console.log('Aucun CV sélectionné pour debug');
    return;
  }

  console.log('=== DEBUG CHARGEMENT DOCUMENT ===');
  console.log('CV ID:', this.currentCV.id);
  console.log('Fichier original:', this.currentCV.filename_original);
  
  try {
    // Test de l'API de santé
    const healthCheck = await firstValueFrom(this.cvService.checkBackendConnection());
    console.log('Backend accessible:', healthCheck);
    
    // Test des infos document
    const docInfo = await firstValueFrom(this.cvService.getDocumentInfo(this.currentCV.id));
    console.log('Info document:', docInfo);
    
    // Test des capacités de conversion
    const conversionStatus = await firstValueFrom(this.cvService.checkConversionCapabilities());
    console.log('Capacités conversion:', conversionStatus);
    
  } catch (error) {
    console.error('Erreur debug:', error);
  }
}

  private handleWordDocumentWithoutConversion(documentInfo: DocumentInfo): void {
    this.documentUrl = null;
    
    if (documentInfo.conversion_available) {
      this.documentLoadError = 'Erreur de conversion du document Word';
    } else {
      this.documentLoadError = 'Les documents Word ne peuvent pas être prévisualisés. Veuillez télécharger le fichier.';
    }
  }

private resetDocumentDisplay(): void {
    this.documentUrl = null;
    this.documentType = null;
    this.documentInfo = null;
    this.isDocumentLoading = false;
    this.documentLoadError = null;
    this.showConversionMessage = false;
  }

  private loadStoredDocument(): void {
    const storedCv = this.cvService.getStoredCv();
    if (storedCv) {
      this.documentUrl = this.sanitizer.bypassSecurityTrustResourceUrl(storedCv.data);
      
      // Détection correcte du type de fichier
      const fileName = storedCv.name.toLowerCase();
      if (fileName.endsWith('.pdf')) {
        this.documentType = 'pdf';
      } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
        this.documentType = 'word';
      } else {
        this.documentType = 'other';
      }
    } else {
      this.resetDocumentDisplay();
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Vérifier si le document peut être affiché
  canDisplayDocument(): boolean {
    return this.documentType === 'pdf' || this.documentType === 'word';
  }

  // 🆕 NOUVELLE MÉTHODE: Obtenir le message d'erreur approprié
  getDocumentErrorMessage(): string {
    if (this.documentLoadError) {
      return this.documentLoadError;
    }

    if (this.documentType === 'word' && !this.conversionSupported) {
      return 'Les documents Word ne peuvent pas être prévisualisés. La conversion PDF n\'est pas disponible sur ce serveur.';
    }

    if (this.documentType === 'other') {
      return 'Aperçu non disponible pour ce format de fichier';
    }

    return 'Document non disponible';
  }



  // Télécharger le document original (inchangé mais amélioré)
  downloadOriginalCV(): void {
    if (!this.currentCV?.id || !this.currentCV?.filename_original) {
      console.error('Informations de CV manquantes pour le téléchargement');
      return;
    }

    console.log('Téléchargement du CV original:', this.currentCV.filename_original);

    this.cvService.downloadOriginalDocument(this.currentCV.id).subscribe({
      next: (response: Blob) => {
        const fileName = this.currentCV?.filename_original || 'document.pdf';
        fileSaver.saveAs(response, fileName);
      },
      error: (error) => {
        console.error('Erreur lors du téléchargement:', error);
        this.showErrorMessage('Erreur lors du téléchargement du document');
      },
    });
  }

  // 🆕 MISE À JOUR: Plein écran
  toggleFullscreen(): void {
    this.isFullscreen = !this.isFullscreen;

    if (this.isFullscreen) {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
  }

  // 🆕 NOUVELLE MÉTHODE: Rafraîchir l'aperçu du document
  refreshDocumentPreview(): void {
    this.loadDocumentPreview();
  }

  private initializeForm(): void {
    this.cvForm = this.fb.group({
      nom: ['', Validators.required],
      email: ['', [Validators.email]],
      telephone: [''],
      adresse: [''],
      experiences: this.fb.array([]),
      formations: this.fb.array([]),
      langues: this.fb.array([]),
    });
  }

  private populateForm(): void {
    if (!this.currentCV) return;

    const personalInfo = this.currentCV.informations_personnelles;

    this.cvForm.patchValue({
      nom: personalInfo?.nom || '',
      email: personalInfo?.email || '',
      telephone: personalInfo?.telephone || '',
      adresse: personalInfo?.adresse || '',
    });

    this.clearFormArray('experiences');
    if (this.currentCV.experience_professionnelle) {
      this.currentCV.experience_professionnelle.forEach((exp) => {
        this.addExperienceToForm(exp);
      });
    }

    this.clearFormArray('formations');
    if (this.currentCV.formations_academiques) {
      this.currentCV.formations_academiques.forEach((formation) => {
        this.addFormationToForm(formation);
      });
    }

    this.clearFormArray('langues');
    if (this.currentCV.competences_linguistiques) {
      this.currentCV.competences_linguistiques.forEach((langue) => {
        this.addLangueToForm(langue);
      });
    }
  }

  private clearFormArray(arrayName: string): void {
    const formArray = this.cvForm.get(arrayName) as FormArray;
    while (formArray.length !== 0) {
      formArray.removeAt(0);
    }
  }

  private addExperienceToForm(exp?: any): void {
    const experienceGroup = this.fb.group({
      poste: [exp?.poste || '', Validators.required],
      entreprise: [exp?.entreprise || '', Validators.required],
      periode: [exp?.periode || '', Validators.required],
      description: [exp?.description || ''],
    });

    this.getExperiencesFormArray().push(experienceGroup);
  }

  private addFormationToForm(formation?: any): void {
    const formationGroup = this.fb.group({
      diplome: [formation?.diplome || '', Validators.required],
      etablissement: [formation?.etablissement || '', Validators.required],
      annee: [formation?.annee || '', Validators.required],
      mention: [formation?.mention || ''],
    });

    this.getFormationsFormArray().push(formationGroup);
  }

  private addLangueToForm(langue?: any): void {
    const langueGroup = this.fb.group({
      langue: [langue?.langue || '', Validators.required],
      niveau: [langue?.niveau || '', Validators.required],
    });

    this.getLanguesFormArray().push(langueGroup);
  }

  getExperiencesFormArray(): FormArray {
    return this.cvForm.get('experiences') as FormArray;
  }

  getFormationsFormArray(): FormArray {
    return this.cvForm.get('formations') as FormArray;
  }

  getLanguesFormArray(): FormArray {
    return this.cvForm.get('langues') as FormArray;
  }

  toggleEditMode(): void {
    if (this.isSaving) {
      return;
    }

    this.isEditMode = !this.isEditMode;
    this.saveError = null;
    this.saveSuccess = false;

    if (this.isEditMode) {
      if (this.currentCV) {
        this.lastSavedData = { ...this.currentCV };
      }
      this.cvForm.enable();
    } else {
      this.cvForm.disable();
      if (this.hasUnsavedChanges()) {
        this.cancelChanges();
      }
    }
  }

  addExperience(): void {
    this.addExperienceToForm();
  }

  removeExperience(index: number): void {
    this.getExperiencesFormArray().removeAt(index);
    if (this.isEditMode) {
      this.updateCurrentCVExperiences();
    }
  }

  addFormation(): void {
    this.addFormationToForm();
  }

  removeFormation(index: number): void {
    this.getFormationsFormArray().removeAt(index);
    if (this.isEditMode) {
      this.updateCurrentCVFormations();
    }
  }

  addLangue(): void {
    this.addLangueToForm();
  }

  removeLangue(index: number): void {
    this.getLanguesFormArray().removeAt(index);
    if (this.isEditMode) {
      this.updateCurrentCVLangues();
    }
  }

  addSkill(skill: string): void {
    if (!skill?.trim() || !this.currentCV) {
      return;
    }

    const trimmedSkill = skill.trim();

    if (this.currentCV.competences_techniques?.includes(trimmedSkill)) {
      this.showErrorMessage('Cette compétence existe déjà');
      return;
    }

    const newSkills = [
      ...(this.currentCV.competences_techniques || []),
      trimmedSkill,
    ];
    this.currentCV.competences_techniques = newSkills;

    if (this.currentCV.id) {
      this.saveFieldsToBackend({
        competences_techniques: newSkills,
      });
    }
  }

  removeSkill(index: number): void {
    if (
      !this.currentCV?.competences_techniques ||
      index < 0 ||
      index >= this.currentCV.competences_techniques.length
    ) {
      return;
    }

    const newSkills = [...this.currentCV.competences_techniques];
    newSkills.splice(index, 1);
    this.currentCV.competences_techniques = newSkills;

    if (this.currentCV.id) {
      this.saveFieldsToBackend({
        competences_techniques: newSkills,
      });
    }
  }

onSaveChanges(): void {
  if (!this.cvForm.valid) {
    this.showErrorMessage('Veuillez corriger les erreurs du formulaire avant de sauvegarder');
    return;
  }

  if (!this.currentCV?.id) {
    this.showErrorMessage('Impossible de sauvegarder: ID du CV manquant');
    return;
  }

  this.isSaving = true;
  this.saveError = null;
  this.saveSuccess = false;

  try {
    const formValue = this.cvForm.value;

    const updatedCV: CVData = {
      ...this.currentCV,
      informations_personnelles: {
        ...this.currentCV.informations_personnelles,
        nom: formValue.nom || null,
        email: formValue.email || null,
        telephone: formValue.telephone || null,
        adresse: formValue.adresse || null,
      },
      experience_professionnelle: this.getExperiencesFormArray().value || [],
      formations_academiques: this.getFormationsFormArray().value || [],
      competences_linguistiques: this.getLanguesFormArray().value || [],
      updated_at: new Date().toISOString(),
    };

    console.log('💾 Sauvegarde en cours...', updatedCV);

    this.cvService.updateCV(updatedCV).subscribe({
      next: (response) => {
        this.isSaving = false;
        
        if (response.success && response.data) {
          this.currentCV = response.data;
          this.lastSavedData = { ...response.data };
          this.saveError = null;

          this.populateForm();
          this.isEditMode = false;
          this.cvForm.disable();

          this.showSuccessMessage('✅ Modifications sauvegardées avec succès');
          this.saveSuccess = true;

          setTimeout(() => {
            this.saveSuccess = false;
          }, 3000);

          console.log('✅ CV sauvegardé:', response.data.id);
        } else {
          throw new Error(response.message || 'Erreur de sauvegarde');
        }
      },
      error: (error) => {
        this.isSaving = false;
        this.saveError = this.getErrorMessage(error);
        this.showErrorMessage(`❌ ${this.saveError}`);
        console.error('❌ Erreur sauvegarde:', error);
      },
    });
  } catch (error) {
    this.isSaving = false;
    this.saveError = 'Erreur lors de la préparation des données';
    this.showErrorMessage(`❌ ${this.saveError}`);
    console.error('❌ Erreur préparation:', error);
  }
}


  private saveFieldsToBackend(fields: Partial<CVData>): void {
    if (!this.currentCV?.id) {
      console.warn('⚠️ Impossible de sauvegarder: ID manquant');
      return;
    }

    console.log('💾 Sauvegarde partielle:', fields);

    this.cvService.updateCVFields(this.currentCV.id, fields).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.currentCV = response.data;
          console.log('✅ Champs sauvegardés');
        }
      },
      error: (error) => {
        console.error('❌ Erreur sauvegarde partielle:', error);
        this.showErrorMessage('Erreur lors de la sauvegarde automatique');
      },
    });
  }

  cancelChanges(): void {
    if (this.isSaving) {
      return;
    }

    if (this.lastSavedData) {
      this.currentCV = { ...this.lastSavedData };
    }

    this.populateForm();

    this.isEditMode = false;
    this.cvForm.disable();
    this.saveError = null;
    this.saveSuccess = false;

    console.log('🔄 Modifications annulées');
  }

  hasUnsavedChanges(): boolean {
    if (!this.isEditMode || !this.currentCV || !this.lastSavedData) {
      return false;
    }

    try {
      const formValue = this.cvForm.value;
      const originalInfo = this.lastSavedData.informations_personnelles;

      const personalInfoChanged =
        formValue.nom !== originalInfo?.nom ||
        formValue.email !== originalInfo?.email ||
        formValue.telephone !== originalInfo?.telephone ||
        formValue.adresse !== originalInfo?.adresse;

      const experiencesChanged =
        JSON.stringify(this.getExperiencesFormArray().value) !==
        JSON.stringify(this.lastSavedData.experience_professionnelle);

      const formationsChanged =
        JSON.stringify(this.getFormationsFormArray().value) !==
        JSON.stringify(this.lastSavedData.formations_academiques);

      const languesChanged =
        JSON.stringify(this.getLanguesFormArray().value) !==
        JSON.stringify(this.lastSavedData.competences_linguistiques);

      return (
        personalInfoChanged ||
        experiencesChanged ||
        formationsChanged ||
        languesChanged
      );
    } catch (error) {
      console.error('Erreur détection changements:', error);
      return false;
    }
  }

  private updateCurrentCVExperiences(): void {
    if (this.currentCV) {
      this.currentCV.experience_professionnelle =
        this.getExperiencesFormArray().value;
    }
  }

  private updateCurrentCVFormations(): void {
    if (this.currentCV) {
      this.currentCV.formations_academiques =
        this.getFormationsFormArray().value;
    }
  }

  private updateCurrentCVLangues(): void {
    if (this.currentCV) {
      this.currentCV.competences_linguistiques =
        this.getLanguesFormArray().value;
    }
  }

  resetForm(): void {
    this.populateForm();
  }

  getFileIcon(fileName: string): string {
    if (!fileName) return 'bi-file-earmark text-muted';

    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'bi-file-earmark-pdf text-danger';
      case 'doc':
      case 'docx':
        return 'bi-file-earmark-word text-primary';
      case 'xls':
      case 'xlsx':
        return 'bi-file-earmark-excel text-success';
      case 'ppt':
      case 'pptx':
        return 'bi-file-earmark-ppt text-warning';
      case 'txt':
        return 'bi-file-earmark-text text-secondary';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return 'bi-file-earmark-image text-info';
      default:
        return 'bi-file-earmark text-muted';
    }
  }

  getStatusIcon(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bi-check-circle-fill';
      case 'processing':
      case 'pending':
        return 'bi-hourglass-split';
      case 'error':
        return 'bi-x-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-success';
      case 'processing':
      case 'pending':
        return 'bg-warning';
      case 'error':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  }

  private getErrorMessage(error: any): string {
    if (error.error?.detail) {
      return error.error.detail;
    } else if (error.error?.message) {
      return error.error.message;
    } else if (error.message) {
      return error.message;
    } else {
      return 'Erreur de communication avec le serveur';
    }
  }

  private showSuccessMessage(message: string): void {
    // Vous pouvez implémenter un toast ou une alerte ici
    console.log('✅', message);
  }

  private showErrorMessage(message: string): void {
    // Vous pouvez implémenter un toast ou une alerte ici
    console.error('❌', message);
  }

  @HostListener('window:beforeunload', ['$event'])
  canDeactivate(event: BeforeUnloadEvent): boolean {
    if (this.hasUnsavedChanges()) {
      event.returnValue =
        'Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter?';
      return false;
    }
    return true;
  }

  exportAsJSON(): void {
    if (!this.currentCV) {
      console.error("Aucune donnée CV disponible pour l'export");
      return;
    }

    const dataStr = JSON.stringify(this.currentCV, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const filename = `cv_${this.currentCV.id || 'data'}_${this.formatDate(
      new Date()
    )}.json`;
    this.downloadFile(blob, filename);
  }

  exportAsText(): void {
    if (!this.currentCV) {
      console.error("Aucune donnée CV disponible pour l'export");
      return;
    }

    const text = this.generateTextVersion();
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const filename = `cv_${this.currentCV.id || 'data'}_${this.formatDate(
      new Date()
    )}.txt`;
    this.downloadFile(blob, filename);
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateTextVersion(): string {
    if (!this.currentCV) return '';

    let text = '';
    const info = this.currentCV.informations_personnelles;

    text += `CURRICULUM VITAE\n`;
    text += `${'='.repeat(50)}\n\n`;

    text += `INFORMATIONS PERSONNELLES\n`;
    text += `-`.repeat(25) + '\n';
    text += `Nom complet: ${info?.nom || 'Non renseigné'}\n`;
    text += `Email: ${info?.email || 'Non renseigné'}\n`;
    text += `Téléphone: ${info?.telephone || 'Non renseigné'}\n`;
    text += `Adresse: ${info?.adresse || 'Non renseigné'}\n\n`;

    if (this.currentCV.competences_techniques?.length) {
      text += `COMPÉTENCES TECHNIQUES\n`;
      text += `-`.repeat(21) + '\n';
      text += this.currentCV.competences_techniques.join(', ') + '\n\n';
    }

    if (this.currentCV.competences_linguistiques?.length) {
      text += `COMPÉTENCES LINGUISTIQUES\n`;
      text += `-`.repeat(25) + '\n';
      this.currentCV.competences_linguistiques.forEach((lang) => {
        text += `${lang.langue}: ${lang.niveau || 'Non spécifié'}\n`;
      });
      text += '\n';
    }

    if (this.currentCV.experience_professionnelle?.length) {
      text += `EXPÉRIENCE PROFESSIONNELLE\n`;
      text += `-`.repeat(26) + '\n';
      this.currentCV.experience_professionnelle.forEach((exp, index) => {
        text += `${index + 1}. ${exp.poste || 'Poste non spécifié'}\n`;
        text += `   Entreprise: ${exp.entreprise || 'Non spécifiée'}\n`;
        text += `   Période: ${exp.periode || 'Non spécifiée'}\n`;
        if (exp.description) {
          text += `   Description: ${exp.description}\n`;
        }
        text += '\n';
      });
    }

    if (this.currentCV.formations_academiques?.length) {
      text += `FORMATION\n`;
      text += `-`.repeat(9) + '\n';
      this.currentCV.formations_academiques.forEach((form, index) => {
        text += `${index + 1}. ${form.diplome || 'Diplôme non spécifié'}\n`;
        text += `   Établissement: ${form.etablissement || 'Non spécifié'}\n`;
        text += `   Année: ${form.annee || 'Non spécifiée'}`;
        if (form.mention) text += ` - ${form.mention}`;
        text += '\n\n';
      });
    }

    if (this.currentCV.certifications?.length) {
      text += `CERTIFICATIONS\n`;
      text += `-`.repeat(14) + '\n';
      this.currentCV.certifications.forEach((cert, index) => {
        text += `${index + 1}. ${cert}\n`;
      });
      text += '\n';
    }

    if (this.currentCV.metadonnees) {
      text += `MÉTADONNÉES\n`;
      text += `-`.repeat(11) + '\n';
      text += `Date d'extraction: ${
        this.currentCV.metadonnees.date_extraction || 'Non spécifiée'
      }\n`;
      text += `Nombre de mots: ${
        this.currentCV.metadonnees.nombre_mots || 'Non spécifié'
      }\n`;
      if (this.currentCV.metadonnees.taille_fichier_kb) {
        text += `Taille du fichier: ${this.currentCV.metadonnees.taille_fichier_kb} KB\n`;
      }
    }

    text += `\n${'='.repeat(50)}\n`;
    text += `Généré le ${new Date().toLocaleString('fr-FR')}\n`;

    return text;
  }

  @HostListener('document:click', ['$event'])
onDocumentClick(event: MouseEvent): void {
  const target = event.target as HTMLElement;
  const exportSection = document.querySelector('.export-section');
  
  if (exportSection && !exportSection.contains(target) && this.isExportDropdownOpen) {
    this.closeExportDropdown();
  }
}
}