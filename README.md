# mcp-apollo

An open-source, production-quality **MCP server for Apollo.io** — built by [AgenTeam](https://agenteamai.com).

Gives your AI agents direct access to Apollo.io's B2B sales intelligence database: prospect search, contact enrichment, company research, job-posting signals, and email finding — all from a conversation.

Built on **Cloudflare Workers** + **TypeScript** + the official **`@modelcontextprotocol/sdk`**.

---

## Who uses this

| AgenTeam Agent | Role | What they use it for |
|---|---|---|
| **Jake** | SDR | Pull verified prospect lists by title + domain |
| **Grant** | GTM Strategist | Research target accounts and funding signals |
| **Connor** | Sales | Enrich deal contacts before calls |
| **Lauren** | Partnerships | Research partner companies and key contacts |

---

## Tools

| Tool | Description |
|---|---|
| `apollo_search_people` | Search for people by title, seniority, company domain, or location |
| `apollo_enrich_person` | Get full profile for a person by email, LinkedIn, or name + company |
| `apollo_search_companies` | Search companies by industry, location, headcount, or funding stage |
| `apollo_enrich_company` | Get full company profile including tech stack and funding by domain or name |
| `apollo_get_job_postings` | Get active job postings for a company (buying signal) |
| `apollo_find_email` | Retrieve a verified email for a person by their Apollo person ID |

---

## Quick start

### 1. Get an Apollo.io API key

1. Go to [app.apollo.io](https://app.apollo.io)
2. Settings → Integrations → API
3. Create a new API key
4. Copy the key — you'll pass it as a Bearer token

### 2. Connect to Claude Desktop

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "url": "https://mcp-apollo.agenteamai.com/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APOLLO_API_KEY"
      }
    }
  }
}
```

### 3. Connect to Claude Code

```bash
claude mcp add apollo \
  --url https://mcp-apollo.agenteamai.com/mcp \
  --header "Authorization: Bearer YOUR_APOLLO_API_KEY"
```

### 4. Connect to Cursor

In Cursor Settings → MCP → Add Server:
- **URL:** `https://mcp-apollo.agenteamai.com/mcp`
- **Headers:** `Authorization: Bearer YOUR_APOLLO_API_KEY`

### 5. Connect to Windsurf

In Windsurf Settings → Extensions → MCP:
```json
{
  "apollo": {
    "serverUrl": "https://mcp-apollo.agenteamai.com/mcp",
    "headers": { "Authorization": "Bearer YOUR_APOLLO_API_KEY" }
  }
}
```

---

## Tool reference

### `apollo_search_people`

Search Apollo's database of 275M+ people.

| Parameter | Type | Description |
|---|---|---|
| `person_titles` | `string[]` | Job titles, e.g. `["VP Sales", "Head of Growth"]` |
| `person_seniorities` | `string[]` | e.g. `["vp", "c_suite", "director", "manager"]` |
| `organization_domains` | `string[]` | Company domains, e.g. `["stripe.com", "vercel.com"]` |
| `person_locations` | `string[]` | e.g. `["New York", "London"]` |
| `organization_num_employees_ranges` | `string[]` | e.g. `["51,200", "201,500"]` |
| `page` | `number` | Default: 1 |
| `per_page` | `number` | Default: 10, max: 25 |

---

### `apollo_enrich_person`

Get full profile for a specific person. Provide at least one identifier.

| Parameter | Type | Description |
|---|---|---|
| `email` | `string` | Most reliable identifier |
| `linkedin_url` | `string` | LinkedIn profile URL |
| `first_name` + `last_name` | `string` | Use together with `organization_name` |

---

### `apollo_search_companies`

Search Apollo's database of 60M+ companies.

| Parameter | Type | Description |
|---|---|---|
| `q_organization_keyword_tags` | `string[]` | Industries/keywords, e.g. `["SaaS", "AI"]` |
| `organization_locations` | `string[]` | HQ locations |
| `organization_num_employees_ranges` | `string[]` | Headcount ranges |
| `organization_funding_stages` | `string[]` | e.g. `["Series A", "Series B"]` |

---

### `apollo_enrich_company`

Full company profile including tech stack, funding history, and key people.

| Parameter | Type | Description |
|---|---|---|
| `domain` | `string` | e.g. `"stripe.com"` — preferred |
| `name` | `string` | Company name — alternative to domain |

---

### `apollo_get_job_postings`

Active job postings = buying signal. Use to identify companies actively hiring in your ICP.

| Parameter | Type | Description |
|---|---|---|
| `organization_id` | `string` | Apollo org ID — from `apollo_enrich_company` |
| `job_titles` | `string[]` | Filter by role, e.g. `["Head of Sales"]` |

---

### `apollo_find_email`

Unlock a person's verified email address.

| Parameter | Type | Description |
|---|---|---|
| `person_id` | `string` | Apollo person ID — from `apollo_search_people` |

---

## Apollo.io rate limits

| Plan | Requests/hour |
|---|---|
| Free | 50 |
| Basic | 200 |
| Professional | 1,000 |
| Organization | Custom |

This server returns `rate_limit_remaining` in every tool response so agents know how many calls are left. On 429, the error message includes the limit tier and upgrade advice.

---

## Self-hosting / local dev

```bash
git clone https://github.com/AgenTeam-AI-2026/mcp-apollo
cd mcp-apollo
npm install
npm run dev          # starts local Wrangler dev server on :8787
```

Run tests:
```bash
npm test                    # unit + RALPH tests
# E2E (requires live key + running worker):
APOLLO_API_KEY=your_key MCP_APOLLO_URL=http://localhost:8787 npm test
```

Deploy:
```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

---

## Auth

Your Apollo.io API key is passed as a Bearer token on each request. **This server never stores your API key** — it is used for the duration of the request only and discarded.

```
Authorization: Bearer <your_apollo_api_key>
```

---

## Transport

- **Primary:** Streamable HTTP — `POST /mcp`
- **Fallback:** SSE — `GET /sse`
- **Health:** `GET /health`

---

## License

MIT — see [LICENSE](./LICENSE)

---

Built by [AgenTeam](https://agenteamai.com) · [Report an issue](https://github.com/AgenTeam-AI-2026/mcp-apollo/issues)
