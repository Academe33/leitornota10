import React from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, CartesianGrid
} from 'recharts';
import CognitiveRadarChart from './CognitiveRadarChart';
import { AnalysisResult, ReadingRecord } from '../types';

interface AnalysisDashboardProps {
  data: AnalysisResult;
  history: ReadingRecord[];
  onReset: () => void;
  record: ReadingRecord;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ data, history, onReset, record }) => {
  // Cores do gráfico
  const chartColor = '#0EA5E9';

  // Processamento do histórico para o gráfico de área (Evolução)
  // Pegamos todas as leituras concluídas para mostrar a tendência completa
  const allReadings = [...history, record]
    .filter(r => r.status === 'completed' && r.result)
    .sort((a, b) => a.timestamp - b.timestamp);

  const evolutionData = allReadings.map(r => ({
    name: new Date(r.timestamp).toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase().replace('.', ''),
    score: r.result?.overallScore || 0,
    fullDate: new Date(r.timestamp).toLocaleDateString('pt-BR')
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      
      {/* 1. Header do Aluno (Estilo Cápsula Academe) */}
      <div className="bg-white rounded-[2.5rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-6 w-full md:w-auto">
          <button 
            onClick={onReset}
            className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 shadow-[0_4px_0_#CBD5E1] hover:bg-slate-200 hover:text-slate-600 active:shadow-none active:translate-y-[4px] transition-all"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"/></svg>
          </button>
          
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#8B5CF6] rounded-[1.5rem] flex items-center justify-center text-white text-3xl font-black shadow-lg">
               {record.studentName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-3xl font-black text-[#0EA5E9] tracking-tight">{record.studentName}</h2>
                <span className="bg-sky-100 text-sky-600 px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase">ID: {record.id.toUpperCase()}</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">
                {new Date(record.timestamp).toLocaleDateString('pt-BR')} às {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-[#F0F9FF] p-3 pr-6 rounded-[2rem] border border-[#BAE6FD] flex items-center gap-4 w-full md:w-auto">
           <div className="w-12 h-12 bg-[#0EA5E9] rounded-2xl flex items-center justify-center text-white shadow-md">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
           </div>
           <div>
             <span className="block text-[9px] font-black text-[#BAE6FD] uppercase tracking-[0.2em]">Leitura Atual</span>
             <span className="block text-sm font-black text-[#0EA5E9]">O Leão e o Ratinho</span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* LINHA 1: NOTA + EVOLUÇÃO */}
        
        {/* Card Score Global (Rosa) - Coluna Menor */}
        <div className="lg:col-span-3 bg-white rounded-[3.5rem] p-8 shadow-[0_15px_50px_rgba(251,113,133,0.08)] border border-white flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[320px]">

          <h3 className="text-[#F472B6] font-black uppercase tracking-[0.2em] text-[10px] mb-6 relative z-10">Nota Global</h3>
          <div className="relative z-10">
             <span className="text-[#FB7185] text-[8rem] font-black tracking-tighter leading-none drop-shadow-sm">{data.overallScore}</span>
          </div>
          <div className="mt-6 bg-[#FFE4E6] text-[#E11D48] px-6 py-2 rounded-full text-[9px] font-black uppercase tracking-[0.2em] relative z-10">Pontos Alcançados</div>
        </div>

        {/* Gráfico de Evolução (Area Chart) - Coluna Maior */}
        <div className="lg:col-span-9 bg-white rounded-[3.5rem] p-10 shadow-sm border border-white flex flex-col justify-between relative">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-[#0EA5E9] font-black uppercase tracking-[0.2em] text-[12px] mb-1">Curva de Evolução</h3>
              <p className="text-slate-400 font-bold text-xs">Crescimento da Nota Global nas Últimas Leituras</p>
            </div>
            <div className="flex items-center gap-2">
               <div className="w-3 h-3 rounded-full bg-[#0EA5E9]"></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Performance</span>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0EA5E9" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#0EA5E9" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 11, fontWeight: 800 }} 
                  dy={15}
                />
                <YAxis 
                  hide 
                  domain={[0, 100]} 
                />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}
                  cursor={{ stroke: '#0EA5E9', strokeWidth: 2, strokeDasharray: '5 5' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#0EA5E9" 
                  strokeWidth={4}
                  fillOpacity={1} 
                  fill="url(#colorScore)" 
                  activeDot={{ r: 8, strokeWidth: 4, stroke: '#fff', fill: '#0EA5E9' }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LINHA 2: RADAR + TRANSCRIÇÃO */}

        {/* Radar e Métricas - Coluna Menor */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-50 flex flex-col items-center flex-grow">
            <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px] text-center mb-8">Mapa de Habilidades<br/>Cognitivas</h3>
            <CognitiveRadarChart metrics={data.metrics} height={300} />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-white p-6 rounded-[2.5rem] text-center border border-slate-50 shadow-sm">
                <span className="block text-[9px] font-black text-[#8B5CF6] uppercase tracking-[0.2em] mb-2">Ritmo Médio</span>
                <span className="block text-3xl font-black text-[#8B5CF6] leading-none">{data.estimatedWPM} <small className="text-xs text-[#C4B5FD]">PPM</small></span>
             </div>
             <div className="bg-white p-6 rounded-[2.5rem] text-center border border-slate-50 shadow-sm">
                <span className="block text-[9px] font-black text-[#22C55E] uppercase tracking-[0.2em] mb-2">Precisão</span>
                <span className="block text-3xl font-black text-[#22C55E] leading-none">{data.metrics.accuracy}<small className="text-sm">%</small></span>
             </div>
          </div>
        </div>

        {/* Transcrição da IA (Card Escuro) - Coluna Maior */}
        <div className="lg:col-span-8 bg-[#0F172A] rounded-[3.5rem] p-12 shadow-2xl relative overflow-hidden flex flex-col">
           <div className="flex items-center gap-5 mb-10">
              <div className="bg-[#334155] p-3 rounded-2xl text-[#818CF8]">
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
              </div>
              <div>
                 <h3 className="text-white font-black uppercase tracking-[0.2em] text-[11px] mb-1">Transcrição da IA</h3>
                 <p className="text-slate-500 font-bold text-[9px] uppercase tracking-[0.2em]">Análise de Processamento de Linguagem Natural</p>
              </div>
           </div>
           
           <div className="relative mb-12 flex-grow flex items-center justify-center">
              <span className="text-[#818CF8] text-6xl absolute -top-8 -left-4 opacity-40 font-serif">“</span>
              <p className="text-white font-bold text-xl md:text-2xl leading-[1.8] italic tracking-wide text-center relative z-10 px-8">
                {data.transcription}
              </p>
              <span className="text-[#818CF8] text-6xl absolute -bottom-8 -right-4 opacity-40 font-serif">”</span>
           </div>

           <div className="mt-auto pt-10 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="space-y-4">
                 <h5 className="text-[#2DD4BF] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#2DD4BF]"></span>
                    Destaques Positivos
                 </h5>
                 <ul className="space-y-2">
                    {data.strengths.map((s, i) => (
                      <li key={i} className="text-slate-400 text-[11px] font-medium leading-relaxed">
                        {s}
                      </li>
                    ))}
                 </ul>
              </div>
              <div className="space-y-4">
                 <h5 className="text-[#F472B6] font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#F472B6]"></span>
                    Pontos a Desenvolver
                 </h5>
                 <ul className="space-y-2">
                    {data.areasForImprovement.map((a, i) => (
                      <li key={i} className="text-slate-400 text-[11px] font-medium leading-relaxed">
                        {a}
                      </li>
                    ))}
                 </ul>
              </div>
           </div>
        </div>
      </div>

      {/* Parecer Pedagógico (Card Roxo Grande) */}
      <div className="bg-[#6366F1] rounded-[3.5rem] p-12 text-white shadow-2xl relative overflow-hidden group">
         <div className="flex gap-8 relative z-10">
            <div className="w-16 h-16 bg-white/20 rounded-[1.5rem] flex items-center justify-center shrink-0 backdrop-blur-sm">
               <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                 <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
               </svg>
            </div>
            <div className="space-y-4 flex-grow">
              <h4 className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">Parecer Pedagógico</h4>
              <p className="text-xl md:text-2xl font-bold leading-relaxed italic opacity-95">
                "{data.feedback}"
              </p>
            </div>
         </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;