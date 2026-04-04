import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApolloApiError, type ApolloClient } from "../apollo-client.js";
import type { ApolloOrganizationResult } from "../types.js";

function formatCompany(org: ApolloOrganizationResult): string {
  const location = [org.city, org.state, org.country].filter(Boolean).join(", ");
  const funding = org.total_funding ? `$${(org.total_funding / 1_000_000).toFixed(1)}M` : null;
  return [
    `**${org.name}**`,
    org.primary_domain ? `Domain: ${org.primary_domain}` : null,
    org.industry ? `Industry: ${org.industry}` : null,
    org.estimated_num_employees ? `Employees: ~${org.estimated_num_employees.toLocaleString()}` : null,
    org.latest_funding_stage ? `Funding: ${org.latest_funding_stage}${funding ? ` (${funding} total)` : ""}` : null,
    location ? `HQ: ${location}` : null,
    org.linkedin_url ? `LinkedIn: ${org.linkedin_url}` : null,
    org.short_description ? `\n${org.short_description}` : null,
    `Apollo ID: ${org.id}`,
  ].filter(Boolean).join("\n");
}

export function registerSearchCompanies(server: McpServer, client: ApolloClient): void {
  server.tool(
    "apollo_search_companies",
    "Search for companies matching industry keywords, location, headcount range, and funding stage. Returns company profiles with domains, employee counts, funding, and Apollo IDs.",
    {
      q_organization_keyword_tags: z.array(z.string()).optional().describe('Industry keywords, e.g. ["saas", "fintech", "hr software"]'),
      organization_locations: z.array(z.string()).optional().describe('HQ locations, e.g. ["New York", "California"]'),
      organization_num_employees_ranges: z.array(z.string()).optional().describe('Headcount ranges, e.g. ["51,200", "201,500"]'),
      organization_funding_stages: z.array(z.string()).optional().describe('Funding stages, e.g. ["Seed", "Series A", "Series B"]'),
      page: z.number().int().min(1).optional().default(1).describe("Page number (default: 1)"),
      per_page: z.number().int().min(1).max(25).optional().default(10).describe("Results per page, max 25 (default: 10)"),
    },
    async (args) => {
      try {
        const { data, rateLimitInfo } = await client.searchCompanies({
          ...(args.q_organization_keyword_tags && { q_organization_keyword_tags: args.q_organization_keyword_tags }),
          ...(args.organization_locations && { organization_locations: args.organization_locations }),
          ...(args.organization_num_employees_ranges && { organization_num_employees_ranges: args.organization_num_employees_ranges }),
          ...(args.organization_funding_stages && { organization_funding_stages: args.organization_funding_stages }),
          page: args.page ?? 1,
          per_page: args.per_page ?? 10,
        });
        const organizations = data.organizations ?? [];
        const { pagination } = data;
        const rl = rateLimitInfo.remaining !== null ? `\n\n_Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining._` : "";
        if (organizations.length === 0) return { content: [{ type: "text" as const, text: `No companies found. Try broadening your filters.${rl}` }] };
        const header = `Found ${pagination.total_entries.toLocaleString()} companies. Page ${pagination.page}/${pagination.total_pages} (${organizations.length} shown).`;
        return { content: [{ type: "text" as const, text: `${header}\n\n${organizations.map(formatCompany).join("\n\n---\n\n")}${rl}` }] };
      } catch (err) {
        if (err instanceof ApolloApiError) return { content: [{ type: "text" as const, text: `Apollo.io error (${err.statusCode}): ${err.message}` }], isError: true };
        throw err;
      }
    }
  );
}
