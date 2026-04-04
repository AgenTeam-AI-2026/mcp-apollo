import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { enrichCompany } from '../src/tools/enrich-company.js';
import { ApolloError } from '../src/types.js';

const mockPost = vi.fn();
vi.mock('../src/apollo-client.js', () => ({
  ApolloClient: vi.fn().mockImplementation(() => ({ post: mockPost })),
}));

const client = new ApolloClient('test-key');
const mockRateLimits = { limit: 50, remaining: 38, reset: 3600 };

const mockOrg = {
  id: 'org_002',
  name: 'Stripe',
  primary_domain: 'stripe.com',
  website_url: 'https://stripe.com',
  linkedin_url: 'https://linkedin.com/company/stripe',
  twitter_url: 'https://twitter.com/stripe',
  short_description: 'Payments infrastructure',
  industry: 'Fintech',
  estimated_num_employees: 8000,
  founded_year: 2010,
  total_funding: 2200000000,
  latest_funding_stage: 'Series I',
  latest_funding_round_date: '2023-03-15',
  technologies: ['AWS', 'Go', 'Ruby'],
  keywords: ['payments', 'fintech'],
  phone: null,
  city: 'San Francisco',
  country: 'United States',
};

beforeEach(() => vi.clearAllMocks());

describe('enrichCompany', () => {
  it('returns full company profile by domain', async () => {
    mockPost.mockResolvedValueOnce({ data: { organization: mockOrg }, rateLimits: mockRateLimits });

    const result = JSON.parse(await enrichCompany(client, { domain: 'stripe.com' }));

    expect(result.company).toMatchObject({
      name: 'Stripe',
      domain: 'stripe.com',
      headcount: 8000,
      technologies: ['AWS', 'Go', 'Ruby'],
    });
    expect(result.rate_limits.remaining).toBe(38);
  });

  it('calls API with domain when provided', async () => {
    mockPost.mockResolvedValueOnce({ data: { organization: mockOrg }, rateLimits: mockRateLimits });
    await enrichCompany(client, { domain: 'stripe.com' });
    expect(mockPost).toHaveBeenCalledWith('/organizations/enrich', expect.objectContaining({ domain: 'stripe.com' }));
  });

  it('calls API with name when domain not available', async () => {
    mockPost.mockResolvedValueOnce({ data: { organization: mockOrg }, rateLimits: mockRateLimits });
    await enrichCompany(client, { name: 'Stripe' });
    expect(mockPost).toHaveBeenCalledWith('/organizations/enrich', expect.objectContaining({ name: 'Stripe' }));
  });

  it('throws on 401 unauthorized', async () => {
    mockPost.mockRejectedValueOnce(new ApolloError('Unauthorized', 401, 'UNAUTHORIZED'));
    await expect(enrichCompany(client, { domain: 'test.com' })).rejects.toThrow('Unauthorized');
  });
});
