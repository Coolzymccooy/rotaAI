import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../config/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'rotaai-dev-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = '7d';

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  role?: 'admin' | 'doctor';
  organizationName?: string;  // For creating a new org
  inviteToken?: string;       // For joining via invite
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
  organizationId?: string | null;
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

  let organizationId: string | null = null;
  let role = input.role || 'doctor';

  // Case 1: Invite token — join existing org
  if (input.inviteToken) {
    const invite = await prisma.invite.findUnique({ where: { token: input.inviteToken } });
    if (!invite) {
      throw Object.assign(new Error('Invalid invite link'), { statusCode: 400 });
    }
    if (invite.expiresAt < new Date()) {
      throw Object.assign(new Error('Invite link has expired'), { statusCode: 400 });
    }
    if (invite.acceptedAt) {
      throw Object.assign(new Error('Invite has already been used'), { statusCode: 400 });
    }
    if (invite.email !== input.email) {
      throw Object.assign(new Error('This invite was sent to a different email address'), { statusCode: 400 });
    }

    organizationId = invite.organizationId;
    role = invite.role as 'admin' | 'doctor';

    // Mark invite as accepted
    await prisma.invite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
  }
  // Case 2: Creating a new organization
  else if (input.organizationName) {
    const slug = input.organizationName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const existingOrg = await prisma.organization.findUnique({ where: { slug } });
    if (existingOrg) {
      throw Object.assign(new Error('An organization with this name already exists'), { statusCode: 400 });
    }

    const org = await prisma.organization.create({
      data: {
        name: input.organizationName,
        slug,
        type: 'nhs_trust',
      },
    });

    organizationId = org.id;
    role = 'admin'; // First user is always admin
  }
  // Case 3: No org context — not allowed in production
  else {
    // Allow orgless signup only in development
    if (process.env.NODE_ENV === 'production') {
      throw Object.assign(new Error('Please use an invite link or create an organization'), { statusCode: 400 });
    }
  }

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password: hashedPassword,
      name: input.name,
      role,
      organizationId,
    },
  });

  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    organizationId: user.organizationId,
    doctorId: user.doctorId,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      doctorId: user.doctorId,
    },
  };
};

export const login = async (input: LoginInput) => {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
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
    organizationId: user.organizationId,
    doctorId: user.doctorId,
  });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      doctorId: user.doctorId,
      organization: user.organization,
    },
  };
};

export const getProfile = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, name: true, role: true,
      organizationId: true, doctorId: true, createdAt: true,
      organization: { select: { id: true, name: true, slug: true, type: true, plan: true } },
    },
  });

  if (!user) {
    throw Object.assign(new Error('User not found'), { statusCode: 404 });
  }

  return user;
};

// Invite management
export const createInvite = async (organizationId: string, email: string, role: string, createdBy: string) => {
  // Check if already invited
  const existing = await prisma.invite.findFirst({
    where: { organizationId, email, acceptedAt: null },
  });
  if (existing) {
    throw Object.assign(new Error('This email has already been invited'), { statusCode: 400 });
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const invite = await prisma.invite.create({
    data: {
      organizationId,
      email,
      role,
      token,
      expiresAt,
      createdBy,
    },
  });

  return invite;
};

export const getInvites = async (organizationId: string) => {
  return prisma.invite.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
};

export const revokeInvite = async (inviteId: string, organizationId: string) => {
  return prisma.invite.deleteMany({
    where: { id: inviteId, organizationId },
  });
};
