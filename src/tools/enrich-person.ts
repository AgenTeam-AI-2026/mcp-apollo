import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';

export const enrichPersonSchema = z.object({
  email: z.string().email().optional().describe('Email address — most reliable identifier'),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  organization_name: z.string().optional(),
  linkedin_url: z.string().url().optional().describe('LinkedIn profile URL'),
});

export type EnrichPersonInput = z.infer<typeof enrichPersonSchema>;

export async function enrichPerson(
  client: ApolloClient,
  input: EnrichPersonInput,
): Promise<string> {
  if (!input.email && !input.linkedin_url && !(input.first_name && input.last_name && input.organization_name)) {
    return JSON.stringify({
      error: 'Provide at least: email, linkedin_url, OR first_name + last_name + organization_name',
    });
  }

  const { data, rateLimitInfo } = await client.enrichPerson({
    email: input.email,
    first_name: input.first_name,
    last_name: input.last_name,
    organization_name: input.organization_name,
    linkedin_url: input.linkedin_url,
    reveal_personal_emails: false,
  });

  const p = data.person;

  return JSON.stringify({
    person: {
      id: p.id,
      name: p.name,
      first_name: p.first_name,
      last_name: p.last_name,
      title: p.title,
      email: p.email,
      email_status: p.email_status,
      phone_numbers: p.phone_numbers,
      linkedin_url: p.linkedin_url,
      location: [p.city, p.state, p.country].filter(Boolean).join(', ') || null,
      company: p.organization?.name ?? null,
      company_domain: p.organization?.primary_domain ?? null,
      employment_history: p.employment_history,
    },
    rate_limits: rateLimitInfo,
  });
}
