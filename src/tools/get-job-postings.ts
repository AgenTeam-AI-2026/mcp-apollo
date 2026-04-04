import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';
import type { ApolloJobPosting } from '../types.js';

export const getJobPostingsSchema = z.object({
  organization_id: z.string().describe(
    'Apollo organization ID — obtain from apollo_enrich_company or apollo_search_companies',
  ),
  job_titles: z.array(z.string()).optional().describe(
    'Filter by role keywords, e.g. ["engineer", "data", "sales"]',
  ),
});

export type GetJobPostingsInput = z.infer<typeof getJobPostingsSchema>;

interface GetJobPostingsResponse {
  job_postings: ApolloJobPosting[];
}

export async function getJobPostings(
  client: ApolloClient,
  input: GetJobPostingsInput,
): Promise<string> {
  const { data, rateLimits } =
    await client.post<GetJobPostingsResponse>(
      '/organizations/job_postings',
      {
        organization_id: input.organization_id,
        job_title_query: input.job_titles?.join(' OR '),
      },
    );

  const postings = (data.job_postings ?? []).map((j) => ({
    id: j.id,
    title: j.title,
    locations: j.locations_derived,
    posted_at: j.posted_at,
    url: j.url,
  }));

  return JSON.stringify({
    job_postings: postings,
    total: postings.length,
    rate_limits: rateLimits,
  });
}
