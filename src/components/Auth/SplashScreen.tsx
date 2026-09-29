import React from 'react';

export const SplashScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-[#08223f] via-[#0d345e] to-[#041324] font-['Inter',sans-serif] text-slate-100 select-none">
      <div className="flex flex-col items-center gap-4 animate-fadeIn">
        {/* Monograma Corporativo */}
        <div className="w-16 h-16 rounded-2xl bg-amber-400 text-[#0d345e] font-black text-2xl flex items-center justify-center shadow-2xl border-2 border-amber-300 animate-pulse">
          E
        </div>

        <div className="text-center">
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white m-0">
              ERGON
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-900/80">
              Contabilidade
            </span>
          </div>
          <p className="text-xs text-blue-200/80 mt-1 font-medium">
            Carregando ambiente seguro...
          </p>
        </div>

        {/* Spinner */}
        <div className="w-6 h-6 border-3 border-amber-400 border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    </div>
  );
};
