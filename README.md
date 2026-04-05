# mcp-apollo

An open-source, self-hosted **MCP server for Apollo.io** — gives your AI agents direct access to Apollo's B2B sales intelligence database.

Deploy it to **your own Cloudflare account** in under 5 minutes. You own the infrastructure, you control the costs. No shared hosting, no vendor lock-in.

Built and maintained by [AgenTeam](https://agenteamai.com). MIT licensed.

---

## How it works

```
Your Cloudflare Workers account
  └── mcp-apollo Worker  (your deploy, your infra)
        └── MCP client sends requests with your Apollo API key
              └── Worker proxies to Apollo.io API
                    └── Returns enriched data to your agent
```

- **You** deploy the Worker to your own Cloudflare account (free tier handles most use cases)
- **You** pass your own Apollo.io API key on every request — the Worker never stores it
- **No shared infrastructure** — every user runs their own isolated instance

---

## Quick deploy (5 minutes)

### Prerequisites
- [Node.js](https://nodejs.org) 18+
- A [Cloudflare account](https://cloudflare.com) (free tier is sufficient)
- An [Apollo.io API key](https://app.apollo.io/#/settings/integrations/api)

### Steps

```bash
# 1. Clone the repo
git clone https://github.com/AgenTeam-AI-2026/mcp-apollo
cd mcp-apollo

# 2. Install dependencies
npm install

# 3. Log in to your Cloudflare account
npx wrangler login

# 4. Deploy
npx wrangler deploy
```

Your server is now live at:
```
https://mcp-apollo.<your-subdomain>.workers.dev
```

That's your personal MCP server URL. Use it in the connection configs below.

---

## Connect your MCP client

Replace `YOUR_WORKER_URL` with your deployed URL and `YOUR_APOLLO_KEY` with your Apollo.io API key.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "apollo": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://YOUR_WORKER_URL/mcp"],
      "env": {
        "APOLLO_API_KEY": "YOUR_APOLLO_KEY"
      }
    }
  }
}
```

Restart Claude Desktop after saving.

### Claude Code

```bash
claude mcp add apollo \
  --transport http \
  --url https://YOUR_WORKER_URL/mcp \
  --header "Authorization: Bearer YOUR_APOLLO_KEY"
```

### Cursor

In `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "url": "https://YOUR_WORKER_URL/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APOLLO_KEY"
      }
    }
  }
}
```

### Windsurf

In `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "apollo": {
      "serverUrl": "https://YOUR_WORKER_URL/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_APOLLO_KEY"
      }
    }
  }
}
```

---

## Get an Apollo.io API key

1. Log in to [apollo.io](https://app.apollo.io)
2. Go to **Settings → Integrations → API**
3. Click **Create API Key**
4. Copy the key — paste it into your MCP client config above

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

---

### `apollo_enrich_person`
Get a full enriched profile for a specific person.

| Parameter | Type | Description |
|---|---|---|
| `email` | `string` | Most reliable identifier |
| `linkedin_url` | `string` | LinkedIn profile URL |
| `first_name` + `last_name` + `organization_name` | `string` | Name + company combo |

At least one identifier is required.

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

---

### `apollo_enrich_company`
Get a full company profile by domain or name.

| Parameter | Type | Description |
|---|---|---|
| `domain` | `string` | e.g. `"stripe.com"` — preferred |
| `name` | `string` | Company name — fallback |

Returns: description, headcount, founding year, total funding, funding stage, tech stack, keywords.

---

### `apollo_get_job_postings`
Get active job postings for a company — a strong buying/hiring signal.

| Parameter | Type | Description |
|---|---|---|
| `organization_id` | `string` | Apollo org ID from `apollo_enrich_company` |
| `job_titles` | `string[]` | Optional filter, e.g. `["engineer", "sales"]` |

---

### `apollo_find_email`
Retrieve a person's verified email by their Apollo person ID.

| Parameter | Type | Description |
|---|---|---|
| `person_id` | `string` | Apollo person ID from `apollo_search_people` |

---

## Apollo.io rate limits

| Plan | Requests / hour |
|---|---|
| Free | 50 |
| Basic | 200 |
| Professional | 1,000 |
| Organization | Custom |

The server returns rate limit metadata with every response (`rate_limits.remaining`, `rate_limits.resetAt`). On 429 errors it returns an informative message — it never silently fails.

---

## Cloudflare Workers free tier

| Metric | Free limit |
|---|---|
| Requests | 100,000 / day |
| CPU time | 10ms / request |

100k requests/day is enough for most individual or small-team deployments. If you exceed it, upgrade to the [Workers Paid plan](https://developers.cloudflare.com/workers/platform/pricing/) ($5/month for 10M requests).

---

## Local development

```bash
npm install
npm run dev
# Server runs at http://localhost:8787
```

---

## Run tests

```bash
npm test                                        # unit + RALPH-loop tests
APOLLO_API_KEY=your_key npx vitest run test/e2e # E2E against live Apollo API
```

---

## CI/CD on your fork

The repo includes GitHub Actions workflows:

- **`ci.yml`** — runs typecheck, build check, and tests on every push
- **`deploy.yml`** — deploys to Cloudflare Workers on merge to `main`
- **`e2e.yml`** — nightly E2E tests against the live Apollo API

To enable auto-deploy, add these secrets in your fork under **GitHub → Settings → Secrets → Actions**:

| Secret | Where to get it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token (use "Edit Cloudflare Workers" template) |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers & Pages → right sidebar |

To enable nightly E2E tests, also add `APOLLO_API_KEY` as a secret and set the repo variable `APOLLO_E2E_ENABLED` to `true`.

---

## Security

- Your Apollo API key is passed as a `Bearer` token in the `Authorization` header on each request
- The Worker **never stores, logs, or persists** your API key
- Each request is stateless — the key is used only for that request's Apollo API call
- You control the entire deployment — no data touches third-party infrastructure

---

## Built by AgenTeam

[AgenTeam](https://agenteamai.com) builds AI agent teams for B2B sales and GTM operations. `mcp-apollo` is one of several open-source MCP servers we publish to give agents direct access to the tools modern sales teams rely on.

---

## License

MIT © AgenTeam-AI-2026
