import React from 'react';
import { ReadingRecord } from '../types';

interface HistoryListProps {
  records: ReadingRecord[];
  onSelect: (id: string) => void;
  onClear: () => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ records, onSelect, onClear }) => {
  const [showConfirm, setShowConfirm] = React.useState(false);

  const uniqueRecords = React.useMemo(() => {
    const map = new Map<string, ReadingRecord>();
    records.forEach(record => {
      const existing = map.get(record.studentName);
      if (!existing || new Date(record.timestamp) > new Date(existing.timestamp)) {
        map.set(record.studentName, record);
      }
    });
    return Array.from(map.values()).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [records]);

  return (
    <div className="space-y-10 max-w-6xl mx-auto">
      {/* Modal de Confirmação */}
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
                onClick={() => {
                  onClear();
                  setShowConfirm(false);
                }}
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

      {/* Cabeçalho do Painel */}
      <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-white flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-4xl font-black text-[#0EA5E9] tracking-tight">Painel do Professor</h2>
          <p className="text-slate-400 font-bold mt-2">Acompanhe a jornada mágica de leitura dos seus alunos.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="bg-[#F0F9FF] px-10 py-5 rounded-[2.5rem] border border-[#BAE6FD] text-center min-w-[180px]">
             <span className="block text-[10px] font-black text-[#BAE6FD] uppercase tracking-[0.2em] mb-1">Leituras Realizadas</span>
             <span className="block text-3xl font-black text-[#0EA5E9] leading-none">{records.length}</span>
          </div>
          {records.length > 0 && (
            <button 
              onClick={() => setShowConfirm(true)}
              className="bg-[#FB7185] text-white font-black text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-2xl shadow-[0_6px_0_#E11D48] hover:bg-[#F43F5E] active:shadow-none active:translate-y-[6px] transition-all"
            >
              Resetar Tudo
            </button>
          )}
        </div>
      </div>

      {/* Lista de Alunos */}
      {uniqueRecords.length === 0 ? (
        <div className="bg-white rounded-[4rem] border-4 border-dashed border-sky-100 py-32 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-24 h-24 bg-sky-50 rounded-full flex items-center justify-center border-4 border-white shadow-sm text-[#0EA5E9]">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
          </div>
          <p className="text-2xl font-black text-slate-800 tracking-tight">Ainda não há nenhuma leitura para avaliar... ✨</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
           {uniqueRecords.map(record => (
             <div 
               key={record.id} 
               className="bg-white rounded-[2.5rem] p-4 md:p-6 shadow-sm hover:shadow-md transition-all border border-white flex flex-col md:flex-row items-center gap-6 group"
             >
                {/* Info Principal */}
                <div className="flex-grow text-center md:text-left">
                   <h3 className="text-xl font-black text-slate-800 leading-tight">{record.studentName}</h3>
                   <div className="flex items-center justify-center md:justify-start gap-2 mt-1">
                      <svg className="w-3 h-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                        {new Date(record.timestamp).toLocaleDateString('pt-BR')} às {new Date(record.timestamp).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                      </span>
                      <span className="text-slate-300 text-[10px]">•</span>
                      <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                         {records.filter(r => r.studentName === record.studentName).length} Testes
                      </span>
                   </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center px-8 border-x border-slate-50 min-w-[120px]">
                   <span className="text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] mb-1">Score Global</span>
                   <span className="text-2xl font-black text-[#8B5CF6] leading-none">
                     {record.status === 'completed' ? record.result?.overallScore : '--'}
                   </span>
                </div>

                {/* Status Badge */}
                <div className="min-w-[140px] flex justify-center">
                  <span className={`text-[9px] font-black uppercase tracking-[0.15em] px-5 py-2 rounded-full border ${
                    record.status === 'completed' 
                      ? 'bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]' 
                      : record.status === 'processing'
                      ? 'bg-[#FFFBEB] text-[#D97706] border-[#FEF3C7] animate-pulse'
                      : 'bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]'
                  }`}>
                    {record.status === 'completed' ? 'Pronto' : record.status === 'processing' ? 'Processando' : 'Erro'}
                  </span>
                </div>

                {/* Botão de Ação */}
                <div className="shrink-0 w-full md:w-auto">
                  <button 
                    onClick={() => onSelect(record.id)}
                    disabled={record.status !== 'completed'}
                    className="w-full md:w-auto px-8 py-4 bg-[#0EA5E9] text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-[0_6px_0_#0284C7] hover:bg-[#0284C7] active:shadow-none active:translate-y-[6px] transition-all disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
                  >
                    Ver Relatório
                  </button>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default HistoryList;