/**
 * Unit tests — tool functions against a mock ApolloClient.
 * Each tool function receives a client instance and typed input.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApolloClient, ApolloApiError } from '../../src/apollo-client.js';
import { searchPeople } from '../../src/tools/search-people.js';
import { enrichPerson } from '../../src/tools/enrich-person.js';
import { searchCompanies } from '../../src/tools/search-companies.js';
import { enrichCompany } from '../../src/tools/enrich-company.js';
import { getJobPostings } from '../../src/tools/get-job-postings.js';
import { findEmail } from '../../src/tools/find-email.js';

const rl = { limit: 50, remaining: 40, resetAt: null };

function makeClient(overrides: Partial<Record<string, ReturnType<typeof vi.fn>>>): ApolloClient {
  return {
    searchPeople: vi.fn(),
    enrichPerson: vi.fn(),
    searchCompanies: vi.fn(),
    enrichCompany: vi.fn(),
    getJobPostings: vi.fn(),
    findEmail: vi.fn(),
    ...overrides,
  } as unknown as ApolloClient;
}

beforeEach(() => vi.clearAllMocks());

describe('searchPeople — tool', () => {
  it('returns results array', async () => {
    const client = makeClient({
      searchPeople: vi.fn().mockResolvedValueOnce({
        data: {
          people: [{ id: 'p1', name: 'A B', first_name: 'A', last_name: 'B', title: 'CTO',
            email: 'a@b.com', email_status: 'verified', linkedin_url: null,
            city: null, state: null, country: null, organization: null }],
          pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
        },
        rateLimitInfo: rl,
      }),
    });
    const out = JSON.parse(await searchPeople(client, { page: 1, per_page: 10 }));
    expect(out.results).toHaveLength(1);
    expect(out.results[0].id).toBe('p1');
  });

  it('throws ApolloApiError on failure', async () => {
    const client = makeClient({
      searchPeople: vi.fn().mockRejectedValueOnce(
        new ApolloApiError('fail', 500, { limit: null, remaining: null, resetAt: null }),
      ),
    });
    await expect(searchPeople(client, { page: 1, per_page: 10 })).rejects.toBeInstanceOf(ApolloApiError);
  });
});

describe('enrichPerson — tool', () => {
  it('returns person profile', async () => {
    const person = { id: 'p2', name: 'X Y', first_name: 'X', last_name: 'Y', title: 'VP',
      email: 'x@y.com', email_status: 'verified', phone_numbers: [], linkedin_url: null,
      city: null, state: null, country: null, organization: null, employment_history: [] };
    const client = makeClient({
      enrichPerson: vi.fn().mockResolvedValueOnce({ data: { person }, rateLimitInfo: rl }),
    });
    const out = JSON.parse(await enrichPerson(client, { email: 'x@y.com' }));
    expect(out.person.id).toBe('p2');
  });

  it('returns error when no identifier provided', async () => {
    const client = makeClient({});
    const out = JSON.parse(await enrichPerson(client, {}));
    expect(out.error).toBeTruthy();
  });
});

describe('searchCompanies — tool', () => {
  it('returns company results', async () => {
    const org = { id: 'o1', name: 'Co', primary_domain: 'co.com', website_url: null,
      linkedin_url: null, estimated_num_employees: 50, industry: 'SaaS',
      latest_funding_stage: 'Seed', city: 'NY', country: 'US' };
    const client = makeClient({
      searchCompanies: vi.fn().mockResolvedValueOnce({
        data: { organizations: [org], pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 } },
        rateLimitInfo: rl,
      }),
    });
    const out = JSON.parse(await searchCompanies(client, { page: 1, per_page: 10 }));
    expect(out.results[0].name).toBe('Co');
  });
});

describe('enrichCompany — tool', () => {
  it('returns company profile', async () => {
    const org = { id: 'o2', name: 'Stripe', primary_domain: 'stripe.com',
      website_url: null, linkedin_url: null, estimated_num_employees: 8000,
      industry: 'Fintech', latest_funding_stage: 'Series I',
      latest_funding_round_date: null, technologies: [], keywords: [],
      short_description: null, founded_year: 2010, total_funding: null,
      city: 'SF', country: 'US' };
    const client = makeClient({
      enrichCompany: vi.fn().mockResolvedValueOnce({ data: { organization: org }, rateLimitInfo: rl }),
    });
    const out = JSON.parse(await enrichCompany(client, { domain: 'stripe.com' }));
    expect(out.company.name).toBe('Stripe');
  });

  it('returns error when no domain or name', async () => {
    const client = makeClient({});
    const out = JSON.parse(await enrichCompany(client, {}));
    expect(out.error).toBeTruthy();
  });
});

describe('getJobPostings — tool', () => {
  it('returns job postings', async () => {
    const client = makeClient({
      getJobPostings: vi.fn().mockResolvedValueOnce({
        data: {
          job_postings: [{ id: 'j1', title: 'Engineer', city: null, state: null, country: 'US', posted_at: null, url: null }],
          pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
        },
        rateLimitInfo: rl,
      }),
    });
    const out = JSON.parse(await getJobPostings(client, { organization_id: 'org1' }));
    expect(out.job_postings).toHaveLength(1);
    expect(out.total).toBe(1);
  });
});

describe('findEmail — tool', () => {
  it('returns email when found', async () => {
    const client = makeClient({
      findEmail: vi.fn().mockResolvedValueOnce({
        data: { person: { id: 'p3', email: 'j@co.com', email_status: 'verified' } },
        rateLimitInfo: rl,
      }),
    });
    const out = JSON.parse(await findEmail(client, { person_id: 'p3' }));
    expect(out.email).toBe('j@co.com');
  });

  it('returns null when email not found', async () => {
    const client = makeClient({
      findEmail: vi.fn().mockResolvedValueOnce({
        data: { person: { id: 'p4', email: undefined, email_status: null } },
        rateLimitInfo: rl,
      }),
    });
    const out = JSON.parse(await findEmail(client, { person_id: 'p4' }));
    expect(out.email).toBeNull();
  });
});
