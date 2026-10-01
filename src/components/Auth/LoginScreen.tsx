import React, { useState } from 'react';
import { 
  Lock, 
  Mail, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  ArrowLeft,
  Eye,
  EyeOff,
  Sparkles,
  Clock,
  Users
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { 
    viewMode, 
    setViewMode, 
    signInWithPassword, 
    requestPasswordReset, 
    updateUserPassword,
    invitationData,
    loadingInvitation,
    acceptInviteAndRegister
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Por favor, informe seu e-mail e senha.');
      return;
    }

    setLoading(true);
    const { error } = await signInWithPassword(email, password);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email.trim()) {
      setErrorMessage('Informe seu e-mail para receber as instruções de recuperação.');
      return;
    }

    setLoading(true);
    const { error, success } = await requestPasswordReset(email);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else if (success) {
      setSuccessMessage('Instruções de recuperação enviadas para seu e-mail! Verifique sua caixa de entrada.');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    const { error, success } = await updateUserPassword(password);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else if (success) {
      setSuccessMessage('Senha atualizada com sucesso! Você já pode entrar.');
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setViewMode('login');
      }, 2000);
    }
  };

  const handleAcceptInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!password || password.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      return;
    }

    setLoading(true);
    const { error, success } = await acceptInviteAndRegister(password);
    setLoading(false);

    if (error) {
      setErrorMessage(error);
    } else if (success) {
      setSuccessMessage('Acesso ativado com sucesso! Carregando seu ambiente de trabalho...');
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row font-['Inter',sans-serif] text-slate-800 select-none bg-slate-50">
      
      {/* ======================================================== */}
      {/* LADO ESQUERDO: FORMULÁRIO DE LOGIN / RECUPERAÇÃO / SENHA */}
      {/* ======================================================== */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between p-6 sm:p-10 lg:p-14 bg-white z-10 shadow-xl lg:shadow-none border-r border-slate-200/80">
        
        {/* Top Header / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-400 text-[#0d345e] font-black text-xl flex items-center justify-center shadow-xs border border-amber-300">
            E
          </div>
          <span className="text-2xl font-black tracking-tight text-[#0d345e] m-0">
            ERGON
          </span>
        </div>

        {/* Center Form Container */}
        <div className="w-full max-w-md mx-auto my-auto py-8">
          
          {/* Título e Subtítulo dinâmicos conforme viewMode */}
          <div className="mb-7">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {viewMode === 'login' && 'Entrar na Plataforma'}
              {viewMode === 'forgot_password' && 'Recuperar Acesso'}
              {viewMode === 'update_password' && 'Definir Nova Senha'}
              {viewMode === 'accept_invite' && 'Ativação de Acesso'}
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {viewMode === 'login' && 'Identifique-se com seu e-mail corporativo para acessar as rotinas, prazos e Kanban.'}
              {viewMode === 'forgot_password' && 'Enviaremos um link seguro para o seu e-mail corporativo redefinir a credencial.'}
              {viewMode === 'update_password' && 'Crie sua senha pessoal segura para restabelecer seu acesso.'}
              {viewMode === 'accept_invite' && 'Conclua seu cadastro institucional criando sua senha de acesso à Ergon.'}
            </p>
          </div>

          {/* Mensagens de Alerta / Sucesso */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* 1. MODO: LOGIN */}
          {viewMode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail Corporativo
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: beatriz@ergon.com.br"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setErrorMessage(null);
                      setSuccessMessage(null);
                      setViewMode('forgot_password');
                    }}
                    className="text-xs text-[#0d345e] hover:text-blue-900 font-semibold cursor-pointer transition hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                    aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar no Sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* 2. MODO: RECUPERAR SENHA */}
          {viewMode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  E-mail Cadastrado
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ex: vinicius@ergon.com.br"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Enviar Link de Recuperação</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setViewMode('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Voltar para o login</span>
                </button>
              </div>
            </form>
          )}

          {/* 3. MODO: ATUALIZAR SENHA (RECOVERY) */}
          {viewMode === 'update_password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Confirmar Nova Senha
                </label>
                <div className="relative flex items-center">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Salvar Senha e Acessar</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    setSuccessMessage(null);
                    setViewMode('login');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancelar e voltar ao login</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. MODO: ATIVAÇÃO DE CONVITE CORPORATIVO */}
          {viewMode === 'accept_invite' && (
            <div className="space-y-4">
              {loadingInvitation ? (
                <div className="p-8 text-center bg-slate-50/80 rounded-2xl border border-slate-200">
                  <span className="inline-block w-6 h-6 border-2 border-[#0d345e] border-t-transparent rounded-full animate-spin mb-3" />
                  <p className="text-xs text-slate-600 font-semibold">Validando credencial de convite...</p>
                </div>
              ) : invitationData && !invitationData.valid ? (
                <div className="p-6 rounded-2xl bg-rose-50/80 border border-rose-200 text-center space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-rose-900">Convite Indisponível</h3>
                    <p className="text-xs text-rose-700 mt-1">{invitationData.message || 'Este convite não é válido ou já expirou.'}</p>
                    <p className="text-[11px] text-rose-600 mt-1">Solicite um novo convite ao administrador da organização.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setViewMode('login')}
                    className="px-4 py-2 rounded-xl bg-[#0d345e] text-white text-xs font-bold hover:bg-[#08223f] transition cursor-pointer"
                  >
                    Voltar para o Login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleAcceptInvite} className="space-y-4">
                  {invitationData && (
                    <div className="p-4 rounded-2xl bg-[#0d345e]/5 border border-[#0d345e]/15">
                      <div className="flex items-center gap-2 mb-2 text-[11px] font-bold text-[#0d345e] uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                        <span>Convite Oficial Ergon</span>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-sm font-black text-slate-900">{invitationData.fullName}</p>
                        <p className="text-xs text-slate-600 font-medium">{invitationData.email}</p>
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-[#0d345e]/10 flex flex-wrap gap-1.5 text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 font-bold">
                          Ergon
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-100/80 border border-amber-300 text-amber-900 font-bold">
                          {invitationData.orgRole === 'admin' ? 'Administrador' : 'Membro'}
                        </span>
                        {invitationData.departmentName && (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-100/80 border border-emerald-300 text-emerald-900 font-bold">
                            Setor: {invitationData.departmentName}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Defina sua Senha de Acesso
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Confirmar Senha
                    </label>
                    <div className="relative flex items-center">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                      <input
                        type="password"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/70 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] focus:bg-white transition font-medium"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#0d345e] hover:bg-[#08223f] text-amber-300 font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {loading ? (
                      <span className="inline-block w-4 h-4 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Ativar Meu Acesso Ergon</span>
                      </>
                    )}
                  </button>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setSuccessMessage(null);
                        setViewMode('login');
                      }}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer transition"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Voltar para o login tradicional</span>
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

        </div>

        {/* Bottom Footer Info */}
        <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 font-medium">
          <span className="text-slate-500">
            Acesso Criptografado & Isolado
          </span>
          <span>Ergon © 2026</span>
        </div>

      </div>

      {/* ======================================================== */}
      {/* LADO DIREITO: IDENTIDADE CORPORATIVA ERGON               */}
      {/* ======================================================== */}
      <div className="hidden lg:flex lg:w-1/2 min-h-screen bg-gradient-to-br from-[#06182c] via-[#0d345e] to-[#04101e] text-white flex-col justify-between p-12 lg:p-16 relative overflow-hidden">
        
        {/* Luzes de fundo com blur suave */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
        
        {/* Grade de fundo geométrica sutil */}
        <div 
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(245, 158, 11, 0.25) 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />

        {/* Topo do lado direito */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-amber-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Sistema Operacional Ergon 2.0</span>
          </div>
          <span className="text-xs text-blue-200/70 font-medium">
            Novembro 2026
          </span>
        </div>

        {/* Centro: Composição visual elegante e limpa */}
        <div className="relative z-10 my-auto py-12 flex flex-col items-center justify-center">
          
          {/* Círculo Central com Monograma em Glow */}
          <div className="relative mb-8 flex items-center justify-center">
            {/* Anéis Externos Pulsantes */}
            <div className="absolute w-36 h-36 rounded-full border border-amber-400/30 animate-pulse pointer-events-none" />
            <div className="absolute w-48 h-48 rounded-full border border-blue-400/15 pointer-events-none" />
            
            {/* Emblema Ergon */}
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-300 via-amber-400 to-amber-500 text-[#0d345e] font-black text-5xl flex items-center justify-center shadow-2xl border-2 border-amber-200">
              E
            </div>
          </div>

          <div className="text-center max-w-sm mb-8">
            <h2 className="text-2xl font-black tracking-tight text-white mb-2">
              Sincronia & Produtividade
            </h2>
            <p className="text-xs text-blue-200/80 leading-relaxed font-normal">
              Controle absoluto de prazos contábeis, passagens de bastão em tempo real e auditoria de SLAs.
            </p>
          </div>

          {/* Cards flutuantes com animação CSS suave */}
          <div className="w-full max-w-sm space-y-3 relative">
            
            {/* Card 1: Passagem de Bastão (Bea & Vini) */}
            <div className="animate-float p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-400/20 border border-amber-400/40 text-amber-300 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white">Bea ⇄ Vini</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[10.5px] text-blue-200/80 m-0">Passagem de bastão em tempo real</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Sincronizado
              </span>
            </div>

            {/* Card 2: Horário Comercial & SLA */}
            <div className="animate-float-delayed p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-400/20 border border-blue-400/40 text-blue-200 flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 text-amber-300" />
                </div>
                <div>
                  <span className="text-xs font-bold text-white">SLA Útil (08h às 17h)</span>
                  <p className="text-[10.5px] text-blue-200/80 m-0">98.8% de pontualidade nas entregas</p>
                </div>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Em Dia
              </span>
            </div>

            {/* Card 3: Indicadores Rápidos */}
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center justify-around text-center">
              <div>
                <span className="text-sm font-black text-amber-400">100%</span>
                <p className="text-[9.5px] text-blue-200/70 uppercase tracking-wider font-semibold">Segurança RLS</p>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <span className="text-sm font-black text-white">Multissetor</span>
                <p className="text-[9.5px] text-blue-200/70 uppercase tracking-wider font-semibold">Contábil & Fiscal</p>
              </div>
              <div className="h-6 w-px bg-white/10" />
              <div>
                <span className="text-sm font-black text-emerald-400">Realtime</span>
                <p className="text-[9.5px] text-blue-200/70 uppercase tracking-wider font-semibold">Sem conflitos</p>
              </div>
            </div>

          </div>

        </div>

        {/* Rodapé do lado direito */}
        <div className="relative z-10 flex items-center justify-between text-xs text-blue-200/60 font-medium pt-4 border-t border-white/10">
          <span>Gestão Operacional de Alta Precisão</span>
          <span>Ergon Contabilidade</span>
        </div>

      </div>

    </div>
  );
};

