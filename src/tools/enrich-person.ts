import { z } from 'zod';
import { enrichPerson } from '../apollo-client.js';

export const enrichPersonSchema = z.object({
  email: z.string().email().optional().describe('Email address — most reliable identifier'),
  first_name: z.string().optional().describe('First name (use with last_name + organization_name)'),
  last_name: z.string().optional().describe('Last name'),
  organization_name: z.string().optional().describe('Company name'),
  linkedin_url: z.string().url().optional().describe('LinkedIn profile URL'),
}).refine(
  (d) => d.email || d.linkedin_url || (d.first_name && d.last_name),
  { message: 'Provide at least: email, linkedin_url, or first_name + last_name' }
);

export type EnrichPersonParams = z.infer<typeof enrichPersonSchema>;

export async function handleEnrichPerson(
  apiKey: string,
  params: EnrichPersonParams
): Promise<string> {
  const result = await enrichPerson(apiKey, params);

  if (result.error) {
    return JSON.stringify({
      error: result.error,
      status: result.status,
      ...(result.rateLimitRemaining !== undefined && {
        rate_limit_remaining: result.rateLimitRemaining,
      }),
    });
  }

  const p = result.data?.person;
  if (!p) {
    return JSON.stringify({ error: 'Person not found in Apollo database.', status: 404 });
  }

  return JSON.stringify({
    person: {
      id: p.id,
      name: p.name,
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      email: p.email,
      email_status: p.email_status,
      phone_numbers: p.phone_numbers ?? [],
      linkedin_url: p.linkedin_url,
      location: [p.city, p.state, p.country].filter(Boolean).join(', ') || null,
      company: p.organization
        ? {
            id: p.organization.id,
            name: p.organization.name,
            domain: p.organization.primary_domain,
            industry: p.organization.industry,
            headcount: p.organization.estimated_num_employees,
            funding_stage: p.organization.funding_stage,
          }
        : null,
      employment_history: p.employment_history ?? [],
    },
    ...(result.rateLimitRemaining !== undefined && {
      rate_limit_remaining: result.rateLimitRemaining,
    }),
  });
}
