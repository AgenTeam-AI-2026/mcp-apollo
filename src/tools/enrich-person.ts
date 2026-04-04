import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';
import type { ApolloPerson } from '../types.js';

export const enrichPersonSchema = z
  .object({
    email: z.string().email().optional().describe(
      'Email address — most reliable identifier',
    ),
    first_name: z.string().optional().describe('First name'),
    last_name: z.string().optional().describe('Last name'),
    organization_name: z.string().optional().describe('Company name'),
    linkedin_url: z.string().url().optional().describe('LinkedIn profile URL'),
  })
  .refine(
    (d) =>
      d.email ||
      d.linkedin_url ||
      (d.first_name && d.last_name && d.organization_name),
    {
      message:
        'Provide at least: email, linkedin_url, OR first_name + last_name + organization_name',
    },
  );

export type EnrichPersonInput = z.infer<typeof enrichPersonSchema>;

interface EnrichPersonResponse {
  person: ApolloPerson;
}

export async function enrichPerson(
  client: ApolloClient,
  input: EnrichPersonInput,
): Promise<string> {
  const { data, rateLimits } =
    await client.post<EnrichPersonResponse>('/people/match', {
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
      headline: p.headline,
      email: p.email,
      email_status: p.email_status,
      phone_numbers: p.phone_numbers,
      linkedin_url: p.linkedin_url,
      twitter_url: p.twitter_url,
      photo_url: p.photo_url,
      location:
        [p.city, p.state, p.country].filter(Boolean).join(', ') || null,
      company: p.organization?.name ?? null,
      company_domain: p.organization?.primary_domain ?? null,
      employment_history: p.employment_history,
    },
    rate_limits: rateLimits,
  });
}
