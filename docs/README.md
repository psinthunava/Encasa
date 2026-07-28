# Project Documentation — Encasa Household Expenses

**Last updated:** 2026-07-28

This directory is the **authoritative source of truth** for this project going forward.
When in doubt, these documents win over chat history or memory of prior conversation.

| Document | Purpose |
|---|---|
| [PRD.md](./PRD.md) | What we're building and why; feature status; what's out of scope |
| [SRS.md](./SRS.md) | Detailed functional and non-functional requirements |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Tech stack, folder structure, auth flow, deployment topology |
| [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) | Entity descriptions and design rationale (schema.prisma is canonical) |
| [API_SPEC.md](./API_SPEC.md) | Server Actions inventory — this app's "API" surface |
| [UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md) | Color/typography/component conventions |
| [ROADMAP.md](./ROADMAP.md) | Phased plan, what's done vs. pending |
| [KNOWN_ISSUES.md](./KNOWN_ISSUES.md) | Open bugs, operational gotchas, accepted limitations |
| [CHANGELOG.md](./CHANGELOG.md) | Chronological record of what shipped |
| [DECISION_LOG.md](./DECISION_LOG.md) | Why things are built the way they are |

## Working process from here on

1. Before implementing a feature: read the relevant docs above, summarize understanding,
   ask questions if anything's unclear — don't assume.
2. Every completed feature updates: CHANGELOG.md, ROADMAP.md, and DATABASE_SCHEMA.md /
   API_SPEC.md if the schema or Server Action surface changed.
3. Every non-trivial design decision gets an entry in DECISION_LOG.md.
4. Before changing an *existing* feature: state what will change, which files are affected,
   any migration/API implications, and possible side effects — before writing code.
5. Modify only the files a change actually touches. No unrelated rewrites.
6. If these docs and chat history ever disagree, the docs win — flag the conflict and ask
   before proceeding on the documented requirement.
