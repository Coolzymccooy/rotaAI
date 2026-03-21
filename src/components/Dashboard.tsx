import React from 'react';
import { Activity, AlertTriangle, CheckCircle2, Users } from 'lucide-react';

export function Dashboard() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Activity className="w-5 h-5 text-indigo-500" />
            <span className="font-medium">Rota Health</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">92%</div>
          <div className="text-sm text-emerald-600 mt-1">+2% from last month</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="font-medium">Uncovered Shifts</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">3</div>
          <div className="text-sm text-amber-600 mt-1">Next 14 days</div>
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="font-medium">Compliance</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">98%</div>
          <div className="text-sm text-gray-500 mt-1">2 minor violations</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 text-gray-500 mb-2">
            <Users className="w-5 h-5 text-blue-500" />
            <span className="font-medium">Staff on Leave</span>
          </div>
          <div className="text-3xl font-bold text-gray-900">5</div>
          <div className="text-sm text-gray-500 mt-1">This week</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Alerts</h3>
          <div className="space-y-3">
             <div className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-100">
               <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
               <div>
                 <p className="font-medium">Dr. Michael Ali exceeds 48h limit</p>
                 <p className="text-sm opacity-80 mt-0.5">Week 42 currently scheduled for 52 hours.</p>
               </div>
             </div>
             <div className="flex items-start gap-3 p-3 bg-amber-50 text-amber-700 rounded-lg border border-amber-100">
               <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
               <div>
                 <p className="font-medium">Uncovered Night Shift</p>
                 <p className="text-sm opacity-80 mt-0.5">Thu 15 Oct requires 1x Registrar.</p>
               </div>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Suggestions</h3>
          <div className="space-y-3">
             <div className="flex items-start gap-3 p-3 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-100">
               <Activity className="w-5 h-5 shrink-0 mt-0.5" />
               <div>
                 <p className="font-medium">Optimise Weekend Distribution</p>
                 <p className="text-sm opacity-80 mt-0.5">Swapping Dr. Smith and Dr. Wong's shifts on Oct 24 improves fairness score by 15%.</p>
                 <button className="mt-2 text-xs font-semibold bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition-colors">Apply Fix</button>
               </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
