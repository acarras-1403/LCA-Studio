# LCA Studio

## Identity
Guided cradle-to-gate LCA demo for people with no LCA knowledge: define goal and scope, draw a linear process chain, fill in an Excel template generated from it, and get impact results, a heat map and a data quality analysis. Public link, no login. All impact factors are fictional.
Tier: 2 — public tool, no login, data persists in Supabase (D3+A1)
Spec version governed: v1.0 — the version of docs/product-spec.md these rules were derived from.
Position: Standalone tool co-located in the existing Supabase project "purepastures", which also hosts the unrelated PurePastures GHG tools; this tool builds on the existing project and adds only its own lca_ objects.

## Session Protocol
At the start of every session:
1. Pull the latest from main before reading anything else.
2. Check docs/product-spec.md: if its version is newer than the "Spec version governed" line in this file, STOP. Tell the builder: "The spec has changed since this CLAUDE.md was written — re-run the Project Governor on the revised spec before building, or these rules may contradict it." Do not build against a stale CLAUDE.md.
3. Read PROGRESS.md in the project root — it is the current state of this build. If it is missing, recreate it with the structure at the end of this section, then continue.
4. Increment the session number and update the date in PROGRESS.md.
5. If "Notes for next session" has content: repeat the notes back to the builder, treat them as this session's priorities, then clear the section.
6. If this is session 1, run First Session Setup below before any build work.

Save point — after completing any module, feature, fix, or schema change:
1. Update PROGRESS.md: current state, remaining work, build decisions, known issues.
2. If the database was touched (any table, policy, function, bucket change), update docs/supabase-setup.md in the same save point.
3. Commit and push to main.
4. Tell the builder in one line: "Save point committed: [what changed]."
Do not start the next piece of work before the save point is pushed. Never end a session without one — an ending session is a save point.

First Session Setup (session 1 only):
1. Create docs/ and move product-spec.md, supabase-setup.md and lca-demo-factors.xlsx into it.
2. Announce what moved, then commit and push before building anything.

PROGRESS.md structure (for the recreate rule): status header (Session / Last updated / Live URL), Current state, Last session (3–5 lines, replace each session), Remaining work (shrinking checklist), Build decisions (one line each), Known issues, Notes for next session.

## Commands
```
npm install
npm run dev
npm run build
```

## Tech Stack
React · Vite · Tailwind CSS · shadcn/ui · Netlify · Supabase
Deployment: GitHub → Netlify, auto-deploys from main. Netlify MCP is active — create the site, set environment variables, and deploy via MCP. Configure SPA redirects so /studies/<id> deep links load.

## Arms
Export — browser only, no server function — PDF report (8 sections) and Excel workbook (6 sheets), in the active language: design per spec Section 3, Export Arm.

## Environment Variables
VITE_SUPABASE_URL — Supabase: Project Settings → API → Project URL — Netlify env var
VITE_SUPABASE_ANON_KEY — Supabase: Project Settings → API → anon / public key — Netlify env var
The service role key is not used by this tool — never add it anywhere.
Key storage follows function placement: Netlify Functions and scheduled functions read Netlify environment variables. Supabase Edge Functions read Supabase Edge Function secrets — they CANNOT read Netlify environment variables. A key in the wrong store fails silently at runtime. At session start, confirm these exist before first use; prompt the builder for any that are missing. No value ever appears in code or in any file committed to GitHub.

## Supabase
Project: "purepastures" (ID ztkgbowwrlszbbfuhkid) — already exists. Project URL: https://ztkgbowwrlszbbfuhkid.supabase.co. Plan: Free — pauses after ~1 week without traffic.
docs/supabase-setup.md is the schema source of truth and is marked INTERIM; its section "LCA tool build rules" is binding. Read it before any database work. Never recreate tables or policies that already exist. Before every migration, list the live tables; if anything other than this tool's lca_ objects appeared after 2026-11-17, stop and report. Update the file at every save point that touches the database; never edit its PurePastures sections.

Tables this tool uses: only these new tables — create them, then document in docs/supabase-setup.md:
lca_vocabulary: id (text), label_en, label_es, category, direction, unit, dataset_name, factor_gwp, factor_water, factor_res_minerals, factor_res_fossils, factor_ecotox, sort_order
lca_companies: id, name (unique, case-insensitive), is_example, created_at
lca_products: id, company_id (FK lca_companies, cascade), name (unique per company), image_path, is_example, created_at
lca_studies: id, product_id (FK lca_products, cascade), fu_amount, fu_unit, units_per_package, annual_production, intended_application, intended_audience, comparative_assertion, system_boundary, cutoff, allocation, data_quality_approach, geography, reference_year, selected_indicators, chain_version, status, is_example, created_at, updated_at
lca_processes: id, study_id (FK lca_studies, cascade), position, name
lca_inventory_rows: id, study_id (FK, cascade), process_id (FK lca_processes, cascade), source_sheet, source_row, direction, vocabulary_id (FK lca_vocabulary), annual_quantity, unit, distance_km, data_quality, factor_gwp, factor_water, factor_res_minerals, factor_res_fossils, factor_ecotox, created_at
Function: lca_is_example_study(study_id). Storage bucket: lca-product-images — public; products/<product_id>.<ext>; example/ prefix protected; JPG/PNG/WebP, max 5 MB.
RLS: lca_vocabulary — anon read only. All other lca_ tables — anon read all; insert, update and delete only when the row and its parents are not examples (use lca_is_example_study for processes and inventory rows). Storage — anon read all; write anywhere except example/. Advisor "always true" warnings are accepted (A1 demo) — document them as intentional.
Seed: lca_vocabulary from sheet "factors" of docs/lca-demo-factors.xlsx (row order = sort_order), after validating it per spec Section 5. Then the read-only Northwind Medical example study per spec Section 5 "Seed data".

