import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';
import type { ApolloOrganization, ApolloPagination } from '../types.js';

export const searchCompaniesSchema = z.object({
  q_organization_keyword_tags: z.array(z.string()).optional().describe(
    'Keywords or industries, e.g. ["SaaS", "fintech", "HR software"]',
  ),
  organization_locations: z.array(z.string()).optional().describe(
    'HQ locations, e.g. ["New York", "United States"]',
  ),
  organization_num_employees_ranges: z.array(z.string()).optional().describe(
    'Employee ranges, e.g. ["51,200", "201,500"]',
  ),
  organization_funding_stages: z.array(z.string()).optional().describe(
    'Funding stages, e.g. ["Series A", "Series B", "Seed"]',
  ),
  page: z.number().int().positive().default(1),
  per_page: z.number().int().min(1).max(25).default(10),
});

export type SearchCompaniesInput = z.infer<typeof searchCompaniesSchema>;

interface SearchCompaniesResponse {
  organizations: ApolloOrganization[];
  pagination: ApolloPagination;
}

export async function searchCompanies(
  client: ApolloClient,
  input: SearchCompaniesInput,
): Promise<string> {
  const { data, rateLimits } =
    await client.post<SearchCompaniesResponse>(
      '/mixed_companies/search',
      {
        q_organization_keyword_tags: input.q_organization_keyword_tags,
        organization_locations: input.organization_locations,
        organization_num_employees_ranges:
          input.organization_num_employees_ranges,
        organization_funding_stages: input.organization_funding_stages,
        page: input.page,
        per_page: input.per_page,
      },
    );

  const companies = data.organizations.map((o) => ({
    id: o.id,
    name: o.name,
    domain: o.primary_domain,
    website: o.website_url,
    linkedin_url: o.linkedin_url,
    headcount: o.estimated_num_employees,
    industry: o.industry,
    funding_stage: o.latest_funding_stage,
    location:
      [o.city, o.country].filter(Boolean).join(', ') || null,
  }));

  return JSON.stringify({
    results: companies,
    pagination: data.pagination,
    rate_limits: rateLimits,
  });
}
