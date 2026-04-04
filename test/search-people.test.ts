import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { searchPeople } from '../src/tools/search-people.js';

const mockPost = vi.fn();
vi.mock('../src/apollo-client.js', () => ({
  ApolloClient: vi.fn().mockImplementation(() => ({ post: mockPost })),
}));

const client = new ApolloClient('test-key');

const mockPerson = {
  id: 'person_001',
  name: 'Jane Doe',
  title: 'VP Engineering',
  email: 'jane@acme.com',
  email_status: 'verified',
  linkedin_url: 'https://linkedin.com/in/janedoe',
  city: 'New York',
  state: 'NY',
  country: 'United States',
  organization: { name: 'Acme Corp', primary_domain: 'acme.com' },
};

const mockRateLimits = { limit: 50, remaining: 45, reset: 3600 };

beforeEach(() => vi.clearAllMocks());

describe('searchPeople', () => {
  it('returns formatted people array on success', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        people: [mockPerson],
        pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
      },
      rateLimits: mockRateLimits,
    });

    const result = JSON.parse(
      await searchPeople(client, { page: 1, per_page: 10 }),
    );

    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({
      id: 'person_001',
      name: 'Jane Doe',
      title: 'VP Engineering',
      email: 'jane@acme.com',
      linkedin_url: 'https://linkedin.com/in/janedoe',
    });
    expect(result.pagination.total_entries).toBe(1);
    expect(result.rate_limits.remaining).toBe(45);
  });

  it('passes title and seniority filters to Apollo', async () => {
    mockPost.mockResolvedValueOnce({
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimits: mockRateLimits,
    });

    await searchPeople(client, {
      person_titles: ['CTO', 'VP Engineering'],
      person_seniorities: ['c_suite', 'vp'],
      page: 1,
      per_page: 10,
    });

    expect(mockPost).toHaveBeenCalledWith('/mixed_people/search', expect.objectContaining({
      person_titles: ['CTO', 'VP Engineering'],
      person_seniorities: ['c_suite', 'vp'],
    }));
  });

  it('returns empty results without throwing when no people found', async () => {
    mockPost.mockResolvedValueOnce({
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimits: mockRateLimits,
    });

    const result = JSON.parse(await searchPeople(client, { page: 1, per_page: 10 }));
    expect(result.results).toEqual([]);
    expect(result.pagination.total_entries).toBe(0);
  });

  it('propagates ApolloError on rate limit', async () => {
    const { ApolloError } = await import('../src/types.js');
    mockPost.mockRejectedValueOnce(new ApolloError('Rate limit exceeded', 429, 'RATE_LIMITED'));
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toThrow('Rate limit exceeded');
  });
});
