import React from 'react';
import { Filter, Download, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { ShiftCell } from './ShiftCell';
import { Doctor, Shift } from '../types';

const DAYS = ['Mon 12', 'Tue 13', 'Wed 14', 'Thu 15', 'Fri 16', 'Sat 17', 'Sun 18'];

const MOCK_DOCTORS: Doctor[] = [
  { id: '1', name: 'Dr. Sarah Smith', grade: 'Registrar', hoursWorked: 42 },
  { id: '2', name: 'Dr. James Chen', grade: 'SHO', hoursWorked: 48 },
  { id: '3', name: 'Dr. Emily Jones', grade: 'FY1', hoursWorked: 36 },
  { id: '4', name: 'Dr. Michael Ali', grade: 'SHO', hoursWorked: 52 },
  { id: '5', name: 'Dr. Lisa Wong', grade: 'Registrar', hoursWorked: 40 },
];

const MOCK_SHIFTS: Shift[] = [
  { id: 's1', doctorId: '1', dayIndex: 0, type: 'D' },
  { id: 's2', doctorId: '1', dayIndex: 1, type: 'D' },
  { id: 's3', doctorId: '1', dayIndex: 2, type: 'OFF' },
  { id: 's4', doctorId: '1', dayIndex: 3, type: 'N' },
  { id: 's5', doctorId: '1', dayIndex: 4, type: 'N' },
  { id: 's6', doctorId: '1', dayIndex: 5, type: 'OFF' },
  { id: 's7', doctorId: '1', dayIndex: 6, type: 'D' },
  
  { id: 's8', doctorId: '2', dayIndex: 0, type: 'N' },
  { id: 's9', doctorId: '2', dayIndex: 1, type: 'OFF' },
  { id: 's10', doctorId: '2', dayIndex: 2, type: 'D' },
  { id: 's11', doctorId: '2', dayIndex: 3, type: 'D' },
  { id: 's12', doctorId: '2', dayIndex: 4, type: 'OFF' },
  { id: 's13', doctorId: '2', dayIndex: 5, type: 'LD', violation: 'Insufficient rest after LD' },
  { id: 's14', doctorId: '2', dayIndex: 6, type: 'D' },

  { id: 's15', doctorId: '3', dayIndex: 0, type: 'OFF' },
  { id: 's16', doctorId: '3', dayIndex: 1, type: 'D' },
  { id: 's17', doctorId: '3', dayIndex: 2, type: 'D' },
  { id: 's18', doctorId: '3', dayIndex: 3, type: 'OFF' },
  { id: 's19', doctorId: '3', dayIndex: 4, type: 'N' },
  { id: 's20', doctorId: '3', dayIndex: 5, type: 'N' },
  { id: 's21', doctorId: '3', dayIndex: 6, type: 'OFF' },

  { id: 's22', doctorId: '4', dayIndex: 0, type: 'LD' },
  { id: 's23', doctorId: '4', dayIndex: 1, type: 'LD' },
  { id: 's24', doctorId: '4', dayIndex: 2, type: 'OFF' },
  { id: 's25', doctorId: '4', dayIndex: 3, type: 'OFF' },
  { id: 's26', doctorId: '4', dayIndex: 4, type: 'D' },
  { id: 's27', doctorId: '4', dayIndex: 5, type: 'D' },
  { id: 's28', doctorId: '4', dayIndex: 6, type: 'D', violation: 'Exceeds 48h average' },

  { id: 's29', doctorId: '5', dayIndex: 0, type: 'D' },
  { id: 's30', doctorId: '5', dayIndex: 1, type: 'D' },
  { id: 's31', doctorId: '5', dayIndex: 2, type: 'D' },
  { id: 's32', doctorId: '5', dayIndex: 3, type: 'D' },
  { id: 's33', doctorId: '5', dayIndex: 4, type: 'D' },
  { id: 's34', doctorId: '5', dayIndex: 5, type: 'OFF' },
  { id: 's35', doctorId: '5', dayIndex: 6, type: 'OFF' },
];

export function RotaBoard() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2">
          <button className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium w-32 text-center text-gray-900">Week 42</span>
          <button className="p-1.5 border border-gray-200 rounded-md hover:bg-gray-50 text-gray-600 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-gray-300 mx-2"></div>
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors">
            <Filter className="w-4 h-4 text-gray-500" />
            Filter
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors">
            <Download className="w-4 h-4 text-gray-500" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-gray-900 text-white rounded-md hover:bg-gray-800 shadow-sm transition-colors">
            <Play className="w-4 h-4" />
            Generate Rota
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="min-w-[800px]">
          {/* Header Row */}
          <div className="grid grid-cols-[200px_repeat(7,1fr)] border-b border-gray-200 bg-gray-50/50 sticky top-0 z-10">
            <div className="p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-200">
              Staff Member
            </div>
            {DAYS.map((day, i) => (
              <div key={day} className={`p-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center ${i !== 6 ? 'border-r border-gray-200' : ''}`}>
                {day}
              </div>
            ))}
          </div>

          {/* Doctor Rows */}
          <div className="divide-y divide-gray-200">
            {MOCK_DOCTORS.map(doctor => (
              <div key={doctor.id} className="grid grid-cols-[200px_repeat(7,1fr)] hover:bg-gray-50/50 transition-colors group">
                <div className="p-3 border-r border-gray-200 flex flex-col justify-center">
                  <div className="font-medium text-sm text-gray-900">{doctor.name}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{doctor.grade}</span>
                    <span className={`text-xs font-medium ${doctor.hoursWorked > 48 ? 'text-red-600' : 'text-gray-500'}`}>
                      {doctor.hoursWorked}h
                    </span>
                  </div>
                </div>
                {DAYS.map((_, dayIndex) => {
                  const shift = MOCK_SHIFTS.find(s => s.doctorId === doctor.id && s.dayIndex === dayIndex);
                  return (
                    <div key={dayIndex} className={`p-1.5 h-16 ${dayIndex !== 6 ? 'border-r border-gray-200' : ''}`}>
                      {shift ? <ShiftCell shift={shift} /> : <div className="h-full w-full rounded-md border border-dashed border-gray-200 bg-gray-50/50"></div>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
