import { z } from 'zod';
import { ApolloClient } from '../apollo-client.js';

export const findEmailSchema = z.object({
  person_id: z.string().describe(
    'Apollo person ID — obtain from apollo_search_people results',
  ),
});

export type FindEmailInput = z.infer<typeof findEmailSchema>;

interface FindEmailResponse {
  person: {
    id: string;
    email: string | null;
    email_status: string | null;
    email_confidence: number | null;
  };
}

export async function findEmail(
  client: ApolloClient,
  input: FindEmailInput,
): Promise<string> {
  const { data, rateLimits } =
    await client.post<FindEmailResponse>(
      '/people/match',
      {
        id: input.person_id,
        reveal_personal_emails: false,
      },
    );

  return JSON.stringify({
    person_id: data.person.id,
    email: data.person.email,
    email_status: data.person.email_status,
    email_confidence: data.person.email_confidence,
    rate_limits: rateLimits,
  });
}
