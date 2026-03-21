import React from 'react';
import { Search, Plus, Filter } from 'lucide-react';

const MOCK_DOCTORS = [
  { id: '1', name: 'Dr. Sarah Smith', grade: 'Registrar', contract: '100%', hours: 48, nights: 4, weekends: 2 },
  { id: '2', name: 'Dr. James Chen', grade: 'SHO', contract: '100%', hours: 48, nights: 3, weekends: 1 },
  { id: '3', name: 'Dr. Emily Jones', grade: 'FY1', contract: '80%', hours: 38.4, nights: 2, weekends: 1 },
  { id: '4', name: 'Dr. Michael Ali', grade: 'SHO', contract: '100%', hours: 48, nights: 5, weekends: 3 },
  { id: '5', name: 'Dr. Lisa Wong', grade: 'Registrar', contract: '60%', hours: 28.8, nights: 1, weekends: 1 },
];

export function Workforce() {
  return (
    <div className="p-6 h-full flex flex-col max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search staff..." 
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-md hover:bg-gray-50 text-gray-700 font-medium transition-colors bg-white shadow-sm">
            <Filter className="w-4 h-4 text-gray-500" />
            Filter
          </button>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm">
          <Plus className="w-4 h-4" />
          Add Staff
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/50 text-gray-500 font-semibold uppercase tracking-wider sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">Name</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Contract</th>
                <th className="px-6 py-4">Target Hours</th>
                <th className="px-6 py-4">Avg Nights/Mo</th>
                <th className="px-6 py-4">Avg Weekends/Mo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_DOCTORS.map(doc => (
                <tr key={doc.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{doc.name}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                      {doc.grade}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{doc.contract}</td>
                  <td className="px-6 py-4 text-gray-600">{doc.hours}h</td>
                  <td className="px-6 py-4 text-gray-600">{doc.nights}</td>
                  <td className="px-6 py-4 text-gray-600">{doc.weekends}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
