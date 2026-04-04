import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient } from '../src/apollo-client.js';
import { getJobPostings } from '../src/tools/get-job-postings.js';
import { ApolloError } from '../src/types.js';

const mockPost = vi.fn();
vi.mock('../src/apollo-client.js', () => ({
  ApolloClient: vi.fn().mockImplementation(() => ({ post: mockPost })),
}));

const client = new ApolloClient('test-key');
const mockRateLimits = { limit: 50, remaining: 35, reset: 3600 };

const mockPostings = [
  { id: 'job_001', title: 'Senior Software Engineer', locations_derived: ['Remote', 'New York'], posted_at: '2024-11-01', url: 'https://example.com/jobs/1' },
  { id: 'job_002', title: 'Head of Sales', locations_derived: ['San Francisco'], posted_at: '2024-11-05', url: 'https://example.com/jobs/2' },
];

beforeEach(() => vi.clearAllMocks());

describe('getJobPostings', () => {
  it('returns list of job postings for an org', async () => {
    mockPost.mockResolvedValueOnce({
      data: { job_postings: mockPostings },
      rateLimits: mockRateLimits,
    });

    const result = JSON.parse(
      await getJobPostings(client, { organization_id: 'org_001' }),
    );

    expect(result.job_postings).toHaveLength(2);
    expect(result.job_postings[0]).toMatchObject({
      id: 'job_001',
      title: 'Senior Software Engineer',
    });
    expect(result.total).toBe(2);
  });

  it('passes organization_id correctly', async () => {
    mockPost.mockResolvedValueOnce({ data: { job_postings: [] }, rateLimits: mockRateLimits });
    await getJobPostings(client, { organization_id: 'org_xyz' });
    expect(mockPost).toHaveBeenCalledWith('/organizations/job_postings', expect.objectContaining({
      organization_id: 'org_xyz',
    }));
  });

  it('handles empty postings list without throwing', async () => {
    mockPost.mockResolvedValueOnce({ data: { job_postings: [] }, rateLimits: mockRateLimits });
    const result = JSON.parse(await getJobPostings(client, { organization_id: 'org_empty' }));
    expect(result.job_postings).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('handles missing job_postings field (null/undefined) gracefully', async () => {
    mockPost.mockResolvedValueOnce({ data: { job_postings: null }, rateLimits: mockRateLimits });
    const result = JSON.parse(await getJobPostings(client, { organization_id: 'org_null' }));
    expect(result.job_postings).toEqual([]);
  });

  it('propagates errors correctly', async () => {
    mockPost.mockRejectedValueOnce(new ApolloError('Not found', 404, 'NOT_FOUND'));
    await expect(getJobPostings(client, { organization_id: 'bad_id' })).rejects.toThrow('Not found');
  });
});
