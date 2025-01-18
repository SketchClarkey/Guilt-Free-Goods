import { NextApiRequest, NextApiResponse } from 'next';
import { createRateLimiter } from '../security/rateLimit';
import { createCsrfProtection } from '../security/csrf';
import { createSessionManager } from '../security/sessionManager';
import { getSession } from 'next-auth/react';

export interface ApiProtectionConfig {
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  csrf?: {
    enabled?: boolean;
    secure?: boolean;
    sameSite?: 'strict' | 'lax' | 'none';
  };
  session?: {
    required?: boolean;
    inactivityTimeout?: number;
    absoluteTimeout?: number;
  };
  roles?: string[];
}

const defaultConfig: ApiProtectionConfig = {
  rateLimit: {
    windowMs: 60000, // 1 minute
    max: 60, // 60 requests per minute
  },
  csrf: {
    enabled: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  },
  session: {
    required: true,
    inactivityTimeout: 2 * 60 * 60, // 2 hours
    absoluteTimeout: 24 * 60 * 60, // 24 hours
  },
};

export const apiProtection = (config: ApiProtectionConfig = {}) => {
  const finalConfig = {
    ...defaultConfig,
    ...config,
    rateLimit: { ...defaultConfig.rateLimit, ...config.rateLimit },
    csrf: { ...defaultConfig.csrf, ...config.csrf },
    session: { ...defaultConfig.session, ...config.session },
  };

  // Initialize middleware
  const rateLimiter = createRateLimiter(finalConfig.rateLimit);
  const csrfProtector = createCsrfProtection(finalConfig.csrf);
  const sessionManager = createSessionManager(finalConfig.session);

  return async function apiProtectionMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void
  ) {
    try {
      // 1. Rate Limiting
      await rateLimiter(req, res);

      // 2. CSRF Protection (if enabled and not GET/HEAD/OPTIONS)
      if (
        finalConfig.csrf?.enabled &&
        !['GET', 'HEAD', 'OPTIONS'].includes(req.method?.toUpperCase() || '')
      ) {
        await csrfProtector(req, res);
      }

      // 3. Session Management
      if (finalConfig.session?.required) {
        await sessionManager(req, res);

        // Check session existence
        const session = await getSession({ req });
        if (!session) {
          res.status(401).json({ error: 'Unauthorized' });
          return;
        }

        // Role-based access control
        if (finalConfig.roles?.length > 0) {
          const userRole = session.user?.role as string;
          if (!finalConfig.roles.includes(userRole)) {
            res.status(403).json({ error: 'Forbidden' });
            return;
          }
        }
      }

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains'
      );
      
      if (process.env.NODE_ENV === 'production') {
        res.setHeader('Content-Security-Policy', "default-src 'self'");
      }

      if (next) {
        next();
      }
    } catch (error) {
      console.error('API Protection Error:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  };
};

// Helper to create API protection middleware with custom config
export const createApiProtection = (config?: ApiProtectionConfig) => {
  return apiProtection(config);
};

// Utility function to protect API routes
export function withApiProtection(handler: NextApiHandler) {
  return async function protectedHandler(req: NextApiRequest, res: NextApiResponse) {
    try {
      await validateSession(req);
      return handler(req, res);
    } catch (_error) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  };
} 