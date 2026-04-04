/**
 * RALPH-Loop tests: Retry, Auth, Load, Payload, Handling
 * Tests the ApolloClient's error handling, auth, and edge-case payload behaviour.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { ApolloError } from '../src/types.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

beforeEach(() => vi.clearAllMocks());
aftereEach(() => vi.restoreAllMocks());

describe('RALPH — Rate limit handling', () => {
  it('throws ApolloError with RATE_LIMITED code on 429', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, { error: 'rate limited' }, {
        'x-rate-limit-limit': '50',
        'x-rate-limit-remaining': '0',
        'x-rate-limit-reset': '60',
      }),
    );
    const client = new ApolloClient('valid-key');
    await expect(client.post('/test', {})).rejects.toMatchObject({
      apolloCode: 'RATE_LIMITED',
      statusCode: 429,
    });
  });

  it('includes reset time in rate-limit error message', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(429, {}, { 'x-rate-limit-reset': '120' }),
    );
    const client = new ApolloClient('valid-key');
    await expect(client.post('/test', {})).rejects.toThrow('120s');
  });
});

describe('RALPH — Auth handling', () => {
  it('throws ApolloError UNAUTHORIZED on 401', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(401, { error: 'unauthorized' }));
    const client = new ApolloClient('bad-key');
    await expect(client.post('/people/match', {})).rejects.toMatchObject({
      apolloCode: 'UNAUTHORIZED',
      statusCode: 401,
    });
  });

  it('sends api key in x-api-key header', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { people: [] }));
    const client = new ApolloClient('my-secret-key');
    await client.post('/mixed_people/search', {});
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)['x-api-key']).toBe('my-secret-key');
  });
});

describe('RALPH — Load / large payloads', () => {
  it('handles large people arrays without errors', async () => {
    const people = Array.from({ length: 25 }, (_, i) => ({
      id: `p_${i}`,
      name: `Person ${i}`,
      title: 'Engineer',
      email: `person${i}@co.com`,
      email_status: 'verified',
      linkedin_url: null,
      city: null,
      state: null,
      country: null,
      organization: null,
      employment_history: null,
    }));
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, {
        people,
        pagination: { page: 1, per_page: 25, total_entries: 25, total_pages: 1 },
      }),
    );
    const client = new ApolloClient('key');
    const { data } = await client.post<{ people: unknown[] }>('/mixed_people/search', {});
    expect((data as { people: unknown[] }).people).toHaveLength(25);
  });
});

describe('RALPH — Payload edge cases', () => {
  it('throws VALIDATION_ERROR on 422', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(422, { message: 'Invalid params' }));
    const client = new ApolloClient('key');
    await expect(client.post('/mixed_people/search', {})).rejects.toMatchObject({
      apolloCode: 'VALIDATION_ERROR',
      statusCode: 422,
    });
  });

  it('throws generic ApolloError on unexpected 500', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(500, { error: 'server error' }));
    const client = new ApolloClient('key');
    await expect(client.post('/test', {})).rejects.toMatchObject({ statusCode: 500 });
  });

  it('parses rate limit headers as numbers', async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(200, { result: 'ok' }, {
        'x-rate-limit-limit': '100',
        'x-rate-limit-remaining': '42',
        'x-rate-limit-reset': '900',
      }),
    );
    const client = new ApolloClient('key');
    const { rateLimits } = await client.post('/test', {});
    expect(rateLimits.limit).toBe(100);
    expect(rateLimits.remaining).toBe(42);
    expect(rateLimits.reset).toBe(900);
  });

  it('returns null for missing rate limit headers', async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { ok: true }));
    const client = new ApolloClient('key');
    const { rateLimits } = await client.post('/test', {});
    expect(rateLimits.limit).toBeNull();
    expect(rateLimits.remaining).toBeNull();
    expect(rateLimits.reset).toBeNull();
  });
});

describe('RALPH — Handling (auth extraction)', () => {
  it('extractApiKey returns key from valid Bearer token', async () => {
    const { extractApiKey } = await import('../src/auth.js');
    const req = new Request('https://example.com', {
      headers: { Authorization: 'Bearer my-apollo-key-123' },
    });
    expect(extractApiKey(req)).toBe('my-apollo-key-123');
  });

  it('extractApiKey returns null when header missing', async () => {
    const { extractApiKey } = await import('../src/auth.js');
    const req = new Request('https://example.com');
    expect(extractApiKey(req)).toBeNull();
  });

  it('extractApiKey returns null for malformed header', async () => {
    const { extractApiKey } = await import('../src/auth.js');
    const req = new Request('https://example.com', {
      headers: { Authorization: 'NotBearer somekey' },
    });
    expect(extractApiKey(req)).toBeNull();
  });

  it('missingAuthResponse returns 401', async () => {
    const { missingAuthResponse } = await import('../src/auth.js');
    const res = missingAuthResponse();
    expect(res.status).toBe(401);
  });
});
