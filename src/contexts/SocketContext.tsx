import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { useToast } from '../components/ui/Toast';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, isConnected: false });

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const { addToast } = useToast();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const newSocket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Listen for real-time events
    newSocket.on('shift:updated', (data) => {
      addToast('A shift has been updated in real-time.', 'info');
      window.dispatchEvent(new Event('rota-updated'));
    });

    newSocket.on('rota:generated', (data) => {
      addToast('A new rota has been generated!', 'success');
      window.dispatchEvent(new Event('rota-updated'));
    });

    newSocket.on('acuity:alert', (data) => {
      addToast(`Acuity alert: ${data.wardId} needs attention.`, 'error');
    });

    newSocket.on('swap:request', (data) => {
      addToast('You have a new shift swap request!', 'info');
    });

    newSocket.on('leave:updated', (data) => {
      addToast('A leave request has been updated.', 'info');
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token]);

  return (
    <SocketContext.Provider value={{ socket, isConnected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
