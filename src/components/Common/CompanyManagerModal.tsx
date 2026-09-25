import React, { useState } from 'react';
import { X, Building2, Plus, Trash2, Search, AlertTriangle, Layers } from 'lucide-react';
import type { Task } from '../../types';

interface CompanyManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  companies: string[];
  tasks?: Task[];
  onAddNewCompany: (company: string) => void;
  onDeleteCompany: (company: string) => void;
}

export const CompanyManagerModal: React.FC<CompanyManagerModalProps> = ({
  isOpen,
  onClose,
  companies,
  tasks = [],
  onAddNewCompany,
  onDeleteCompany,
}) => {
  const [newCompanyInput, setNewCompanyInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [companyToDelete, setCompanyToDelete] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCompanyInput.trim();
    if (!trimmed) return;
    if (companies.includes(trimmed)) {
      alert('Esta empresa já está cadastrada.');
      return;
    }
    onAddNewCompany(trimmed);
    setNewCompanyInput('');
  };

  const handleConfirmDelete = () => {
    if (companyToDelete) {
      onDeleteCompany(companyToDelete);
      setCompanyToDelete(null);
    }
  };

  const filteredCompanies = companies.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-scaleUp font-['Inter',sans-serif] flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#0d345e] text-white flex items-center justify-between border-b border-[#08223f] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-400 text-[#0d345e] flex items-center justify-center shadow-xs">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white m-0">
                Gerenciar Empresas / Clientes
              </h3>
              <p className="text-[11px] text-blue-200/90 m-0">
                {companies.length} empresa{companies.length === 1 ? '' : 's'} cadastrada{companies.length === 1 ? '' : 's'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-blue-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
          {/* Quick Add Form */}
          <form onSubmit={handleAdd} className="p-3 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-2">
            <label className="block text-xs font-bold text-[#0d345e] uppercase tracking-wider">
              Cadastrar Nova Empresa ou Cliente
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Ex: Comercial Silva Ltda, Construtora Beta..."
                value={newCompanyInput}
                onChange={(e) => setNewCompanyInput(e.target.value)}
                className="flex-1 px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#0d345e] font-medium"
              />
              <button
                type="submit"
                disabled={!newCompanyInput.trim()}
                className="px-3.5 py-2 bg-[#0d345e] hover:bg-blue-900 disabled:opacity-50 text-amber-300 border border-amber-400/50 rounded-lg text-xs font-extrabold shadow-xs transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Adicionar</span>
              </button>
            </div>
          </form>

          {/* Search Bar */}
          {companies.length > 3 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar empresa na lista..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0d345e]"
              />
            </div>
          )}

          {/* Company List */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              Empresas Disponíveis ({filteredCompanies.length})
            </span>

            {filteredCompanies.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-1.5" />
                <p className="text-xs text-slate-600 font-semibold m-0">
                  {companies.length === 0
                    ? 'Nenhuma empresa cadastrada no catálogo.'
                    : 'Nenhuma empresa encontrada com essa busca.'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1 m-0">
                  Cadastre as empresas no formulário acima para vinculá-las às tarefas do Kanban e compromissos.
                </p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {filteredCompanies.map((c) => {
                  const linkedCount = tasks.filter((t) => t.company === c).length;
                  return (
                    <div
                      key={c}
                      className="p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50/70 transition flex items-center justify-between gap-3 shadow-2xs group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#0d345e] flex items-center justify-center shrink-0 border border-blue-100">
                          <Building2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 m-0 truncate">
                            {c}
                          </p>
                          {linkedCount > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                              <Layers className="w-2.5 h-2.5 text-slate-400" />
                              {linkedCount} tarefa{linkedCount === 1 ? '' : 's'} vinculada{linkedCount === 1 ? '' : 's'}
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setCompanyToDelete(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                        title={`Excluir empresa "${c}"`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#0d345e] text-white hover:bg-blue-900 text-xs font-semibold rounded-lg transition cursor-pointer"
          >
            Concluir
          </button>
        </div>
      </div>

      {/* Confirmation Dialog for Deleting Company */}
      {companyToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl p-5 max-w-sm w-full border border-slate-200 space-y-3 animate-scaleUp">
            <div className="flex items-center gap-2.5 text-rose-600">
              <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 m-0">
                Excluir Empresa?
              </h4>
            </div>

            <p className="text-xs text-slate-600 m-0 leading-relaxed">
              Deseja realmente remover a empresa <strong className="text-slate-900">"{companyToDelete}"</strong> do catálogo?
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompanyToDelete(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
