import { z } from 'zod';
import { searchPeople } from '../apollo-client.js';
import type { SearchPeopleInput } from '../types.js';

export const searchPeopleSchema = z.object({
  person_titles: z.array(z.string()).optional().describe('Job titles to match, e.g. ["VP Engineering", "CTO"]'),
  person_seniorities: z.array(z.string()).optional().describe('Seniority levels, e.g. ["vp", "c_suite", "director"]'),
  organization_domains: z.array(z.string()).optional().describe('Company domains to search within, e.g. ["stripe.com"]'),
  person_locations: z.array(z.string()).optional().describe('Locations, e.g. ["New York", "San Francisco"]'),
  organization_num_employees_ranges: z.array(z.string()).optional().describe('Employee ranges, e.g. ["51,200", "201,500"]'),
  page: z.number().int().min(1).default(1).optional().describe('Page number (default: 1)'),
  per_page: z.number().int().min(1).max(25).default(10).optional().describe('Results per page (default: 10, max: 25)'),
});

export type SearchPeopleParams = z.infer<typeof searchPeopleSchema>;

export async function handleSearchPeople(
  apiKey: string,
  params: SearchPeopleParams
): Promise<string> {
  const input: SearchPeopleInput = {
    person_titles: params.person_titles,
    person_seniorities: params.person_seniorities,
    organization_domains: params.organization_domains,
    person_locations: params.person_locations,
    organization_num_employees_ranges: params.organization_num_employees_ranges,
    page: params.page,
    per_page: params.per_page,
  };

  const result = await searchPeople(apiKey, input);

  if (result.error) {
    return JSON.stringify({
      error: result.error,
      status: result.status,
      ...(result.rateLimitRemaining !== undefined && {
        rate_limit_remaining: result.rateLimitRemaining,
      }),
    });
  }

  const people = result.data?.people ?? [];
  const pagination = result.data?.pagination;

  const formatted = people.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    email: p.email,
    email_status: p.email_status,
    linkedin_url: p.linkedin_url,
    location: [p.city, p.state, p.country].filter(Boolean).join(', ') || null,
    company: p.organization
      ? {
          name: p.organization.name,
          domain: p.organization.primary_domain,
          industry: p.organization.industry,
          headcount: p.organization.estimated_num_employees,
        }
      : null,
  }));

  return JSON.stringify({
    people: formatted,
    pagination,
    ...(result.rateLimitRemaining !== undefined && {
      rate_limit_remaining: result.rateLimitRemaining,
    }),
  });
}
