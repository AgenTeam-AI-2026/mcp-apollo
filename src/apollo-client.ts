import type {
  ApolloSearchPeopleResponse,
  ApolloSearchCompaniesResponse,
  ApolloEnrichPersonResponse,
  ApolloEnrichCompanyResponse,
  ApolloJobPostingsResponse,
  ApolloFindEmailResponse,
  SearchPeopleInput,
  EnrichPersonInput,
  SearchCompaniesInput,
  EnrichCompanyInput,
  GetJobPostingsInput,
  FindEmailInput,
} from './types.js';

const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';

export interface ApolloClientResult<T> {
  data?: T;
  error?: string;
  status: number;
  rateLimitRemaining?: number;
}

async function apolloRequest<T>(
  apiKey: string,
  method: 'GET' | 'POST',
  path: string,
  body?: Record<string, unknown>
): Promise<ApolloClientResult<T>> {
  const url = `${APOLLO_BASE_URL}${path}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'x-api-key': apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    return {
      status: 503,
      error: `Network error reaching Apollo.io: ${String(err)}`,
    };
  }

  const rateLimitRemaining = parseRateLimit(response.headers.get('x-rate-limit-remaining'));

  if (response.status === 429) {
    return {
      status: 429,
      rateLimitRemaining: 0,
      error:
        'Apollo.io rate limit reached. Free tier allows 50 requests/hour. ' +
        'Upgrade your Apollo.io plan for higher limits.',
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      status: response.status,
      error: 'Invalid Apollo.io API key. Check your key at app.apollo.io → Settings → API Keys.',
    };
  }

  if (!response.ok) {
    let errorMessage = `Apollo.io API error (${response.status})`;
    try {
      const errBody = (await response.json()) as Record<string, unknown>;
      if (typeof errBody['error'] === 'string') errorMessage = errBody['error'];
      else if (typeof errBody['message'] === 'string') errorMessage = errBody['message'];
    } catch {
      // ignore JSON parse error
    }
    return { status: response.status, error: errorMessage, rateLimitRemaining };
  }

  try {
    const data = (await response.json()) as T;
    return { status: 200, data, rateLimitRemaining };
  } catch {
    return { status: 500, error: 'Failed to parse Apollo.io response as JSON.' };
  }
}

function parseRateLimit(header: string | null): number | undefined {
  if (!header) return undefined;
  const parsed = parseInt(header, 10);
  return isNaN(parsed) ? undefined : parsed;
}

// ─── Public API Methods ───────────────────────────────────────────────────────

export function searchPeople(
  apiKey: string,
  input: SearchPeopleInput
): Promise<ApolloClientResult<ApolloSearchPeopleResponse>> {
  const body: Record<string, unknown> = {};
  if (input.person_titles?.length) body['person_titles'] = input.person_titles;
  if (input.person_seniorities?.length) body['person_seniorities'] = input.person_seniorities;
  if (input.organization_domains?.length)
    body['q_organization_domains'] = input.organization_domains.join('\n');
  if (input.person_locations?.length) body['person_locations'] = input.person_locations;
  if (input.organization_num_employees_ranges?.length)
    body['organization_num_employees_ranges'] = input.organization_num_employees_ranges;
  body['page'] = input.page ?? 1;
  body['per_page'] = Math.min(input.per_page ?? 10, 25);
  return apolloRequest<ApolloSearchPeopleResponse>(apiKey, 'POST', '/mixed_people/search', body);
}

export function enrichPerson(
  apiKey: string,
  input: EnrichPersonInput
): Promise<ApolloClientResult<ApolloEnrichPersonResponse>> {
  const params = new URLSearchParams();
  if (input.email) params.set('email', input.email);
  if (input.first_name) params.set('first_name', input.first_name);
  if (input.last_name) params.set('last_name', input.last_name);
  if (input.organization_name) params.set('organization_name', input.organization_name);
  if (input.linkedin_url) params.set('linkedin_url', input.linkedin_url);
  return apolloRequest<ApolloEnrichPersonResponse>(
    apiKey,
    'GET',
    `/people/match?${params.toString()}`
  );
}

export function searchCompanies(
  apiKey: string,
  input: SearchCompaniesInput
): Promise<ApolloClientResult<ApolloSearchCompaniesResponse>> {
  const body: Record<string, unknown> = {};
  if (input.q_organization_keyword_tags?.length)
    body['q_organization_keyword_tags'] = input.q_organization_keyword_tags;
  if (input.organization_locations?.length)
    body['organization_locations'] = input.organization_locations;
  if (input.organization_num_employees_ranges?.length)
    body['organization_num_employees_ranges'] = input.organization_num_employees_ranges;
  if (input.organization_funding_stages?.length)
    body['organization_funding_stages'] = input.organization_funding_stages;
  body['page'] = input.page ?? 1;
  body['per_page'] = Math.min(input.per_page ?? 10, 25);
  return apolloRequest<ApolloSearchCompaniesResponse>(
    apiKey,
    'POST',
    '/mixed_companies/search',
    body
  );
}

export function enrichCompany(
  apiKey: string,
  input: EnrichCompanyInput
): Promise<ApolloClientResult<ApolloEnrichCompanyResponse>> {
  const params = new URLSearchParams();
  if (input.domain) params.set('domain', input.domain);
  if (input.name) params.set('name', input.name);
  return apolloRequest<ApolloEnrichCompanyResponse>(
    apiKey,
    'GET',
    `/organizations/enrich?${params.toString()}`
  );
}

export function getJobPostings(
  apiKey: string,
  input: GetJobPostingsInput
): Promise<ApolloClientResult<ApolloJobPostingsResponse>> {
  const body: Record<string, unknown> = {
    organization_id: input.organization_id,
    page: input.page ?? 1,
    per_page: Math.min(input.per_page ?? 10, 25),
  };
  if (input.job_titles?.length) body['job_titles'] = input.job_titles;
  return apolloRequest<ApolloJobPostingsResponse>(apiKey, 'POST', '/job_postings/search', body);
}

export function findEmail(
  apiKey: string,
  input: FindEmailInput
): Promise<ApolloClientResult<ApolloFindEmailResponse>> {
  return apolloRequest<ApolloFindEmailResponse>(apiKey, 'POST', '/people/request_email', {
    id: input.person_id,
  });
}
