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
import { CRTWarp } from './CRTWarp';

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
              {(viewMode === 'update_password' || viewMode === 'accept_invite') && 'Definir Senha de Acesso'}
            </h1>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              {viewMode === 'login' && 'Identifique-se com seu e-mail corporativo para acessar as rotinas, prazos e Kanban.'}
              {viewMode === 'forgot_password' && 'Enviaremos um link seguro para o seu e-mail corporativo redefinir a credencial.'}
              {(viewMode === 'update_password' || viewMode === 'accept_invite') && 'Crie sua senha pessoal segura para concluir a ativação da sua conta.'}
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
      {/* LADO DIREITO: ANIMAÇÃO CRT WARP (REACT BITS)             */}
      {/* ======================================================== */}
      <div className="hidden lg:block lg:w-1/2 min-h-screen h-full relative overflow-hidden bg-[#05010a]">
        <CRTWarp
          color="#c755f7"
          backgroundColor="#05010a"
          speed={0.5}
          curvature={0.25}
          scanlineStrength={0.25}
          scanlineFrequency={200}
          waveAmplitude={0.3}
          waveFrequency={2.5}
          bloom={1.5}
          bloomRadius={1}
          noise={0.1}
          vignette={0}
          brightness={1.25}
          pixelation={1}
          rgbShift={0.015}
          mouseReact={true}
          mouseStrength={0.5}
          dpr={1}
          fps={30}
        />
      </div>

    </div>
  );
};

