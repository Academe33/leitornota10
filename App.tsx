import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AppStatus, AnalysisResult, ActiveView, ReadingRecord } from './types';
import { analyzeReadingAudio } from './services/geminiService';
import AudioRecorder from './components/AudioRecorder';
import AnalysisDashboard from './components/AnalysisDashboard';
import HistoryList from './components/HistoryList';
import Sidebar from './components/Sidebar';
import Logo from './assets/logo.png';

export interface Story {
  id: string;
  title: string;
  content: string;
  difficulty: 'Fácil' | 'Médio' | 'Difícil';
  theme: string;
}

const STORIES: Story[] = [
  {
    id: '1',
    title: "O Leão e o Ratinho",
    content: "Um leão, cansado de tanto caçar, dormia espichado à sombra de uma boa árvore. Vieram uns ratinhos passear em cima dele e ele acordou. Todos conseguiram fugir, menos um, que o leão prendeu debaixo da pata. Tanto o ratinho pediu e implorou que o leão desistiu de esmagá-lo e deixou que fosse embora. Algum tempo depois o leão ficou preso na rede de uns caçadores. Não conseguia se soltar, e fazia a floresta inteira tremer com seus urros de raiva. Nisso apareceu o ratinho, e com seus dentes afiados roeu as cordas e soltou o leão. Moral: Uma boa ação ganha outra.",
    difficulty: "Fácil",
    theme: "Fábula"
  },
  {
    id: '2',
    title: "A Lebre e a Tartaruga",
    content: "A lebre vivia a se gabar de que era o mais veloz de todos os animais. Até o dia em que encontrou a tartaruga. Eu tenho certeza de que, se apostarmos uma corrida, serei a vencedora, desafiou a tartaruga. A lebre caiu na gargalhada. Uma corrida? Eu e você? Essa é boa! Por acaso você está com medo de perder? perguntou a tartaruga. É mais fácil um leão voar do que eu perder uma corrida para você, respondeu a lebre. No dia seguinte a raposa foi escolhida para ser a juíza da prova. Bastou dar o sinal da largada para a lebre disparar na frente a toda velocidade. A tartaruga não se abalou e continuou na sua marcha lenta e constante. A lebre estava tão certa da vitória que resolveu tirar uma soneca. Quando acordou, viu a tartaruga cruzando a linha de chegada.",
    difficulty: "Médio",
    theme: "Fábula"
  },
  {
    id: '3',
    title: "O Menino e o Lobo",
    content: "Um pastorzinho de ovelhas achava a vida muito monótona. Por isso, inventava de tudo para se distrair. A sua diversão favorita era fingir que estava em apuros. Um lobo! Socorro! Socorro! Costumava gritar aos quatro ventos. Quando as pessoas da aldeia vinham correndo ajudá-lo, encontravam o menino dando risadas. Um dia, um lobo apareceu de verdade na frente do pastor. Desesperado, ele começou a gritar como nunca: Socorro! Um lobo! Um lobo! As pessoas ouviram, mas acharam que era mais uma brincadeira do menino e não foram ajudá-lo. O lobo pôde devorar o rebanho inteiro sem ser incomodado.",
    difficulty: "Difícil",
    theme: "Conto"
  }
];

const STORAGE_KEY = 'academe_kids_v1_storage';

type RecordingStep = 'READING' | 'INTERPRETATION';

