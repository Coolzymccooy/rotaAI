import { Shift } from '../types';
import { AlertTriangle } from 'lucide-react';

const SHIFT_STYLES: Record<string, string> = {
  'D': 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  'LD': 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  'N': 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  'OFF': 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100',
  'L': 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
};

const SHIFT_LABELS: Record<string, string> = {
  'D': 'Day',
  'LD': 'Long Day',
  'N': 'Night',
  'OFF': 'Off',
  'L': 'Leave',
};

export function ShiftCell({ shift }: { shift: Shift }) {
  const style = SHIFT_STYLES[shift.type] || SHIFT_STYLES['OFF'];
  const label = SHIFT_LABELS[shift.type] || 'Unknown';

  return (
    <div className="relative h-full w-full group/cell cursor-pointer">
      <div className={`h-full w-full rounded-md border flex items-center justify-center text-xs font-semibold transition-colors ${style} ${shift.violation ? 'ring-2 ring-red-400 ring-offset-1' : ''}`}>
        {shift.type}
        {shift.violation && (
          <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500 fill-red-100" />
          </div>
        )}
      </div>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover/cell:opacity-100 group-hover/cell:visible transition-all z-50 shadow-xl pointer-events-none">
        <div className="font-semibold mb-1">{label} Shift</div>
        <div className="text-gray-300 mb-2">08:00 - 17:00 (8h)</div>
        {shift.violation && (
          <div className="mt-2 pt-2 border-t border-gray-700 text-red-400 flex items-start gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{shift.violation}</span>
          </div>
        )}
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
      </div>
    </div>
  );
}
