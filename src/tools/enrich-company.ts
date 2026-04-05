import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';

export const enrichCompanySchema = z.object({
  domain: z.string().optional().describe('Company domain, e.g. "stripe.com" — preferred identifier'),
  name: z.string().optional().describe('Company name — used if domain is not available'),
});

export type EnrichCompanyInput = z.infer<typeof enrichCompanySchema>;

export async function enrichCompany(
  client: ApolloClient,
  input: EnrichCompanyInput,
): Promise<string> {
  if (!input.domain && !input.name) {
    return JSON.stringify({ error: 'Provide at least a domain or a company name' });
  }

  const params: Record<string, string> = {};
  if (input.domain) params['domain'] = input.domain;
  if (input.name) params['name'] = input.name;

  const { data, rateLimitInfo } = await client.enrichCompany(params);
  const o = data.organization;

  return JSON.stringify({
    company: {
      id: o.id,
      name: o.name,
      domain: o.primary_domain,
      website: o.website_url,
      linkedin_url: o.linkedin_url,
      description: o.short_description,
      industry: o.industry,
      headcount: o.estimated_num_employees,
      founded_year: o.founded_year,
      total_funding: o.total_funding,
      funding_stage: o.latest_funding_stage,
      last_funding_date: o.latest_funding_round_date,
      technologies: o.technologies,
      keywords: o.keywords,
      location: [o.city, o.country].filter(Boolean).join(', ') || null,
    },
    rate_limits: rateLimitInfo,
  });
}
