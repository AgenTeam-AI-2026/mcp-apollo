# mcp-apollo

An open-source, production-quality **MCP server for Apollo.io** — gives your AI agents direct access to Apollo's B2B sales intelligence database.

Built and maintained by [AgenTeam](https://agenteamai.com). MIT licensed.

---

## What it does

`mcp-apollo` exposes six tools that let any MCP-compatible AI client (Claude Desktop, Claude Code, Cursor, Windsurf, and others) search Apollo's 275M+ person database, enrich contacts and companies, and pull hiring signals — all directly from the conversation, without switching tabs or copying data manually.

**AgenTeam agents that use this server:**
- **Jake** (SDR) — pulls verified prospect lists and finds emails
- **Grant** (GTM) — researches target accounts and market segments
- **Connor** (Sales) — enriches deal contacts before calls
- **Lauren** (Partnerships) — identifies partnership targets and key contacts

---

## Tools

### `apollo_search_people`
Search Apollo's database for people matching filters.

| Parameter | Type | Description |
|---|---|---|
| `person_titles` | `string[]` | Job titles, e.g. `["VP Engineering", "CTO"]` |
| `person_seniorities` | `string[]` | `"vp"`, `"c_suite"`, `"director"`, `"manager"`, `"senior"` |
| `organization_domains` | `string[]` | Company domains, e.g. `["stripe.com"]` |
| `person_locations` | `string[]` | Locations, e.g. `["New York", "San Francisco"]` |
| `organization_num_employees_ranges` | `string[]` | Size ranges, e.g. `["51,200", "201,500"]` |
| `page` | `number` | Page number (default: 1) |
| `per_page` | `number` | Results per page, max 25 (default: 10) |

Returns: id, name, title, company, email, email_status, LinkedIn URL, location, pagination, rate limits.

---

### `apollo_enrich_person`
Get a full enriched profile for a specific person.

| Parameter | Type | Description |
|---|---|---|
| `email` | `string` | Most reliable identifier |
| `linkedin_url` | `string` | LinkedIn profile URL |
| `first_name` + `last_name` + `organization_name` | `string` | Name + company combo |

At least one identifier is required. Returns: full profile including phone, employment history, email confidence.

---

### `apollo_search_companies`
Search for companies matching criteria.

| Parameter | Type | Description |
|---|---|---|
| `q_organization_keyword_tags` | `string[]` | Keywords/industries, e.g. `["SaaS", "fintech"]` |
| `organization_locations` | `string[]` | HQ locations |
| `organization_num_employees_ranges` | `string[]` | Size ranges |
| `organization_funding_stages` | `string[]` | `"Seed"`, `"Series A"`, `"Series B"` etc. |
| `page` | `number` | Page (default: 1) |
| `per_page` | `number` | Max 25 (default: 10) |

Returns: name, domain, headcount, funding stage, industry, location, LinkedIn.

---

### `apollo_enrich_company`
Get a full company profile by domain or name.

| Parameter | Type | Description |
|---|---|---|
| `domain` | `string` | e.g. `"stripe.com"` — preferred |
| `name` | `string` | Company name — fallback |

Returns: description, headcount, founding year, total funding, funding stage, tech stack, keywords, phone.

---

### `apollo_get_job_postings`
Get active job postings for a company — a strong buying/hiring signal.

| Parameter | Type | Description |
|---|---|---|
| `organization_id` | `string` | Apollo org ID — from `apollo_enrich_company` or `apollo_search_companies` |
| `job_titles` | `string[]` | Optional filter, e.g. `["engineer", "sales"]` |

Returns: list of postings with title, location, posted date, URL.

---

### `apollo_find_email`
Retrieve a person's verified email by their Apollo person ID.

| Parameter | Type | Description |
|---|---|---|
| `person_id` | `string` | Apollo person ID — from `apollo_search_people` |

Returns: email address, email_status, confidence score.

---

## Rate limits

| Apollo Plan | Requests / hour | Notes |
|---|---|---|
| Free | 50 | Good for testing |
| Basic | 200 | Small teams |
| Professional | 1,000 | Most sales teams |
| Organization | Custom | Enterprise |

This server surfaces rate-limit metadata in every tool response (`rate_limits.remaining`, `rate_limits.reset`). On 429 errors, it returns an informative message including the reset time — it never silently fails.

---

## Setup

### 1. Get an Apollo.io API key

1. Log in to [apollo.io](https://app.apollo.io)
2. Go to **Settings → Integrations → API**
3. Click **Create API Key**
4. Copy the key — you'll need it below

---

### 2. Connect to your MCP client

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp-apollo.agenteamai.com/mcp"],
      "env": {
        "APOLLO_API_KEY": "your_apollo_api_key_here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add apollo \
  --transport http \
  --url https://mcp-apollo.agenteamai.com/mcp \
  --header "Authorization: Bearer your_apollo_api_key_here"
```

#### Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "url": "https://mcp-apollo.agenteamai.com/mcp",
      "headers": {
        "Authorization": "Bearer your_apollo_api_key_here"
      }
    }
  }
}
```

#### Windsurf

In `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "serverUrl": "https://mcp-apollo.agenteamai.com/mcp",
      "headers": {
        "Authorization": "Bearer your_apollo_api_key_here"
      }
    }
  }
}
```

---

## Self-hosting / Development

### Prerequisites
- Node.js 18+
- A [Cloudflare account](https://cloudflare.com) (free tier is fine)
- `wrangler` CLI

### Local dev

```bash
git clone https://github.com/AgenTeam-AI-2026/mcp-apollo
cd mcp-apollo
npm install

# Create local secrets file (never committed)
echo 'APOLLO_API_KEY=your_key_here' > .dev.vars

npm run dev
```

The server runs at `http://localhost:8787`.

### Run tests

```bash
npm test                        # Unit + RALPH-loop tests
APOLLO_API_KEY=your_key npm test test/e2e/smoke.test.ts   # E2E against live API
```

### Deploy

```bash
npm install -g wrangler
wrangler login
wrangler deploy
```

Deployed URL: `https://mcp-apollo.<your-subdomain>.workers.dev`

---

## Security

- Your Apollo API key is passed as a `Bearer` token in the `Authorization` header
- The server **never stores, logs, or persists** your API key
- Each request is stateless — the key is used only for that request's Apollo API call
- Deployed on Cloudflare Workers — no server infrastructure to compromise

---

## Built by AgenTeam

[AgenTeam](https://agenteamai.com) builds AI agent teams for B2B sales and GTM operations. `mcp-apollo` is one of several open-source MCP servers we publish to give our agents — and yours — access to the tools modern sales teams rely on.

---

## License

MIT © AgenTeam-AI-2026
