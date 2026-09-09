# Visora — Turn your data into dashboards instantly

Visora is an AI-augmented analytics platform that turns raw CSV/Excel files into
production-grade interactive dashboards in seconds. This is the complete rebuild
of the original Dashboard-Generator (React CRA) as a modern SaaS product.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn-style UI |
| Charts | Recharts |
| Drag & drop | dnd-kit |
| State | Zustand |
| Animation | Anime.js |
| Auth / DB / Storage | Supabase (Google OAuth + email/password, PostgreSQL, Storage) |
| In-browser queries | DuckDB-WASM |
| Data backend | FastAPI (Python) — profiler & recommender services |

## Project Structure

```
visora/
├── app/
│   ├── (auth)/login/        # Split-panel sign-in (Google OAuth + email)
│   ├── (app)/               # Authenticated shell (sidebar layout)
│   │   ├── workspace/       # Project library
│   │   ├── datasets/        # Upload + DuckDB-powered preview
│   │   ├── profiler/        # Column stats, quality, recommendations
│   │   └── builder/         # 3-panel dashboard studio
│   └── page.tsx             # Marketing landing page
├── components/              # ui/ · layout/ · landing/ · workspace/ · datasets/ · profiler/ · builder/
├── lib/                     # supabase.ts · duckdb.ts · anime.ts · analyze.ts · utils.ts
├── store/                   # dashboardStore.ts · datasetStore.ts (Zustand)
├── types/                   # Shared TypeScript types
├── middleware.ts            # Supabase session refresh + route protection
└── backend/                 # FastAPI service (profiler + recommender)
```

## Frontend Setup

```bash
cd visora
npm install
cp .env.example .env.local   # fill in your Supabase credentials
npm run dev                  # http://localhost:3000
```

Environment variables (`.env.local`):

```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
NEXT_PUBLIC_PROFILER_API_URL=http://localhost:8000   # optional FastAPI service
```

### Supabase setup

1. Create a project at supabase.com.
2. Enable the Google provider under Authentication → Providers (plus Email).
3. Run the schema:

```sql
create table datasets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text,
  file_path text,
  row_count integer,
  column_count integer,
  column_types jsonb,
  schema_meta jsonb,
  created_at timestamptz default now()
);

create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  dataset_id uuid references datasets,
  name text,
  status text default 'draft',
  widgets jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users,
  full_name text,
  avatar_url text,
  workspace_name text default 'My Workspace',
  updated_at timestamptz default now()
);
```

4. Create a storage bucket named `datasets` for uploaded files.

## Backend Setup (FastAPI)

```bash
cd visora/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Endpoints:

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Service heartbeat |
| POST | `/profiler/analyze` | Multipart file upload → column statistics, completeness, anomalies |
| POST | `/recommender/suggest` | Dataset schema → chart/widget recommendations |

## Design Tokens

Dark theme tokens are defined in `tailwind.config.ts` and must be used instead
of hardcoded colors: background `#0b1326`, surfaces `#131b2e → #2d3449`,
primary teal `#4cd7f6` / container `#06b6d4`, secondary purple `#ddb7ff`,
tertiary green `#4edea3`, error `#ffb4ab`, outline `#869397`,
text `#dae2fd` / muted `#bcc9cd`. Fonts: Plus Jakarta Sans (headings),
Inter (body), JetBrains Mono (metrics/code).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint |
