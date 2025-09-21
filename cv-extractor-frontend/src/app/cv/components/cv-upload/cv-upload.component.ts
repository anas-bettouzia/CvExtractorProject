// src/app/cv/components/cv-upload/cv-upload.component.ts
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CvService } from '../../services/cv.service';

@Component({
  selector: 'app-cv-upload',
  templateUrl: './cv-upload.component.html',
  styleUrls: ['./cv-upload.component.scss'],
})
export class CvUploadComponent implements OnInit {
  selectedFile: File | null = null;
  isLoading = false;
  allowedExtensions = [
    '.pdf',
    '.docx',
    '.doc',
    '.txt',
    '.xlsx',
    '.xls',
    '.pptx',
    '.ppt',
  ];
  maxFileSize = 16 * 1024 * 1024; // 16MB

  // Messages d'alerte
  alertMessage = '';
  alertType: 'success' | 'danger' | 'warning' | 'info' = 'info';
  showAlert = false;

  constructor(private cvService: CvService, private router: Router) {}

  ngOnInit(): void {}
  // Ajoutez cette propriété à votre composant
showDuplicateModal = false;
duplicateResponse: any = null;


// Modifiez showDuplicateWarning
showDuplicateWarning(response: any): void {
  this.duplicateResponse = response;
  this.showDuplicateModal = true;
}

// Méthode pour fermer le modal
closeDuplicateModal(): void {
  this.showDuplicateModal = false;
  this.duplicateResponse = null;
}

// Méthode pour remplacer le CV
replaceExistingCV(): void {
  if (this.duplicateResponse && this.duplicateResponse.data && this.selectedFile) {
    console.log('Remplacer le CV:', this.duplicateResponse.data.id);
    
    this.isLoading = true;
    
    this.cvService.replaceCVWithFile(this.duplicateResponse.data.id, this.selectedFile).subscribe({
      next: (response) => {
        this.isLoading = false;
        
        if (response.success) {
          this.showSuccess('CV remplacé avec succès ! Redirection en cours...');
          this.cvService.storeCvInLocalStorage(this.selectedFile!);
          setTimeout(() => {
            this.router.navigate(['/cv/display']);
          }, 1500);
        } else {
          this.showError(response.message || 'Erreur lors du remplacement');
        }
        
        this.closeDuplicateModal();
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur remplacement CV:', error);
        this.showError("Erreur lors du remplacement du CV");
        this.closeDuplicateModal();
      }
    });
  } else {
    console.error('Données manquantes pour le remplacement');
    this.closeDuplicateModal();
  }
}



  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      if (this.validateFile(file)) {
        this.selectedFile = file;
        this.hideAlert();
      }
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.add('drag-over');
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('drag-over');
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const dropZone = event.currentTarget as HTMLElement;
    dropZone.classList.remove('drag-over');

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (this.validateFile(file)) {
        this.selectedFile = file;
        this.hideAlert();
      }
    }
  }

  validateFile(file: File): boolean {
    // Vérifier l'extension
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!this.allowedExtensions.includes(fileExtension)) {
      this.showError(
        `Format non supporté. Formats acceptés: ${this.allowedExtensions.join(
          ', '
        )}`
      );
      return false;
    }

    // Vérifier la taille
    if (file.size > this.maxFileSize) {
      this.showError('Le fichier est trop volumineux. Taille maximale: 16MB');
      return false;
    }

    return true;
  }

uploadCV(): void {
  if (!this.selectedFile) {
    this.showError('Veuillez sélectionner un fichier');
    return;
  }

  this.isLoading = true;
  this.hideAlert();

  console.log('Début de l\'upload...');

  this.cvService.uploadCV(this.selectedFile).subscribe({
    next: (response) => {
      console.log('Réponse reçue:', response);
      console.log('is_duplicate:', response.is_duplicate);
      console.log('success:', response.success);
      
      if (response.is_duplicate) {
        console.log('Doublon détecté, affichage du modal...');
        this.showDuplicateWarning(response);
      } else if (response.success) {
        console.log('CV traité avec succès, redirection...');

        this.cvService.storeCvInLocalStorage(this.selectedFile!);

        this.showSuccess('CV traité avec succès ! Redirection en cours...');
        setTimeout(() => {
          this.router.navigate(['/cv/display']);
        }, 1500);
      } else {
        console.log('Erreur de traitement:', response.message);
        this.showError(response.message || 'Erreur lors du traitement');
      }
      this.isLoading = false;
    },
    error: (error) => {
      console.error('Erreur upload:', error);
      console.error('Détails de l\'erreur:', error.error);
      this.showError("Erreur lors de l'upload du fichier");
      this.isLoading = false;
    },
  });
  
}



  clearFile(): void {
    this.selectedFile = null;
    this.hideAlert();
  }

  private showSuccess(message: string): void {
    this.alertMessage = message;
    this.alertType = 'success';
    this.showAlert = true;
  }

  private showError(message: string): void {
    this.alertMessage = message;
    this.alertType = 'danger';
    this.showAlert = true;
  }

  private showWarning(message: string): void {
    this.alertMessage = message;
    this.alertType = 'warning';
    this.showAlert = true;
  }

  private showInfo(message: string): void {
    this.alertMessage = message;
    this.alertType = 'info';
    this.showAlert = true;
  }

  private hideAlert(): void {
    this.showAlert = false;
    this.alertMessage = '';
  }

  dismissAlert(): void {
    this.hideAlert();
  }

  getFileIcon(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'bi-file-earmark-pdf';
      case 'doc':
      case 'docx':
        return 'bi-file-earmark-word';
      case 'xls':
      case 'xlsx':
        return 'bi-file-earmark-excel';
      case 'ppt':
      case 'pptx':
        return 'bi-file-earmark-ppt';
      case 'txt':
        return 'bi-file-earmark-text';
      default:
        return 'bi-file-earmark';
    }
  }

  getFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getProgressBarColor(): string {
    if (this.selectedFile) {
      const sizeInMB = this.selectedFile.size / (1024 * 1024);
      if (sizeInMB > 12) return 'bg-warning';
      if (sizeInMB > 8) return 'bg-info';
      return 'bg-success';
    }
    return 'bg-primary';
  }
}
