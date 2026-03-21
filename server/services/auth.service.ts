import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rotaai-dev-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'doctor';
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
  name: string;
  doctorId?: string | null;
}

function generateToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export const register = async (input: RegisterInput) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw Object.assign(new Error('User with this email already exists'), { statusCode: 400 });
  }

  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(input.password, salt);

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role: input.role || 'doctor',
    },
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    doctorId: user.doctorId,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctorId: user.doctorId,
    },
  };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const isMatch = await bcrypt.compare(input.password, user.password);
  if (!isMatch) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    doctorId: user.doctorId,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      doctorId: user.doctorId,
    },
  };
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      doctorId: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return user;
};
