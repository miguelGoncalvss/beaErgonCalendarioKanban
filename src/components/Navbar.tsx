import React from 'react';
import { ShieldCheck, Users } from 'lucide-react';

interface NavbarProps {
  onOpenAdminMetrics?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenAdminMetrics, 
}) => {
  return (
    <header className="bg-[#0d345e] text-white border-b-2 border-amber-400 shadow-md sticky top-0 z-30 font-['Inter',sans-serif]">
      <div className="w-full px-6 py-2.5 flex items-center justify-between">
        
        {/* Brand Identity: Blue & Yellow Corporate */}
        <div className="flex items-center gap-3">
          {/* Corporate Monogram */}
          <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#0d345e] font-black text-base flex items-center justify-center shadow-xs border border-amber-300 select-none">
            E
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-white m-0">
                ERGON
              </span>
              <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-900/80">
                Contabilidade
              </span>
            </div>
            <p className="text-[11px] text-blue-200/90 m-0 font-medium leading-none">
              Calendário & Kanban Operacional
            </p>
          </div>
        </div>

        {/* Right Section Actions */}
        <div className="flex items-center gap-2.5">
          {/* Admin Metrics Button */}
          {onOpenAdminMetrics && (
            <button
              onClick={onOpenAdminMetrics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08223f] hover:bg-blue-900 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Painel de métricas de tempo, SLA e desempenho operacional"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Métricas & SLA</span>
            </button>
          )}

          {/* Equipe Ergon Badge */}
          <div 
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#08223f] border border-blue-800 text-xs font-semibold text-white shadow-xs"
            title="Equipe Ergon Contábil"
          >
            <div className="w-6 h-6 rounded bg-amber-400 text-[#0d345e] flex items-center justify-center text-xs font-black shadow-xs">
              <Users className="w-3.5 h-3.5" />
            </div>
            <span className="font-medium text-blue-100">Equipe Ergon</span>
          </div>
        </div>

      </div>
    </header>
  );
};

export default Navbar;
