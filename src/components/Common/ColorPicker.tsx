import React from 'react';
import { Check, Pipette, X } from 'lucide-react';
import { PRESET_COLORS } from '../../utils/colors';

interface ColorPickerProps {
  selectedColor?: string;
  onChange: (color?: string) => void;
  label?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({
  selectedColor,
  onChange,
  label = 'Faixa de Cor / Identificador Visual',
}) => {
  return (
    <div className="flex flex-col gap-1.5 font-['Inter',sans-serif]">
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <span 
            className="w-3 h-3 rounded-full border border-slate-300 shrink-0 shadow-2xs" 
            style={{ backgroundColor: selectedColor || '#cbd5e1' }}
          />
          <span>{label}</span>
        </label>
        {selectedColor && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            className="text-[10px] text-slate-500 hover:text-slate-700 font-semibold cursor-pointer flex items-center gap-0.5 hover:underline"
          >
            <X className="w-2.5 h-2.5" />
            Remover cor
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap p-2 bg-slate-50 border border-slate-200 rounded-xl">
        {/* Opção Sem Cor */}
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className={`w-6 h-6 rounded-full border-2 transition cursor-pointer flex items-center justify-center text-[10px] text-slate-400 bg-white ${
            !selectedColor ? 'border-slate-800 scale-110 shadow-xs' : 'border-slate-300 hover:border-slate-400'
          }`}
          title="Sem cor específica (Padrão)"
        >
          <span className="w-3 h-0.5 bg-slate-400 -rotate-45" />
        </button>

        {/* Cores Predefinidas */}
        {PRESET_COLORS.map((color) => {
          const isSelected = selectedColor?.toLowerCase() === color.hex.toLowerCase();
          return (
            <button
              key={color.id}
              type="button"
              onClick={() => onChange(color.hex)}
              className={`w-6 h-6 rounded-full transition cursor-pointer flex items-center justify-center shadow-2xs ${
                isSelected ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color.hex }}
              title={color.name}
            >
              {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" />}
            </button>
          );
        })}

        {/* Seletor Customizado / Paleta Livre */}
        <label 
          className="relative w-6 h-6 rounded-full border border-slate-300 bg-white hover:bg-slate-100 flex items-center justify-center cursor-pointer transition shadow-2xs group"
          title="Escolher outra cor personalizada..."
        >
          <Pipette className="w-3 h-3 text-slate-600 group-hover:text-slate-900" />
          <input
            type="color"
            value={selectedColor || '#2563eb'}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
          />
        </label>

        {/* Prévia da faixa */}
        {selectedColor && (
          <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
            <span className="w-3 h-3 rounded-sm shadow-xs" style={{ backgroundColor: selectedColor }} />
            <span>Faixa Ativa</span>
          </div>
        )}
      </div>
    </div>
  );
};
