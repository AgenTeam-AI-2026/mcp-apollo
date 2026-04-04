/**
 * Extracts and validates the Apollo.io API key from the MCP request.
 *
 * The key is expected as a Bearer token in the Authorization header:
 *   Authorization: Bearer <apollo_api_key>
 *
 * The server never stores this key — it is used only for the duration
 * of the request and passed directly to Apollo's API.
 */
export function extractApiKey(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth) return null;

  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0]?.toLowerCase() !== 'bearer') return null;

  const key = parts[1]?.trim();
  if (!key || key.length === 0) return null;

  return key;
}

export function missingAuthResponse(): Response {
  return new Response(
    JSON.stringify({
      error: 'Missing or invalid Authorization header.',
      hint: 'Pass your Apollo.io API key as: Authorization: Bearer <your_api_key>',
    }),
    {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    },
  );
}
