import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';
import type { ApolloPerson, ApolloPagination } from '../types.js';

export const searchPeopleSchema = z.object({
  person_titles: z.array(z.string()).optional().describe(
    'Job titles to match, e.g. ["VP Engineering", "CTO"]',
  ),
  person_seniorities: z.array(z.string()).optional().describe(
    'Seniority levels: "vp", "c_suite", "director", "manager", "senior", "entry"',
  ),
  organization_domains: z.array(z.string()).optional().describe(
    'Company domains to search within, e.g. ["stripe.com"]',
  ),
  person_locations: z.array(z.string()).optional().describe(
    'Locations, e.g. ["New York", "San Francisco, CA"]',
  ),
  organization_num_employees_ranges: z.array(z.string()).optional().describe(
    'Employee count ranges, e.g. ["51,200", "201,500"]',
  ),
  page: z.number().int().positive().default(1).describe('Page number (default 1)'),
  per_page: z.number().int().min(1).max(25).default(10).describe(
    'Results per page, max 25 (default 10)',
  ),
});

export type SearchPeopleInput = z.infer<typeof searchPeopleSchema>;

interface SearchPeopleResponse {
  people: ApolloPerson[];
  pagination: ApolloPagination;
}

export async function searchPeople(
  client: ApolloClient,
  input: SearchPeopleInput,
): Promise<string> {
  const { data, rateLimits } = await client.post<SearchPeopleResponse>(
    '/mixed_people/search',
    {
      person_titles: input.person_titles,
      person_seniorities: input.person_seniorities,
      q_organization_domains: input.organization_domains?.join('\n'),
      person_locations: input.person_locations,
      organization_num_employees_ranges: input.organization_num_employees_ranges,
      page: input.page,
      per_page: input.per_page,
    },
  );

  const people = data.people.map((p) => ({
    id: p.id,
    name: p.name,
    title: p.title,
    company: p.organization?.name ?? null,
    email: p.email,
    email_status: p.email_status,
    linkedin_url: p.linkedin_url,
    location: [p.city, p.state, p.country].filter(Boolean).join(', ') || null,
  }));

  return JSON.stringify({
    results: people,
    pagination: data.pagination,
    rate_limits: rateLimits,
  });
}
