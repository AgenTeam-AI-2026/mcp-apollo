import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../src/apollo-client.js';
import { enrichCompany } from '../src/tools/enrich-company.js';

const mockEnrichCompany = vi.fn();
const client = { enrichCompany: mockEnrichCompany } as unknown as ApolloClient;
const rl = { limit: 50, remaining: 38, resetAt: null };

const mockOrg = {
  id: 'o2', name: 'Stripe', primary_domain: 'stripe.com', website_url: 'https://stripe.com',
  linkedin_url: 'https://linkedin.com/company/stripe', short_description: 'Payments',
  industry: 'Fintech', estimated_num_employees: 8000, founded_year: 2010,
  total_funding: 2200000000, latest_funding_stage: 'Series I',
  latest_funding_round_date: '2023-03-15', technologies: ['AWS', 'Go'],
  keywords: ['payments'], city: 'SF', country: 'US',
};

beforeEach(() => vi.clearAllMocks());

describe('enrichCompany', () => {
  it('returns full company profile by domain', async () => {
    mockEnrichCompany.mockResolvedValueOnce({ data: { organization: mockOrg }, rateLimitInfo: rl });
    const result = JSON.parse(await enrichCompany(client, { domain: 'stripe.com' }));
    expect(result.company).toMatchObject({ name: 'Stripe', domain: 'stripe.com', headcount: 8000 });
    expect(result.rate_limits.remaining).toBe(38);
  });

  it('calls enrichCompany with domain', async () => {
    mockEnrichCompany.mockResolvedValueOnce({ data: { organization: mockOrg }, rateLimitInfo: rl });
    await enrichCompany(client, { domain: 'stripe.com' });
    expect(mockEnrichCompany).toHaveBeenCalledWith(expect.objectContaining({ domain: 'stripe.com' }));
  });

  it('calls enrichCompany with name when no domain', async () => {
    mockEnrichCompany.mockResolvedValueOnce({ data: { organization: mockOrg }, rateLimitInfo: rl });
    await enrichCompany(client, { name: 'Stripe' });
    expect(mockEnrichCompany).toHaveBeenCalledWith(expect.objectContaining({ name: 'Stripe' }));
  });

  it('returns error when neither domain nor name provided', async () => {
    const result = JSON.parse(await enrichCompany(client, {}));
    expect(result.error).toBeTruthy();
    expect(mockEnrichCompany).not.toHaveBeenCalled();
  });

  it('propagates ApolloApiError on 401', async () => {
    mockEnrichCompany.mockRejectedValueOnce(
      new ApolloApiError('Unauthorized', 401, { limit: null, remaining: null, resetAt: null }),
    );
    await expect(enrichCompany(client, { domain: 'test.com' })).rejects.toThrow('Unauthorized');
  });
});
