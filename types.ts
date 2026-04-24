
export interface ReadingMetrics {
  fluency: number;
  pronunciation: number;
  pacing: number;
  expression: number;
  accuracy: number;
  comprehension: number;
}

export interface AnalysisResult {
  overallScore: number;
  metrics: ReadingMetrics;
  feedback: string;
  transcription: string;
  strengths: string[];
  areasForImprovement: string[];
  estimatedWPM: number;
}

export interface ReadingRecord {
  id: string;
  studentName: string;
  timestamp: number;
  status: 'processing' | 'completed' | 'error';
  result?: AnalysisResult;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR'
}

export type ActiveView = 'STUDENT' | 'MANAGER' | 'TEST';
