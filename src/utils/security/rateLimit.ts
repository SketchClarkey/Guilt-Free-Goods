import { NextApiRequest, NextApiResponse } from 'next';

interface RateLimitConfig {
  windowMs: number;
  max: number;
}

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const ipBuckets = new Map<string, TokenBucket>();

export const rateLimit = (config: RateLimitConfig = { windowMs: 60000, max: 5 }) => {
  return async function rateLimitMiddleware(
    req: NextApiRequest,
    res: NextApiResponse,
    next?: () => void
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || 
               req.socket.remoteAddress || 
               'unknown';

    let bucket = ipBuckets.get(ip);
    const now = Date.now();

    if (!bucket) {
      bucket = {
        tokens: config.max,
        lastRefill: now,
      };
      ipBuckets.set(ip, bucket);
    }

    // Calculate token refill
    const timePassed = now - bucket.lastRefill;
    const refillRate = config.max / config.windowMs;
    const refillTokens = timePassed * refillRate;
    bucket.tokens = Math.min(config.max, bucket.tokens + refillTokens);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((1 - bucket.tokens) / refillRate),
      });
      return;
    }

    bucket.tokens -= 1;
    ipBuckets.set(ip, bucket);

    // Clean up old entries periodically
    if (Math.random() < 0.01) { // 1% chance to trigger cleanup
      const expiryMs = config.windowMs * 2;
      for (const [storedIp, storedBucket] of ipBuckets.entries()) {
        if (now - storedBucket.lastRefill > expiryMs) {
          ipBuckets.delete(storedIp);
        }
      }
    }

    if (next) {
      next();
    }
  };
};

// Helper to create rate limit middleware with custom config
export const createRateLimiter = (config?: RateLimitConfig) => {
  return rateLimit(config);
}; 