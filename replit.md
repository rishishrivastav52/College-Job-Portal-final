# CampusHire Job Portal

CampusHire helps college students discover early-career roles, apply with a resume, and track outcomes while companies publish jobs and review applicants.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL`, `SESSION_SECRET`, and `BLOB_READ_WRITE_TOKEN`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/college-job-portal/src/` — React UI, route pages, and shared CampusHire visual components
- `artifacts/api-server/src/routes/` — role-aware auth, jobs, profiles, and applications API
- `lib/api-spec/openapi.yaml` — source of truth for API contracts and generated hooks
- `lib/db/src/schema/index.ts` — PostgreSQL schema for users, profiles, jobs, and applications

## Architecture decisions

- Account access uses signed HTTP-only sessions backed by the PostgreSQL user table because this college project explicitly requested simple database checks rather than a hosted auth provider.
- Resume files are uploaded server-side to Vercel Blob as private objects; the API proxies authorized resume reads so recruiters do not need direct store credentials.
- The frontend uses the generated OpenAPI client and role-aware routes so Student and Company experiences share one contract.

## Product

- Students can create accounts, browse searchable internships, maintain a profile, submit PDF resumes, and track application status.
- Companies can create accounts, publish roles, see applicant counts, review student resumes, and move applications through pending, reviewed, interview, or rejected.
- Demo accounts are seeded for quick exploration: `maya@campushire.demo` and `hello@northstar.demo`, both using `campus123`.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Run API codegen after editing `lib/api-spec/openapi.yaml`.
- Vercel Blob must be configured with a private store token; resume URLs intentionally point back through `/api/applications/:applicationId/resume`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
