/**
 * Request validation utilities to detect and prevent suspicious requests
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Maximum allowed sizes for different parts of the request
 */
const MAX_ALBUM_ID_LENGTH = 100;
const MAX_AUTH_TOKEN_LENGTH = 500;

/**
 * Suspicious patterns to detect potential attacks
 */
const SUSPICIOUS_PATTERNS = [
  /[<>'"]/g, // Basic XSS patterns
  /(\bunion\b|\bselect\b|\binsert\b|\bdelete\b|\bdrop\b|\bupdate\b)/gi, // SQL injection keywords
  /\.\.\/|\.\.\\/, // Path traversal
  /\x00/, // Null bytes
];

/**
 * Validate album ID format and content
 */
export function validateAlbumId(albumId: string | null): ValidationResult {
  if (!albumId) {
    return { valid: false, error: 'Album ID is required' };
  }

  if (albumId.length > MAX_ALBUM_ID_LENGTH) {
    return { valid: false, error: 'Album ID is too long' };
  }

  // Check for suspicious patterns
  for (const pattern of SUSPICIOUS_PATTERNS) {
    if (pattern.test(albumId)) {
      return { valid: false, error: 'Album ID contains invalid characters' };
    }
  }

  return { valid: true };
}

/**
 * Validate auth token format and content
 */
export function validateAuthToken(authToken: string | null): ValidationResult {
  if (!authToken) {
    return { valid: false, error: 'Auth token is required' };
  }

  const trimmedToken = authToken.trim();

  if (trimmedToken.length === 0) {
    return { valid: false, error: 'Auth token cannot be empty' };
  }

  if (trimmedToken.length > MAX_AUTH_TOKEN_LENGTH) {
    return { valid: false, error: 'Auth token is too long' };
  }

  // Check for suspicious patterns (but be less strict since tokens can have various formats)
  if (/\x00/.test(trimmedToken)) {
    return { valid: false, error: 'Auth token contains invalid characters' };
  }

  return { valid: true };
}

/**
 * Validate Content-Type header for POST requests
 */
export function validateContentType(
  request: Request,
  expectedType = 'application/json',
): ValidationResult {
  const contentType = request.headers.get('content-type');

  if (!contentType || !contentType.includes(expectedType)) {
    return { valid: false, error: `Invalid Content-Type. Expected ${expectedType}` };
  }

  return { valid: true };
}
