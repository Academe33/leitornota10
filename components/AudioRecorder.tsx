import React, { useState, useRef, useEffect } from 'react';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  isProcessing: boolean;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onRecordingComplete, isProcessing }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const timerRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
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
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Erro ao acessar microfone:", err);
      alert("Não foi possível acessar o microfone. Verifique as permissões.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) window.clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 bg-white rounded-3xl shadow-xl border border-slate-100 transition-all hover:shadow-2xl max-w-md w-full mx-auto">
      <div className="relative mb-6 group">
        <button 
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          className={`
            relative z-10 w-28 h-28 rounded-full flex items-center justify-center 
            transition-all duration-200 transform active:translate-y-2 active:shadow-none
            ${isRecording 
              ? 'bg-red-500 shadow-[0_8px_0_rgb(185,28,28)] hover:bg-red-400' 
              : 'bg-indigo-500 shadow-[0_8px_0_rgb(55,48,163)] hover:bg-indigo-400'
            }
            ${isProcessing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {isRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white drop-shadow-md" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
        </button>
        {/* Camada de efeito de "chão" para dar profundidade extra */}
        <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/10 rounded-[100%] blur-md transition-all duration-200 group-active:w-20 group-active:blur-sm"></div>
      </div>
      
      <div className="text-3xl font-black text-slate-700 mb-2 tracking-widest text-shadow-sm">
        {formatTime(recordingTime)}
      </div>
      
      <p className="text-slate-500 font-bold text-center mb-6 text-lg">
        {isRecording ? "Gravando... 🎤" : "Clique para começar! 🚀"}
      </p>

      {isRecording && (
        <div className="flex gap-2 h-8 items-end justify-center">
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
  );
};

export default AudioRecorder;