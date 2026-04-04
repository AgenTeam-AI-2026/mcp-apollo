/**
 * TypeScript types for Apollo.io API responses.
 * Based on Apollo.io REST API v1 documentation.
 */

export interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number: string;
  type?: string;
  status?: string;
}

export interface ApolloOrganizationSummary {
  id: string;
  name: string;
  website_url?: string;
  linkedin_url?: string;
  estimated_num_employees?: number;
  primary_domain?: string;
}

export interface ApolloEmploymentHistory {
  _id: string;
  organization_name?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  current?: boolean;
}

export interface ApolloPersonResult {
  id: string;
  first_name: string;
  last_name: string;
  name: string;
  title?: string;
  email?: string;
  email_status?: "verified" | "unverified" | "likely" | "unavailable" | "unknown";
  linkedin_url?: string;
  phone_numbers?: ApolloPhoneNumber[];
  city?: string;
  state?: string;
  country?: string;
  organization?: ApolloOrganizationSummary;
  employment_history?: ApolloEmploymentHistory[];
}

export interface ApolloOrganizationResult {
  id: string;
  name: string;
  website_url?: string;
  primary_domain?: string;
  linkedin_url?: string;
  estimated_num_employees?: number;
  industry?: string;
  keywords?: string[];
  city?: string;
  state?: string;
  country?: string;
  founded_year?: number;
  total_funding?: number;
  latest_funding_stage?: string;
  latest_funding_round_date?: string;
  technologies?: string[];
  short_description?: string;
}

export interface ApolloJobPosting {
  id: string;
  title: string;
  url?: string;
  city?: string;
  state?: string;
  country?: string;
  posted_at?: string;
  updated_at?: string;
}

export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

export interface ApolloPeopleSearchResponse {
  people: ApolloPersonResult[];
  pagination: ApolloPagination;
}

export interface ApolloPersonEnrichResponse {
  person: ApolloPersonResult;
}

export interface ApolloCompaniesSearchResponse {
  organizations: ApolloOrganizationResult[];
  pagination: ApolloPagination;
}

export interface ApolloCompanyEnrichResponse {
  organization: ApolloOrganizationResult;
}

export interface ApolloJobPostingsResponse {
  job_postings: ApolloJobPosting[];
  pagination: ApolloPagination;
}

export interface ApolloFindEmailResponse {
  person: {
    id: string;
    email?: string;
    email_status?: string;
  };
}

export interface ApolloRateLimitInfo {
  remaining: number | null;
  limit: number | null;
  resetAt: string | null;
}
