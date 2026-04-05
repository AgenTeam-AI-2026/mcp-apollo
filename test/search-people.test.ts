import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../src/apollo-client.js';
import { searchPeople } from '../src/tools/search-people.js';

const mockSearchPeople = vi.fn();
const client = { searchPeople: mockSearchPeople } as unknown as ApolloClient;
const rl = { limit: 50, remaining: 45, resetAt: null };

beforeEach(() => vi.clearAllMocks());

describe('searchPeople', () => {
  it('returns formatted people array on success', async () => {
    mockSearchPeople.mockResolvedValueOnce({
      data: {
        people: [{
          id: 'p1', name: 'Jane Doe', first_name: 'Jane', last_name: 'Doe',
          title: 'VP Eng', email: 'jane@acme.com', email_status: 'verified',
          linkedin_url: 'https://linkedin.com/in/jane',
          city: 'New York', state: 'NY', country: 'US',
          organization: { id: 'o1', name: 'Acme', primary_domain: 'acme.com' },
        }],
        pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
      },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await searchPeople(client, { page: 1, per_page: 10 }));
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toMatchObject({ id: 'p1', name: 'Jane Doe', email: 'jane@acme.com' });
    expect(result.rate_limits.remaining).toBe(45);
  });

  it('passes title and seniority filters', async () => {
    mockSearchPeople.mockResolvedValueOnce({
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    await searchPeople(client, { person_titles: ['CTO'], person_seniorities: ['c_suite'], page: 1, per_page: 10 });
    expect(mockSearchPeople).toHaveBeenCalledWith(expect.objectContaining({
      person_titles: ['CTO'], person_seniorities: ['c_suite'],
    }));
  });

  it('returns empty results without throwing', async () => {
    mockSearchPeople.mockResolvedValueOnce({
      data: { people: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await searchPeople(client, { page: 1, per_page: 10 }));
    expect(result.results).toEqual([]);
  });

  it('propagates ApolloApiError on rate limit', async () => {
    mockSearchPeople.mockRejectedValueOnce(
      new ApolloApiError('Rate limited', 429, { limit: 50, remaining: 0, resetAt: null }),
    );
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toThrow('Rate limited');
  });
});
