import React from 'react';
import { ShieldAlert, UserX, LogOut, Clock, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AccountStatusScreenProps {
  reason: 'deactivated' | 'no_membership';
}

export const AccountStatusScreen: React.FC<AccountStatusScreenProps> = ({ reason }) => {
  const { signOut, refreshSessionData, user } = useAuth();

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#08223f] via-[#0d345e] to-[#041324] font-['Inter',sans-serif] text-slate-100 select-none">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 text-slate-800 p-8 text-center animate-scaleUp">
        
        {/* Ícone de Destaque */}
        <div className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-md bg-amber-50 border border-amber-200 text-amber-600">
          {reason === 'deactivated' ? (
            <UserX className="w-8 h-8 text-rose-600" />
          ) : (
            <Clock className="w-8 h-8 text-amber-600" />
          )}
        </div>

        {/* Título e Explicação */}
        <h2 className="text-lg font-black text-slate-900 mb-2">
          {reason === 'deactivated' ? 'Conta Inativa no Momento' : 'Vínculo Setorial Pendente'}
        </h2>

        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          {reason === 'deactivated' ? (
            <>
              Olá, <strong>{user?.fullName || 'Operador'}</strong>. Seu acesso à organização ERGON está temporariamente desativado pela administração. Entre em contato com o responsável para reativar seu cadastro.
            </>
          ) : (
            <>
              Olá, <strong>{user?.fullName || 'Operador'}</strong>. Sua conta no Supabase Auth foi identificada com sucesso, mas ela ainda não possui um vínculo ativo com os setores da <strong>ERGON</strong>. Solicite ao administrador a liberação do seu acesso.
            </>
          )}
        </p>

        {/* Ações */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => refreshSessionData()}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Verificar se o acesso foi liberado</span>
          </button>

          <button
            type="button"
            onClick={() => signOut()}
            className="w-full py-2.5 px-4 rounded-xl bg-[#0d345e] hover:bg-blue-900 text-amber-300 font-bold text-xs shadow-md transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair desta conta</span>
          </button>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Segurança de Dados e Acessos ERGON Contabilidade</span>
        </div>

      </div>
    </div>
  );
};
