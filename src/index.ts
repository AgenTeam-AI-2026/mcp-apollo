/**
 * mcp-apollo — Cloudflare Workers MCP server for Apollo.io
 *
 * Transport: Streamable HTTP (primary) with SSE fallback
 * Auth:      Bearer token (customer's Apollo.io API key)
 * License:   MIT
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { extractApiKey, missingAuthResponse } from './auth.js';
import { ApolloClient } from './apollo-client.js';
import { ApolloError } from './types.js';

import { searchPeopleSchema, searchPeople } from './tools/search-people.js';
import { enrichPersonSchema, enrichPerson } from './tools/enrich-person.js';
import { searchCompaniesSchema, searchCompanies } from './tools/search-companies.js';
import { enrichCompanySchema, enrichCompany } from './tools/enrich-company.js';
import { getJobPostingsSchema, getJobPostings } from './tools/get-job-postings.js';
import { findEmailSchema, findEmail } from './tools/find-email.js';

// ─── Helper ─────────────────────────────────────────────────────────────────

function errorResponse(err: unknown): string {
  if (err instanceof ApolloError) {
    return JSON.stringify({
      error: err.message,
      code: err.apolloCode,
      status: err.statusCode,
    });
  }
  return JSON.stringify({
    error: err instanceof Error ? err.message : 'Unknown error',
  });
}

// ─── MCP Server factory ──────────────────────────────────────────────────────

function createMcpServer(apiKey: string): McpServer {
  const client = new ApolloClient(apiKey);
  const server = new McpServer({
    name: 'mcp-apollo',
    version: '0.1.0',
  });

  server.tool(
    'apollo_search_people',
    'Search Apollo.io for people matching filters. Returns name, title, company, email, LinkedIn, location.',
    searchPeopleSchema.shape,
    async (input) => {
      try {
        const result = await searchPeople(client, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: errorResponse(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_enrich_person',
    'Get full enriched profile for a specific person. Pass email, LinkedIn URL, or first+last+company.',
    enrichPersonSchema.shape,
    async (input) => {
      try {
        const result = await enrichPerson(client, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: errorResponse(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_search_companies',
    'Search Apollo.io for companies by keyword, location, headcount, or funding stage.',
    searchCompaniesSchema.shape,
    async (input) => {
      try {
        const result = await searchCompanies(client, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: errorResponse(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_enrich_company',
    'Get full company profile by domain or name. Returns headcount, funding, tech stack, description.',
    enrichCompanySchema.shape,
    async (input) => {
      try {
        const result = await enrichCompany(client, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: errorResponse(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_get_job_postings',
    'Get active job postings for a company — a strong hiring signal. Requires Apollo organization ID.',
    getJobPostingsSchema.shape,
    async (input) => {
      try {
        const result = await getJobPostings(client, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: errorResponse(err) }], isError: true };
      }
    },
  );

  server.tool(
    'apollo_find_email',
    'Retrieve the verified email for a person by their Apollo person ID.',
    findEmailSchema.shape,
    async (input) => {
      try {
        const result = await findEmail(client, input);
        return { content: [{ type: 'text', text: result }] };
      } catch (err) {
        return { content: [{ type: 'text', text: errorResponse(err) }], isError: true };
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

    const apiKey = extractApiKey(request);
    if (!apiKey) return missingAuthResponse();

    const url = new URL(request.url);
    if (url.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', server: 'mcp-apollo', version: '0.1.0' }),
        { headers: { 'Content-Type': 'application/json' } },
      );
    }

    const server = createMcpServer(apiKey);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);
    return transport.handleRequest(request);
  },
};
