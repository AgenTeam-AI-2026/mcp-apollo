import { ApolloError, ApolloRateLimitInfo } from './types.js';

const BASE_URL = 'https://api.apollo.io/api/v1';

/**
 * Thin, typed wrapper around Apollo.io's REST API.
 * Handles auth, rate-limit parsing, and error normalisation.
 */
export class ApolloClient {
  constructor(private readonly apiKey: string) {}

  /**
   * Parse rate-limit headers from an Apollo response.
   */
  private parseRateLimits(headers: Headers): ApolloRateLimitInfo {
    return {
      limit: this.headerInt(headers, 'x-rate-limit-limit'),
      remaining: this.headerInt(headers, 'x-rate-limit-remaining'),
      reset: this.headerInt(headers, 'x-rate-limit-reset'),
    };
  }

  private headerInt(headers: Headers, name: string): number | null {
    const val = headers.get(name);
    if (val === null) return null;
    const n = parseInt(val, 10);
    return isNaN(n) ? null : n;
  }

  /**
   * Core HTTP helper — used by all tool implementations.
   */
  async post<T>(
    path: string,
    body: Record<string, unknown>,
  ): Promise<{ data: T; rateLimits: ApolloRateLimitInfo }> {
    const url = `${BASE_URL}${path}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify(body),
    });

    const rateLimits = this.parseRateLimits(res.headers);

    if (res.status === 401) {
      throw new ApolloError(
        'Invalid Apollo.io API key. Check your key and try again.',
        401,
        'UNAUTHORIZED',
      );
    }

    if (res.status === 422) {
      const text = await res.text();
      throw new ApolloError(
        `Apollo API validation error: ${text}`,
        422,
        'VALIDATION_ERROR',
      );
    }

    if (res.status === 429) {
      const resetIn = rateLimits.reset ?? 60;
      throw new ApolloError(
        `Apollo.io rate limit exceeded. Resets in ${resetIn}s. ` +
          `Consider upgrading your Apollo plan for higher limits.`,
        429,
        'RATE_LIMITED',
      );
    }

    if (!res.ok) {
      const text = await res.text();
      throw new ApolloError(
        `Apollo API error ${res.status}: ${text}`,
        res.status,
        'API_ERROR',
      );
    }

    const data = (await res.json()) as T;
    return { data, rateLimits };
  }

  async get<T>(
    path: string,
    params: Record<string, string>,
  ): Promise<{ data: T; rateLimits: ApolloRateLimitInfo }> {
    const url = new URL(`${BASE_URL}${path}`);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'x-api-key': this.apiKey,
        'Cache-Control': 'no-cache',
      },
    });

    const rateLimits = this.parseRateLimits(res.headers);

    if (res.status === 401) {
      throw new ApolloError('Invalid Apollo.io API key.', 401, 'UNAUTHORIZED');
    }
    if (res.status === 429) {
      throw new ApolloError(
        `Apollo.io rate limit exceeded. Remaining: ${rateLimits.remaining ?? 'unknown'}.`,
        429,
        'RATE_LIMITED',
      );
    }
    if (!res.ok) {
      const text = await res.text();
      throw new ApolloError(`Apollo API error ${res.status}: ${text}`, res.status);
    }

    const data = (await res.json()) as T;
    return { data, rateLimits };
  }
}