const App: React.FC = () => {
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginId, setLoginId] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [activeView, setActiveView] = useState<ActiveView>('MANAGER');
  const [records, setRecords] = useState<ReadingRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState('André Silva');
  
  // Novos estados para o fluxo de duas etapas
  const [recordingStep, setRecordingStep] = useState<RecordingStep>('READING');
  const [readingBlob, setReadingBlob] = useState<Blob | null>(null);
  const [showPrivacyPopup, setShowPrivacyPopup] = useState(false);
  const [lastRecordId, setLastRecordId] = useState<string | null>(null);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem('academe-theme') === 'dark';
    } catch {
      return false;
    }
  });
  const [isMobile, setIsMobile] = useState(false);
  const [fontScale, setFontScale] = useState(1);
  const storyScrollRef = useRef<HTMLDivElement | null>(null);
  const [hasMoreBelow, setHasMoreBelow] = useState(false);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });
        setIsAuthenticated(response.ok);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          identifier: loginId.trim(),
          password: loginPassword,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setLoginError(typeof data?.error === 'string' ? data.error : 'Falha no login.');
        return;
      }

      setIsAuthenticated(true);
      setLoginPassword('');
    } catch {
      setLoginError('Erro de conexão. Tente novamente.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch {
      // ignora e segue com logout local
    }

    setIsAuthenticated(false);
    setLoginPassword('');
    setLoginError('');
  };

  const updateStoryScrollState = useCallback(() => {
    const el = storyScrollRef.current;
    if (!el) return;
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    setHasMoreBelow(remaining > 8);
  }, []);

  useEffect(() => {
    const el = storyScrollRef.current;
    if (!el) return;
    updateStoryScrollState();
    el.addEventListener('scroll', updateStoryScrollState, { passive: true });
    const ro = new ResizeObserver(updateStoryScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateStoryScrollState);
      ro.disconnect();
    };
  }, [updateStoryScrollState, selectedStory, recordingStep, fontScale, hasStarted]);

  useEffect(() => {
    const isReadingScreen = !!selectedStory && hasStarted;
    if (isReadingScreen) {
      document.body.classList.add('reading-mode');
    } else {
      document.body.classList.remove('reading-mode');
    }
    return () => {
      document.body.classList.remove('reading-mode');
    };
  }, [selectedStory, hasStarted]);

  useEffect(() => {
    if (isDark) {
      document.body.classList.add('dark-theme');
      try { localStorage.setItem('academe-theme', 'dark'); } catch { /* ignore */ }
    } else {
      document.body.classList.remove('dark-theme');
      try { localStorage.setItem('academe-theme', 'light'); } catch { /* ignore */ }
    }
  }, [isDark]);

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

  useEffect(() => {
    const ua = navigator.userAgent || '';
    const mobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)
      || (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width: 768px)').matches && 'ontouchstart' in window);
    setIsMobile(mobile);

    const params = new URLSearchParams(window.location.search);
    const challengeId = params.get('challenge');
    const launch = params.get('launch');
    if (challengeId) {
      const story = STORIES.find(s => s.id === challengeId);
      if (story) {
        setSelectedStory(story);
        setIsStandalone(true);
        setActiveView('TEST');
        if (launch === '1' || !mobile) {
          setHasStarted(true);
          if (launch === '1') {
            const tryFullscreen = () => {
              const el = document.documentElement as HTMLElement & {
                webkitRequestFullscreen?: () => Promise<void>;
              };
              const req = el.requestFullscreen || el.webkitRequestFullscreen;
              if (req) {
                req.call(el).catch(() => { /* usuário precisa interagir */ });
              }
            };
            tryFullscreen();
          }
        }
      }
    }
  }, []);

  const handleStartChallenge = () => {
    if (!selectedStory) return;
    if (!isMobile) {
      setHasStarted(true);
      return;
    }
    const url = `${window.location.origin}/?challenge=${selectedStory.id}&launch=1`;
    const features = 'noopener,noreferrer,fullscreen=yes,menubar=no,toolbar=no,location=no,status=no';
    const newWin = window.open(url, '_blank', features);
    if (!newWin) {
      setHasStarted(true);
      const el = document.documentElement as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void>;
      };
      const req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        req.call(el).catch(() => { /* ignore */ });
      }
    }
  };

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
    setLastRecordId(recordId);
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
          selectedStory?.content || '',
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
  const lastRecord = records.find(r => r.id === lastRecordId);
  const studentHistory = selectedRecord 
    ? records.filter(r => r.studentName === selectedRecord.studentName && r.status === 'completed')
    : [];

  const handleChangeView = (view: ActiveView) => {
    setActiveView(view);
    setSelectedRecordId(null);
    setStatus(AppStatus.IDLE);
    setRecordingStep('READING');
    setReadingBlob(null);
    setShowPrivacyPopup(false);
    setSelectedStory(null);
  };

  const handleRestart = () => {
    setStatus(AppStatus.IDLE);
    setRecordingStep('READING');
    setReadingBlob(null);
    setShowPrivacyPopup(false);
    setLastRecordId(null);
  };

  const firstName = (studentName.trim().split(' ')[0]) || 'Aluno';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white px-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-black mb-2">Verificando Acesso</h1>
          <p className="text-slate-300">Validando sessão segura...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-black px-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-3xl border border-violet-900/40 bg-slate-900/90 p-8 shadow-2xl"
        >
          <h1 className="text-2xl font-black text-white mb-2">Acesso Protegido</h1>
          <p className="text-slate-300 text-sm mb-6">
            Entre com seu ID e senha para continuar.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">
                ID
              </label>
              <input
                type="email"
                autoComplete="username"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="seu-id@dominio.com"
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-400 mb-2 font-bold">
                Senha
              </label>
              <input
                type="password"
                autoComplete="current-password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:ring-2 focus:ring-violet-500"
                placeholder="Digite sua senha"
              />
            </div>
          </div>

          {loginError && (
            <div className="mt-4 rounded-xl bg-rose-500/15 border border-rose-400/30 px-4 py-3 text-sm text-rose-200">
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoggingIn}
            className="w-full mt-6 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-70 disabled:cursor-not-allowed text-white font-black py-3 transition-colors"
          >
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans text-slate-900">
      {!isStandalone && <Sidebar activeView={activeView} onChangeView={handleChangeView} />}

      <div className="flex-1 flex flex-col min-w-0">
        {!isStandalone && (
          <header className="px-6 md:px-10 py-6 flex flex-wrap gap-4 justify-between items-center border-b border-slate-100 bg-white/60 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <div className="bg-white px-5 py-2.5 rounded-full shadow-sm flex items-center gap-3 border border-slate-100">
                <img src={Logo} alt="Academe" className="h-6 object-contain" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-black text-slate-900">Olá, {firstName}! <span className="inline-block">👋</span></h1>
                <p className="text-xs text-slate-500 font-medium">
                  {activeView === 'STUDENT' ? 'Pronto para uma nova leitura?' : activeView === 'TEST' ? 'Teste de Leitura Oficial' : 'Visão geral da turma'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleLogout}
                className="h-11 px-4 rounded-2xl bg-white border border-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider hover:bg-slate-50 transition-colors"
              >
                Sair
              </button>
              <div className="hidden lg:flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sem notificações</span>
              </div>
              <button
                type="button"
                onClick={() => setIsDark(v => !v)}
                aria-label={isDark ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
                title={isDark ? 'Tema claro' : 'Tema escuro'}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] text-white flex items-center justify-center shadow-lg shadow-violet-500/30 hover:scale-105 active:scale-95 transition-transform duration-150 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2"
              >
                {isDark ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(76,29,149,0.6)]">
                    <path fillRule="evenodd" d="M12 2.25a.75.75 0 0 1 .75.75v2.25a.75.75 0 0 1-1.5 0V3a.75.75 0 0 1 .75-.75ZM7.5 12a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM18.894 6.166a.75.75 0 0 0-1.06-1.06l-1.591 1.59a.75.75 0 1 0 1.06 1.061l1.591-1.59ZM21.75 12a.75.75 0 0 1-.75.75h-2.25a.75.75 0 0 1 0-1.5H21a.75.75 0 0 1 .75.75ZM17.834 18.894a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 1 0-1.061 1.06l1.59 1.591ZM12 18a.75.75 0 0 1 .75.75V21a.75.75 0 0 1-1.5 0v-2.25A.75.75 0 0 1 12 18ZM7.758 17.303a.75.75 0 0 0-1.061-1.06l-1.591 1.59a.75.75 0 0 0 1.06 1.061l1.591-1.59ZM6 12a.75.75 0 0 1-.75.75H3a.75.75 0 0 1 0-1.5h2.25A.75.75 0 0 1 6 12ZM6.697 7.757a.75.75 0 0 0 1.06-1.06l-1.59-1.591a.75.75 0 0 0-1.061 1.06l1.59 1.591Z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(76,29,149,0.6)]">
                    <path fillRule="evenodd" d="M9.528 1.718a.75.75 0 0 1 .162.819A8.97 8.97 0 0 0 9 6a9 9 0 0 0 9 9 8.97 8.97 0 0 0 3.463-.69.75.75 0 0 1 .981.98 10.503 10.503 0 0 1-9.694 6.46c-5.799 0-10.5-4.7-10.5-10.5 0-4.368 2.667-8.112 6.46-9.694a.75.75 0 0 1 .818.162Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </div>
          </header>
        )}

        <main className={`flex-grow w-full relative ${isStandalone ? 'p-3 sm:p-6' : 'p-6 md:p-10'}`}>
        {isStandalone && !hasStarted && selectedStory ? (
          <div className="fixed inset-0 z-40 bg-gradient-to-br from-[#8B5CF6] via-[#7C3AED] to-[#6366F1] flex items-center justify-center p-6 animate-in fade-in duration-500">
            <button
              onClick={handleStartChallenge}
              className="px-16 py-6 bg-white text-[#8B5CF6] text-xl font-black uppercase tracking-[0.25em] rounded-[2rem] shadow-[0_8px_0_#6D28D9] hover:bg-violet-50 active:shadow-none active:translate-y-[8px] transition-all"
            >
              Iniciar
            </button>
          </div>
        ) : selectedRecordId ? (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
             {showPrivacyPopup && activeView === 'TEST' && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4">
                 <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                   <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-6">
                     <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                     </svg>
                   </div>
                   <h3 className="text-2xl font-black text-slate-900 mb-2">Aviso Importante</h3>
                   <p className="text-slate-600 mb-8 leading-relaxed">
                     Essa avaliação será vista <strong className="text-slate-900">somente pelo professor</strong> no painel dele. Seus resultados são privados.
                   </p>
                   <button
                     onClick={() => setShowPrivacyPopup(false)}
                     className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white py-4 rounded-xl font-bold uppercase tracking-wider transition-colors"
                   >
                     Entendi
                   </button>
                 </div>
               </div>
             )}
             {selectedRecord && selectedRecord.result && (
               <AnalysisDashboard 
                 data={selectedRecord.result} 
                 history={studentHistory} 
                 onReset={() => setSelectedRecordId(null)}
                 record={selectedRecord}
                 hideBackButton={isStandalone}
               />
             )}
          </div>
        ) : (
          <>
            {(activeView === 'STUDENT' || activeView === 'TEST') ? (
              <div className="space-y-8 animate-in fade-in duration-700">
                {status === AppStatus.IDLE ? (
                  !selectedStory ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      {STORIES.map(story => (
                        <div 
                          key={story.id} 
                          onClick={() => setSelectedStory(story)}
                          className="soft-paper-bg overflow-hidden bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md hover:border-violet-200 hover:-translate-y-1 transition-all cursor-pointer flex flex-col h-full group"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                              story.difficulty === 'Fácil' ? 'bg-emerald-100 text-emerald-700' :
                              story.difficulty === 'Médio' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            }`}>
                              {story.difficulty}
                            </span>
                            <span className="text-slate-400 text-xs font-semibold uppercase tracking-wider">{story.theme}</span>
                          </div>
                          <h4 className="text-xl font-black text-slate-800 mb-3 group-hover:text-violet-600 transition-colors">{story.title}</h4>
                          <p className="text-slate-500 text-sm line-clamp-3 mb-6 flex-grow">{story.content}</p>
                          <div className="flex gap-2">
                            <button 
                              className="flex-1 py-3 bg-slate-50 text-violet-600 font-bold rounded-xl group-hover:bg-violet-600 group-hover:text-white transition-colors"
                            >
                              Iniciar
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const link = `${window.location.origin}/?challenge=${story.id}`;
                                navigator.clipboard.writeText(link);
                                alert('Link do desafio copiado!');
                              }}
                              className="px-4 py-3 bg-slate-50 text-slate-400 font-bold rounded-xl hover:bg-violet-100 hover:text-violet-600 transition-colors flex items-center justify-center"
                              title="Copiar link do desafio"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex flex-col lg:grid lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 lg:items-start h-[calc(100dvh-7rem)] sm:h-[calc(100dvh-8rem)] lg:h-auto"
                      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                    >
                      <div className="soft-paper-bg lg:col-span-6 bg-[#1A1A1A] p-4 sm:p-8 md:p-14 lg:p-16 rounded-2xl sm:rounded-[3rem] lg:rounded-[4rem] shadow-2xl shadow-violet-900/30 ring-1 ring-violet-500/10 relative overflow-hidden border border-violet-500/20 flex flex-col flex-1 min-h-0 lg:h-[75vh]">
                        
                        {!isStandalone && (
                          <button 
                            onClick={() => setSelectedStory(null)}
                            className="absolute top-4 left-4 sm:top-8 sm:left-8 md:top-12 md:left-12 flex items-center gap-1.5 sm:gap-2 text-slate-400 hover:text-violet-600 font-bold text-xs sm:text-sm transition-colors z-10"
                          >
                            <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            Voltar
                          </button>
                        )}

                        {recordingStep === 'READING' && (
                          <div className="absolute top-4 right-4 sm:top-8 sm:right-8 md:top-12 md:right-12 flex items-center gap-1 sm:gap-2 bg-[#0F0F0F] rounded-full p-1 border border-violet-500/20 z-10">
                            <button
                              onClick={() => setFontScale(s => Math.max(0.7, +(s - 0.1).toFixed(2)))}
                              disabled={fontScale <= 0.7}
                              aria-label="Diminuir tamanho da fonte"
                              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#2A2036] text-violet-300 hover:text-white hover:bg-[#8B5CF6] font-black text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              −
                            </button>
                            <span className="text-[10px] sm:text-xs font-bold text-violet-300 tabular-nums w-8 text-center">
                              {Math.round(fontScale * 100)}%
                            </span>
                            <button
                              onClick={() => setFontScale(s => Math.min(1.8, +(s + 0.1).toFixed(2)))}
                              disabled={fontScale >= 1.8}
                              aria-label="Aumentar tamanho da fonte"
                              className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-[#2A2036] text-violet-300 hover:text-white hover:bg-[#8B5CF6] font-black text-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              +
                            </button>
                          </div>
                        )}

                        <h3 className={`text-xl sm:text-2xl md:text-3xl font-black text-violet-100 mb-4 sm:mb-6 md:mb-8 shrink-0 ${!isStandalone ? 'mt-10 sm:mt-8 md:mt-6' : 'mt-12 sm:mt-10'}`}>
                          {recordingStep === 'READING' ? (
                            activeView === 'TEST' ? `Avaliação: ${selectedStory.title}` : selectedStory.title
                          ) : "Agora, explique o que você entendeu:"}
                        </h3>
                        
                        {recordingStep === 'READING' ? (
                          <div className="relative flex-1 min-h-0">
                            <div
                              ref={storyScrollRef}
                              className="h-full overflow-y-auto pr-2 -mr-2 no-scrollbar"
                            >
                              <p
                                style={{
                                  fontSize: `clamp(${1 * fontScale}rem, ${2 * fontScale}vw + 0.5rem, ${1.875 * fontScale}rem)`,
                                  lineHeight: 1.6,
                                }}
                                className="text-slate-200 font-serif text-justify animate-in fade-in duration-500 pb-16"
                              >
                                <span className="inline-block w-6 sm:w-10" />
                                {selectedStory.content}
                              </p>
                            </div>
                            <div
                              aria-hidden="true"
                              className={`pointer-events-none absolute inset-x-0 bottom-0 h-32 transition-opacity duration-300 ${hasMoreBelow ? 'opacity-100' : 'opacity-0'}`}
                              style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.26) 30%, rgba(0,0,0,0.16) 60%, rgba(0,0,0,0.06) 85%, rgba(0,0,0,0) 100%)',
                              }}
                            />
                            <button
                              type="button"
                              aria-label="Rolar para ver mais texto"
                              onClick={() => {
                                const el = storyScrollRef.current;
                                if (el) el.scrollBy({ top: el.clientHeight * 0.75, behavior: 'smooth' });
                              }}
                              className={`absolute left-1/2 -translate-x-1/2 bottom-3 flex items-center justify-center w-9 h-9 rounded-full bg-white/10 backdrop-blur-sm border border-white/15 text-violet-200 hover:text-white hover:bg-white/20 hover:scale-110 active:scale-95 transition-all duration-200 animate-bounce-soft ${hasMoreBelow ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
                                <path d="M6 9l6 6 6-6" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-4 sm:space-y-6 animate-in slide-in-from-right duration-500">
                             <div className="bg-violet-50 p-5 sm:p-8 rounded-2xl sm:rounded-3xl border-2 border-violet-100">
                                <p className="text-base sm:text-xl text-slate-600 font-medium leading-relaxed">
                                  Muito bem! Agora, clique no microfone novamente e conte com suas próprias palavras:
                                  <br/><br/>
                                  <span className="font-bold text-violet-600">1. Quem são os personagens?</span><br/>
                                  <span className="font-bold text-violet-600">2. O que aconteceu na história?</span>
                                </p>
                             </div>
                             <p className="text-slate-400 text-xs sm:text-sm font-bold text-center uppercase tracking-widest">Grave sua explicação</p>
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-6 shrink-0 w-full lg:sticky lg:top-6 flex justify-stretch items-end">
                        <AudioRecorder 
                          key={recordingStep}
                          onRecordingComplete={handleRecordingComplete} 
                          isProcessing={false}
                          onRestart={handleRestart}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="max-w-2xl mx-auto bg-white p-6 sm:p-10 md:p-16 rounded-3xl sm:rounded-[3rem] md:rounded-[5rem] shadow-2xl text-center space-y-5 sm:space-y-8 md:space-y-10 border border-white">
                    {lastRecord?.status === 'processing' ? (
                      <>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-violet-100 rounded-full flex items-center justify-center mx-auto border-4 sm:border-8 border-white shadow-lg animate-pulse">
                          <svg className="h-12 w-12 sm:h-16 sm:w-16 text-violet-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </div>
                        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 tracking-tight">Processando...</h2>
                        <p className="text-base sm:text-xl text-slate-500 font-medium italic">A Inteligência Artificial está analisando sua leitura. Aguarde um momento!</p>
                      </>
                    ) : (
                      <>
                        <div className="w-24 h-24 sm:w-32 sm:h-32 bg-[#DCFCE7] rounded-full flex items-center justify-center mx-auto border-4 sm:border-8 border-white shadow-lg">
                          <svg className="h-12 w-12 sm:h-16 sm:w-16 text-[#16A34A]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>
                        </div>
                        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight">Fantástico! 🚀</h2>
                        <p className="text-base sm:text-xl text-slate-500 font-medium italic">Sua leitura e explicação foram analisadas com sucesso.</p>
                        
                        {activeView === 'TEST' ? (
                          <button 
                            onClick={() => {
                              setSelectedRecordId(lastRecordId);
                              setShowPrivacyPopup(true);
                              setStatus(AppStatus.IDLE);
                            }}
                            className="w-full py-4 sm:py-6 bg-[#8B5CF6] text-white text-base sm:text-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-[0_6px_0_#6D28D9] sm:shadow-[0_8px_0_#6D28D9] hover:bg-[#7C3AED] active:shadow-none active:translate-y-[6px] sm:active:translate-y-[8px] transition-all"
                          >
                            Ver Minha Avaliação
                          </button>
                        ) : (
                          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                            <button 
                              onClick={() => {
                                setSelectedRecordId(lastRecordId);
                                setStatus(AppStatus.IDLE);
                              }}
                              className="flex-1 py-4 sm:py-6 bg-white border-2 border-violet-200 text-[#8B5CF6] text-base sm:text-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-2xl sm:rounded-[2rem] hover:bg-violet-50 transition-all"
                            >
                              Ver Resultado
                            </button>
                            <button 
                              onClick={() => setStatus(AppStatus.IDLE)}
                              className="flex-1 py-4 sm:py-6 bg-[#8B5CF6] text-white text-base sm:text-xl font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] rounded-2xl sm:rounded-[2rem] shadow-[0_6px_0_#6D28D9] sm:shadow-[0_8px_0_#6D28D9] hover:bg-[#7C3AED] active:shadow-none active:translate-y-[6px] sm:active:translate-y-[8px] transition-all"
                            >
                              Ler Mais
                            </button>
                          </div>
                        )}
                      </>
                    )}
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
