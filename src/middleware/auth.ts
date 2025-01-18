import { NextApiRequest } from 'next';
import { getToken } from 'next-auth/jwt';

const publicPaths = ['/api/auth/signin', '/api/auth/signup', '/api/auth/reset-password'];

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 1000; // 1 second for testing
const UNAUTHENTICATED_LIMIT = 5;
const AUTHENTICATED_LIMIT = 10;

// Rate limiting storage
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const requestCounts = new Map<string, RateLimitEntry>();

export async function authMiddleware(req: NextApiRequest): Promise<Response | undefined> {
  // Allow public paths
  if (publicPaths.some(path => req.url?.includes(path))) {
    return undefined;
  }

  // Rate limiting
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor || 'unknown';
  const token = await getToken({ req });
  const rateLimit = token ? AUTHENTICATED_LIMIT : UNAUTHENTICATED_LIMIT;
  
  const now = Date.now();
  const entry = requestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
  
  // Reset count if window has expired
  if (now >= entry.resetTime) {
    entry.count = 0;
    entry.resetTime = now + RATE_LIMIT_WINDOW;
  }
  
  entry.count++;
  requestCounts.set(ip, entry);

  if (entry.count > rateLimit) {
    return new Response(
      JSON.stringify({ error: 'Too Many Requests' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Check authentication for non-public paths
  if (!token) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return undefined;
} 