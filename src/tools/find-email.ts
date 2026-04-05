import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';

export const findEmailSchema = z.object({
  person_id: z.string().describe(
    'Apollo person ID — from apollo_search_people results',
  ),
});

export type FindEmailInput = z.infer<typeof findEmailSchema>;

export async function findEmail(
  client: ApolloClient,
  input: FindEmailInput,
): Promise<string> {
  const { data, rateLimitInfo } = await client.findEmail(input.person_id);

  return JSON.stringify({
    person_id: data.person.id,
    email: data.person.email ?? null,
    email_status: data.person.email_status ?? null,
    rate_limits: rateLimitInfo,
  });
}
