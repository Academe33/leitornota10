import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
  onTranscriptUpdate?: (transcript: string) => void;
  onRecordingStart?: () => void;
}

type SRResult = {
  isFinal: boolean;
  0: { transcript: string };
};
type SREvent = { resultIndex: number; results: ArrayLike<SRResult> };
type SRInstance = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing, onTranscriptUpdate, onRecordingStart }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recognitionRef = useRef<SRInstance | null>(null);
  const finalTranscriptRef = useRef<string>('');
  const wantTranscribeRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
      }
    };
  }, []);

  const startSpeechRecognition = () => {
    if (!onTranscriptUpdate) return;
    const w = window as unknown as {
      SpeechRecognition?: new () => SRInstance;
      webkitSpeechRecognition?: new () => SRInstance;
    };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) {
      console.warn('SpeechRecognition não suportado neste navegador.');
      return;
    }
    const recognition = new SR();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    finalTranscriptRef.current = '';
    wantTranscribeRef.current = true;

    recognition.onresult = (event: SREvent) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) {
          finalTranscriptRef.current += ' ' + res[0].transcript;
        } else {
          interim += ' ' + res[0].transcript;
        }
      }
      const full = (finalTranscriptRef.current + ' ' + interim).trim();
      onTranscriptUpdate?.(full);
    };

    recognition.onerror = () => { /* silencioso */ };

    recognition.onend = () => {
      if (wantTranscribeRef.current) {
        try { recognition.start(); } catch { /* ignore */ }
      }
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch {
      /* ignore */
    }
  };

  const stopSpeechRecognition = () => {
    wantTranscribeRef.current = false;
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch { /* ignore */ }
      recognitionRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      if (!window.isSecureContext) {
        alert(
          'Este navegador bloqueou o microfone porque a página não está em um contexto seguro.\n\n' +
          'Abra o aplicativo por HTTPS (https://...) ou por http://localhost:3000. ' +
          'Pelo IP da rede (http://192.168...) o microfone só funciona em HTTPS.'
        );
        return;
      }
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        alert(
          'Este navegador não expôs a API de microfone (navigator.mediaDevices).\n\n' +
          'Use Chrome/Edge/Firefox/Safari atualizados e acesse via HTTPS ou localhost.'
        );
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStart?.();
      startSpeechRecognition();
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erro ao acessar microfone:', err);
      const anyErr = err as { name?: string; message?: string };
      if (anyErr?.name === 'NotAllowedError' || anyErr?.name === 'SecurityError') {
        alert('Permissão negada. Autorize o microfone nas configurações do navegador e tente novamente.');
      } else if (anyErr?.name === 'NotFoundError' || anyErr?.name === 'OverconstrainedError') {
        alert('Nenhum microfone foi encontrado neste dispositivo.');
      } else {
        alert(
          'Não foi possível acessar o microfone. ' +
          'Se estiver abrindo pelo IP da rede, use HTTPS (https://...) ou http://localhost:3000.'
        );
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      stopSpeechRecognition();
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-row lg:flex-col items-center justify-start lg:justify-center gap-3 sm:gap-4 lg:gap-0 p-3 sm:p-5 lg:p-8 bg-white rounded-2xl sm:rounded-3xl shadow-xl border border-slate-100 transition-all hover:shadow-2xl w-full max-w-md mx-auto">
      <div className="relative group shrink-0 lg:mb-6">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          aria-label={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
          className={`
            relative z-10 w-16 h-16 sm:w-20 sm:h-20 lg:w-28 lg:h-28 rounded-full flex items-center justify-center 
            transition-all duration-200 transform active:translate-y-2 active:shadow-none
            ${isRecording 
              ? 'bg-red-500 shadow-[0_6px_0_rgb(185,28,28)] lg:shadow-[0_8px_0_rgb(185,28,28)] hover:bg-red-400' 
              : 'bg-indigo-500 shadow-[0_6px_0_rgb(55,48,163)] lg:shadow-[0_8px_0_rgb(55,48,163)] hover:bg-indigo-400'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-9 sm:w-9 lg:h-12 lg:w-12 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 sm:h-9 sm:w-9 lg:h-12 lg:w-12 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        <div className="hidden lg:block absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/10 rounded-[100%] blur-md transition-all duration-200 group-active:w-16 group-active:blur-sm"></div>
      </div>

      <div className="flex flex-col items-start lg:items-center flex-1 lg:flex-none min-w-0 text-left lg:text-center">
        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-700 tracking-widest text-shadow-sm tabular-nums">
          {formatTime(recordingTime)}
        </div>
        
        <p className="text-slate-500 font-bold text-left lg:text-center mt-1 lg:mt-2 lg:mb-6 text-xs sm:text-sm lg:text-lg truncate max-w-full">
          {isRecording ? "Gravando... 🎤" : "Clique para ler! 🚀"}
        </p>

        {isRecording && (
          <div className="hidden lg:flex gap-2 h-8 items-end justify-center">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i} 
                className="w-2 bg-red-400 rounded-full animate-bounce"
                style={{ height: `${Math.random() * 100}%`, animationDuration: '0.8s', animationDelay: `${i * 0.1}s` }}
              ></div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AudioRecorder;