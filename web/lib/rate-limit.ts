/**
 * In-memory rate limiter for API protection
 * Tracks requests per IP address with automatic cleanup
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

class InMemoryRateLimiter {
  private store: Map<string, RateLimitRecord> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Run cleanup every 5 minutes to prevent memory leaks
    this.cleanupInterval = setInterval(
      () => {
        this.cleanup();
      },
      5 * 60 * 1000,
    );
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, record] of this.store.entries()) {
      if (now > record.resetTime) {
        this.store.delete(key);
      }
    }
  }

  check(
    identifier: string,
    limit: number,
    windowMs: number,
  ): { success: boolean; limit: number; remaining: number; reset: number } {
    const now = Date.now();
    const record = this.store.get(identifier);

    // No record or expired - create new one
    if (!record || now > record.resetTime) {
      const resetTime = now + windowMs;
      this.store.set(identifier, {
        count: 1,
        resetTime,
      });
      return {
        success: true,
        limit,
        remaining: limit - 1,
        reset: resetTime,
      };
    }

    // Record exists and is valid
    if (record.count >= limit) {
      return {
        success: false,
        limit,
        remaining: 0,
        reset: record.resetTime,
      };
    }

    // Increment count
    record.count++;
    this.store.set(identifier, record);

    return {
      success: true,
      limit,
      remaining: limit - record.count,
      reset: record.resetTime,
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
  }
}

// Global instance to persist across requests
const limiter = new InMemoryRateLimiter();

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  limit: number; // Maximum number of requests
  windowMs: number; // Time window in milliseconds
}

/**
 * Get rate limit configurations from environment or use defaults
 */
export function getRateLimitConfig(endpoint: 'info' | 'download'): RateLimitConfig {
  if (endpoint === 'info') {
    const rpm = Number.parseInt(process.env.RATE_LIMIT_INFO_RPM || '20', 10);
    return {
      limit: rpm,
      windowMs: 60 * 1000, // 1 minute
    };
  }

  // download endpoint
  const rpm = Number.parseInt(process.env.RATE_LIMIT_DOWNLOAD_RPM || '3', 10);
  return {
    limit: rpm,
    windowMs: 60 * 1000, // 1 minute
  };
}

/**
 * Extract client IP from request
 */
export function getClientIp(request: Request): string {
  // Check various headers for the real IP
  const headers = request.headers;

  // Try standard forwarded headers
  const forwardedFor = headers.get('x-forwarded-for');
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    const ips = forwardedFor.split(',');
    return ips[0].trim();
  }

  const realIp = headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }

  // Fallback to a generic identifier
  // In production, this should be replaced with actual IP detection
  return 'unknown';
}

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): { success: boolean; limit: number; remaining: number; reset: number } {
  return limiter.check(identifier, config.limit, config.windowMs);
}

/**
 * Create rate limit response headers
 */
export function getRateLimitHeaders(result: { limit: number; remaining: number; reset: number }) {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.reset).toISOString(),
  };
}
/**
 * Cleanup rate limiter on shutdown (for testing)
 */
export function destroyRateLimiter() {
  limiter.destroy();
}
