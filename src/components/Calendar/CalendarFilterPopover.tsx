import React, { useState, useRef, useEffect } from 'react';
import { 
  Filter, 
  X, 
  RotateCcw, 
  CalendarCheck, 
  ListTodo, 
  Bell, 
  AlertCircle, 
  Lightbulb, 
  Building2, 
  Check, 
  Search,
  Palette
} from 'lucide-react';
import type { NoteCategory } from '../../types';
import { PRESET_COLORS } from '../../utils/colors';

export interface CalendarFilterState {
  colors: string[];
  types: NoteCategory[];
  companies: string[];
}

export const INITIAL_CALENDAR_FILTERS: CalendarFilterState = {
  colors: [],
  types: [],
  companies: [],
};

interface CalendarFilterPopoverProps {
  filters: CalendarFilterState;
  onChangeFilters: (filters: CalendarFilterState) => void;
  availableCompanies: string[];
}

const TYPE_OPTIONS: { id: NoteCategory; label: string; icon: React.ReactNode }[] = [
  { 
    id: 'reuniao', 
    label: 'Reunião', 
    icon: <CalendarCheck className="w-3.5 h-3.5 text-purple-600" />
  },
  { 
    id: 'geral', 
    label: 'Afazer / Tarefa', 
    icon: <ListTodo className="w-3.5 h-3.5 text-blue-600" />
  },
  { 
    id: 'lembrete', 
    label: 'Lembrete', 
    icon: <Bell className="w-3.5 h-3.5 text-sky-600" />
  },
  { 
    id: 'urgente', 
    label: 'Urgente', 
    icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
  },
  { 
    id: 'ideia', 
    label: 'Ideia', 
    icon: <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
  },
];

