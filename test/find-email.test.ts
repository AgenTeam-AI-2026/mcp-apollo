import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../src/apollo-client.js';
import { findEmail } from '../src/tools/find-email.js';

const mockFindEmail = vi.fn();
const client = { findEmail: mockFindEmail } as unknown as ApolloClient;
const rl = { limit: 50, remaining: 30, resetAt: null };

beforeEach(() => vi.clearAllMocks());

describe('findEmail', () => {
  it('returns email and status for known person', async () => {
    mockFindEmail.mockResolvedValueOnce({
      data: { person: { id: 'p3', email: 'alice@co.com', email_status: 'verified' } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await findEmail(client, { person_id: 'p3' }));
    expect(result.email).toBe('alice@co.com');
    expect(result.email_status).toBe('verified');
    expect(result.person_id).toBe('p3');
  });

  it('returns null email when not available', async () => {
    mockFindEmail.mockResolvedValueOnce({
      data: { person: { id: 'p4', email: undefined, email_status: 'unavailable' } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await findEmail(client, { person_id: 'p4' }));
    expect(result.email).toBeNull();
  });

  it('passes person_id to client', async () => {
    mockFindEmail.mockResolvedValueOnce({
      data: { person: { id: 'p5', email: 'x@y.com', email_status: 'verified' } },
      rateLimitInfo: rl,
    });
    await findEmail(client, { person_id: 'p5' });
    expect(mockFindEmail).toHaveBeenCalledWith('p5');
  });

  it('propagates ApolloApiError on rate limit', async () => {
    mockFindEmail.mockRejectedValueOnce(
      new ApolloApiError('Rate limited', 429, { limit: 50, remaining: 0, resetAt: null }),
    );
    await expect(findEmail(client, { person_id: 'any' })).rejects.toThrow('Rate limited');
  });
});
