/**
 * RALPH-Loop tests: Rate-limit, Auth, Load, Payload, Handling
 * Tests auth extraction and ApolloApiError behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApolloApiError } from '../src/apollo-client.js';
import { extractBearerToken, unauthorizedResponse } from '../src/auth.js';

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.restoreAllMocks());

describe('RALPH — Rate limit', () => {
  it('ApolloApiError carries statusCode 429 and rateLimitInfo', () => {
    const err = new ApolloApiError('Rate limited', 429, { limit: 50, remaining: 0, resetAt: '60' });
    expect(err.statusCode).toBe(429);
    expect(err.rateLimitInfo.remaining).toBe(0);
    expect(err.message).toContain('Rate limited');
  });

  it('ApolloApiError is instanceof Error', () => {
    const err = new ApolloApiError('oops', 500, { limit: null, remaining: null, resetAt: null });
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApolloApiError);
  });
});

describe('RALPH — Auth handling', () => {
  it('extractBearerToken returns null for missing Authorization header', () => {
    const req = new Request('https://example.com');
    expect(extractBearerToken(req)).toBeNull();
  });

  it('extractBearerToken returns null for non-Bearer scheme', () => {
    const req = new Request('https://example.com', { headers: { Authorization: 'Basic abc123' } });
    expect(extractBearerToken(req)).toBeNull();
  });

  it('extractBearerToken returns null for empty token', () => {
    const req = new Request('https://example.com', { headers: { Authorization: 'Bearer ' } });
    expect(extractBearerToken(req)).toBeNull();
  });

  it('extractBearerToken returns trimmed key for valid header', () => {
    const req = new Request('https://example.com', { headers: { Authorization: 'Bearer my-secret-key' } });
    expect(extractBearerToken(req)).toBe('my-secret-key');
  });

  it('unauthorizedResponse returns 401 JSON response', async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBeTruthy();
  });
});

describe('RALPH — Payload edge cases', () => {
  it('ApolloApiError with 422 carries correct statusCode', () => {
    const err = new ApolloApiError('Validation error', 422, { limit: null, remaining: null, resetAt: null });
    expect(err.statusCode).toBe(422);
  });

  it('ApolloApiError with 401 is recognisable by statusCode', () => {
    const err = new ApolloApiError('Unauthorized', 401, { limit: null, remaining: null, resetAt: null });
    expect(err.statusCode).toBe(401);
    expect(err.name).toBe('ApolloApiError');
  });

  it('ApolloApiError with 500 wraps server errors', () => {
    const err = new ApolloApiError('Server error', 500, { limit: null, remaining: null, resetAt: null });
    expect(err.statusCode).toBe(500);
  });

  it('rateLimitInfo fields are null when headers absent', () => {
    const err = new ApolloApiError('err', 429, { limit: null, remaining: null, resetAt: null });
    expect(err.rateLimitInfo.limit).toBeNull();
    expect(err.rateLimitInfo.remaining).toBeNull();
    expect(err.rateLimitInfo.resetAt).toBeNull();
  });
});
