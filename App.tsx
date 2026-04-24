import React, { useState, useEffect } from 'react';
import { AppStatus, AnalysisResult, ActiveView, ReadingRecord } from './types';
import { analyzeReadingAudio } from './services/geminiService';
import AudioRecorder from './components/AudioRecorder';
import AnalysisDashboard from './components/AnalysisDashboard';
import HistoryList from './components/HistoryList';
import Sidebar from './components/Sidebar';
import Logo from './assets/logo.png';

const PRE_PROGRAMMED_STORY = {
  title: "O Leão e o Ratinho",
  content: `Um leão, cansado de tanto caçar, dormia espichado à sombra de uma boa árvore. Vieram uns ratinhos passear em cima dele e ele acordou. Todos conseguiram fugir, menos um, que o leão prendeu debaixo da pata. Tanto o ratinho pediu e implorou que o leão desistiu de esmagá-lo e deixou que fosse embora. Algum tempo depois o leão ficou preso na rede de uns caçadores. Não conseguia se soltar, e fazia a floresta inteira tremer com seus urros de raiva. Nisso apareceu o ratinho, e com seus dentes afiados roeu as cordas e soltou o leão. Moral: Uma boa ação ganha outra.`
};

const STORAGE_KEY = 'academe_kids_v1_storage';

