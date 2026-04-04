import { z } from 'zod';
import { searchCompanies } from '../apollo-client.js';

export const searchCompaniesSchema = z.object({
  q_organization_keyword_tags: z.array(z.string()).optional().describe('Keywords or industries, e.g. ["SaaS", "fintech"]'),
  organization_locations: z.array(z.string()).optional().describe('HQ locations, e.g. ["New York", "London"]'),
  organization_num_employees_ranges: z.array(z.string()).optional().describe('Employee ranges, e.g. ["51,200", "201,500"]'),
  organization_funding_stages: z.array(z.string()).optional().describe('Funding stages, e.g. ["Series A", "Series B"]'),
  page: z.number().int().min(1).default(1).optional().describe('Page number (default: 1)'),
  per_page: z.number().int().min(1).max(25).default(10).optional().describe('Results per page (default: 10, max: 25)'),
});

export type SearchCompaniesParams = z.infer<typeof searchCompaniesSchema>;

export async function handleSearchCompanies(
  apiKey: string,
  params: SearchCompaniesParams
): Promise<string> {
  const result = await searchCompanies(apiKey, params);

  if (result.error) {
    return JSON.stringify({
      error: result.error,
      status: result.status,
      ...(result.rateLimitRemaining !== undefined && {
        rate_limit_remaining: result.rateLimitRemaining,
      }),
    });
  }

  const orgs = result.data?.organizations ?? [];
  const pagination = result.data?.pagination;

  const formatted = orgs.map((o) => ({
    id: o.id,
    name: o.name,
    domain: o.primary_domain,
    website: o.website_url,
    linkedin_url: o.linkedin_url,
    industry: o.industry,
    headcount: o.estimated_num_employees,
    funding_stage: o.funding_stage ?? o.latest_funding_stage,
    total_funding: o.total_funding,
    location: [o.city, o.state, o.country].filter(Boolean).join(', ') || null,
    description: o.short_description,
    founded_year: o.founded_year,
  }));

  return JSON.stringify({
    companies: formatted,
    pagination,
    ...(result.rateLimitRemaining !== undefined && {
      rate_limit_remaining: result.rateLimitRemaining,
    }),
  });
}
