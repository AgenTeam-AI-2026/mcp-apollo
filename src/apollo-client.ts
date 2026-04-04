import type {
  ApolloPeopleSearchResponse,
  ApolloPersonEnrichResponse,
  ApolloCompaniesSearchResponse,
  ApolloCompanyEnrichResponse,
  ApolloJobPostingsResponse,
  ApolloFindEmailResponse,
  ApolloRateLimitInfo,
} from "./types.js";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";

export class ApolloApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly rateLimitInfo: ApolloRateLimitInfo
  ) {
    super(message);
    this.name = "ApolloApiError";
  }
}

function parseRateLimitInfo(headers: Headers): ApolloRateLimitInfo {
  const remaining = headers.get("x-rate-limit-remaining");
  const limit = headers.get("x-rate-limit-limit");
  const resetAt = headers.get("x-rate-limit-reset");
  return {
    remaining: remaining !== null ? parseInt(remaining, 10) : null,
    limit: limit !== null ? parseInt(limit, 10) : null,
    resetAt,
  };
}

export class ApolloClient {
  constructor(private readonly apiKey: string) {}

  private async post<T>(
    path: string,
    body: Record<string, unknown>
  ): Promise<{ data: T; rateLimitInfo: ApolloRateLimitInfo }> {
    const response = await fetch(`${APOLLO_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
      body: JSON.stringify(body),
    });
    const rateLimitInfo = parseRateLimitInfo(response.headers);
    await this.assertOk(response, rateLimitInfo);
    return { data: (await response.json()) as T, rateLimitInfo };
  }

  private async get<T>(
    path: string,
    params: Record<string, string>
  ): Promise<{ data: T; rateLimitInfo: ApolloRateLimitInfo }> {
    const url = new URL(`${APOLLO_BASE_URL}${path}`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
      },
    });
    const rateLimitInfo = parseRateLimitInfo(response.headers);
    await this.assertOk(response, rateLimitInfo);
    return { data: (await response.json()) as T, rateLimitInfo };
  }

  private async assertOk(
    response: Response,
    rateLimitInfo: ApolloRateLimitInfo
  ): Promise<void> {
    if (response.ok) return;
    if (response.status === 401) {
      throw new ApolloApiError(
        "Invalid Apollo.io API key. Verify your key at https://app.apollo.io/#/settings/integrations/api",
        401,
        rateLimitInfo
      );
    }
    if (response.status === 429) {
      const resetMsg = rateLimitInfo.resetAt
        ? ` Rate limit resets at: ${rateLimitInfo.resetAt}.`
        : "";
      throw new ApolloApiError(
        `Apollo.io rate limit exceeded.${resetMsg} Free tier: 50 req/hour. Upgrade at https://app.apollo.io/#/settings/billing`,
        429,
        rateLimitInfo
      );
    }
    const text = await response.text().catch(() => "(no body)");
    throw new ApolloApiError(
      `Apollo.io API error ${response.status}: ${text}`,
      response.status,
      rateLimitInfo
    );
  }

  async searchPeople(
    params: Record<string, unknown>
  ): Promise<{ data: ApolloPeopleSearchResponse; rateLimitInfo: ApolloRateLimitInfo }> {
    return this.post<ApolloPeopleSearchResponse>("/mixed_people/search", params);
  }

  async enrichPerson(
    params: Record<string, unknown>
  ): Promise<{ data: ApolloPersonEnrichResponse; rateLimitInfo: ApolloRateLimitInfo }> {
    return this.post<ApolloPersonEnrichResponse>("/people/match", params);
  }

  async searchCompanies(
    params: Record<string, unknown>
  ): Promise<{ data: ApolloCompaniesSearchResponse; rateLimitInfo: ApolloRateLimitInfo }> {
    return this.post<ApolloCompaniesSearchResponse>("/mixed_companies/search", params);
  }

  async enrichCompany(
    params: Record<string, string>
  ): Promise<{ data: ApolloCompanyEnrichResponse; rateLimitInfo: ApolloRateLimitInfo }> {
    return this.get<ApolloCompanyEnrichResponse>("/organizations/enrich", params);
  }

  async getJobPostings(
    organizationId: string,
    jobTitles?: string[]
  ): Promise<{ data: ApolloJobPostingsResponse; rateLimitInfo: ApolloRateLimitInfo }> {
    const body: Record<string, unknown> = { organization_ids: [organizationId] };
    if (jobTitles && jobTitles.length > 0) body.job_titles = jobTitles;
    return this.post<ApolloJobPostingsResponse>("/job_postings/search", body);
  }

  async findEmail(
    personId: string
  ): Promise<{ data: ApolloFindEmailResponse; rateLimitInfo: ApolloRateLimitInfo }> {
    return this.post<ApolloFindEmailResponse>("/people/reveal", { id: personId });
  }
}
