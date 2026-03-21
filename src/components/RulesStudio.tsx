import React from 'react';
import { Save, AlertCircle } from 'lucide-react';

export function RulesStudio() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm mt-1">Configure hard constraints and soft optimisation weights.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm">
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-500" />
            Hard Rules (Non-negotiable)
          </h3>
          <p className="text-sm text-gray-500 mt-1">The optimiser will never violate these constraints.</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Weekly Hours</label>
              <div className="relative">
                <input type="number" defaultValue={48} className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">hrs</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Min Rest Between Shifts</label>
              <div className="relative">
                <input type="number" defaultValue={11} className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">hrs</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Nights</label>
              <div className="relative">
                <input type="number" defaultValue={4} className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">shifts</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Max Consecutive Long Days</label>
              <div className="relative">
                <input type="number" defaultValue={4} className="w-full pl-3 pr-10 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">shifts</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-200 bg-gray-50/50">
          <h3 className="text-lg font-semibold text-gray-900">Soft Rules (Optimisation Weights)</h3>
          <p className="text-sm text-gray-500 mt-1">The optimiser will try to balance these based on their priority.</p>
        </div>
        <div className="p-6 space-y-8">
          
          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Weekend Fairness</label>
              <span className="text-sm text-indigo-600 font-medium">High Priority</span>
            </div>
            <input type="range" min="0" max="100" defaultValue="90" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <p className="text-xs text-gray-500 mt-2">Distribute weekend shifts equally among staff of the same grade.</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Night Shift Fairness</label>
              <span className="text-sm text-indigo-600 font-medium">High Priority</span>
            </div>
            <input type="range" min="0" max="100" defaultValue="85" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <p className="text-xs text-gray-500 mt-2">Distribute night shifts equally among staff of the same grade.</p>
          </div>

          <div>
            <div className="flex justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">Respect Preferences</label>
              <span className="text-sm text-gray-500 font-medium">Medium Priority</span>
            </div>
            <input type="range" min="0" max="100" defaultValue="60" className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
            <p className="text-xs text-gray-500 mt-2">Attempt to grant requested days off and preferred shift patterns.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
