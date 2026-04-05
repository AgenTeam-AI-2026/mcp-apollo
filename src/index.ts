/**
 * mcp-apollo — Cloudflare Workers MCP server for Apollo.io
 *
 * Transport: Streamable HTTP via fetch-to-node bridge
 * Auth:      Bearer token (customer's Apollo.io API key)
 * License:   MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { toFetchResponse, toReqRes } from 'fetch-to-node';
import { extractBearerToken, unauthorizedResponse } from './auth.js';
import { ApolloClient, ApolloApiError } from './apollo-client.js';

import { searchPeopleSchema, searchPeople } from './tools/search-people.js';
import { enrichPersonSchema, enrichPerson } from './tools/enrich-person.js';
import { searchCompaniesSchema, searchCompanies } from './tools/search-companies.js';
import { enrichCompanySchema, enrichCompany } from './tools/enrich-company.js';
import { getJobPostingsSchema, getJobPostings } from './tools/get-job-postings.js';
import { findEmailSchema, findEmail } from './tools/find-email.js';

// ─── Error helper ────────────────────────────────────────────────────────────

function errorText(err: unknown): string {
  if (err instanceof ApolloApiError) {
    return JSON.stringify({
      error: err.message,
      status: err.statusCode,
      rate_limits: err.rateLimitInfo,
    });
  }
  return JSON.stringify({
    error: err instanceof Error ? err.message : 'Unknown error',
  });
}

// ─── MCP Server factory ──────────────────────────────────────────────────────

function createMcpServer(apiKey: string): McpServer {
  const client = new ApolloClient(apiKey);
  const server = new McpServer({ name: 'mcp-apollo', version: '0.1.0' });

  server.tool(
    'apollo_search_people',
    'Search Apollo.io for people matching filters. Returns name, title, company, email, LinkedIn, location.',
    searchPeopleSchema.shape,
    async (input) => {
      try {
        return { content: [{ type: 'text' as const, text: await searchPeople(client, input) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_enrich_person',
    'Get full enriched profile for a specific person. Pass email, LinkedIn URL, or first+last+company.',
    enrichPersonSchema.shape,
    async (input) => {
      try {
        return { content: [{ type: 'text' as const, text: await enrichPerson(client, input) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_search_companies',
    'Search Apollo.io for companies by keyword, location, headcount, or funding stage.',
    searchCompaniesSchema.shape,
    async (input) => {
      try {
        return { content: [{ type: 'text' as const, text: await searchCompanies(client, input) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_enrich_company',
    'Get full company profile by domain or name. Returns headcount, funding, tech stack, description.',
    enrichCompanySchema.shape,
    async (input) => {
      try {
        return { content: [{ type: 'text' as const, text: await enrichCompany(client, input) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_get_job_postings',
    'Get active job postings for a company — a strong hiring signal. Requires Apollo organization ID.',
    getJobPostingsSchema.shape,
    async (input) => {
      try {
        return { content: [{ type: 'text' as const, text: await getJobPostings(client, input) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_find_email',
    'Retrieve the verified email for a person by their Apollo person ID.',
    findEmailSchema.shape,
    async (input) => {
      try {
        return { content: [{ type: 'text' as const, text: await findEmail(client, input) }] };
      } catch (err) {
        return { content: [{ type: 'text' as const, text: errorText(err) }], isError: true };
      }
    },
  );

  return server;
}

// ─── Cloudflare Worker entry point ───────────────────────────────────────────

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, Mcp-Session-Id',
        },
      });
    }

    const apiKey = extractBearerToken(request);
    if (!apiKey) return unauthorizedResponse();

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', server: 'mcp-apollo', version: '0.1.0' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    // Bridge web-standard Request/Response ↔ Node.js IncomingMessage/ServerResponse
    const { req, res } = toReqRes(request);
    const body = await request.json().catch(() => null);

    const server = createMcpServer(apiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined, // stateless per-request
    });

    transport.onerror = (err) => console.error('[mcp-apollo]', err);

    await server.connect(transport);
    await transport.handleRequest(req, res, body);

    return toFetchResponse(res);
  },
};
