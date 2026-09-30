import React from 'react';
import { ShieldCheck, Users, Building2, LogOut, ChevronDown, Briefcase } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface NavbarProps {
  onOpenAdminMetrics?: () => void;
  onOpenCompanyManager?: () => void;
  onOpenWorkloadDashboard?: () => void;
  onOpenTeamManagement?: () => void;
  onOpenUserPortal?: (sleeve?: 'team_access' | 'workload' | 'sla_metrics' | 'profile') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onOpenAdminMetrics,
  onOpenCompanyManager,
  onOpenWorkloadDashboard,
  onOpenTeamManagement,
  onOpenUserPortal,
}) => {
  const { 
    user, 
    signOut, 
    departments, 
    activeDepartment, 
    setActiveDepartmentId,
    isOrgAdmin,
    isOrgOwner,
    isDepartmentManager
  } = useAuth();

  const userInitial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'O';

  return (
    <header className="bg-[#0d345e] text-white border-b-2 border-amber-400 shadow-md sticky top-0 z-30 font-['Inter',sans-serif]">
      <div className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between">
        
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

          {/* Seletor de Setor Ativo (Se houver múltiplos setores ou para Admin) */}
          {departments.length > 1 || (isOrgAdmin && departments.length > 0) ? (
            <div className="hidden md:flex items-center ml-2 pl-3 border-l border-blue-900/80">
              <div className="relative flex items-center">
                <Briefcase className="w-3.5 h-3.5 text-amber-400 absolute left-2 pointer-events-none" />
                <select
                  value={activeDepartment?.id || (isOrgAdmin ? 'all' : '')}
                  onChange={(e) => setActiveDepartmentId(e.target.value)}
                  className="pl-7 pr-8 py-1 bg-[#08223f] hover:bg-blue-900/80 border border-blue-800 text-amber-300 text-xs font-bold rounded-lg cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-400 transition appearance-none"
                  title="Alterar setor ativo para filtragem"
                >
                  {isOrgAdmin && (
                    <option value="all" className="bg-[#08223f] text-white">
                      Todos os Setores
                    </option>
                  )}
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id} className="bg-[#08223f] text-white">
                      Setor: {dept.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-amber-300 absolute right-2.5 pointer-events-none" />
              </div>
            </div>
          ) : activeDepartment ? (
            <div className="hidden md:flex items-center ml-2 pl-3 border-l border-blue-900/80">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-800 flex items-center gap-1">
                <Briefcase className="w-3 h-3 text-amber-400" />
                <span>{activeDepartment.name}</span>
              </span>
            </div>
          ) : null}
        </div>

        {/* Right Section Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* Manage Companies Button */}
          {onOpenCompanyManager && (
            <button
              onClick={onOpenCompanyManager}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08223f] hover:bg-blue-900 border border-blue-800 hover:border-amber-400/60 text-blue-100 hover:text-amber-300 text-xs font-semibold transition cursor-pointer shadow-xs"
              title="Gerenciar e excluir empresas / clientes cadastrados"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Empresas</span>
            </button>
          )}

          {/* Se onOpenUserPortal não estiver ativo ou para acesso rápido legado */}
          {!onOpenUserPortal && onOpenAdminMetrics && (
            <button
              onClick={onOpenAdminMetrics}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08223f] hover:bg-blue-900 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Painel de métricas de tempo, SLA e desempenho operacional"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Métricas & SLA</span>
              <span className="sm:hidden">SLA</span>
            </button>
          )}

          {/* Equipe & Acessos - Apenas se não houver portal dedicado integrado */}
          {!onOpenUserPortal && onOpenTeamManagement && (isOrgAdmin || isDepartmentManager) && (
            <button
              onClick={onOpenTeamManagement}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#08223f] hover:bg-blue-900 border border-amber-400/50 hover:border-amber-400 text-amber-300 text-xs font-bold transition cursor-pointer shadow-xs"
              title="Painel Administrativo: Gestão de Setores, Vínculos e Convites"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Equipe & Acessos</span>
              <span className="md:hidden">Acessos</span>
            </button>
          )}

          {/* Equipe Ergon - Apenas se não houver portal dedicado integrado */}
          {!onOpenUserPortal && onOpenWorkloadDashboard && (
            <button 
              type="button"
              onClick={onOpenWorkloadDashboard}
              className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-[#08223f] hover:bg-blue-900 border border-blue-700/80 hover:border-amber-400 text-xs font-semibold text-white shadow-xs transition cursor-pointer group"
              title="Abrir Dashboard de Carga de Trabalho & Gestão Diária (Bea vs. Vini)"
            >
              <div className="w-6 h-6 rounded bg-amber-400 text-[#0d345e] flex items-center justify-center text-xs font-black shadow-xs group-hover:scale-105 transition-transform">
                <Users className="w-3.5 h-3.5" />
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="font-bold text-blue-100 group-hover:text-amber-300 transition-colors leading-tight">
                  Equipe Ergon
                </span>
                <span className="text-[9.5px] text-amber-300/80 font-normal leading-tight">
                  Carga & Prazos
                </span>
              </div>
            </button>
          )}

          {/* Perfil do Usuário Autenticado e Acesso à Área de Gestão */}
          {user && (
            <div className="flex items-center gap-1.5 pl-1.5 sm:pl-2.5 border-l border-blue-900/80">
              <button
                type="button"
                onClick={() => onOpenUserPortal?.('team_access')}
                className="flex items-center gap-2 p-1 sm:px-2.5 sm:py-1 rounded-xl bg-[#08223f] hover:bg-blue-900 border border-blue-800 hover:border-amber-400 text-left transition cursor-pointer group shadow-xs"
                title="Abrir Central de Gestão & Área do Operador"
              >
                <div 
                  className="w-7 h-7 rounded-full bg-amber-400 text-[#0d345e] font-black text-xs flex items-center justify-center shadow-xs border border-amber-300 group-hover:scale-105 transition-transform shrink-0"
                >
                  {userInitial}
                </div>

                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-bold text-white truncate max-w-[120px] leading-tight group-hover:text-amber-300 transition-colors">
                    {user.fullName}
                  </span>
                  <span className="text-[9.5px] text-amber-300/90 font-medium leading-tight">
                    {isOrgOwner ? '👑 Owner' : isOrgAdmin ? '🛡️ Admin' : isDepartmentManager ? '⭐ Chefe Setor' : '👤 Membro'}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => signOut()}
                className="p-1.5 rounded-lg bg-[#08223f] hover:bg-rose-950/80 border border-blue-800 hover:border-rose-400 text-blue-200 hover:text-rose-300 transition cursor-pointer ml-1"
                title="Sair do sistema (Logout)"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};

export default Navbar;
