import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { findEmail } from '../src/tools/find-email.js';
import { ApolloError } from '../src/types.js';

const mockPost = vi.fn();
vi.mock('../src/apollo-client.js', () => ({
  ApolloClient: vi.fn().mockImplementation(() => ({ post: mockPost })),
}));

const client = new ApolloClient('test-key');
const mockRateLimits = { limit: 50, remaining: 30, reset: 3600 };

beforeEach(() => vi.clearAllMocks());

describe('findEmail', () => {
  it('returns email and confidence for known person', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        person: {
          id: 'person_003',
          email: 'alice@company.com',
          email_status: 'verified',
          email_confidence: 92,
        },
      },
      rateLimits: mockRateLimits,
    });

    const result = JSON.parse(await findEmail(client, { person_id: 'person_003' }));

    expect(result.email).toBe('alice@company.com');
    expect(result.email_status).toBe('verified');
    expect(result.email_confidence).toBe(92);
    expect(result.person_id).toBe('person_003');
  });

  it('returns null email when email not available', async () => {
    mockPost.mockResolvedValueOnce({
      data: { person: { id: 'person_004', email: null, email_status: 'unavailable', email_confidence: null } },
      rateLimits: mockRateLimits,
    });

    const result = JSON.parse(await findEmail(client, { person_id: 'person_004' }));
    expect(result.email).toBeNull();
    expect(result.email_confidence).toBeNull();
  });

  it('passes person_id to Apollo correctly', async () => {
    mockPost.mockResolvedValueOnce({
      data: { person: { id: 'person_005', email: 'x@y.com', email_status: 'verified', email_confidence: 85 } },
      rateLimits: mockRateLimits,
    });
    await findEmail(client, { person_id: 'person_005' });
    expect(mockPost).toHaveBeenCalledWith('/people/match', expect.objectContaining({ id: 'person_005' }));
  });

  it('throws on rate limit', async () => {
    mockPost.mockRejectedValueOnce(new ApolloError('Rate limit exceeded', 429, 'RATE_LIMITED'));
    await expect(findEmail(client, { person_id: 'any' })).rejects.toThrow('Rate limit exceeded');
  });
});
