export type Language = 'pl' | 'en';

export interface Checkpoint {
  id: string;
  name: string;
  hint: string;
  extraHint?: string;
  image?: string; // base64
  task: string;
  requirePhoto: boolean;
  requireAudio?: boolean;
  requireEvaluation?: boolean;
  requireAnswer?: boolean;
  answerType?: 'text' | 'choice';
  correctAnswer?: string;
  choices?: string[];
  qrNumber: number; // 1-30
  passcode?: string;
  lat?: number;
  lng?: number;
}

export interface CheckpointResult {
  checkpointId: string;
  photo?: string; // base64
  audio?: string; // base64
  bestPerformer?: string;
}

export interface GameSession {
  id: string;
  gameId: string;
  parentId: string;
  teamName: string;
  members: string[];
  results?: CheckpointResult[];
  timestamp: number;
}

export interface TeamInfo {
  name: string;
  members: string[];
}

export interface GameData {
  id: string;
  parentId: string;
  checkpoints: Checkpoint[];
  createdAt: number;
  verificationMethod?: 'qr' | 'passcode' | 'gps';
  gpsThreshold?: number; // in meters
  gpsViewMode?: 'radar' | 'map' | 'satellite';
  timeLimit?: number; // in minutes
  extraTimeLimit?: number; // in minutes
}
