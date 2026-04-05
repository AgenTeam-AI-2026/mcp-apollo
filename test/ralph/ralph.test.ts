/**
 * RALPH integration tests — end-to-end through tool functions
 * using a fully mocked ApolloClient.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../../src/apollo-client.js';
import { extractBearerToken, unauthorizedResponse } from '../../src/auth.js';
import { searchPeople } from '../../src/tools/search-people.js';
import { enrichPerson } from '../../src/tools/enrich-person.js';
import { findEmail } from '../../src/tools/find-email.js';

const rl = (remaining: number) => ({ limit: 50, remaining, resetAt: null });

function makeClient(): ApolloClient {
  return {
    searchPeople: vi.fn(),
    enrichPerson: vi.fn(),
    searchCompanies: vi.fn(),
    enrichCompany: vi.fn(),
    getJobPostings: vi.fn(),
    findEmail: vi.fn(),
  } as unknown as ApolloClient;
}

beforeEach(() => vi.clearAllMocks());

describe('R — Rate limit (429)', () => {
  it('ApolloApiError carries remaining=0 on rate limit', async () => {
    const client = makeClient();
    (client.searchPeople as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApolloApiError('Rate limit exceeded', 429, rl(0)),
    );
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toMatchObject({
      statusCode: 429,
      rateLimitInfo: { remaining: 0 },
    });
  });

  it('rate limit info is included in the error', async () => {
    const client = makeClient();
    (client.searchPeople as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApolloApiError('Too many requests', 429, rl(3)),
    );
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toMatchObject({
      rateLimitInfo: { remaining: 3 },
    });
  });
});

describe('A — Auth', () => {
  it('extractBearerToken returns null for missing header', () => {
    expect(extractBearerToken(new Request('https://x.com'))).toBeNull();
  });

  it('extractBearerToken returns null for non-Bearer scheme', () => {
    expect(extractBearerToken(new Request('https://x.com', {
      headers: { Authorization: 'Basic abc' },
    }))).toBeNull();
  });

  it('extractBearerToken returns null for empty token', () => {
    expect(extractBearerToken(new Request('https://x.com', {
      headers: { Authorization: 'Bearer ' },
    }))).toBeNull();
  });

  it('extractBearerToken returns key for valid Bearer header', () => {
    expect(extractBearerToken(new Request('https://x.com', {
      headers: { Authorization: 'Bearer my-key-123' },
    }))).toBe('my-key-123');
  });

  it('unauthorizedResponse is 401', async () => {
    const res = unauthorizedResponse();
    expect(res.status).toBe(401);
    const body = await res.json() as { error: string };
    expect(typeof body.error).toBe('string');
  });

  it('401 from Apollo propagates as ApolloApiError', async () => {
    const client = makeClient();
    (client.enrichPerson as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApolloApiError('Invalid API key', 401, rl(50)),
    );
    await expect(enrichPerson(client, { email: 'x@y.com' })).rejects.toMatchObject({ statusCode: 401 });
  });
});

describe('L — Network failures', () => {
  it('propagates network errors from findEmail', async () => {
    const client = makeClient();
    (client.findEmail as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('fetch failed: getaddrinfo ENOTFOUND'),
    );
    await expect(findEmail(client, { person_id: 'p1' })).rejects.toThrow('fetch failed');
  });
});

describe('P — Payload edge cases', () => {
  it('returns empty results when people array is empty', async () => {
    const client = makeClient();
    (client.searchPeople as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl(40),
    });
    const result = JSON.parse(await searchPeople(client, { page: 1, per_page: 10 }));
    expect(result.results).toEqual([]);
  });

  it('500 from Apollo propagates as ApolloApiError', async () => {
    const client = makeClient();
    (client.searchPeople as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new ApolloApiError('Server error', 500, rl(45)),
    );
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toMatchObject({ statusCode: 500 });
  });
});

describe('H — Host unreachable', () => {
  it('wraps DNS error from searchPeople', async () => {
    const client = makeClient();
    (client.searchPeople as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('TypeError: getaddrinfo ENOTFOUND api.apollo.io'),
    );
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toThrow('getaddrinfo');
  });
});
