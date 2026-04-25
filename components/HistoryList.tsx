import React from 'react';
import { ReadingRecord, Shift, Grade } from '../types';

interface HistoryListProps {
  records: ReadingRecord[];
  onSelect: (id: string) => void;
  onClear: () => void;
}

type ViewMode = 'ALL' | 'BY_SHIFT' | 'BY_GRADE' | 'BY_CLASSROOM';

const GRADES: Grade[] = ['1º Ano', '2º Ano', '3º Ano', '4º Ano', '5º Ano', '6º Ano', '7º Ano', '8º Ano', '9º Ano'];
const SHIFTS: Shift[] = ['Manhã', 'Tarde'];

const hashString = (s: string): number => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
};

const deriveGrade = (r: ReadingRecord): Grade => r.grade || GRADES[hashString(r.studentName) % GRADES.length];
const deriveShift = (r: ReadingRecord): Shift => r.shift || SHIFTS[hashString(r.studentName + 'shift') % SHIFTS.length];
const deriveClassroom = (r: ReadingRecord): string => r.classroom || `Turma ${String.fromCharCode(65 + (hashString(r.studentName + 'c') % 4))}`;

const SHIFT_STYLES: Record<Shift, { bg: string; text: string; border: string; icon: string; emoji: string }> = {
  'Manhã':  { bg: 'bg-[#FFFBEB]', text: 'text-[#D97706]', border: 'border-[#FEF3C7]', icon: '☀️', emoji: '☀️' },
  'Tarde':  { bg: 'bg-[#FFF7ED]', text: 'text-[#EA580C]', border: 'border-[#FED7AA]', icon: '🌤️', emoji: '🌤️' },
};

const scoreColor = (score?: number): string => {
  if (score === undefined) return 'text-slate-300';
  if (score >= 80) return 'text-[#16A34A]';
  if (score >= 60) return 'text-[#D97706]';
  return 'text-[#EF4444]';
};

