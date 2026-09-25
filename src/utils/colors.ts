export interface EventColorOption {
  id: string;
  name: string;
  hex: string;
  bgLight: string;
  border: string;
  text: string;
  badge: string;
}

export const PRESET_COLORS: EventColorOption[] = [
  { id: 'blue', name: 'Azul Contábil', hex: '#2563eb', bgLight: 'bg-blue-50', border: 'border-blue-400', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  { id: 'emerald', name: 'Verde Financeiro', hex: '#059669', bgLight: 'bg-emerald-50', border: 'border-emerald-400', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  { id: 'purple', name: 'Roxo Reunião / Diretoria', hex: '#9333ea', bgLight: 'bg-purple-50', border: 'border-purple-400', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  { id: 'amber', name: 'Amarelo Atenção', hex: '#d97706', bgLight: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-800', badge: 'bg-amber-100 text-amber-900' },
  { id: 'orange', name: 'Laranja Folha / DP', hex: '#ea580c', bgLight: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800', badge: 'bg-orange-100 text-orange-900' },
  { id: 'rose', name: 'Vermelho Urgente', hex: '#e11d48', bgLight: 'bg-rose-50', border: 'border-rose-400', text: 'text-rose-800', badge: 'bg-rose-100 text-rose-900' },
  { id: 'cyan', name: 'Ciano Geral', hex: '#0891b2', bgLight: 'bg-cyan-50', border: 'border-cyan-400', text: 'text-cyan-800', badge: 'bg-cyan-100 text-cyan-900' },
  { id: 'pink', name: 'Rosa Especial', hex: '#db2777', bgLight: 'bg-pink-50', border: 'border-pink-400', text: 'text-pink-800', badge: 'bg-pink-100 text-pink-900' },
];

export function getColorOption(colorHex?: string): EventColorOption | undefined {
  if (!colorHex) return undefined;
  return PRESET_COLORS.find((c) => c.hex.toLowerCase() === colorHex.toLowerCase());
}
