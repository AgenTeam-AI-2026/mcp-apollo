import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as client from '../../src/apollo-client.js';
import { handleSearchPeople } from '../../src/tools/search-people.js';
import { handleEnrichPerson } from '../../src/tools/enrich-person.js';
import { handleSearchCompanies } from '../../src/tools/search-companies.js';
import { handleEnrichCompany } from '../../src/tools/enrich-company.js';
import { handleGetJobPostings } from '../../src/tools/get-job-postings.js';
import { handleFindEmail } from '../../src/tools/find-email.js';

const FAKE_KEY = 'test-api-key';

beforeEach(() => { vi.restoreAllMocks(); });

// ─── apollo_search_people ─────────────────────────────────────────────────────

describe('handleSearchPeople', () => {
  it('returns formatted people on success', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({
      status: 200,
      rateLimitRemaining: 45,
      data: {
        people: [{
          id: 'p1', name: 'Jane Doe', title: 'VP Sales', email: 'jane@acme.com',
          email_status: 'verified', linkedin_url: 'https://linkedin.com/in/janedoe',
          first_name: 'Jane', last_name: 'Doe', city: 'New York', state: 'NY',
          country: 'US', phone_numbers: null, employment_history: null,
          organization: { id: 'o1', name: 'Acme', primary_domain: 'acme.com',
            website_url: null, linkedin_url: null, industry: 'SaaS',
            estimated_num_employees: 200, city: null, state: null, country: null,
            founded_year: null, short_description: null, funding_stage: 'Series B',
            total_funding: null, latest_funding_stage: null,
            latest_funding_round_date: null, logo_url: null, technologies: [] },
        }],
        pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
      },
    });

    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, { person_titles: ['VP Sales'] }));
    expect(result.people).toHaveLength(1);
    expect(result.people[0].name).toBe('Jane Doe');
    expect(result.people[0].email).toBe('jane@acme.com');
    expect(result.rate_limit_remaining).toBe(45);
  });

  it('returns error on API failure', async () => {
    vi.spyOn(client, 'searchPeople').mockResolvedValue({ status: 500, error: 'Internal error' });
    const result = JSON.parse(await handleSearchPeople(FAKE_KEY, {}));
    expect(result.error).toBe('Internal error');
    expect(result.status).toBe(500);
  });
});

// ─── apollo_enrich_person ─────────────────────────────────────────────────────

describe('handleEnrichPerson', () => {
  it('returns full person profile', async () => {
    vi.spyOn(client, 'enrichPerson').mockResolvedValue({
      status: 200,
      data: {
        person: {
          id: 'p2', name: 'Bob Smith', first_name: 'Bob', last_name: 'Smith',
          title: 'CTO', email: 'bob@startup.io', email_status: 'verified',
          linkedin_url: null, city: 'Austin', state: 'TX', country: 'US',
          phone_numbers: [{ raw_number: '+15551234567', type: 'mobile' }],
          organization: null, employment_history: [],
        },
      },
    });

    const result = JSON.parse(await handleEnrichPerson(FAKE_KEY, { email: 'bob@startup.io' }));
    expect(result.person.name).toBe('Bob Smith');
    expect(result.person.phone_numbers).toHaveLength(1);
  });

  it('returns 404 if person not found', async () => {
    vi.spyOn(client, 'enrichPerson').mockResolvedValue({ status: 200, data: undefined });
    const result = JSON.parse(await handleEnrichPerson(FAKE_KEY, { email: 'nobody@x.com' }));
    expect(result.status).toBe(404);
  });
});

// ─── apollo_search_companies ──────────────────────────────────────────────────

describe('handleSearchCompanies', () => {
  it('returns formatted companies', async () => {
    vi.spyOn(client, 'searchCompanies').mockResolvedValue({
      status: 200,
      data: {
        organizations: [{
          id: 'o1', name: 'Stripe', primary_domain: 'stripe.com',
          website_url: 'https://stripe.com', linkedin_url: null,
          industry: 'Fintech', estimated_num_employees: 8000,
          city: 'San Francisco', state: 'CA', country: 'US',
          founded_year: 2010, short_description: 'Payments',
          funding_stage: 'Public', total_funding: 2000000000,
          latest_funding_stage: 'Series H', latest_funding_round_date: '2021-03-01',
          logo_url: null, technologies: ['AWS', 'React'],
        }],
        pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
      },
    });

    const result = JSON.parse(await handleSearchCompanies(FAKE_KEY, { q_organization_keyword_tags: ['fintech'] }));
    expect(result.companies[0].name).toBe('Stripe');
    expect(result.companies[0].domain).toBe('stripe.com');
  });
});

// ─── apollo_enrich_company ────────────────────────────────────────────────────

describe('handleEnrichCompany', () => {
  it('returns full company profile including technologies', async () => {
    vi.spyOn(client, 'enrichCompany').mockResolvedValue({
      status: 200,
      data: {
        organization: {
          id: 'o2', name: 'Vercel', primary_domain: 'vercel.com',
          website_url: 'https://vercel.com', linkedin_url: null,
          industry: 'Developer Tools', estimated_num_employees: 500,
          city: 'San Francisco', state: 'CA', country: 'US',
          founded_year: 2015, short_description: 'Frontend cloud',
          funding_stage: 'Series D', total_funding: 313000000,
          latest_funding_stage: 'Series D', latest_funding_round_date: '2022-05-23',
          logo_url: null, technologies: ['Next.js', 'Turborepo'],
        },
      },
    });

    const result = JSON.parse(await handleEnrichCompany(FAKE_KEY, { domain: 'vercel.com' }));
    expect(result.company.name).toBe('Vercel');
    expect(result.company.technologies).toContain('Next.js');
  });
});

// ─── apollo_get_job_postings ──────────────────────────────────────────────────

describe('handleGetJobPostings', () => {
  it('returns job postings with pagination', async () => {
    vi.spyOn(client, 'getJobPostings').mockResolvedValue({
      status: 200,
      data: {
        job_postings: [{
          id: 'j1', title: 'Account Executive', url: 'https://jobs.example.com/ae',
          city: 'Remote', state: null, country: 'US',
          posted_at: '2025-03-15', last_seen_at: '2025-04-01',
        }],
        pagination: { page: 1, per_page: 10, total_entries: 1, total_pages: 1 },
      },
    });

    const result = JSON.parse(await handleGetJobPostings(FAKE_KEY, { organization_id: 'o1' }));
    expect(result.job_postings[0].title).toBe('Account Executive');
    expect(result.total).toBe(1);
  });
});

// ─── apollo_find_email ────────────────────────────────────────────────────────

describe('handleFindEmail', () => {
  it('returns email when found', async () => {
    vi.spyOn(client, 'findEmail').mockResolvedValue({
      status: 200,
      data: { person: { id: 'p1', email: 'jane@acme.com', email_status: 'verified' } },
    });

    const result = JSON.parse(await handleFindEmail(FAKE_KEY, { person_id: 'p1' }));
    expect(result.email).toBe('jane@acme.com');
    expect(result.found).toBe(true);
  });

  it('returns found: false when email is null', async () => {
    vi.spyOn(client, 'findEmail').mockResolvedValue({
      status: 200,
      data: { person: { id: 'p2', email: null, email_status: null } },
    });

    const result = JSON.parse(await handleFindEmail(FAKE_KEY, { person_id: 'p2' }));
    expect(result.found).toBe(false);
    expect(result.email).toBeNull();
  });
});
