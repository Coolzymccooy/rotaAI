import React from 'react';
import { TrendingUp } from 'lucide-react';

export function Analytics() {
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Night Shift Distribution</h3>
            <select className="text-sm border-gray-200 rounded-md text-gray-600 bg-gray-50 px-2 py-1">
              <option>Last 3 Months</option>
              <option>Last 6 Months</option>
            </select>
          </div>
          <div className="h-64 flex items-end justify-between gap-4 px-4">
            {/* Mock Bar Chart */}
            {[4, 5, 3, 6, 4, 5, 2, 7].map((val, i) => (
              <div key={i} className="w-full bg-indigo-50 rounded-t-md relative group h-full flex items-end">
                <div 
                  className="w-full bg-indigo-500 rounded-t-md transition-all group-hover:bg-indigo-600" 
                  style={{ height: `${val * 10}%` }}
                ></div>
                <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-gray-500 whitespace-nowrap">Dr {i+1}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Compliance Score</h3>
          <div className="flex-1 flex items-center justify-center relative">
            {/* Mock Donut Chart */}
            <svg className="w-40 h-40 transform -rotate-90">
              <circle cx="80" cy="80" r="70" fill="none" stroke="#f3f4f6" strokeWidth="16" />
              <circle cx="80" cy="80" r="70" fill="none" stroke="#10b981" strokeWidth="16" strokeDasharray="440" strokeDashoffset="44" className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-gray-900">90%</span>
              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium mt-1">Compliant</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Burnout Risk Indicators</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Dr. Michael Ali</span>
                <span className="text-red-600 font-medium">High Risk</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-red-500 h-2 rounded-full" style={{ width: '85%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">52h avg over 3 weeks, 5 nights this month.</p>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium text-gray-700">Dr. James Chen</span>
                <span className="text-amber-600 font-medium">Medium Risk</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-amber-500 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">48h avg, 3 weekends worked consecutively.</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Weekend Fairness</h3>
          <div className="space-y-4">
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">FY1</div>
                 <div>
                   <p className="text-sm font-medium text-gray-900">Excellent Distribution</p>
                   <p className="text-xs text-gray-500">Variance: 0.2 shifts</p>
                 </div>
               </div>
               <TrendingUp className="w-5 h-5 text-emerald-500" />
             </div>
             <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">SHO</div>
                 <div>
                   <p className="text-sm font-medium text-gray-900">Moderate Imbalance</p>
                   <p className="text-xs text-gray-500">Variance: 1.5 shifts</p>
                 </div>
               </div>
               <TrendingUp className="w-5 h-5 text-amber-500" />
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
