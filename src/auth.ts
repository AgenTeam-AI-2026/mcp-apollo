import { ApolloApiError } from './types.js';

/**
 * Extracts the Bearer token from the Authorization header.
 * Returns null if missing or malformed.
 */
export function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') return null;

  const token = parts[1];
  if (!token || token.trim() === '') return null;

  return token.trim();
}

/**
 * Builds a structured auth error for missing or invalid credentials.
 */
export function makeAuthError(): ApolloApiError {
  return {
    status: 401,
    error: 'unauthorized',
    message:
      'Missing or invalid Apollo.io API key. ' +
      'Pass your key as: Authorization: Bearer <your_apollo_api_key>',
  };
}
