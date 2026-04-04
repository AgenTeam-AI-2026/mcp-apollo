/**
 * E2E smoke tests — require a real APOLLO_API_KEY env var.
 * Skipped automatically when key is not set (CI-safe).
 *
 * Run locally:
 *   APOLLO_API_KEY=your_key npx vitest run test/e2e/smoke.test.ts
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { ApolloClient } from '../../src/apollo-client.js';
import { searchPeople } from '../../src/tools/search-people.js';
import { searchCompanies } from '../../src/tools/search-companies.js';
import { enrichCompany } from '../../src/tools/enrich-company.js';

const API_KEY = process.env['APOLLO_API_KEY'];
const skip = !API_KEY;

beforeAll(() => {
  if (skip) {
    console.log('\u23E9 E2E tests skipped — set APOLLO_API_KEY to run against the live Apollo API');
  }
});

describe.skipIf(skip)('E2E — Apollo live API smoke tests', () => {
  let client: ApolloClient;

  beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    client = new ApolloClient(API_KEY!);
  });

  it('searchPeople returns at least one result for broad query', async () => {
    const result = JSON.parse(
      await searchPeople(client, {
        person_titles: ['Software Engineer'],
        page: 1,
        per_page: 5,
      }),
    );
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results[0]).toHaveProperty('id');
    expect(result.results[0]).toHaveProperty('name');
  }, 15_000);

  it('searchCompanies returns results for SaaS keyword', async () => {
    const result = JSON.parse(
      await searchCompanies(client, {
        q_organization_keyword_tags: ['SaaS'],
        page: 1,
        per_page: 3,
      }),
    );
    expect(result.results.length).toBeGreaterThan(0);
  }, 15_000);

  it('enrichCompany returns profile for stripe.com', async () => {
    const result = JSON.parse(
      await enrichCompany(client, { domain: 'stripe.com' }),
    );
    expect(result.company.name).toMatch(/stripe/i);
    expect(result.company.domain).toBe('stripe.com');
  }, 15_000);
});
