import React, { useState, useEffect } from 'react';
import { AppStatus, AnalysisResult, ActiveView, ReadingRecord } from './types';
import { analyzeReadingAudio } from './services/geminiService';
import AudioRecorder from './components/AudioRecorder';
import AnalysisDashboard from './components/AnalysisDashboard';
import HistoryList from './components/HistoryList';

const PRE_PROGRAMMED_STORY = {
  title: "O Leão e o Ratinho",
  content: `Um leão, cansado de tanto caçar, dormia espichado à sombra de uma boa árvore. Vieram uns ratinhos passear em cima dele e ele acordou. Todos conseguiram fugir, menos um, que o leão prendeu debaixo da pata. Tanto o ratinho pediu e implorou que o leão desistiu de esmagá-lo e deixou que fosse embora. Algum tempo depois o leão ficou preso na rede de uns caçadores. Não conseguia se soltar, e fazia a floresta inteira tremer com seus urros de raiva. Nisso apareceu o ratinho, e com seus dentes afiados roeu as cordas e soltou o leão. Moral: Uma boa ação ganha outra.`
};

const STORAGE_KEY = 'academe_kids_v1_storage';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [activeView, setActiveView] = useState<ActiveView>('STUDENT');
  const [recordingStep, setRecordingStep] = useState<'READING' | 'EXPLAINING'>('READING');
  const [readingAudioBlob, setReadingAudioBlob] = useState<Blob | null>(null);
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('André Silva');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        console.error("Erro ao carregar dados", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  }, [records]);

  const handleRecordingComplete = async (blob: Blob) => {
    if (recordingStep === 'READING') {
      // Passo 1: Leitura concluída, armazena e vai para explicação
      setReadingAudioBlob(blob);
      setRecordingStep('EXPLAINING');
      return;
    }

    // Passo 2: Explicação concluída, inicia processamento
    setStatus(AppStatus.FINISHED);
    
    // Reset para próxima vez
    setRecordingStep('READING');
    
    const recordId = Math.random().toString(36).substr(2, 9);
    const newRecord: ReadingRecord = {
      id: recordId,
      studentName: studentName.trim() || 'Estudante',
      timestamp: Date.now(),
      status: 'processing'
    };
    setRecords(prev => [newRecord, ...prev]);

    try {
      const readingReader = new FileReader();
      const comprehensionReader = new FileReader();
      
      // Promessas para ler os dois blobs
      const readReadingAudio = new Promise<string>((resolve) => {
        readingReader.readAsDataURL(readingAudioBlob!);
        readingReader.onloadend = () => resolve((readingReader.result as string).split(',')[1]);
      });

      const readComprehensionAudio = new Promise<string>((resolve) => {
        comprehensionReader.readAsDataURL(blob); // blob atual é o da explicação
        comprehensionReader.onloadend = () => resolve((comprehensionReader.result as string).split(',')[1]);
      });

      const [readingBase64, comprehensionBase64] = await Promise.all([readReadingAudio, readComprehensionAudio]);
      
      const mimeType = blob.type || 'audio/webm';
      
      try {
        const result = await analyzeReadingAudio(readingBase64, comprehensionBase64, mimeType, PRE_PROGRAMMED_STORY.content);
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'completed', result } : r));
      } catch (err) {
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'error' } : r));
      }
      
      // Limpa blob temporário
      setReadingAudioBlob(null);

    } catch (err) {
      console.error(err);
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'error' } : r));
    }
  };

  const selectedRecord = records.find(r => r.id === selectedRecordId);
  const studentHistory = selectedRecord 
    ? records.filter(r => r.studentName === selectedRecord.studentName && r.status === 'completed')
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-[#BAE6FD] bg-opacity-40 font-sans pb-10">
      {/* Header Estilo Academe Kids */}
      <header className="px-6 py-6 flex justify-between items-center max-w-7xl mx-auto w-full">
        <div className="bg-white px-4 py-2 rounded-full shadow-sm flex items-center gap-2">
          <span className="text-[#0EA5E9] font-black text-xl italic">Academe</span>
          <span className="bg-[#FB7185] text-white px-3 py-0.5 rounded-full text-sm font-bold">Kids</span>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setActiveView(activeView === 'STUDENT' ? 'MANAGER' : 'STUDENT'); setSelectedRecordId(null); setStatus(AppStatus.IDLE); setRecordingStep('READING'); }}
            className="bg-white text-[#0EA5E9] px-8 py-3 rounded-2xl shadow-[0_6px_0_#BAE6FD] text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-slate-50 active:shadow-none active:translate-y-[6px] transition-all"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"/></svg>
            {activeView === 'STUDENT' ? 'Painel Gestor' : 'Área do Aluno'}
          </button>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full p-6">
        {selectedRecordId ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
             {selectedRecord && selectedRecord.result && (
               <AnalysisDashboard 
                 data={selectedRecord.result} 
                 history={studentHistory} 
                 onReset={() => setSelectedRecordId(null)}
                 record={selectedRecord}
               />
             )}
          </div>
        ) : (
          <>
            {activeView === 'STUDENT' ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                {status === AppStatus.IDLE ? (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-8 bg-white p-12 md:p-20 rounded-[4rem] shadow-xl shadow-sky-900/5 relative overflow-hidden border border-white">

                      <h3 className="text-3xl font-black text-[#1E293B] mb-8">{PRE_PROGRAMMED_STORY.title}</h3>
                      <p className="text-2xl md:text-3xl text-slate-700 leading-relaxed font-serif text-justify indent-10">
                        {PRE_PROGRAMMED_STORY.content}
                      </p>
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-sky-900/5 border border-white flex flex-col gap-6">
                        <h4 className="text-[#0EA5E9] font-black uppercase tracking-widest text-xs">Identificação</h4>
                        <input 
                          type="text" 
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-[#0EA5E9] outline-none transition-all"
                          placeholder="Nome do Aluno"
                        />
                      </div>
                      
                      <div className="flex flex-col items-center gap-4">
                        {recordingStep === 'READING' ? (
                          <div className="text-center animate-in fade-in duration-300">
                             <span className="bg-blue-100 text-blue-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Passo 1 de 2</span>
                             <h4 className="text-xl font-black text-slate-700 mb-2">Grave a Leitura</h4>
                             <p className="text-sm text-slate-400 font-medium mb-6">Leia o texto ao lado em voz alta.</p>
                          </div>
                        ) : (
                          <div className="text-center animate-in fade-in duration-300">
                             <span className="bg-purple-100 text-purple-600 px-4 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-4 inline-block">Passo 2 de 2</span>
                             <h4 className="text-xl font-black text-slate-700 mb-2">Explique o Texto</h4>
                             <p className="text-sm text-slate-400 font-medium mb-6">Conte com suas palavras o que você entendeu.</p>
                          </div>
                        )}
                        <AudioRecorder 
                          onRecordingComplete={handleRecordingComplete} 
                          isProcessing={false} 
                          key={recordingStep} // Força recriar o componente para limpar estado interno
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto bg-white p-16 rounded-[5rem] shadow-2xl text-center space-y-10 border border-white">
                    <div className="w-32 h-32 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto border-8 border-white shadow-lg">
                      <svg className="h-16 w-16 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tight">Fantástico! 🚀</h2>
                    <p className="text-xl text-slate-500 font-medium italic">Sua leitura foi enviada. Agora vamos ver como você se saiu!</p>
                    <button 
                      onClick={() => setStatus(AppStatus.IDLE)}
                      className="w-full py-6 bg-[#8B5CF6] text-white text-xl font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-[0_8px_0_#6D28D9] hover:bg-[#7C3AED] active:shadow-none active:translate-y-[8px] transition-all"
                    >
                      Ler mais um pouco
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <HistoryList records={records} onSelect={setSelectedRecordId} onClear={() => setRecords([])} />
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default App;