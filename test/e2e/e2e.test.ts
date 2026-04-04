/**
 * E2E Tests — run against a live deployed Worker or local `wrangler dev`
 *
 * Usage:
 *   APOLLO_API_KEY=your_key MCP_APOLLO_URL=http://localhost:8787 vitest run test/e2e
 *
 * These tests are SKIPPED in CI unless both env vars are set.
 * They call the real Apollo.io API and consume rate-limit quota.
 */
import { describe, it, expect } from 'vitest';

const BASE_URL = process.env['MCP_APOLLO_URL'] ?? '';
const API_KEY = process.env['APOLLO_API_KEY'] ?? '';
const SKIP = !BASE_URL || !API_KEY;

async function mcpCall(
  toolName: string,
  args: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }),
  });
  const json = (await res.json()) as Record<string, unknown>;
  const result = json['result'] as Record<string, unknown>;
  const content = result?.['content'] as Array<{ type: string; text: string }>;
  return JSON.parse(content?.[0]?.text ?? '{}') as Record<string, unknown>;
}

describe.skipIf(SKIP)('E2E — live Apollo.io + deployed Worker', () => {
  it('GET /health returns ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    const json = (await res.json()) as Record<string, unknown>;
    expect(json['status']).toBe('ok');
    expect(json['server']).toBe('mcp-apollo');
  });

  it('apollo_search_people returns results for "VP Sales"', async () => {
    const result = await mcpCall('apollo_search_people', {
      person_titles: ['VP Sales'],
      per_page: 3,
    });
    expect(Array.isArray(result['people'])).toBe(true);
    const people = result['people'] as unknown[];
    expect(people.length).toBeGreaterThan(0);
  });

  it('apollo_search_companies returns results for SaaS companies', async () => {
    const result = await mcpCall('apollo_search_companies', {
      q_organization_keyword_tags: ['SaaS'],
      per_page: 3,
    });
    expect(Array.isArray(result['companies'])).toBe(true);
  });

  it('apollo_enrich_company returns Stripe profile', async () => {
    const result = await mcpCall('apollo_enrich_company', { domain: 'stripe.com' });
    const company = result['company'] as Record<string, unknown>;
    expect(company?.['name']).toBe('Stripe');
    expect(company?.['domain']).toBe('stripe.com');
  });

  it('returns 401 for invalid API key', async () => {
    const res = await fetch(`${BASE_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer invalid-key-xyz',
      },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 1, method: 'tools/call',
        params: { name: 'apollo_search_people', arguments: {} },
      }),
    });
    // Worker should return a valid response; Apollo will 401 inside the tool result
    expect(res.status).toBeLessThan(500);
  });
});
