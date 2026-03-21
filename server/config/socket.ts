import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rotaai-dev-jwt-secret-change-in-production';

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      (socket as any).user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    logger.info(`Socket connected: ${user?.name} (${user?.role})`);

    // Join role-specific rooms
    socket.join(`role:${user?.role}`);
    if (user?.doctorId) {
      socket.join(`doctor:${user.doctorId}`);
    }

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user?.name}`);
    });
  });

  logger.info('Socket.IO initialized');
  return io;
};

export const getIO = (): SocketIOServer | null => io;

// Broadcast helper functions
export const emitShiftUpdate = (data: any) => {
  if (io) {
    io.emit('shift:updated', data);
  }
};

export const emitRotaGenerated = (data: any) => {
  if (io) {
    io.emit('rota:generated', data);
  }
};

export const emitAcuityAlert = (wardId: string, data: any) => {
  if (io) {
    io.emit('acuity:alert', { wardId, ...data });
  }
};

export const emitSwapRequest = (targetDoctorId: string, data: any) => {
  if (io) {
    io.to(`doctor:${targetDoctorId}`).emit('swap:request', data);
  }
};

export const emitLeaveRequestUpdate = (data: any) => {
  if (io) {
    io.to('role:admin').emit('leave:updated', data);
    if (data.doctorId) {
      io.to(`doctor:${data.doctorId}`).emit('leave:updated', data);
    }
  }
};
