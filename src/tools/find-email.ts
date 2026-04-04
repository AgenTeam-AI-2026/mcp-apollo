import { z } from 'zod';
import { findEmail } from '../apollo-client.js';

export const findEmailSchema = z.object({
  person_id: z.string().describe('Apollo person ID — obtained from apollo_search_people results'),
});

export type FindEmailParams = z.infer<typeof findEmailSchema>;

export async function handleFindEmail(
  apiKey: string,
  params: FindEmailParams
): Promise<string> {
  const result = await findEmail(apiKey, params);

  if (result.error) {
    return JSON.stringify({
      error: result.error,
      status: result.status,
      ...(result.rateLimitRemaining !== undefined && {
        rate_limit_remaining: result.rateLimitRemaining,
      }),
    });
  }

  const person = result.data?.person;
  if (!person) {
    return JSON.stringify({ error: 'Person not found.', status: 404 });
  }

  return JSON.stringify({
    person_id: person.id,
    email: person.email,
    email_status: person.email_status,
    found: !!person.email,
    ...(result.rateLimitRemaining !== undefined && {
      rate_limit_remaining: result.rateLimitRemaining,
    }),
  });
}
