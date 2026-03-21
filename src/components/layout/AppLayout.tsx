import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { AIPanel } from './AIPanel';
import { Outlet } from 'react-router-dom';

export function AppLayout() {
  const [isAIOpen, setIsAIOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen bg-background text-foreground overflow-hidden font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleAI={() => setIsAIOpen(!isAIOpen)} isAIOpen={isAIOpen} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
      <AIPanel isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} />
    </div>
  );
}
