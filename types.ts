
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

export type Shift = 'Manhã' | 'Tarde';
export type Grade = '1º Ano' | '2º Ano' | '3º Ano' | '4º Ano' | '5º Ano' | '6º Ano' | '7º Ano' | '8º Ano' | '9º Ano';

export interface ReadingRecord {
  id: string;
  studentName: string;
  timestamp: number;
  status: 'processing' | 'completed' | 'error';
  result?: AnalysisResult;
  classroom?: string;
  grade?: Grade;
  shift?: Shift;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  FINISHED = 'FINISHED',
  ERROR = 'ERROR'
}

export type ActiveView = 'STUDENT' | 'MANAGER' | 'TEST';
