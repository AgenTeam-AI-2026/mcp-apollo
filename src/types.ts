// ─── Apollo API Response Types ──────────────────────────────────────────────

export interface ApolloEmailStatus {
  value: string | null;
  status: 'verified' | 'unverified' | 'likely_to_engage' | null;
}

export interface ApolloOrganization {
  id: string;
  name: string;
  website_url: string | null;
  linkedin_url: string | null;
  primary_domain: string | null;
  industry: string | null;
  estimated_num_employees: number | null;
  city: string | null;
  state: string | null;
  country: string | null;
  founded_year: number | null;
  short_description: string | null;
  funding_stage: string | null;
  total_funding: number | null;
  latest_funding_stage: string | null;
  latest_funding_round_date: string | null;
  logo_url: string | null;
  technologies: string[];
}

export interface ApolloPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  linkedin_url: string | null;
  title: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  email: string | null;
  email_status: string | null;
  phone_numbers: Array<{ raw_number: string; type: string | null }> | null;
  organization: ApolloOrganization | null;
  employment_history: Array<{
    title: string | null;
    organization_name: string | null;
    start_date: string | null;
    end_date: string | null;
    current: boolean;
  }> | null;
}

export interface ApolloJobPosting {
  id: string;
  title: string | null;
  url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  last_seen_at: string | null;
  posted_at: string | null;
}

export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

// ─── Search Response Types ───────────────────────────────────────────────────

export interface ApolloSearchPeopleResponse {
  people: ApolloPerson[];
  pagination: ApolloPagination;
  breadcrumbs?: unknown[];
}

export interface ApolloSearchCompaniesResponse {
  organizations: ApolloOrganization[];
  pagination: ApolloPagination;
}

export interface ApolloEnrichPersonResponse {
  person: ApolloPerson;
}

export interface ApolloEnrichCompanyResponse {
  organization: ApolloOrganization;
}

export interface ApolloJobPostingsResponse {
  job_postings: ApolloJobPosting[];
  pagination: ApolloPagination;
}

export interface ApolloFindEmailResponse {
  person: {
    id: string;
    email: string | null;
    email_status: string | null;
  };
}

// ─── Error Types ─────────────────────────────────────────────────────────────

export interface ApolloApiError {
  status: number;
  error: string;
  message: string;
  rateLimitRemaining?: number;
}

// ─── Tool Input Types ─────────────────────────────────────────────────────────

export interface SearchPeopleInput {
  person_titles?: string[];
  person_seniorities?: string[];
  organization_domains?: string[];
  person_locations?: string[];
  organization_num_employees_ranges?: string[];
  page?: number;
  per_page?: number;
}

export interface EnrichPersonInput {
  email?: string;
  first_name?: string;
  last_name?: string;
  organization_name?: string;
  linkedin_url?: string;
}

export interface SearchCompaniesInput {
  q_organization_keyword_tags?: string[];
  organization_locations?: string[];
  organization_num_employees_ranges?: string[];
  organization_funding_stages?: string[];
  page?: number;
  per_page?: number;
}

export interface EnrichCompanyInput {
  domain?: string;
  name?: string;
}

export interface GetJobPostingsInput {
  organization_id: string;
  job_titles?: string[];
  page?: number;
  per_page?: number;
}

export interface FindEmailInput {
  person_id: string;
}
