export interface PersonalInfo {
  nom?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
}

export interface Experience {
  periode?: string;
  poste?: string;
  entreprise?: string;
  description?: string;
}

export interface Formation {
  annee?: string;
  diplome?: string;
  etablissement?: string;
  mention?: string;
}

export interface LanguageSkill {
  langue: string;
  niveau?: string;
}

export interface CVMetadata {
  nombre_mots: number;
  date_extraction: string;
  apercu_texte?: string;
  taille_fichier_kb?: number;
}

export interface CVData {
  id: string;
  informations_personnelles: PersonalInfo;
  competences_techniques: string[];
  experience_professionnelle: Experience[];
  formations_academiques: Formation[];
  certifications: string[];
  competences_linguistiques: LanguageSkill[];
  type_document: string;
  metadonnees: CVMetadata;
  nlp_enrichment?: any;
  filename_original?: string;
  file_hash?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface CVResponse {
  success: boolean;
  message?: string;
  data?: CVData;
  error?: string;
  is_duplicate?: boolean;
}

export interface CVListResponse {
  success: boolean;
  data: CVData[];
  total: number;
  message?: string;
}