type RecordingStep = 'READING' | 'INTERPRETATION';

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [activeView, setActiveView] = useState<ActiveView>('STUDENT');
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('André Silva');
  
  // Novos estados para o fluxo de duas etapas
  const [recordingStep, setRecordingStep] = useState<RecordingStep>('READING');
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);

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
      // Passo 1 Concluído: Guardar áudio da leitura e avançar
      setReadingBlob(blob);
      setRecordingStep('INTERPRETATION');
      return;
    }

    // Passo 2 Concluído: Processar tudo
    setStatus(AppStatus.FINISHED);
    const recordId = Math.random().toString(36).substr(2, 9);
    const newRecord: ReadingRecord = {
      id: recordId,
      studentName: studentName.trim() || 'Estudante',
      timestamp: Date.now(),
      status: 'processing'
    };
    setRecords(prev => [newRecord, ...prev]);

    try {
      // Converter ambos os áudios para Base64
      const readingReader = new FileReader();
      
      // Promessa para ler o primeiro áudio (Leitura)
      const readReadingAudio = new Promise<string>((resolve, reject) => {
        if (!readingBlob) {
          reject(new Error("Áudio da leitura não encontrado"));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Falha ao ler áudio de leitura: formato inválido"));
          }
        };
        reader.onerror = () => reject(reader.error || new Error("Erro na leitura do arquivo de leitura"));
        reader.readAsDataURL(readingBlob);
      });

      // Promessa para ler o segundo áudio (Interpretação)
      const readInterpretationAudio = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Falha ao ler áudio de interpretação: formato inválido"));
          }
        };
        reader.onerror = () => reject(reader.error || new Error("Erro na leitura do arquivo de interpretação"));
        reader.readAsDataURL(blob); // 'blob' aqui é o da interpretação
      });

      const [readingBase64, interpretationBase64] = await Promise.all([readReadingAudio, readInterpretationAudio]);
      const mimeType = blob.type || 'audio/webm';

      try {
        const result = await analyzeReadingAudio(
          readingBase64, 
          mimeType, 
          PRE_PROGRAMMED_STORY.content,
          interpretationBase64 // Passando o segundo áudio
        );
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'completed', result } : r));
      } catch (err) {
        console.error("Erro final após tentativas:", err);
        setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'error' } : r));
        alert("Ops! Ocorreu um erro ao processar sua leitura após várias tentativas. Por favor, tente gravar novamente.");
      }
      
      // Resetar estados
      setReadingBlob(null);
      setRecordingStep('READING');

    } catch (err) {
      console.error(err);
      setRecords(prev => prev.map(r => r.id === recordId ? { ...r, status: 'error' } : r));
      alert("Erro ao preparar os áudios. Por favor, tente novamente.");
    }
  };

  const selectedRecord = records.find(r => r.id === selectedRecordId);
  const studentHistory = selectedRecord 
    ? records.filter(r => r.studentName === selectedRecord.studentName && r.status === 'completed')
    : [];

  const handleChangeView = (view: ActiveView) => {
    setActiveView(view);
    setSelectedRecordId(null);
    setStatus(AppStatus.IDLE);
    setRecordingStep('READING');
    setReadingBlob(null);
  };

  const firstName = (studentName.trim().split(' ')[0]) || 'Aluno';

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans text-slate-900">
      <Sidebar activeView={activeView} onChangeView={handleChangeView} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="px-6 md:px-10 py-6 flex flex-wrap gap-4 justify-between items-center border-b border-slate-100 bg-white/60 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="bg-white px-5 py-2.5 rounded-full shadow-sm flex items-center gap-3 border border-slate-100">
              <img src={Logo} alt="Academe" className="h-6 object-contain" />
              <span className="bg-[#8B5CF6] text-white px-3 py-0.5 rounded-full text-xs font-black tracking-wider">KIDS</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-lg font-black text-slate-900">Olá, {firstName}! <span className="inline-block">👋</span></h1>
              <p className="text-xs text-slate-500 font-medium">
                {activeView === 'STUDENT' ? 'Pronto para uma nova leitura?' : 'Visão geral da turma'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
              <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sem notificações</span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center font-black text-sm shadow-lg shadow-violet-500/30">
              {firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-grow w-full p-6 md:p-10">
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
                    <div className="lg:col-span-8 bg-white p-12 md:p-20 rounded-[4rem] shadow-xl shadow-violet-900/5 relative overflow-hidden border border-white">

                      <h3 className="text-3xl font-black text-[#1E293B] mb-8">
                        {recordingStep === 'READING' ? PRE_PROGRAMMED_STORY.title : "Agora, explique o que você entendeu:"}
                      </h3>
                      
                      {recordingStep === 'READING' ? (
                        <p className="text-2xl md:text-3xl text-slate-700 leading-relaxed font-serif text-justify indent-10 animate-in fade-in duration-500">
                          {PRE_PROGRAMMED_STORY.content}
                        </p>
                      ) : (
                        <div className="space-y-6 animate-in slide-in-from-right duration-500">
                           <div className="bg-violet-50 p-8 rounded-3xl border-2 border-violet-100">
                              <p className="text-xl text-slate-600 font-medium leading-relaxed">
                                Muito bem! Agora, clique no microfone novamente e conte com suas próprias palavras:
                                <br/><br/>
                                <span className="font-bold text-violet-600">1. Quem são os personagens?</span><br/>
                                <span className="font-bold text-violet-600">2. O que aconteceu na história?</span>
                              </p>
                           </div>
                           <p className="text-slate-400 text-sm font-bold text-center uppercase tracking-widest">Grave sua explicação</p>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 space-y-6">
                      <div className="bg-white p-8 rounded-[3rem] shadow-xl shadow-violet-900/5 border border-white flex flex-col gap-6">
                        <h4 className="text-[#8B5CF6] font-black uppercase tracking-widest text-xs">Identificação</h4>
                        <input 
                          type="text" 
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          disabled={recordingStep === 'INTERPRETATION'}
                          className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl px-6 py-4 font-bold text-slate-800 focus:border-[#8B5CF6] outline-none transition-all disabled:opacity-50"
                          placeholder="Nome do Aluno"
                        />
                      </div>
                      <AudioRecorder 
                        key={recordingStep} // Força remontagem para resetar estado visual ao mudar de passo
                        onRecordingComplete={handleRecordingComplete} 
                        isProcessing={false} 
                      />
                    </div>
                  </div>
                ) : (
                  <div className="max-w-2xl mx-auto bg-white p-16 rounded-[5rem] shadow-2xl text-center space-y-10 border border-white">
                    <div className="w-32 h-32 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto border-8 border-white shadow-lg">
                      <svg className="h-16 w-16 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <h2 className="text-5xl font-black text-slate-900 tracking-tight">Fantástico! 🚀</h2>
                    <p className="text-xl text-slate-500 font-medium italic">Sua leitura e explicação foram enviadas. Agora vamos ver como você se saiu!</p>
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
    </div>
  );
};

export default App;