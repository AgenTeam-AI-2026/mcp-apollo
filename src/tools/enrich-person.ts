import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ApolloApiError, type ApolloClient } from "../apollo-client.js";
import type { ApolloPersonResult } from "../types.js";

function formatPersonFull(p: ApolloPersonResult): string {
  const location = [p.city, p.state, p.country].filter(Boolean).join(", ");
  const phones = p.phone_numbers?.map((ph) => `${ph.raw_number}${ph.type ? ` (${ph.type})` : ""}`).join(", ") ?? "\u2014";
  const employment = p.employment_history?.slice(0, 3).map((e) => {
    const period = [e.start_date, e.end_date ?? (e.current ? "present" : null)].filter(Boolean).join(" \u2192 ");
    return `  \u2022 ${e.title ?? "Unknown role"} at ${e.organization_name ?? "Unknown"}${period ? ` (${period})` : ""}`;
  }).join("\n") ?? "  \u2014";
  return [
    `**${p.name}**`,
    `Title: ${p.title ?? "\u2014"}`,
    `Company: ${p.organization?.name ?? "\u2014"}${p.organization?.primary_domain ? ` (${p.organization.primary_domain})` : ""}`,
    `Email: ${p.email ?? "\u2014"}${p.email_status ? ` [${p.email_status}]` : ""}`,
    `Phone: ${phones}`,
    `LinkedIn: ${p.linkedin_url ?? "\u2014"}`,
    `Location: ${location || "\u2014"}`,
    `\nEmployment History (recent):\n${employment}`,
    `\nApollo ID: ${p.id}`,
  ].join("\n");
}

export function registerEnrichPerson(server: McpServer, client: ApolloClient): void {
  server.tool(
    "apollo_enrich_person",
    "Get full enriched profile for a specific person using their email, name + company, or LinkedIn URL. Returns verified email status, phone numbers, and employment history.",
    {
      email: z.string().email().optional().describe("Person's email address (most reliable)"),
      first_name: z.string().optional().describe("First name (use with last_name + organization_name)"),
      last_name: z.string().optional().describe("Last name (use with first_name + organization_name)"),
      organization_name: z.string().optional().describe("Company name (use with first_name + last_name)"),
      linkedin_url: z.string().url().optional().describe("LinkedIn profile URL"),
    },
    async (args) => {
      if (!args.email && !args.linkedin_url && !(args.first_name && args.last_name && args.organization_name)) {
        return { content: [{ type: "text" as const, text: "Provide at least one identifier: email, linkedin_url, or first_name + last_name + organization_name." }], isError: true };
      }
      try {
        const params: Record<string, unknown> = {};
        if (args.email) params.email = args.email;
        if (args.first_name) params.first_name = args.first_name;
        if (args.last_name) params.last_name = args.last_name;
        if (args.organization_name) params.organization_name = args.organization_name;
        if (args.linkedin_url) params.linkedin_url = args.linkedin_url;
        const { data, rateLimitInfo } = await client.enrichPerson(params);
        const rl = rateLimitInfo.remaining !== null ? `\n\n_Rate limit: ${rateLimitInfo.remaining}/${rateLimitInfo.limit} remaining._` : "";
        if (!data.person) return { content: [{ type: "text" as const, text: `No person found matching the provided identifiers.${rl}` }] };
        return { content: [{ type: "text" as const, text: formatPersonFull(data.person) + rl }] };
      } catch (err) {
        if (err instanceof ApolloApiError) return { content: [{ type: "text" as const, text: `Apollo.io error (${err.statusCode}): ${err.message}` }], isError: true };
        throw err;
      }
    }
  );
}
