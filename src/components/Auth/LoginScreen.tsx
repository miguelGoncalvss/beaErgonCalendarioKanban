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
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const LoginScreen: React.FC = () => {
  const { 
    viewMode, 
    setViewMode, 
    signInWithPassword, 
    requestPasswordReset, 
    updateUserPassword 
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

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#08223f] via-[#0d345e] to-[#041324] font-['Inter',sans-serif] text-slate-100 select-none relative overflow-hidden">
      
      {/* Detalhes de luz de fundo corporativos */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200/80 animate-scaleUp text-slate-800 relative z-10">
        
        {/* Top Header Card */}
        <div className="px-8 pt-8 pb-6 bg-[#0d345e] text-white border-b-4 border-amber-400 relative">
          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-11 h-11 rounded-xl bg-amber-400 text-[#0d345e] font-black text-xl flex items-center justify-center shadow-md border border-amber-300">
              E
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white m-0">
                  ERGON
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#08223f] text-amber-300 border border-blue-900/80">
                  Contabilidade
                </span>
              </div>
              <p className="text-xs text-blue-200/90 font-medium m-0">
                Calendário & Kanban Operacional
              </p>
            </div>
          </div>

          <h2 className="text-base font-bold text-slate-100 mt-4 mb-0.5 flex items-center gap-2">
            {viewMode === 'login' && 'Entrar na Plataforma'}
            {viewMode === 'forgot_password' && 'Recuperar Senha'}
            {(viewMode === 'update_password' || viewMode === 'accept_invite') && 'Definir Senha de Acesso'}
          </h2>
          <p className="text-xs text-blue-200/80 m-0">
            {viewMode === 'login' && 'Identifique-se com seu e-mail corporativo para continuar.'}
            {viewMode === 'forgot_password' && 'Enviaremos um link seguro para o seu e-mail.'}
            {(viewMode === 'update_password' || viewMode === 'accept_invite') && 'Crie sua senha pessoal segura para concluir.'}
          </p>
        </div>

        {/* Mensagens de Feedback */}
        <div className="px-8 pt-6">
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-fadeIn">
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] transition"
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
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#0d345e] hover:bg-blue-900 text-amber-300 font-black text-sm shadow-md hover:shadow-lg transition cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#0d345e] hover:bg-blue-900 text-amber-300 font-black text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
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

          {/* 3. MODO: ATUALIZAR SENHA (RECOVERY OU INVITE) */}
          {(viewMode === 'update_password' || viewMode === 'accept_invite') && (
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] transition"
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
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0d345e]/20 focus:border-[#0d345e] transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-[#0d345e] hover:bg-blue-900 text-amber-300 font-black text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 disabled:opacity-70"
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
        </div>

        {/* Footer Informativo */}
        <div className="px-8 py-5 mt-6 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            Acesso restrito à equipe autorizada. O cadastro de novos operadores é realizado por convite administrativo.
          </span>
        </div>

      </div>
    </div>
  );
};
