import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';

export const getJobPostingsSchema = z.object({
  organization_id: z.string().describe(
    'Apollo organization ID — from apollo_enrich_company or apollo_search_companies',
  ),
  job_titles: z.array(z.string()).optional().describe(
    'Filter by role keywords, e.g. ["engineer", "data", "sales"]',
  ),
});

export type GetJobPostingsInput = z.infer<typeof getJobPostingsSchema>;

export async function getJobPostings(
  client: ApolloClient,
  input: GetJobPostingsInput,
): Promise<string> {
  const { data, rateLimitInfo } = await client.getJobPostings(
    input.organization_id,
    input.job_titles,
  );

  const postings = (data.job_postings ?? []).map((j) => ({
    id: j.id,
    title: j.title,
    location: [j.city, j.state, j.country].filter(Boolean).join(', ') || null,
    posted_at: j.posted_at,
    url: j.url,
  }));

  return JSON.stringify({
    job_postings: postings,
    total: postings.length,
    rate_limits: rateLimitInfo,
  });
}
