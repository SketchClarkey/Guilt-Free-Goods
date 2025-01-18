import { NextApiRequest, NextApiResponse } from 'next';
import { getToken } from 'next-auth/jwt';
import { getSession, signOut } from 'next-auth/react';
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface SessionConfig {
  maxAge?: number;
  updateAge?: number;
  absoluteTimeout?: number;
  inactivityTimeout?: number;
  refreshTokenRotation?: boolean;
  singleSession?: boolean;
}

const defaultConfig: SessionConfig = {
  maxAge: 30 * 24 * 60 * 60, // 30 days
  updateAge: 24 * 60 * 60, // 24 hours
  absoluteTimeout: 90 * 24 * 60 * 60, // 90 days
  inactivityTimeout: 2 * 60 * 60, // 2 hours
  refreshTokenRotation: true,
  singleSession: false,
};

export const sessionManager = (config: SessionConfig = {}) => {
  const finalConfig = { ...defaultConfig, ...config };

  return async function sessionMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void
  ) {
    const session = await getSession({ req });
    const token = await getToken({ req });

    if (!session || !token) {
      if (next) next();
      return;
    }

    const now = Date.now();
    const tokenIat = token.iat as number;
    const tokenExp = token.exp as number;

    // Check absolute timeout
    if (finalConfig.absoluteTimeout) {
      const sessionAge = now / 1000 - tokenIat;
      if (sessionAge > finalConfig.absoluteTimeout) {
        await signOut({ redirect: false });
        res.status(401).json({ error: 'Session expired' });
        return;
      }
    }

    // Check inactivity timeout
    if (finalConfig.inactivityTimeout) {
      const lastActivity = token.lastActivity as number || tokenIat;
      const inactivityTime = now / 1000 - lastActivity;
      if (inactivityTime > finalConfig.inactivityTimeout) {
        await signOut({ redirect: false });
        res.status(401).json({ error: 'Session expired due to inactivity' });
        return;
      }
    }

    // Update session age if needed
    if (finalConfig.updateAge) {
      const sessionAge = now / 1000 - tokenIat;
      if (sessionAge > finalConfig.updateAge) {
        // Implement token rotation logic here
        if (finalConfig.refreshTokenRotation) {
          // Rotate refresh token
          // This would be implemented based on your token rotation strategy
        }
      }
    }

    // Single session check
    if (finalConfig.singleSession) {
      // TODO: Implement single session check
      // const sessionId = token.sessionId as string;
      // This will be implemented when single session feature is needed
    }

    // Update last activity
    token.lastActivity = Math.floor(now / 1000);

    if (next) next();
  };
};

// Helper to create session manager middleware with custom config
export const createSessionManager = (config?: SessionConfig) => {
  return sessionManager(config);
};

// Utility functions for session management
export const isSessionValid = async (req: NextApiRequest): Promise<boolean> => {
  const session = await getSession({ req });
  return !!session;
};

export const getSessionUser = async (req: NextApiRequest) => {
  const session = await getSession({ req });
  return session?.user;
};

export const invalidateSession = async () => {
  await signOut({ redirect: false });
};

export async function validateSession(token: string): Promise<boolean> {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const { exp, sessionId } = decoded;

    // Check if token is expired
    if (Date.now() >= exp * 1000) {
      return false;
    }

    // Validate session ID
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    return !!session && !session.revoked;
  } catch {
    return false;
  }
} 