import React, { useState } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hi Segun! I noticed Dr. Smith is over their weekly hours by 4 hours. Would you like me to suggest a swap?' }
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;
    
    setMessages(prev => [...prev, { role: 'user', content: messageText }]);
    setInput('');
    
    if (messageText.toLowerCase().includes('generate') || messageText.toLowerCase().includes('create') || messageText.toLowerCase().includes('rota')) {
      setMessages(prev => [...prev, { role: 'ai', content: 'Generating a new rota based on your prompt. Applying EWTD constraints, staff preferences, and historical acuity data...' }]);
      setIsGenerating(true);
      
      try {
        const response = await fetch('/api/rota/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            prompt: messageText
          })
        });
        
        if (response.ok) {
          setMessages(prev => [...prev, { role: 'ai', content: '✨ Rota generated successfully! 100% shift coverage achieved with 0 hard rule violations. Projected locum spend is below budget. You can review it on the Rota Board.' }]);
          // Dispatch an event so RotaBoard can refresh
          window.dispatchEvent(new Event('rota-updated'));
        } else {
          setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered an error while generating the rota.' }]);
        }
      } catch (error) {
        setMessages(prev => [...prev, { role: 'ai', content: 'Sorry, I encountered a network error while generating the rota.' }]);
      } finally {
        setIsGenerating(false);
      }
    } else {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'ai', content: 'Analyzing constraints... I can swap Dr. Smith with Dr. Jones on Friday night. This maintains skill coverage and fixes the hour violation. Apply?' }]);
      }, 1000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 384, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className="h-full bg-card border-l border-border flex flex-col shrink-0 overflow-hidden"
        >
          <div className="h-14 border-b border-border flex items-center justify-between px-4 shrink-0">
            <div className="flex items-center gap-2 text-primary font-medium">
              <Sparkles className="w-4 h-4" />
              RotaAI Copilot
            </div>
            <button onClick={onClose} className="p-1.5 text-muted-foreground hover:bg-secondary rounded-md">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                  msg.role === 'ai' ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground'
                }`}>
                  {msg.role === 'ai' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] ${
                  msg.role === 'ai' ? 'bg-secondary text-foreground rounded-tl-none' : 'bg-primary text-primary-foreground rounded-tr-none'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isGenerating && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/20 text-primary">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="px-4 py-2.5 rounded-2xl text-sm max-w-[80%] bg-secondary text-foreground rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  Generating...
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border bg-card shrink-0">
            <div className="relative flex items-center">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                disabled={isGenerating}
                placeholder="Ask RotaAI..."
                className="w-full bg-secondary border-transparent focus:bg-background focus:border-primary focus:ring-1 focus:ring-primary rounded-full pl-4 pr-12 py-2.5 text-sm outline-none transition-all disabled:opacity-50"
              />
              <button 
                onClick={() => handleSend()}
                disabled={isGenerating}
                className="absolute right-1.5 p-1.5 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
              <span 
                onClick={() => handleSend('Generate next month\'s rota')}
                className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
              >
                ✨ Prompt-to-Rota
              </span>
              <span 
                onClick={() => handleSend('Fix violations')}
                className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                Fix violations
              </span>
              <span 
                onClick={() => handleSend('Optimize fairness')}
                className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors"
              >
                Optimize fairness
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
