import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../src/apollo-client.js';
import { getJobPostings } from '../src/tools/get-job-postings.js';

const mockGetJobPostings = vi.fn();
const client = { getJobPostings: mockGetJobPostings } as unknown as ApolloClient;
const rl = { limit: 50, remaining: 35, resetAt: null };

const mockPostings = [
  { id: 'j1', title: 'Senior Engineer', city: 'Remote', state: null, country: 'US', posted_at: '2024-11-01', url: 'https://example.com/1' },
  { id: 'j2', title: 'Head of Sales', city: 'SF', state: 'CA', country: 'US', posted_at: '2024-11-05', url: 'https://example.com/2' },
];

beforeEach(() => vi.clearAllMocks());

describe('getJobPostings', () => {
  it('returns job postings for an org', async () => {
    mockGetJobPostings.mockResolvedValueOnce({
      data: { job_postings: mockPostings, pagination: { page: 1, per_page: 10, total_entries: 2, total_pages: 1 } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await getJobPostings(client, { organization_id: 'org_001' }));
    expect(result.job_postings).toHaveLength(2);
    expect(result.job_postings[0]).toMatchObject({ id: 'j1', title: 'Senior Engineer' });
    expect(result.total).toBe(2);
  });

  it('passes organization_id to client', async () => {
    mockGetJobPostings.mockResolvedValueOnce({
      data: { job_postings: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    await getJobPostings(client, { organization_id: 'org_xyz' });
    expect(mockGetJobPostings).toHaveBeenCalledWith('org_xyz', undefined);
  });

  it('handles empty postings list', async () => {
    mockGetJobPostings.mockResolvedValueOnce({
      data: { job_postings: [], pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await getJobPostings(client, { organization_id: 'org_empty' }));
    expect(result.job_postings).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('handles null job_postings field gracefully', async () => {
    mockGetJobPostings.mockResolvedValueOnce({
      data: { job_postings: null, pagination: { page: 1, per_page: 10, total_entries: 0, total_pages: 0 } },
      rateLimitInfo: rl,
    });
    const result = JSON.parse(await getJobPostings(client, { organization_id: 'org_null' }));
    expect(result.job_postings).toEqual([]);
  });

  it('propagates ApolloApiError', async () => {
    mockGetJobPostings.mockRejectedValueOnce(
      new ApolloApiError('Not found', 404, { limit: null, remaining: null, resetAt: null }),
    );
    await expect(getJobPostings(client, { organization_id: 'bad' })).rejects.toThrow('Not found');
  });
});