const HistoryList: React.FC<HistoryListProps> = ({ records, onSelect, onClear }) => {
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<ViewMode>('ALL');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [shiftFilter, setShiftFilter] = React.useState<Shift | 'ALL'>('ALL');

  const enrichedRecords = React.useMemo(
    () => records.map(r => ({
      ...r,
      _grade: deriveGrade(r),
      _shift: deriveShift(r),
      _classroom: deriveClassroom(r),
    })),
    [records]
  );

  const filteredRecords = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let base = enrichedRecords;
    if (shiftFilter !== 'ALL') {
      base = base.filter(r => r._shift === shiftFilter);
    }
    if (!q) return base;
    return base.filter(r =>
      r.studentName.toLowerCase().includes(q) ||
      r._grade.toLowerCase().includes(q) ||
      r._shift.toLowerCase().includes(q) ||
      r._classroom.toLowerCase().includes(q)
    );
  }, [enrichedRecords, searchQuery, shiftFilter]);

  const stats = React.useMemo(() => {
    const completed = filteredRecords.filter(r => r.status === 'completed' && r.result);
    const scores = completed.map(r => r.result!.overallScore);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thisWeek = filteredRecords.filter(r => r.timestamp >= weekAgo).length;

    const byShift: Record<Shift, number> = { 'Manhã': 0, 'Tarde': 0 };
    filteredRecords.forEach(r => { byShift[r._shift]++; });

    return { total: filteredRecords.length, avg, thisWeek, byShift };
  }, [filteredRecords]);

  const groupedByShift = React.useMemo(() => {
    const groups: Record<Shift, typeof filteredRecords> = { 'Manhã': [], 'Tarde': [] };
    filteredRecords.forEach(r => { groups[r._shift].push(r); });
    return groups;
  }, [filteredRecords]);

  const groupedByGrade = React.useMemo(() => {
    const groups = new Map<Grade, typeof filteredRecords>();
    filteredRecords.forEach(r => {
      if (!groups.has(r._grade)) groups.set(r._grade, []);
      groups.get(r._grade)!.push(r);
    });
    return Array.from(groups.entries()).sort((a, b) => GRADES.indexOf(a[0]) - GRADES.indexOf(b[0]));
  }, [filteredRecords]);

  const groupedByClassroom = React.useMemo(() => {
    const groups = new Map<string, typeof filteredRecords>();
    filteredRecords.forEach(r => {
      const key = `${r._grade} • ${r._classroom} • ${r._shift}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    });
    return Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRecords]);

  const renderRecordCard = (record: typeof filteredRecords[number]) => {
    const shiftStyle = SHIFT_STYLES[record._shift];
    const score = record.status === 'completed' ? record.result?.overallScore : undefined;
    return (
      <div
        key={record.id}
        className="bg-white rounded-[2rem] p-5 md:p-6 shadow-sm hover:shadow-md transition-all border border-white flex flex-col md:flex-row items-center gap-5 group"
      >
        <div className="w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center text-xl font-black text-white shadow-lg shadow-violet-500/30">
          {record.studentName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
        </div>

        <div className="flex-grow text-center md:text-left min-w-0">
          <h3 className="text-lg font-black text-slate-800 leading-tight truncate">{record.studentName}</h3>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-1 flex-wrap">
            <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full border ${shiftStyle.bg} ${shiftStyle.text} ${shiftStyle.border}`}>
              {shiftStyle.emoji} {record._shift}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-[#F5F3FF] text-[#8B5CF6] border border-[#DDD6FE]">
              {record._grade}
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.15em] px-3 py-1 rounded-full bg-slate-50 text-slate-500 border border-slate-100">
              {record._classroom}
            </span>
          </div>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
            <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
              {new Date(record.timestamp).toLocaleDateString('pt-BR')} • {new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center px-6 border-x border-slate-50 min-w-[100px]">
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Score</span>
          <span className={`text-2xl font-black leading-none ${scoreColor(score)}`}>
            {score !== undefined ? score : '--'}
          </span>
        </div>

        <div className="min-w-[110px] flex justify-center">
          <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-4 py-2 rounded-full border ${
            record.status === 'completed'
              ? 'bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]'
              : record.status === 'processing'
                ? 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7] animate-pulse'
                : 'bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]'
          }`}>
            {record.status === 'completed' ? 'Pronto' : record.status === 'processing' ? 'Processando' : 'Erro'}
          </span>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <button
            onClick={() => onSelect(record.id)}
            disabled={record.status !== 'completed'}
            className="w-full md:w-auto px-6 py-3 bg-[#8B5CF6] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_6px_0_#7C3AED] hover:bg-[#7C3AED] active:shadow-none active:translate-y-[6px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
          >
            Ver
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl max-w-sm w-full mx-4 border-2 border-slate-100 text-center space-y-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-500">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 mb-2">Tem certeza?</h3>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">
                Isso apagará todo o histórico de leituras. Essa ação não pode ser desfeita.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button
                onClick={() => { onClear(); setShowConfirm(false); }}
                className="w-full bg-[#FB7185] text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-[0_6px_0_#E11D48] hover:bg-[#F43F5E] active:shadow-none active:translate-y-[6px] transition-all"
              >
                Sim, resetar
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-4 bg-slate-100 text-slate-500 font-black text-xs uppercase tracking-[0.2em] rounded-xl hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-white flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-[#8B5CF6] tracking-tight">Painel do Professor</h2>
          <p className="text-slate-400 font-bold mt-2 text-sm md:text-base">Testes organizados por turno, série e turma.</p>
        </div>
        {records.length > 0 && (
          <button
            onClick={() => setShowConfirm(true)}
            className="bg-[#FB7185] text-white font-black text-xs uppercase tracking-[0.2em] px-6 py-3 rounded-2xl shadow-[0_6px_0_#E11D48] hover:bg-[#F43F5E] active:shadow-none active:translate-y-[6px] transition-all self-start md:self-auto"
          >
            Resetar Tudo
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="soft-paper-bg overflow-hidden bg-white rounded-[2rem] p-6 border border-white shadow-sm">
          <span className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Total de Testes</span>
          <span className="block text-4xl font-black text-[#8B5CF6] leading-none">{stats.total}</span>
        </div>
        <div className="soft-paper-bg overflow-hidden bg-white rounded-[2rem] p-6 border border-white shadow-sm">
          <span className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Média Geral</span>
          <span className={`block text-4xl font-black leading-none ${scoreColor(stats.avg || undefined)}`}>{stats.avg || '--'}</span>
        </div>
        <div className="soft-paper-bg overflow-hidden bg-white rounded-[2rem] p-6 border border-white shadow-sm">
          <span className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Últimos 7 dias</span>
          <span className="block text-4xl font-black text-[#16A34A] leading-none">{stats.thisWeek}</span>
        </div>
        <div className="soft-paper-bg overflow-hidden bg-white rounded-[2rem] p-4 border border-white shadow-sm flex flex-col">
          <span className="block text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-2">Filtrar por Turno</span>
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl flex-grow">
            {([
              { key: 'ALL' as const, label: 'Todos', emoji: '🗂️' },
              { key: 'Manhã' as const, label: 'Manhã', emoji: '☀️' },
              { key: 'Tarde' as const, label: 'Tarde', emoji: '🌤️' },
            ]).map(opt => (
              <button
                key={opt.key}
                onClick={() => setShiftFilter(opt.key)}
                className={`flex-1 px-2 py-2 text-[10px] font-black uppercase tracking-[0.12em] rounded-xl whitespace-nowrap transition-all ${
                  shiftFilter === opt.key
                    ? 'bg-[#8B5CF6] text-white shadow-sm'
                    : 'text-slate-500 hover:text-[#8B5CF6]'
                }`}
                title={opt.label}
              >
                <span className="block text-base leading-none mb-0.5">{opt.emoji}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs de visualização + busca */}
      <div className="bg-white rounded-[2rem] p-4 md:p-5 border border-white shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-2xl overflow-x-auto">
          {([
            { key: 'ALL', label: 'Todos' },
            { key: 'BY_SHIFT', label: 'Por Turno' },
            { key: 'BY_GRADE', label: 'Por Série' },
            { key: 'BY_CLASSROOM', label: 'Por Turma' },
          ] as { key: ViewMode; label: string }[]).map(tab => (
            <button
              key={tab.key}
              onClick={() => setViewMode(tab.key)}
              className={`px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.15em] rounded-xl whitespace-nowrap transition-all ${
                viewMode === tab.key
                  ? 'bg-[#8B5CF6] text-white shadow-sm'
                  : 'text-slate-500 hover:text-[#8B5CF6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex-grow relative">
          <svg className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            type="text"
            placeholder="Buscar por aluno, série, turno..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 placeholder:text-slate-300 border border-slate-100 focus:border-[#8B5CF6] focus:outline-none transition-colors"
          />
        </div>
      </div>

      {/* Conteúdo principal */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white rounded-[3rem] border-4 border-dashed border-violet-100 py-24 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm text-[#8B5CF6]">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <p className="text-xl font-black text-slate-800 tracking-tight">
            {records.length === 0 ? 'Ainda não há testes realizados ✨' : 'Nenhum resultado para esta busca'}
          </p>
        </div>
      ) : viewMode === 'ALL' ? (
        <div className="flex flex-col gap-3">
          {filteredRecords.sort((a, b) => b.timestamp - a.timestamp).map(renderRecordCard)}
        </div>
      ) : viewMode === 'BY_SHIFT' ? (
        <div className="space-y-6">
          {SHIFTS.map(shift => {
            const shiftStyle = SHIFT_STYLES[shift];
            const group = groupedByShift[shift];
            if (group.length === 0) return null;
            return (
              <div key={shift} className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-white shadow-sm">
                <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${shiftStyle.bg} ${shiftStyle.border} border`}>
                      {shiftStyle.emoji}
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-800">{shift}</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.length} {group.length === 1 ? 'teste' : 'testes'}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {group.sort((a, b) => b.timestamp - a.timestamp).map(renderRecordCard)}
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'BY_GRADE' ? (
        <div className="space-y-6">
          {groupedByGrade.map(([grade, group]) => (
            <div key={grade} className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-white shadow-sm">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#8B5CF6] to-[#6366F1] flex items-center justify-center text-lg font-black text-white shadow-lg shadow-violet-500/30">
                    {grade.split(' ')[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800">{grade}</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.length} {group.length === 1 ? 'teste' : 'testes'}</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {group.sort((a, b) => b.timestamp - a.timestamp).map(renderRecordCard)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {groupedByClassroom.map(([key, group]) => (
            <div key={key} className="bg-white rounded-[2.5rem] p-6 md:p-8 border border-white shadow-sm">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div>
                  <h3 className="text-xl font-black text-slate-800">{key}</h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{group.length} {group.length === 1 ? 'teste' : 'testes'}</p>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {group.sort((a, b) => b.timestamp - a.timestamp).map(renderRecordCard)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
