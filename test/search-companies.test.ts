import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../src/apollo-client.js';
import { searchCompanies } from '../src/tools/search-companies.js';

const mockSearchCompanies = vi.fn();
const client = { searchCompanies: mockSearchCompanies } as unknown as ApolloClient;
const rl = { limit: 50, remaining: 40, resetAt: null };

const mockOrg = {
  id: 'o1', name: 'TechCo', primary_domain: 'techco.com', website_url: 'https://techco.com',
  linkedin_url: 'https://linkedin.com/company/techco', estimated_num_employees: 150,
  industry: 'Software', latest_funding_stage: 'Series B', city: 'Austin', country: 'US',
};

beforeEach(() => vi.clearAllMocks());

describe('searchCompanies', () => {
  it('returns formatted companies on success', async () => {
    mockSearchCompanies.mockResolvedValueOnce({
      data: { organizations: [mockOrg], pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await searchCompanies(client, { page: 1, per_page: 10 }));
    expect(result.results[0]).toMatchObject({ name: 'TechCo', domain: 'techco.com', headcount: 150 });
  });

  it('passes keyword and funding filters', async () => {
    mockSearchCompanies.mockResolvedValueOnce({
      data: { organizations: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    await searchCompanies(client, { q_organization_keyword_tags: ['SaaS'], organization_funding_stages: ['Series A'], page: 1, per_page: 10 });
    expect(mockSearchCompanies).toHaveBeenCalledWith(expect.objectContaining({
      q_organization_keyword_tags: ['SaaS'], organization_funding_stages: ['Series A'],
    }));
  });

  it('handles empty results gracefully', async () => {
    mockSearchCompanies.mockResolvedValueOnce({
      data: { organizations: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await searchCompanies(client, { page: 1, per_page: 10 }));
    expect(result.results).toEqual([]);
  });

  it('propagates ApolloApiError on rate limit', async () => {
    mockSearchCompanies.mockRejectedValueOnce(
      new ApolloApiError('Rate limited', 429, { limit: 50, remaining: 0, resetAt: null }),
    );
    await expect(searchCompanies(client, { page: 1, per_page: 10 })).rejects.toThrow('Rate limited');
  });
});
