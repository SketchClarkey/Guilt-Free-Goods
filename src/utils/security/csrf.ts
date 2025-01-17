import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

const CSRF_TOKEN_COOKIE = 'csrf_token';
const CSRF_TOKEN_HEADER = 'x-csrf-token';
const CSRF_TOKEN_BODY = 'csrfToken';

interface CSRFConfig {
  cookieName?: string;
  headerName?: string;
  bodyName?: string;
  secure?: boolean;
  sameSite?: 'strict' | 'lax' | 'none';
}

export const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export const setCsrfToken = (
  res: NextApiResponse,
  config: CSRFConfig = {}
) => {
  const token = generateToken();
  const cookieName = config.cookieName || CSRF_TOKEN_COOKIE;

  res.setHeader('Set-Cookie', `${cookieName}=${token}; HttpOnly; Path=/; ${
    config.secure ? 'Secure; ' : ''
  }SameSite=${config.sameSite || 'strict'}`);

  return token;
};

export const validateCsrfToken = (
  req: NextApiRequest,
  config: CSRFConfig = {}
): boolean => {
  const cookieName = config.cookieName || CSRF_TOKEN_COOKIE;
  const headerName = config.headerName || CSRF_TOKEN_HEADER;
  const bodyName = config.bodyName || CSRF_TOKEN_BODY;

  const cookieToken = req.cookies[cookieName];
  const headerToken = req.headers[headerName.toLowerCase()];
  const bodyToken = req.body?.[bodyName];

  if (!cookieToken) {
    return false;
  }

  const providedToken = headerToken || bodyToken;

  if (!providedToken) {
    return false;
  }

  // Use timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken),
    Buffer.from(providedToken)
  );
};

export const csrfProtection = (config: CSRFConfig = {}) => {
  return async function csrfMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void
  ) {
    // Skip CSRF check for GET, HEAD, OPTIONS requests
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method?.toUpperCase() || '')) {
      if (next) next();
      return;
    }

    if (!validateCsrfToken(req, config)) {
      res.status(403).json({ error: 'Invalid CSRF token' });
      return;
    }

    if (next) next();
  };
};

// Helper to create CSRF middleware with custom config
export const createCsrfProtection = (config?: CSRFConfig) => {
  return csrfProtection(config);
}; 