/**
 * Bearer token extraction from the Authorization header.
 * Customers pass their own Apollo.io API key — we never store it.
 */
export function extractBearerToken(request: Request): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) return null;
  const spaceIdx = authHeader.indexOf(' ');
  if (spaceIdx === -1) return null;
  const scheme = authHeader.slice(0, spaceIdx).toLowerCase();
  const token = authHeader.slice(spaceIdx + 1).trim();
  if (scheme !== 'bearer' || !token) return null;
  return token;
}

export function unauthorizedResponse(hint?: string): Response {
  return new Response(
    JSON.stringify({
      error: 'Missing or invalid Authorization header.',
      hint: hint ?? 'Pass your Apollo.io API key as: Authorization: Bearer <your_api_key>',
    }),
    { status: 401, headers: { 'Content-Type': 'application/json' } },
  );
}
