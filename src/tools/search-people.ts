import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApolloApiError, type ApolloClient } from "../apollo-client.js";
import type { ApolloPersonResult } from "../types.js";

function formatPerson(p: ApolloPersonResult): string {
  const location = [p.city, p.state, p.country].filter(Boolean).join(", ");
  const lines: (string | null)[] = [
    `**${p.name}**`,
    p.title ? `Title: ${p.title}` : null,
    p.organization
      ? `Company: ${p.organization.name}${p.organization.primary_domain ? ` (${p.organization.primary_domain})` : ""}`
      : null,
    p.email ? `Email: ${p.email}${p.email_status ? ` [${p.email_status}]` : ""}` : null,
    p.linkedin_url ? `LinkedIn: ${p.linkedin_url}` : null,
    location ? `Location: ${location}` : null,
    `Apollo ID: ${p.id}`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function registerSearchPeople(server: McpServer, client: ApolloClient): void {
  server.tool(
    "apollo_search_people",
    "Search Apollo.io's database for people matching role, seniority, company domain, and location filters. Returns names, titles, emails (where available), LinkedIn URLs, and Apollo IDs for use with apollo_enrich_person or apollo_find_email.",
    {
      person_titles: z.array(z.string()).optional().describe('Job titles to match, e.g. ["VP Engineering", "CTO"]'),
      person_seniorities: z.array(z.string()).optional().describe('Seniority levels: "owner", "founder", "c_suite", "vp", "head", "director", "manager", "senior"'),
      organization_domains: z.array(z.string()).optional().describe('Company domains, e.g. ["stripe.com", "figma.com"]'),
      person_locations: z.array(z.string()).optional().describe('Locations, e.g. ["New York", "San Francisco Bay Area"]'),
      organization_num_employees_ranges: z.array(z.string()).optional().describe('Headcount ranges, e.g. ["51,200", "201,500"]'),
      page: z.number().int().min(1).optional().default(1).describe("Page number (default: 1)"),
      per_page: z.number().int().min(1).max(25).optional().default(10).describe("Results per page, max 25 (default: 10)"),
    },
    async (args) => {
      try {
        const { data, rateLimitInfo } = await client.searchPeople({
          ...(args.person_titles && { person_titles: args.person_titles }),
          ...(args.person_seniorities && { person_seniorities: args.person_seniorities }),
          ...(args.organization_domains && { organization_domains: args.organization_domains }),
          ...(args.person_locations && { person_locations: args.person_locations }),
          ...(args.organization_num_employees_ranges && { organization_num_employees_ranges: args.organization_num_employees_ranges }),
          page: args.page ?? 1,
          per_page: args.per_page ?? 10,
        });
        const people = data.people ?? [];
        const { pagination } = data;
        const rl = rateLimitInfo.remaining !== null ? `\n\n_Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining._` : "";
        if (people.length === 0) return { content: [{ type: "text" as const, text: `No people found. Try broadening your filters.${rl}` }] };
        const header = `Found ${pagination.total_entries.toLocaleString()} results. Page ${pagination.page}/${pagination.total_pages} (${people.length} shown).`;
        return { content: [{ type: "text" as const, text: `${header}\n\n${people.map(formatPerson).join("\n\n---\n\n")}${rl}` }] };
      } catch (err) {
        if (err instanceof ApolloApiError) return { content: [{ type: "text" as const, text: `Apollo.io error (${err.statusCode}): ${err.message}` }], isError: true };
        throw err;
      }
    }
  );
}
