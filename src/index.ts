import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { extractApiKey } from './auth.js';
import { handleSearchPeople, searchPeopleSchema } from './tools/search-people.js';
import { handleEnrichPerson, enrichPersonSchema } from './tools/enrich-person.js';
import { handleSearchCompanies, searchCompaniesSchema } from './tools/search-companies.js';
import { handleEnrichCompany, enrichCompanySchema } from './tools/enrich-company.js';
import { handleGetJobPostings, getJobPostingsSchema } from './tools/get-job-postings.js';
import { handleFindEmail, findEmailSchema } from './tools/find-email.js';

// ─── MCP Agent ────────────────────────────────────────────────────────────────

export class ApolloMcpAgent extends McpAgent {
  server = new McpServer({
    name: 'mcp-apollo',
    version: '0.1.0',
  });

  async init(): Promise<void> {
    const apiKey = this.getApiKey();

    this.server.tool(
      'apollo_search_people',
      'Search Apollo.io for people matching filters. Use to build prospect lists by title, seniority, company domain, or location.',
      searchPeopleSchema.shape,
      async (params) => ({
        content: [{ type: 'text', text: await handleSearchPeople(apiKey, params) }],
      })
    );

    this.server.tool(
      'apollo_enrich_person',
      'Get full profile for a person from Apollo.io. Provide email, LinkedIn URL, or name + company. Returns title, location, phone, employment history.',
      enrichPersonSchema.shape,
      async (params) => ({
        content: [{ type: 'text', text: await handleEnrichPerson(apiKey, params) }],
      })
    );

    this.server.tool(
      'apollo_search_companies',
      'Search Apollo.io for companies matching industry, location, headcount, or funding stage.',
      searchCompaniesSchema.shape,
      async (params) => ({
        content: [{ type: 'text', text: await handleSearchCompanies(apiKey, params) }],
      })
    );

    this.server.tool(
      'apollo_enrich_company',
      'Get full company profile from Apollo.io. Provide domain (e.g. stripe.com) or name. Returns headcount, funding, tech stack, key people.',
      enrichCompanySchema.shape,
      async (params) => ({
        content: [{ type: 'text', text: await handleEnrichCompany(apiKey, params) }],
      })
    );

    this.server.tool(
      'apollo_get_job_postings',
      'Get active job postings for a company — a strong buying signal. Requires Apollo organization ID from apollo_enrich_company.',
      getJobPostingsSchema.shape,
      async (params) => ({
        content: [{ type: 'text', text: await handleGetJobPostings(apiKey, params) }],
      })
    );

    this.server.tool(
      'apollo_find_email',
      'Retrieve a verified email address for a person by their Apollo person ID. Use after apollo_search_people to unlock contact details.',
      findEmailSchema.shape,
      async (params) => ({
        content: [{ type: 'text', text: await handleFindEmail(apiKey, params) }],
      })
    );
  }

  private getApiKey(): string {
    // In Cloudflare Workers with McpAgent, the request is available via this.request
    const apiKey = extractApiKey(this.request as Request);
    if (!apiKey) {
      throw new Error(
        'Missing Apollo.io API key. Set Authorization: Bearer <your_apollo_api_key>'
      );
    }
    return apiKey;
  }
}

// ─── Cloudflare Worker Entry Point ────────────────────────────────────────────

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ status: 'ok', server: 'mcp-apollo', version: '0.1.0' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // MCP endpoint — Streamable HTTP (primary)
    if (url.pathname === '/mcp') {
      return ApolloMcpAgent.serve('/mcp').fetch(request, env, ctx);
    }

    // SSE fallback
    if (url.pathname === '/sse') {
      return ApolloMcpAgent.serveSSE('/sse').fetch(request, env, ctx);
    }

    return new Response(
      JSON.stringify({
        name: 'mcp-apollo',
        description: 'Apollo.io MCP server by AgenTeam',
        endpoints: {
          mcp: '/mcp',
          sse: '/sse',
          health: '/health',
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  },
} satisfies ExportedHandler<Env>;

// Minimal env interface — no secrets stored server-side
interface Env {}
