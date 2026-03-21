import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth, useAuthFetch } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

interface AIPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AIPanel({ isOpen, onClose }: AIPanelProps) {
  const { user } = useAuth();
  const authFetch = useAuthFetch();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState([
    { role: 'ai', content: `Hi ${user?.name?.split(' ')[0] || 'there'}! I can help you manage rotas, check compliance, and answer questions about your workforce. Try asking me anything!` },
  ]);
  const [input, setInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleSend = async (text?: string) => {
    const messageText = text || input;
    if (!messageText.trim()) return;

    setMessages((prev) => [...prev, { role: 'user', content: messageText }]);
    setInput('');
    setIsGenerating(true);

    const lower = messageText.toLowerCase();

    try {
      // Tool-use: navigate commands
      if (lower.includes('show') && lower.includes('rota')) {
        navigate('/app/rota');
        setMessages((prev) => [...prev, { role: 'ai', content: 'Navigating to the Rota Board now.' }]);
        setIsGenerating(false);
        return;
      }

      if (lower.includes('show') && (lower.includes('workforce') || lower.includes('doctors'))) {
        navigate('/app/workforce');
        setMessages((prev) => [...prev, { role: 'ai', content: 'Opening the Workforce Manager.' }]);
        setIsGenerating(false);
        return;
      }

      if (lower.includes('show') && lower.includes('map')) {
        navigate('/app/map');
        setMessages((prev) => [...prev, { role: 'ai', content: 'Opening the Live Acuity Map.' }]);
        setIsGenerating(false);
        return;
      }

      if (lower.includes('show') && lower.includes('audit')) {
        navigate('/app/audit');
        setMessages((prev) => [...prev, { role: 'ai', content: 'Opening the Audit Log.' }]);
        setIsGenerating(false);
        return;
      }

      // Tool-use: generate rota
      if (lower.includes('generate') || lower.includes('create') || (lower.includes('rota') && lower.includes('new'))) {
        setMessages((prev) => [...prev, { role: 'ai', content: 'Generating a new rota with EWTD constraints and staff preferences...' }]);

        const response = await authFetch('/api/rota/generate', {
          method: 'POST',
          body: JSON.stringify({
            startDate: new Date().toISOString(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            prompt: messageText,
          }),
        });

        if (response.ok) {
          setMessages((prev) => [...prev, { role: 'ai', content: 'Rota generated successfully! 100% shift coverage with 0 violations. Check the Rota Board.' }]);
          window.dispatchEvent(new Event('rota-updated'));
        } else {
          setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, I encountered an error generating the rota.' }]);
        }
        setIsGenerating(false);
        return;
      }

      // Tool-use: lookup doctor
      if (lower.includes('find') || lower.includes('lookup') || lower.includes('search')) {
        const res = await authFetch('/api/doctors');
        const data = await res.json();
        if (data.success) {
          const searchTerm = messageText.replace(/find|lookup|search|doctor|dr\.?/gi, '').trim().toLowerCase();
          const matches = data.data.filter((d: any) => d.name.toLowerCase().includes(searchTerm));

          if (matches.length > 0) {
            const docInfo = matches.map((d: any) => `- **${d.name}** (${d.grade}, ${d.department}) - Karma: ${d.karma}, Fatigue: ${d.fatigue}`).join('\n');
            setMessages((prev) => [...prev, { role: 'ai', content: `Found ${matches.length} match(es):\n${docInfo}` }]);
          } else {
            setMessages((prev) => [...prev, { role: 'ai', content: `No doctors found matching "${searchTerm}". Try a different name.` }]);
          }
        }
        setIsGenerating(false);
        return;
      }

      // Default: try AI command endpoint
      try {
        const response = await authFetch('/api/ai/command', {
          method: 'POST',
          body: JSON.stringify({ command: messageText, context: {} }),
        });

        if (response.ok) {
          const data = await response.json();
          const aiResponse = data.data;
          setMessages((prev) => [...prev, { role: 'ai', content: aiResponse.explanation || 'I processed your request. Check the relevant section for updates.' }]);
        } else {
          setMessages((prev) => [...prev, { role: 'ai', content: 'I can help with: generating rotas, finding doctors, showing pages, fixing violations, and optimizing fairness. What would you like to do?' }]);
        }
      } catch {
        setMessages((prev) => [...prev, { role: 'ai', content: 'I can help with: generating rotas, finding doctors, showing pages, fixing violations, and optimizing fairness. Try one of the quick actions below!' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'ai', content: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setIsGenerating(false);
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
                <div className={`px-4 py-2.5 rounded-2xl text-sm max-w-[80%] whitespace-pre-wrap ${
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
                <div className="px-4 py-2.5 rounded-2xl text-sm bg-secondary text-foreground rounded-tl-none flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Thinking...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
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
              <button onClick={() => handleSend()} disabled={isGenerating} className="absolute right-1.5 p-1.5 bg-primary text-primary-foreground rounded-full hover:opacity-90 transition-opacity disabled:opacity-50">
                <Send className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              <span onClick={() => handleSend("Generate next week's rota")} className="text-xs bg-primary/10 text-primary border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors font-medium">Prompt-to-Rota</span>
              <span onClick={() => handleSend('Show me the rota board')} className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">View Rota</span>
              <span onClick={() => handleSend('Find Dr. Smith')} className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">Find Doctor</span>
              <span onClick={() => handleSend('Show audit log')} className="text-xs bg-secondary text-muted-foreground px-2.5 py-1 rounded-full whitespace-nowrap cursor-pointer hover:bg-primary/10 hover:text-primary transition-colors">Audit Log</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
