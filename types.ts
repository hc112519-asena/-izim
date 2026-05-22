export enum AppMode {
  DASHBOARD = 'DASHBOARD',
  MAP_DRAWING = 'MAP_DRAWING',
  EXCAVATION_PLANNING = 'EXCAVATION_PLANNING',
  ARTIFACT_ILLUSTRATION = 'ARTIFACT_ILLUSTRATION',
  AI_STUDIO = 'AI_STUDIO', // Includes 3D, Text-to-Image, Image Editing
  TRANSLATION = 'TRANSLATION',
  EPIGRAPHY = 'EPIGRAPHY',
  PROFILE = 'PROFILE'
}

export enum AIJobType {
  TEXT_TO_IMAGE = 'TEXT_TO_IMAGE',
  IMAGE_EDITING = 'IMAGE_EDITING',
  RECONSTRUCTION_3D = 'RECONSTRUCTION_3D'
}

export enum ArchaeologicalPeriod {
  PALEOLITHIC = 'Paleolitik',
  NEOLITHIC = 'Neolitik',
  CHALCOLITHIC = 'Kalkolitik',
  BRONZE_AGE = 'Tunç Çağı',
  IRON_AGE = 'Demir Çağı',
  HELLENISTIC = 'Hellenistik',
  ROMAN = 'Roma Dönemi',
  BYZANTINE = 'Bizans Dönemi',
  ISLAMIC = 'İslami Dönem',
  MODERN = 'Modern/Yakın Dönem'
}

export enum ToolType {
  PEN = 'PEN',
  ERASER = 'ERASER',
  FILL = 'FILL',
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE'
}

export interface DrawingTool {
  name: string;
  icon: string;
  lineWidth: number;
  color: string;
}

export interface LogEntry {
  id: string;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error';
}