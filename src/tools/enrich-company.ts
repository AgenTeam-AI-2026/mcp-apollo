import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';
import type { ApolloOrganization } from '../types.js';

export const enrichCompanySchema = z
  .object({
    domain: z.string().optional().describe(
      'Company domain, e.g. "stripe.com" — preferred identifier',
    ),
    name: z.string().optional().describe(
      'Company name — used if domain is not available',
    ),
  })
  .refine((d) => d.domain || d.name, {
    message: 'Provide at least a domain or a company name',
  });

export type EnrichCompanyInput = z.infer<typeof enrichCompanySchema>;

interface EnrichCompanyResponse {
  organization: ApolloOrganization;
}

export async function enrichCompany(
  client: ApolloClient,
  input: EnrichCompanyInput,
): Promise<string> {
  const { data, rateLimits } =
    await client.post<EnrichCompanyResponse>(
      '/organizations/enrich',
      {
        domain: input.domain,
        name: input.name,
      },
    );

  const o = data.organization;

  return JSON.stringify({
    company: {
      id: o.id,
      name: o.name,
      domain: o.primary_domain,
      website: o.website_url,
      linkedin_url: o.linkedin_url,
      twitter_url: o.twitter_url,
      description: o.short_description,
      industry: o.industry,
      headcount: o.estimated_num_employees,
      founded_year: o.founded_year,
      total_funding: o.total_funding,
      funding_stage: o.latest_funding_stage,
      last_funding_date: o.latest_funding_round_date,
      technologies: o.technologies,
      keywords: o.keywords,
      phone: o.phone,
      location:
        [o.city, o.country].filter(Boolean).join(', ') || null,
    },
    rate_limits: rateLimits,
  });
}
