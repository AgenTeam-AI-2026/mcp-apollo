import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { searchCompanies } from '../src/tools/search-companies.js';
import { ApolloError } from '../src/types.js';

const mockPost = vi.fn();
vi.mock('../src/apollo-client.js', () => ({
  ApolloClient: vi.fn().mockImplementation(() => ({ post: mockPost })),
}));

const client = new ApolloClient('test-key');
const mockRateLimits = { limit: 50, remaining: 40, reset: 3600 };

const mockOrg = {
  id: 'org_001',
  name: 'TechCo',
  primary_domain: 'techco.com',
  website_url: 'https://techco.com',
  linkedin_url: 'https://linkedin.com/company/techco',
  estimated_num_employees: 150,
  industry: 'Software',
  latest_funding_stage: 'Series B',
  city: 'Austin',
  country: 'United States',
};

beforeEach(() => vi.clearAllMocks());

describe('searchCompanies', () => {
  it('returns formatted companies on success', async () => {
    mockPost.mockResolvedValueOnce({
      data: {
        organizations: [mockOrg],
        pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
      },
      rateLimits: mockRateLimits,
    });

    const result = JSON.parse(
      await searchCompanies(client, { page: 1, per_page: 10 }),
    );

    expect(result.results[0]).toMatchObject({
      name: 'TechCo',
      domain: 'techco.com',
      headcount: 150,
      funding_stage: 'Series B',
    });
  });

  it('passes keyword and funding filters', async () => {
    mockPost.mockResolvedValueOnce({
      data: { organizations: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimits: mockRateLimits,
    });

    await searchCompanies(client, {
      q_organization_keyword_tags: ['SaaS', 'HR'],
      organization_funding_stages: ['Series A'],
      page: 1,
      per_page: 10,
    });

    expect(mockPost).toHaveBeenCalledWith('/mixed_companies/search', expect.objectContaining({
      q_organization_keyword_tags: ['SaaS', 'HR'],
      organization_funding_stages: ['Series A'],
    }));
  });

  it('handles empty results gracefully', async () => {
    mockPost.mockResolvedValueOnce({
      data: { organizations: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimits: mockRateLimits,
    });
    const result = JSON.parse(await searchCompanies(client, { page: 1, per_page: 10 }));
    expect(result.results).toEqual([]);
  });

  it('propagates rate limit error', async () => {
    mockPost.mockRejectedValueOnce(new ApolloError('Rate limit exceeded', 429, 'RATE_LIMITED'));
    await expect(searchCompanies(client, { page: 1, per_page: 10 })).rejects.toThrow('Rate limit exceeded');
  });
});
