import React from 'react';
import CognitiveRadarChart from './CognitiveRadarChart';
import EvolutionCurveChart, { EvolutionPoint } from './EvolutionCurveChart';
import { AnalysisResult, ReadingRecord } from '../types';

interface AnalysisDashboardProps {
  data: AnalysisResult;
  history: ReadingRecord[];
  onReset: () => void;
  record: ReadingRecord;
  hideBackButton?: boolean;
}

const METRIC_LABELS: Array<{ key: keyof AnalysisResult['metrics']; label: string }> = [
  { key: 'fluency', label: 'FLUÊNCIA' },
  { key: 'accuracy', label: 'PRECISÃO' },
  { key: 'pacing', label: 'RITMO' },
  { key: 'expression', label: 'EXPRESSÃO' },
  { key: 'pronunciation', label: 'PRONÚNCIA' },
  { key: 'comprehension', label: 'COMPREENSÃO' },
];

const SHORT_MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ data, history, onReset, record, hideBackButton }) => {
  const allReadings = [...history, record]
    .filter((r) => r.status === 'completed' && r.result)
    .sort((a, b) => a.timestamp - b.timestamp);

  const evolutionData: EvolutionPoint[] =
    allReadings.length > 0
      ? allReadings.map((r) => {
          const d = new Date(r.timestamp);
          return {
            name: SHORT_MONTHS[d.getMonth()],
            score: r.result?.overallScore ?? 0,
            fullDate: d.toLocaleDateString('pt-BR'),
          };
        })
      : [{ name: SHORT_MONTHS[new Date(record.timestamp).getMonth()], score: data.overallScore }];

  const formattedDate = new Date(record.timestamp).toLocaleDateString('pt-BR');

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header estilo referência */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Olá, {record.studentName.split(' ')[0]}!
          </h1>
          <p className="text-slate-400 font-bold mt-1">Acompanhe seu progresso de leitura</p>
        </div>
        {!hideBackButton && (
          <button
            type="button"
            onClick={onReset}
            className="bg-violet-50 text-[#8B5CF6] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center gap-2 hover:bg-violet-100 transition-all self-start md:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
            </svg>
            Área do Aluno
          </button>
        )}
      </div>

      {/* LINHA 1: Nota Global (1/3) + Curva de Evolução (2/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Nota Global */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm relative">
          <div className="flex items-start justify-between mb-4">
            <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">
              Nota Global
            </h3>
            <div className="w-10 h-10 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2.5}
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.539 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            </div>
          </div>
          <div className="flex flex-col items-center text-center py-2">
            <span className="text-[8rem] leading-none font-black text-[#8B5CF6] tracking-tighter">
              {data.overallScore}
            </span>
            <span className="text-[#8B5CF6] font-black uppercase tracking-[0.3em] text-sm mt-2">
              pontos
            </span>
          </div>
          <p className="text-slate-500 font-bold text-sm mt-6">
            {data.overallScore >= 80
              ? 'Parabéns! Continue assim.'
              : data.overallScore >= 60
                ? 'Muito bom! Continue praticando.'
                : 'Vamos praticar mais um pouco.'}
          </p>
        </div>

        {/* Curva de Evolução */}
        <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <div className="mb-2">
            <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">
              Curva de Evolução
            </h3>
            <p className="text-slate-400 text-xs font-bold mt-1">
              Crescimento da Nota Global nas Últimas Leituras
            </p>
          </div>
          <EvolutionCurveChart data={evolutionData} height={260} />
        </div>
      </div>

      {/* LINHA 2: Mapa de Habilidades (1/3) + Última Análise (1/3) + Destaques/Pontos (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Mapa de Habilidades */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
          <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px] mb-2">
            Mapa de Habilidades
          </h3>
          <CognitiveRadarChart metrics={data.metrics} height={280} />
          <dl className="grid grid-cols-3 gap-2 mt-4 text-center">
            {METRIC_LABELS.map(({ key, label }) => (
              <div key={key}>
                <dt className="text-[9px] font-black text-slate-400 tracking-widest">{label}</dt>
                <dd className="text-sm font-black text-[#8B5CF6]">{data.metrics[key]}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Última Análise */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col">
          <div className="mb-4">
            <h3 className="text-slate-400 font-black uppercase tracking-[0.2em] text-[11px]">
              Última Análise
            </h3>
            <p className="text-slate-400 text-xs font-bold mt-1">
              IA · Processamento de Linguagem Natural
            </p>
          </div>
          <div className="relative flex-grow">
            <span
              aria-hidden="true"
              className="absolute -top-2 -left-1 text-[#8B5CF6] text-5xl opacity-60 font-serif leading-none"
            >
              “
            </span>
            <p className="text-slate-700 font-serif text-base leading-relaxed pl-6 pr-2">
              {data.transcription}
            </p>
          </div>
          <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-6 pt-4 border-t border-slate-100">
            Análise realizada em {formattedDate}
          </p>
        </div>

        {/* Destaques + Pontos */}
        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm flex flex-col gap-8">
          <div>
            <h3 className="text-emerald-500 font-black uppercase tracking-[0.2em] text-[11px] mb-4">
              Destaques Positivos
            </h3>
            <ul className="space-y-3">
              {data.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="text-slate-600 font-medium text-sm leading-snug">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-amber-500 font-black uppercase tracking-[0.2em] text-[11px] mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              Pontos a Desenvolver
            </h3>
            <ul className="space-y-3">
              {data.areasForImprovement.map((a, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span
                    aria-hidden="true"
                    className="w-5 h-5 rounded-full bg-amber-100 text-amber-500 flex items-center justify-center shrink-0 mt-0.5"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={4}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </span>
                  <span className="text-slate-600 font-medium text-sm leading-snug">{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* LINHA 3: Parecer Pedagógico (full-width, destaque) */}
      <div className="bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] rounded-[2rem] p-10 text-white shadow-xl relative overflow-hidden">
        <div className="flex gap-8 relative z-10">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0 backdrop-blur-sm">
            <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="space-y-3 flex-grow">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/70">
              Parecer Pedagógico
            </h4>
            <p className="text-lg md:text-xl font-bold leading-relaxed italic opacity-95">
              “{data.feedback}”
            </p>
            <p className="text-white/70 font-black uppercase tracking-[0.2em] text-[10px] pt-2">
              Ritmo: {data.estimatedWPM} ppm · Precisão: {data.metrics.accuracy}%
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
