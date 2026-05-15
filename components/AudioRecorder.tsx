import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
  onRecordingStart?: () => void;
  onRestart?: () => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing, onRecordingStart, onRestart }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRestartingRef = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

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
      const preferredMimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorderOptions: MediaRecorderOptions = {
        audioBitsPerSecond: 32000,
      };
      if (preferredMimeType) {
        recorderOptions.mimeType = preferredMimeType;
      }
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        if (isRestartingRef.current) {
          isRestartingRef.current = false;
          chunksRef.current = [];
          return;
        }
        const blob = new Blob(chunksRef.current, { type: mediaRecorder.mimeType || 'audio/webm' });
        onRecordingComplete(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingStart?.();
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
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const handleRestartClick = () => {
    isRestartingRef.current = true;
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch { /* ignore */ }
    }
    chunksRef.current = [];
    setIsRecording(false);
    setRecordingTime(0);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    onRestart?.();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="soft-paper-bg flex flex-row lg:flex-col items-center justify-start lg:justify-center gap-3 sm:gap-4 lg:gap-0 p-3 sm:p-5 lg:p-8 bg-[#1A1A1A] rounded-2xl sm:rounded-3xl shadow-2xl shadow-violet-900/30 ring-1 ring-violet-500/10 border border-violet-500/20 transition-all hover:border-violet-500/40 w-full overflow-hidden">
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
              : 'bg-[#8B5CF6] shadow-[0_6px_0_#6D28D9] lg:shadow-[0_8px_0_#6D28D9] hover:bg-[#7C3AED]'
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
        <div className="text-xl sm:text-2xl lg:text-3xl font-black text-violet-100 tracking-widest tabular-nums">
          {formatTime(recordingTime)}
        </div>
        
        <p className="text-violet-300/80 font-bold text-left lg:text-center mt-1 lg:mt-2 lg:mb-6 text-xs sm:text-sm lg:text-lg truncate max-w-full inline-flex items-center justify-start lg:justify-center gap-1.5">
            {isRecording ? (
              <>
                Gravando...
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white drop-shadow-[0_1px_2px_rgba(139,92,246,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 14a3 3 0 003-3V6a3 3 0 10-6 0v5a3 3 0 003 3z" />
                  <path d="M18 11a1 1 0 10-2 0 4 4 0 01-8 0 1 1 0 10-2 0 6 6 0 005 5.917V19H8.5a1 1 0 100 2h7a1 1 0 100-2H13v-2.083A6 6 0 0018 11z" />
                </svg>
              </>
            ) : (
              <>
                Clique para ler!
                <svg className="w-4 h-4 lg:w-5 lg:h-5 text-white drop-shadow-[0_1px_2px_rgba(139,92,246,0.4)]" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06z" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M17.03 8.47a.75.75 0 011.06 0 5.5 5.5 0 010 7.78.75.75 0 11-1.06-1.06 4 4 0 000-5.66.75.75 0 010-1.06z" />
                  <path fillRule="evenodd" clipRule="evenodd" d="M19.15 6.35a.75.75 0 011.06 0 8.5 8.5 0 010 12.02.75.75 0 11-1.06-1.06 7 7 0 000-9.9.75.75 0 010-1.06z" />
                </svg>
              </>
            )}
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

      {isRecording && onRestart && (
        <button
          onClick={handleRestartClick}
          aria-label="Começar do zero"
          className="shrink-0 ml-auto lg:ml-0 lg:mt-5 flex items-center gap-2 bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] px-5 py-3 sm:px-6 sm:py-3.5 rounded-full shadow-[0_6px_0_#6D28D9] hover:shadow-[0_4px_0_#6D28D9] hover:translate-y-[2px] active:translate-y-[6px] active:shadow-[0_0_0_#6D28D9] transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          <span className="hidden sm:inline">Começar do Zero</span>
          <span className="sm:hidden">Zerar</span>
        </button>
      )}
    </div>
  );
};

export default AudioRecorder;