## Hard Rules
- API keys never in any frontend file or GitHub commit. Storage follows function placement: Netlify env vars for Netlify Functions, Supabase Edge Function secrets for Supabase Edge Functions — Edge Functions cannot read Netlify env vars. Always called through a server-side function.
- Netlify Identity: never. This tool has no authentication at all.
- RLS: never disabled on any table. If a query fails, fix the policy or the query — never disable RLS to work around it.
- This tool shares a Supabase project with the PurePastures GHG tools. Protected tables — facility_reporting_period, activity_data, ef_table, expected_matches, emissions_results — must not be modified: no schema changes, no RLS changes. This tool never queries them. Never touch the projects purepastures-ghg or acarras-1403's Project. Every object this tool creates starts with lca_ (bucket: lca-product-images).
- Factor values: never invent, change or fill in factors. If docs/lca-demo-factors.xlsx fails validation or lacks items the example needs, stop and ask the builder. Invent only annual quantities for the example study.
- The builder's real workbook LCA_Modelling_calculations_v3.xlsx (real ecoinvent values, client data) must never enter the repo.

## Brand
No brand skill. These inline rules come from the builder's brand guidelines (spec Section 10) and apply to every view and export:
- Background #F7F5F2 · Text #1F1D1B · Granate #7A1F2B is the only action colour (buttons, links, active states, headings); hover #5C1520.
- Sage #8A9A7B for accents only, never text or buttons · Sage dark #5E6E52 secondary text · Sage light #E6EBE1 cards · Warm grey #6B6560 metadata.
- Fonts: Source Serif 4 600 headings, Source Sans 3 400/600 body, self-hosted (no Google Fonts CDN). Never Tailwind blue or gray defaults.
- Corners 6–8 px; no gradients, no strong shadows, no flashy animation, no stock imagery. Text contrast ≥ 4.5:1 in light and dark modes.
- Copy: British English and Spain Spanish (tú); no middle dots as separators in interface copy. Logo: text wordmark in granate until logo files are added.

## Business Rules
- Number of functional units per year N_FU = annual_production ÷ fu_amount; quantity per FU = annual_quantity ÷ N_FU. Transport rows: (annual tonnes × distance_km) ÷ N_FU = tkm per FU. Transport mode is chosen in the Type column.
- Impact per row = quantity per FU × the row's factor snapshot (copied from lca_vocabulary at upload). Never store per-FU values or impacts — recalculate on display.
- All five indicators are always calculated; only selected_indicators are displayed and exported.
- Data quality: Measured 1, Calculated 2, Estimated 3; process score = impact-weighted mean; Good < 1.5, Fair 1.5–2.5, Poor > 2.5; unweighted mean if the process total is 0. Heat map: process impact ÷ largest process impact, linear from #E6EBE1 to #7A1F2B; "No data" processes grey.
- Upload: reject the whole file if any row is invalid; list every error as sheet · row · column · reason; refuse templates from another study or an older chain_version. Changing the chain after upload: warn, then delete inventory rows and increment chain_version.
- Unit is fixed by the vocabulary item; allocation, cut-off, data quality approach, geography and units per package are recorded only, never used in calculations.
- Display 3 significant figures; full precision in the Excel export. Fictional-data banner on every view and in both exports. The spec Section 9 worked check is a unit test and must reproduce exactly.

Out of scope — do not build: login, accounts, roles, permissions; AI matching of inputs; branching or merging chains; distribution, use, end of life; separate bill of materials; pedigree matrix; per-process production volumes; public comparative assertions; real ecoinvent or licensed data; typing inventory into forms; study version history or edit locking; CSV export.

## Reference Docs
Read before building the related part:
- docs/product-spec.md — full module specs, UI sections, logic, export design, acceptance criteria
- docs/supabase-setup.md — schema source of truth (exists — read first; follow its LCA tool build rules)
- docs/lca-demo-factors.xlsx — fictional vocabulary and factors to seed lca_vocabulary
Code layout is Claude Code's choice (record it in PROGRESS.md Build decisions); root holds only CLAUDE.md and PROGRESS.md.
PROGRESS.md in the root is read at every session start per the Session Protocol.
