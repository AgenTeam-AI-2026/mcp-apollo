# Contributing to mcp-apollo

Thank you for your interest in contributing. This document explains how to contribute without breaking things for everyone.

---

## Ground rules

- **Never push directly to `main`** — all changes go through a Pull Request
- **CI must pass** before your PR can be merged — the test suite is the gate
- **One concern per PR** — small, focused PRs are reviewed faster
- **No new runtime dependencies without discussion** — open an issue first

---

## Development setup

```bash
git clone https://github.com/AgenTeam-AI-2026/mcp-apollo
cd mcp-apollo
npm install
npm run dev        # local Wrangler dev server on :8787
```

---

## Making a change

```bash
# 1. Create a branch off main
git checkout main
git pull
git checkout -b feat/your-feature-name

# 2. Make your changes

# 3. Run tests locally before pushing
npm test
npm run typecheck

# 4. Push and open a PR against main
git push origin feat/your-feature-name
```

Open a Pull Request on GitHub. CI will run automatically. A maintainer will review once CI is green.

---

## Test requirements

Every PR that touches `src/` must include or update tests.

| What changed | What's needed |
|---|---|
| New tool | Unit tests + RALPH-loop coverage |
| Bug fix | A test that would have caught the bug |
| Refactor | Existing tests must still pass |

Run the full suite:
```bash
npm test                        # unit + RALPH-loop
npm run typecheck               # TypeScript
npx wrangler deploy --dry-run   # build check
```

---

## Branch naming

| Type | Pattern | Example |
|---|---|---|
| Feature | `feat/...` | `feat/add-sequence-tool` |
| Bug fix | `fix/...` | `fix/rate-limit-header` |
| Docs | `docs/...` | `docs/update-cursor-setup` |
| Chore | `chore/...` | `chore/bump-sdk-version` |

---

## What makes a good PR

- Clear title: `feat: add apollo_get_sequences tool`
- Brief description of what changed and why
- Link to an issue if one exists
- Tests included
- CI green before requesting review

---

## Reporting a bug

Open an [issue](https://github.com/AgenTeam-AI-2026/mcp-apollo/issues) with:
- What you expected to happen
- What actually happened
- Which tool and input triggered it
- Apollo.io plan tier (free/paid affects rate limits)

---

## Suggesting a new tool

Open an issue with:
- The Apollo.io API endpoint it would use
- Which agent/use case needs it
- Sample input and expected output

Wait for a maintainer to confirm before building — avoids wasted effort.

---

## Commit message format

```
<type>(<scope>): <short description>

Examples:
feat(tools): add apollo_get_sequences tool
fix(auth): handle empty Bearer token correctly
docs(readme): update Windsurf connection config
chore(deps): bump @modelcontextprotocol/sdk to 1.30.0
```

---

## Questions?

Open an issue or reach out to the [AgenTeam](https://agenteamai.com) team.
