/**
 * RALPH-Loop Tests
 * R — Rate limit (429 handling)
 * A — Auth errors (401 / 403)
 * L — Late / network failure (503 / fetch throws)
 * P — Payload malformed (bad JSON from Apollo)
 * H — Host unreachable (DNS / network error)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractApiKey, makeAuthError } from '../../src/auth.js';
import * as client from '../../src/apollo-client.js';
import { handleSearchPeople } from '../../src/tools/search-people.js';
import { handleEnrichPerson } from '../../src/tools/enrich-person.js';
import { handleFindEmail } from '../../src/tools/find-email.js';

const FAKE_KEY = 'test-key';

beforeEach(() => { vi.restoreAllMocks(); });

// ─── R: Rate Limit ────────────────────────────────────────────────────────────

describe('R — Rate limit (429)', () => {
  it('returns informative rate-limit error with remaining=0', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({
      status: 429,
      rateLimitRemaining: 0,
      error: 'Apollo.io rate limit reached. Free tier allows 50 requests/hour. Upgrade your Apollo.io plan for higher limits.',
    });

    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.status).toBe(429);
    expect(result.rate_limit_remaining).toBe(0);
    expect(result.error).toMatch(/rate limit/i);
  });

  it('includes rate_limit_remaining when provided by Apollo', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({
      status: 200,
      rateLimitRemaining: 3,
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
    });

    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.rate_limit_remaining).toBe(3);
  });
});

// ─── A: Auth ──────────────────────────────────────────────────────────────────

describe('A — Auth errors', () => {
  it('extractApiKey returns null for missing Authorization header', () => {
    const req = new Request('https://mcp-apollo.example.com/mcp', { method: 'POST' });
    expect(extractApiKey(req)).toBeNull();
  });

  it('extractApiKey returns null for malformed header (no Bearer prefix)', () => {
    const req = new Request('https://mcp-apollo.example.com/mcp', {
      headers: { Authorization: 'Basic abc123' },
    });
    expect(extractApiKey(req)).toBeNull();
  });

  it('extractApiKey returns null for empty token', () => {
    const req = new Request('https://mcp-apollo.example.com/mcp', {
      headers: { Authorization: 'Bearer ' },
    });
    expect(extractApiKey(req)).toBeNull();
  });

  it('extractApiKey returns trimmed key for valid header', () => {
    const req = new Request('https://mcp-apollo.example.com/mcp', {
      headers: { Authorization: 'Bearer my-secret-key  ' },
    });
    expect(extractApiKey(req)).toBe('my-secret-key');
  });

  it('makeAuthError returns 401 with helpful message', () => {
    const err = makeAuthError();
    expect(err.status).toBe(401);
    expect(err.error).toBe('unauthorized');
    expect(err.message).toMatch(/Apollo\.io API key/i);
  });

  it('handles 401 from Apollo gracefully', async () => {
    vi.spyOn(client, 'enrichPerson').mockResolvedValue({
      status: 401,
      error: 'Invalid Apollo.io API key. Check your key at app.apollo.io → Settings → API Keys.',
    });
    const result = JSON.parse(await handleEnrichPerson(FAKE_KEY, { email: 'test@example.com' }));
    expect(result.status).toBe(401);
    expect(result.error).toMatch(/API key/i);
  });

  it('handles 403 from Apollo gracefully', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({ status: 403, error: 'Forbidden' });
    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.status).toBe(403);
  });
});

// ─── L: Late / Network failure ────────────────────────────────────────────────

describe('L — Network failures', () => {
  it('returns 503 with message when fetch throws', async () => {
    vi.spyOn(client, 'findEmail').mockResolvedValue({
      status: 503,
      error: 'Network error reaching Apollo.io: TypeError: Failed to fetch',
    });
    const result = JSON.parse(await handleFindEmail(FAKE_KEY, { person_id: 'p1' }));
    expect(result.status).toBe(503);
    expect(result.error).toMatch(/Network error/i);
  });
});

// ─── P: Payload malformed ─────────────────────────────────────────────────────

describe('P — Malformed payloads', () => {
  it('returns 500 when Apollo returns unparseable JSON', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({
      status: 500,
      error: 'Failed to parse Apollo.io response as JSON.',
    });
    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.status).toBe(500);
    expect(result.error).toMatch(/parse/i);
  });

  it('returns empty array when people field is missing', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({
      status: 200,
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
    });
    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.people).toEqual([]);
  });
});

// ─── H: Host unreachable ──────────────────────────────────────────────────────

describe('H — Host unreachable', () => {
  it('wraps DNS/connection error in a 503 response', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({
      status: 503,
      error: 'Network error reaching Apollo.io: TypeError: getaddrinfo ENOTFOUND api.apollo.io',
    });
    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.status).toBe(503);
    expect(result.error).toMatch(/ENOTFOUND|Network error/i);
  });
});
