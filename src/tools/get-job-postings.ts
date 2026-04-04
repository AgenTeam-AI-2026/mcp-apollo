import { z } from 'zod';
import { getJobPostings } from '../apollo-client.js';

export const getJobPostingsSchema = z.object({
  organization_id: z.string().describe('Apollo organization ID (from apollo_enrich_company or apollo_search_companies)'),
  job_titles: z.array(z.string()).optional().describe('Filter by role titles, e.g. ["Software Engineer", "Head of Sales"]'),
  page: z.number().int().min(1).default(1).optional(),
  per_page: z.number().int().min(1).max(25).default(10).optional(),
});

export type GetJobPostingsParams = z.infer<typeof getJobPostingsSchema>;

export async function handleGetJobPostings(
  apiKey: string,
  params: GetJobPostingsParams
): Promise<string> {
  const result = await getJobPostings(apiKey, params);

  if (result.error) {
    return JSON.stringify({
      error: result.error,
      status: result.status,
      ...(result.rateLimitRemaining !== undefined && {
        rate_limit_remaining: result.rateLimitRemaining,
      }),
    });
  }

  const postings = result.data?.job_postings ?? [];
  const pagination = result.data?.pagination;

  const formatted = postings.map((j) => ({
    id: j.id,
    title: j.title,
    url: j.url,
    location: [j.city, j.state, j.country].filter(Boolean).join(', ') || null,
    posted_at: j.posted_at,
    last_seen_at: j.last_seen_at,
  }));

  return JSON.stringify({
    job_postings: formatted,
    total: pagination?.total_entries ?? formatted.length,
    pagination,
    ...(result.rateLimitRemaining !== undefined && {
      rate_limit_remaining: result.rateLimitRemaining,
    }),
  });
}