export const CalendarFilterPopover: React.FC<CalendarFilterPopoverProps> = ({
  filters,
  onChangeFilters,
  availableCompanies,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'types' | 'colors' | 'companies'>('types');
  const [companySearch, setCompanySearch] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);

  const totalActiveFilters = 
    filters.types.length + 
    filters.colors.length + 
    filters.companies.length;

  // Fecha o popover ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const toggleType = (type: NoteCategory) => {
    const next = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type];
    onChangeFilters({ ...filters, types: next });
  };

  const toggleColor = (colorHex: string) => {
    const next = filters.colors.includes(colorHex)
      ? filters.colors.filter((c) => c !== colorHex)
      : [...filters.colors, colorHex];
    onChangeFilters({ ...filters, colors: next });
  };

  const toggleCompany = (company: string) => {
    const next = filters.companies.includes(company)
      ? filters.companies.filter((c) => c !== company)
      : [...filters.companies, company];
    onChangeFilters({ ...filters, companies: next });
  };

  const clearAllFilters = () => {
    onChangeFilters(INITIAL_CALENDAR_FILTERS);
  };

  // Filtragem de empresas pelo campo de busca
  const filteredCompanies = availableCompanies.filter((comp) =>
    comp.toLowerCase().includes(companySearch.toLowerCase().trim())
  );

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Botão de Disparo do Filtro */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`
          flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer border
          ${
            totalActiveFilters > 0
              ? 'bg-amber-400 text-[#0d345e] border-amber-500 hover:bg-amber-300 shadow-xs'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-[#0d345e]'
          }
        `}
        title="Filtrar calendário por Tipo, Cor e Empresa"
      >
        <Filter className={`w-3.5 h-3.5 ${totalActiveFilters > 0 ? 'text-[#0d345e]' : 'text-slate-500'}`} />
        <span>Filtros</span>
        {totalActiveFilters > 0 && (
          <span className="w-4 h-4 rounded-full bg-[#0d345e] text-amber-300 text-[10px] font-black flex items-center justify-center shrink-0">
            {totalActiveFilters}
          </span>
        )}
      </button>

      {/* Painel Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 animate-scaleUp overflow-hidden">
          {/* Topo do Popover */}
          <div className="px-4 py-3 bg-[#0d345e] text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-white m-0">
                Filtros do Calendário
              </h3>
              {totalActiveFilters > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400 text-[#0d345e] text-[10px] font-black">
                  {totalActiveFilters} ativo{totalActiveFilters > 1 ? 's' : ''}
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {totalActiveFilters > 0 && (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-white transition px-2 py-0.5 rounded hover:bg-white/10 cursor-pointer font-semibold"
                  title="Limpar todos os filtros"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Limpar</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-300 hover:text-white rounded hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Abas de Categoria */}
          <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('types')}
              className={`flex-1 py-2 px-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'types'
                  ? 'border-[#0d345e] text-[#0d345e] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Tipo</span>
              {filters.types.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0d345e] text-white text-[10px]">
                  {filters.types.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('colors')}
              className={`flex-1 py-2 px-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'colors'
                  ? 'border-[#0d345e] text-[#0d345e] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Palette className="w-3 h-3" />
              <span>Cor</span>
              {filters.colors.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0d345e] text-white text-[10px]">
                  {filters.colors.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('companies')}
              className={`flex-1 py-2 px-3 text-center transition cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                activeTab === 'companies'
                  ? 'border-[#0d345e] text-[#0d345e] bg-white'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Building2 className="w-3 h-3" />
              <span>Empresa</span>
              {filters.companies.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-[#0d345e] text-white text-[10px]">
                  {filters.companies.length}
                </span>
              )}
            </button>
          </div>

          {/* Conteúdo da Aba Ativa */}
          <div className="p-3 max-h-64 overflow-y-auto space-y-2">
            {/* 1. ABA: TIPOS */}
            {activeTab === 'types' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pb-1 border-b border-slate-100">
                  <span>Selecione os tipos para exibir:</span>
                  {filters.types.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, types: [] })}
                      className="text-[#0d345e] hover:underline font-bold cursor-pointer"
                    >
                      Desmarcar tipos
                    </button>
                  )}
                </div>

                {TYPE_OPTIONS.map((opt) => {
                  const isChecked = filters.types.includes(opt.id);
                  return (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => toggleType(opt.id)}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs text-left
                        ${
                          isChecked
                            ? 'bg-blue-50/70 border-[#0d345e]/40 font-bold text-[#0d345e]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`
                            w-4 h-4 rounded border flex items-center justify-center transition shrink-0
                            ${
                              isChecked
                                ? 'bg-[#0d345e] border-[#0d345e] text-amber-300'
                                : 'border-slate-300 bg-white'
                            }
                          `}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="flex items-center gap-1.5">
                          {opt.icon}
                          {opt.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 2. ABA: CORES */}
            {activeTab === 'colors' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pb-1 border-b border-slate-100">
                  <span>Selecione as cores de destaque:</span>
                  {filters.colors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, colors: [] })}
                      className="text-[#0d345e] hover:underline font-bold cursor-pointer"
                    >
                      Desmarcar cores
                    </button>
                  )}
                </div>

                {/* Opções PRESET_COLORS */}
                {PRESET_COLORS.map((color) => {
                  const isChecked = filters.colors.includes(color.hex);
                  return (
                    <button
                      type="button"
                      key={color.id}
                      onClick={() => toggleColor(color.hex)}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs text-left
                        ${
                          isChecked
                            ? 'bg-amber-50/60 border-amber-300 font-bold text-slate-900'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`
                            w-4 h-4 rounded border flex items-center justify-center transition shrink-0
                            ${
                              isChecked
                                ? 'bg-[#0d345e] border-[#0d345e] text-amber-300'
                                : 'border-slate-300 bg-white'
                            }
                          `}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs shrink-0"
                            style={{ backgroundColor: color.hex }}
                          />
                          <span>{color.name}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {/* Opção: Sem Cor Definida */}
                <button
                  type="button"
                  onClick={() => toggleColor('none')}
                  className={`
                    w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs text-left
                    ${
                      filters.colors.includes('none')
                        ? 'bg-amber-50/60 border-amber-300 font-bold text-slate-900'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition shrink-0
                        ${
                          filters.colors.includes('none')
                            ? 'bg-[#0d345e] border-[#0d345e] text-amber-300'
                            : 'border-slate-300 bg-white'
                        }
                      `}
                    >
                      {filters.colors.includes('none') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-full border border-dashed border-slate-400 bg-slate-100 shrink-0" />
                      <span className="text-slate-600">Sem cor</span>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* 3. ABA: EMPRESAS */}
            {activeTab === 'companies' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 border-b border-slate-100 pb-1">
                  <span>Filtrar por empresa / cliente:</span>
                  {filters.companies.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChangeFilters({ ...filters, companies: [] })}
                      className="text-[#0d345e] hover:underline font-bold cursor-pointer"
                    >
                      Desmarcar empresas
                    </button>
                  )}
                </div>

                {/* Campo de Busca Rápida de Empresa se houver mais de 3 */}
                {availableCompanies.length > 3 && (
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Pesquisar empresa..."
                      value={companySearch}
                      onChange={(e) => setCompanySearch(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-[#0d345e]"
                    />
                  </div>
                )}

                {/* Opção: Sem Empresa Alocada */}
                <button
                  type="button"
                  onClick={() => toggleCompany('none')}
                  className={`
                    w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs text-left
                    ${
                      filters.companies.includes('none')
                        ? 'bg-blue-50/70 border-[#0d345e]/40 font-bold text-[#0d345e]'
                        : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                    }
                  `}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`
                        w-4 h-4 rounded border flex items-center justify-center transition shrink-0
                        ${
                          filters.companies.includes('none')
                            ? 'bg-[#0d345e] border-[#0d345e] text-amber-300'
                            : 'border-slate-300 bg-white'
                        }
                      `}
                    >
                      {filters.companies.includes('none') && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <span className="text-slate-500 italic">Sem empresa alocada</span>
                  </div>
                </button>

                {/* Lista de Empresas cadastradas */}
                {filteredCompanies.map((comp) => {
                  const isChecked = filters.companies.includes(comp);
                  return (
                    <button
                      type="button"
                      key={comp}
                      onClick={() => toggleCompany(comp)}
                      className={`
                        w-full flex items-center justify-between p-2 rounded-lg border transition cursor-pointer select-none text-xs text-left
                        ${
                          isChecked
                            ? 'bg-blue-50/70 border-[#0d345e]/40 font-bold text-[#0d345e]'
                            : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                        }
                      `}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className={`
                            w-4 h-4 rounded border flex items-center justify-center transition shrink-0
                            ${
                              isChecked
                                ? 'bg-[#0d345e] border-[#0d345e] text-amber-300'
                                : 'border-slate-300 bg-white'
                            }
                          `}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="truncate">{comp}</span>
                      </div>
                    </button>
                  );
                })}

                {filteredCompanies.length === 0 && companySearch && (
                  <p className="text-xs text-slate-400 italic text-center py-2">
                    Nenhuma empresa encontrada com "{companySearch}".
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Rodapé informativo */}
          <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500 font-medium">
              {totalActiveFilters === 0
                ? 'Exibindo todos os eventos'
                : `${totalActiveFilters} filtro(s) selecionado(s)`}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1 bg-[#0d345e] hover:bg-blue-900 text-amber-300 border border-amber-400/50 rounded-lg font-bold text-xs cursor-pointer transition shadow-2xs"
            >
              Concluído
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
