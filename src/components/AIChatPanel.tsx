import React, { useState } from 'react';
import { X, Send, Sparkles, Bot, User, CheckCircle2, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string | React.ReactNode;
}

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hi! I am your RotaAI Copilot. I can help you generate rotas, fix coverage issues, and balance fairness. What would you like to do?'
    }
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input;
    setInput('');
    
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: userMsg }]);

    // Simulate AI response
    setTimeout(() => {
      if (userMsg.toLowerCase().includes('dr ahmed') || userMsg.toLowerCase().includes('leave')) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: (
            <div className="space-y-3">
              <p>I've analysed the impact of Dr. Ahmed's leave next week.</p>
              <div className="bg-white border border-gray-200 rounded-md p-3 text-xs space-y-2 shadow-sm">
                <div className="flex items-center gap-2 text-amber-600 font-medium">
                  <AlertCircle className="w-4 h-4" />
                  3 shifts affected
                </div>
                <div className="flex items-center gap-2 text-emerald-600 font-medium">
                  <CheckCircle2 className="w-4 h-4" />
                  Replacements found
                </div>
                <ul className="list-disc pl-5 text-gray-600 space-y-1 mt-2">
                  <li>Tue Night → Dr. James Chen</li>
                  <li>Wed Day → Dr. Lisa Wong</li>
                  <li>Thu Day → Locum required</li>
                </ul>
              </div>
              <p>Would you like me to apply these changes to the rota?</p>
              <div className="flex gap-2 mt-2">
                <button className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-md hover:bg-indigo-700">
                  Apply Changes
                </button>
                <button className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50">
                  Modify
                </button>
              </div>
            </div>
          )
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: 'I can help with that. Let me run the optimisation engine to find the best solution while maintaining compliance rules.'
        }]);
      }
    }, 1000);
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-gray-50 flex flex-col shadow-xl z-20 shrink-0">
      <div className="h-14 border-b border-gray-200 bg-white flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-2 font-semibold text-gray-900">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          AI Copilot
        </div>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-indigo-100 text-indigo-700' : 'bg-white border border-gray-200 text-indigo-600 shadow-sm'}`}>
              {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>
            <div className={`text-sm p-3 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm shadow-sm'}`}>
              {msg.content}
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-gray-200 shrink-0">
        <div className="flex flex-wrap gap-2 mb-3">
          <button onClick={() => setInput("Dr Ahmed is on leave next week, fix the rota")} className="text-[11px] font-medium px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors border border-gray-200">
            "Dr Ahmed is on leave..."
          </button>
          <button onClick={() => setInput("Balance weekend distribution")} className="text-[11px] font-medium px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors border border-gray-200">
            "Balance weekends"
          </button>
        </div>
        <form onSubmit={handleSend} className="relative">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask AI to adjust rota..."
            className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1.5 bg-indigo-600 text-white rounded-md disabled:opacity-50 disabled:bg-gray-400 transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
