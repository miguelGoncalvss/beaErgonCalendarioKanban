import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  Lock, 
  Mail, 
  User as UserIcon, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle,
  Eye, 
  EyeOff, 
  LogOut, 
  Database, 
  KeyRound, 
  Users, 
  FileSpreadsheet, 
  Calculator, 
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AuthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdminMetrics?: () => void;
}

export const AuthDrawer: React.FC<AuthDrawerProps> = ({ 
  isOpen, 
  onClose,
  onOpenAdminMetrics 
}) => {
  const { user, login, register, logout, isAuthenticated } = useAuth();
  
  const [isLoginTab, setIsLoginTab] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('contabilidade');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Smooth enter / exit animation state
  const [isClosing, setIsClosing] = useState(false);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 260);
  }, [isClosing, onClose]);

  // Close on Escape key press with smooth transition
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isClosing) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isClosing, handleClose]);

  if (!isOpen && !isClosing) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLoginTab) {
        await login(email.trim(), password);
        setSuccessMsg('Login realizado com sucesso!');
      } else {
        await register(name.trim(), email.trim(), password, role);
        setSuccessMsg('Conta criada com sucesso!');
      }
      setTimeout(() => {
        setSuccessMsg('');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ocorreu um erro ao processar. Verifique os dados digitados.');
    } finally {
      setLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail('contato@ergon.com.br');
    setPassword('admin123');
    setIsLoginTab(true);
    setErrorMsg('');
  };

  const getRoleBadge = (userRole?: string) => {
    switch (userRole) {
      case 'admin':
        return {
          label: 'Administrador Geral',
          icon: ShieldCheck,
          badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/50',
        };
      case 'fiscal':
        return {
          label: 'Analista Fiscal',
          icon: FileSpreadsheet,
          badgeClass: 'bg-blue-400/20 text-blue-200 border-blue-400/40',
        };
      case 'dp':
        return {
          label: 'Departamento Pessoal',
          icon: Users,
          badgeClass: 'bg-blue-400/20 text-blue-200 border-blue-400/40',
        };
      case 'contabilidade':
      default:
        return {
          label: 'Contabilidade & Operações',
          icon: Calculator,
          badgeClass: 'bg-amber-400/20 text-amber-300 border-amber-400/50',
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Dark backdrop with smooth fade in/out */}
      <div 
        className={`fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity cursor-pointer ${
          isClosing ? 'animate-fadeOut' : 'animate-fadeIn'
        }`}
        onClick={handleClose}
        aria-label="Fechar painel"
      />

      {/* Slide-over Right Drawer Container: Fundo Azul igual à Navbar */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
        <aside 
          className={`w-screen max-w-md bg-[#0d345e] text-white shadow-2xl border-l-2 border-amber-400 flex flex-col pointer-events-auto overflow-hidden font-['Inter',sans-serif] ${
            isClosing ? 'animate-slideOutRight' : 'animate-slideInRight'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header integrado no mesmo azul */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-blue-900/80 bg-[#08223f]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#0d345e] font-black flex items-center justify-center shadow-xs border border-amber-300 select-none">
                E
              </div>
              <div>
                <h2 className="text-sm font-black text-white m-0 tracking-tight flex items-center gap-2">
                  <span>{isAuthenticated && user ? 'Perfil do Usuário' : 'Acesso ao Sistema'}</span>
                </h2>
                <p className="text-[11px] text-blue-200/90 m-0 font-medium">
                  ERGON Contabilidade & Gestão
                </p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="p-2 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Fechar (Esc)"
              aria-label="Fechar gaveta"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body: Fundo azul contínuo, sem micro-componentes fragmentados */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* ============================================================ */}
            {/* VIEW 1: USUÁRIO LOGADO (Área Integrada no Azul) */}
            {/* ============================================================ */}
            {isAuthenticated && user ? (
              <div className="space-y-6 animate-fadeIn">
                
                {/* Cabeçalho do Perfil no Azul */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-amber-400 text-[#0d345e] flex items-center justify-center text-2xl font-black shadow-md border-2 border-amber-300 shrink-0">
                    {user.name ? user.name.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#08223f] text-emerald-400 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Online
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${roleInfo.badgeClass}`}>
                        <RoleIcon className="w-3 h-3" />
                        <span>{roleInfo.label}</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white truncate m-0 leading-tight">
                      {user.name}
                    </h3>
                    <p className="text-xs text-blue-200/90 truncate m-0 mt-0.5">
                      {user.email}
                    </p>
                  </div>
                </div>

                {/* Informações da Sessão e Acessos Integrados */}
                <div className="space-y-3 pt-4 border-t border-blue-900/80">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-amber-300 m-0">
                    Informações da Conta
                  </h4>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-blue-200">Banco de Dados:</span>
                      <span className="font-semibold text-white flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-amber-300" />
                        SQL Relacional (Ativo)
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-blue-200">Identificador (ID):</span>
                      <span className="font-mono text-blue-100 font-semibold">
                        {user.id ? `#${user.id.slice(0, 12)}...` : '#USR-PADRAO'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                      <span className="text-blue-200">Status da Sessão:</span>
                      <span className="font-semibold text-emerald-400">
                        Autenticada & Sincronizada
                      </span>
                    </div>

                    <div className="flex items-start justify-between py-1.5 border-b border-white/5">
                      <span className="text-blue-200">Módulos Habilitados:</span>
                      <span className="font-semibold text-white text-right">
                        Calendário Contábil, Kanban & Recorrências
                      </span>
                    </div>
                  </div>
                </div>

                {/* Botão de Métricas para Administrador */}
                {user.role === 'admin' && onOpenAdminMetrics && (
                  <button
                    type="button"
                    onClick={() => {
                      handleClose();
                      setTimeout(() => {
                        onOpenAdminMetrics();
                      }, 260);
                    }}
                    className="w-full py-3 px-4 bg-[#08223f] hover:bg-blue-950 border border-amber-400 text-amber-300 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Abrir Painel de Métricas & SLA</span>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                )}

                {/* Botão Sair da Conta */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                    }}
                    className="w-full py-3 px-4 bg-rose-500/15 hover:bg-rose-500/25 text-rose-200 border border-rose-400/30 text-xs font-bold rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-2xs"
                  >
                    <LogOut className="w-4 h-4 text-rose-300" />
                    <span>Sair da Minha Conta</span>
                  </button>
                </div>

              </div>
            ) : (
              /* ============================================================ */
              /* VIEW 2: LOGIN / CADASTRO (Tudo integrado no fundo azul) */
              /* ============================================================ */
              <div className="space-y-6 animate-fadeIn">
                
                {/* Abas Integradas no Azul */}
                <div className="flex p-1 bg-[#08223f] rounded-xl border border-blue-900 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginTab(true);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      isLoginTab
                        ? 'bg-amber-400 text-[#0d345e] shadow-xs'
                        : 'text-blue-200 hover:text-white'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Entrar</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLoginTab(false);
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`flex-1 py-2.5 rounded-lg text-center transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      !isLoginTab
                        ? 'bg-amber-400 text-[#0d345e] shadow-xs'
                        : 'text-blue-200 hover:text-white'
                    }`}
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Criar Conta</span>
                  </button>
                </div>

                {/* Feedback Alerts */}
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-500/50 text-rose-200 text-xs font-medium flex items-start gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                {successMsg && (
                  <div className="p-3 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Formulário integrado no fundo azul */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nome (apenas cadastro) */}
                  {!isLoginTab && (
                    <div>
                      <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                        <span>Nome Completo</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Beatriz Silva"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="w-full px-3.5 py-2.5 text-xs bg-[#08223f] text-white placeholder-blue-300/50 border border-blue-900/80 rounded-xl focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium transition"
                      />
                    </div>
                  )}

                  {/* E-mail */}
                  <div>
                    <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-amber-400" />
                      <span>E-mail Corporativo</span>
                    </label>
                    <input
                      type="email"
                      placeholder="seuemail@escritorio.com.br"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-xs bg-[#08223f] text-white placeholder-blue-300/50 border border-blue-900/80 rounded-xl focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium transition"
                    />
                  </div>

                  {/* Senha */}
                  <div>
                    <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Senha de Acesso</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-[#08223f] text-white placeholder-blue-300/50 border border-blue-900/80 rounded-xl focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium transition"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-300 hover:text-amber-300 transition cursor-pointer"
                        title={showPassword ? 'Esconder senha' : 'Exibir senha'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Função/Setor (apenas cadastro) */}
                  {!isLoginTab && (
                    <div>
                      <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-amber-400" />
                        <span>Função / Setor</span>
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-[#08223f] text-white border border-blue-900/80 rounded-xl focus:outline-hidden focus:border-amber-400 focus:ring-1 focus:ring-amber-400 font-medium cursor-pointer transition"
                      >
                        <option value="contabilidade" className="bg-[#08223f] text-white">📊 Contador(a) / Analista Contábil</option>
                        <option value="fiscal" className="bg-[#08223f] text-white">📑 Analista Fiscal</option>
                        <option value="dp" className="bg-[#08223f] text-white">👥 Departamento Pessoal</option>
                        <option value="admin" className="bg-[#08223f] text-white">🛡️ Administrador do Sistema</option>
                      </select>
                    </div>
                  )}

                  {/* Atalho Demo integrado (sem caixa separada) */}
                  {isLoginTab && (
                    <div className="pt-1 flex items-center justify-between text-xs">
                      <button
                        type="button"
                        onClick={handleFillDemo}
                        className="text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer flex items-center gap-1"
                      >
                        <span>🔑 Preencher usuário demo padrão (admin123)</span>
                      </button>
                    </div>
                  )}

                  {/* Botão de Envio - Amarelo Ouro Sólido */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full py-3 px-4 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 disabled:opacity-60 text-[#0d345e] text-xs font-black rounded-xl shadow-md border border-amber-300 transition cursor-pointer flex items-center justify-center gap-2 tracking-wide"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-[#0d345e]" />
                          <span>Processando...</span>
                        </>
                      ) : (
                        <>
                          <span>{isLoginTab ? 'Entrar no Ergon' : 'Concluir Cadastro e Acessar'}</span>
                          <ArrowRight className="w-4 h-4 text-[#0d345e]" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

              </div>
            )}
          </div>

          {/* Rodapé Integrado */}
          <div className="px-6 py-3 bg-[#08223f] border-t border-blue-900/80 text-[11px] text-blue-200/80 flex items-center justify-between">
            <span className="font-semibold text-white">ERGON Contabilidade</span>
            <span className="flex items-center gap-1.5 text-blue-200">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              SQL Conectado
            </span>
          </div>

        </aside>
      </div>
    </div>
  );
};
