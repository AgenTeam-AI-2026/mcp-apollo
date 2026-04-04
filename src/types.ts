// ─── Apollo API Response Types ────────────────────────────────────────────────

export interface ApolloEmail {
  email: string;
  email_confidence: number | null;
  email_status: string | null;
  email_source: string | null;
}

export interface ApolloEmployment {
  organization_name: string | null;
  title: string | null;
  start_date: string | null;
  end_date: string | null;
  current: boolean;
}

export interface ApolloPerson {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  title: string | null;
  headline: string | null;
  email: string | null;
  email_status: string | null;
  phone_numbers: Array<{ raw_number: string; type: string | null }> | null;
  linkedin_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  organization: ApolloOrganizationSummary | null;
  employment_history: ApolloEmployment[] | null;
  photo_url: string | null;
  twitter_url: string | null;
}

export interface ApolloOrganizationSummary {
  id: string | null;
  name: string | null;
  website_url: string | null;
  linkedin_url: string | null;
  primary_domain: string | null;
  estimated_num_employees: number | null;
  industry: string | null;
  city: string | null;
  country: string | null;
}

export interface ApolloOrganization extends ApolloOrganizationSummary {
  short_description: string | null;
  founded_year: number | null;
  total_funding: number | null;
  latest_funding_stage: string | null;
  latest_funding_round_date: string | null;
  technologies: string[] | null;
  keywords: string[] | null;
  phone: string | null;
  blog_url: string | null;
  facebook_url: string | null;
  twitter_url: string | null;
}

export interface ApolloJobPosting {
  id: string;
  title: string | null;
  locations_derived: string[] | null;
  posted_at: string | null;
  url: string | null;
}

export interface ApolloPagination {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

export interface ApolloRateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}

// ─── Internal Error Type ───────────────────────────────────────────────────────

export class ApolloError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly apolloCode?: string,
  ) {
    super(message);
    this.name = 'ApolloError';
  }
}
