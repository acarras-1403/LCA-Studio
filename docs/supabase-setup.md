# Supabase Setup — PurePastures GHG Data Entry Tool

> **STATUS: INTERIM — NOT THE FINAL VERSION (2026-11-17).**
> This file is incomplete. It fully documents only the Tool A tables. Three
> further tables exist in the live database and are listed below by name only
> (see "Tables present but not yet documented"). The full version, with columns,
> constraints and RLS for every table, is still to be written.
>
> **This version is sufficient for the LCA tool build** under the rules in the
> "LCA tool build rules" section. Claude Code must follow those rules and must
> not treat this file as a complete picture of the schema.

> Schema source of truth from the moment this file exists (CLAUDE.md). Update
> at every save point that touches the database.

**Project name:** purepastures
**Project ID:** ztkgbowwrlszbbfuhkid
**Project URL:** https://ztkgbowwrlszbbfuhkid.supabase.co
**Region:** eu-central-1 (Frankfurt)
**Plan:** Free — pauses after ~1 week with no traffic (D-15, deliberate trade-off, not an oversight). If the live tool shows connection errors after an idle period, restore the project manually in the Supabase dashboard.

This is a brand-new project created for the v5.0 D3 promotion (D-11, D-14) — it does not reuse the tool's earlier v1.0 project. Two unrelated pre-existing projects were found in this org at build time (`purepastures-ghg`, `acarras-1403's Project`, both dated 2026-07-04) and were deliberately left untouched; one is likely the prohibited v1.0 project, but cleanup of either is out of scope for this build (D-14 limitation).

## Tables

### `facility_reporting_period`

One row per facility per reporting year.

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| facility | text, not null | hardcoded facility id (e.g. `fac_north_plant`) — see `src/data/lookups.js` `FACILITIES` |
| reporting_year | integer, not null | |
| facility_country | text, not null | from `FACILITY_COUNTRIES` lookup |
| production_volume | numeric, not null | unit is the fixed `PRODUCTION_UNIT` constant, not stored per-row |
| annual_revenue | numeric, not null | currency is the fixed `CURRENCY` constant, not stored per-row |
| created_at | timestamptz, not null | `default now()` |

Unique constraint: `(facility, reporting_year)` — matches spec Section 5's "Key fields ... unique together." Enforced at the database, not just application logic.

### `activity_data`

One row per logged activity entry.

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| reporting_period | text, not null | `'YYYY-MM'` |
| facility | text, not null | hardcoded facility id |
| emission_source | text, not null | hardcoded source id — `category`/`subcategory`/`scope` are **not** stored; derived client-side from this via `deriveHierarchy()` |
| activity_data_value_raw | numeric, not null | |
| activity_data_unit_raw | text, not null | |
| activity_data_value_converted | numeric, not null | placeholder conversion factor (1.0/TBD) — not accurate, do not use downstream |
| activity_data_unit_converted | text, not null | |
| data_quality_rating | text, not null | one of `measured` / `calculated` / `estimated` / `proxy` |
| notes | text, nullable | |
| evidence_link | text, nullable | |
| reviewer | text, nullable | personal data — GDPR applies, see Section 7 of the spec |
| facility_reporting_period_ref | uuid, not null | FK → `facility_reporting_period(id)`, auto-assigned at submission by matching `facility` + year extracted from `reporting_period` |
| created_at | timestamptz, not null | `default now()` |

### Tables present but not yet documented

Verified in the live `public` schema on 2026-11-17. All three have RLS enabled.
Their columns, constraints and policies are **not documented here yet**. They
most likely come from the Tool B build (EF database and calculation logic).

| Table | Status |
|---|---|
| `ef_table` | exists, undocumented |
| `expected_matches` | exists, undocumented |
| `emissions_results` | exists, undocumented |

## LCA tool build rules

These rules apply until the final version of this file exists.

1. **Project:** build in `purepastures` (`ztkgbowwrlszbbfuhkid`) only. Never touch `purepastures-ghg` or `acarras-1403's Project`.
2. **Naming:** every new table, view, function and policy the LCA tool creates starts with `lca_`.
3. **Existing tables are off limits for changes:** never alter, drop, rename, add columns to, or change RLS on `facility_reporting_period`, `activity_data`, `ef_table`, `expected_matches` or `emissions_results`. Any change to these breaks Tools A/B.
4. **Reading existing tables:** if the LCA tool needs data from any of them, read only. Before writing a query against one of the three undocumented tables, inspect its live columns first; do not assume a structure.
5. **Before any migration:** list the live tables and confirm nothing new has appeared since 2026-11-17. If it has, stop and report.
6. **After each save point:** add every new `lca_` table to this file (columns, constraints, RLS), in the same format as the Tool A tables above.
7. **Free plan:** the project pauses after about a week with no traffic. All tools in this project share that limit.

## RLS Policies

_Documented for the two Tool A tables only._

Both tables: RLS enabled. `anon` role granted `SELECT` (`using (true)`) and `INSERT` (`with check (true)`) only — no `UPDATE`/`DELETE` policy exists on either table, so both are denied by default under RLS. Explicit `GRANT SELECT, INSERT` issued to `anon` on both tables.

The Supabase security advisor flags both `INSERT` policies as "always true" / unrestricted. **This is intentional, not a gap** — the tool is A1 (public, no login, no roles), so every anonymous visitor is equally entitled to insert; the flag is expected and accepted, not a fix-it item.

## Notes for future sessions

- Every `activity_data_value_converted` is computed via a placeholder `conversion_factor` (always `1.0`, `status: 'TBD'`) — see `CONVERSION_FACTORS` in `src/data/lookups.js`. Do not treat this column as accurate.
- No update/delete capability exists anywhere in the frontend — matches the RLS policies exactly (nothing to bypass).
- Tool B (future EF database + calculation logic + dashboard) will join this same project as a second tool. It reads `activity_data` and `facility_reporting_period` as they exist here; any schema change here should be treated as a breaking change for Tool B's own build.

---

# LCA Studio (this repo) — `lca_` objects

> Added 2026-11-17 by Claude Code, LCA Studio session 1. The PurePastures
> sections above are unchanged. Everything in this section was created by the
> LCA Studio build; no existing table, policy or bucket was altered.

Live tables confirmed before the first migration (2026-11-17): `facility_reporting_period`,
`activity_data`, `ef_table`, `expected_matches`, `emissions_results` — nothing new
had appeared, so the build proceeded.

## Tables

### `lca_vocabulary`

The fixed vocabulary and lookup table. Seeded from `docs/lca-demo-factors.xlsx`
(sheet `factors`, row order becomes `sort_order`). Read-only for the app.
**All factor values are fictional.**

| Column | Type | Notes |
|---|---|---|
| id | text, primary key | e.g. `EN_ELEC_ES` |
| label_en | text, not null | non-blank |
| label_es | text, not null | non-blank |
| category | text, not null | `material` / `energy` / `transport` / `waste` / `emission` |
| direction | text, not null | `input` / `output` |
| unit | text, not null | non-blank |
| dataset_name | text, not null | fictional dataset label shown in exports |
| factor_gwp | numeric, not null | >= 0, kg CO2-eq per unit |
| factor_water | numeric, not null | >= 0, m3 world-eq per unit |
| factor_res_minerals | numeric, not null | >= 0, kg Sb-eq per unit |
| factor_res_fossils | numeric, not null | >= 0, MJ per unit |
| factor_ecotox | numeric, not null | >= 0, CTUe per unit |
| sort_order | integer, not null | dropdown order; index `lca_vocabulary_sort_order_idx` |

Check constraint `lca_vocabulary_transport_unit_chk`: `category = 'transport'` if and
only if `unit = 'tkm'`.
Seeded rows: **57** (verified row for row against the workbook by digest).

### `lca_companies`

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| name | text, not null | non-blank, max 120 characters |
| name_key | text, generated | `lower(btrim(name))`, stored |
| is_example | boolean, not null | `default false` |
| created_at | timestamptz, not null | `default now()` |

Unique constraint `lca_companies_name_key_uq` on `(name_key)` — company names are
unique, case-insensitively.

### `lca_products`

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| company_id | uuid, not null | FK -> `lca_companies(id)` on delete cascade; index `lca_products_company_id_idx` |
| name | text, not null | non-blank, max 120 characters |
| name_key | text, generated | `lower(btrim(name))`, stored |
| image_path | text, nullable | path inside `lca-product-images` |
| is_example | boolean, not null | `default false` |
| created_at | timestamptz, not null | `default now()` |

Unique constraint `lca_products_company_name_uq` on `(company_id, name_key)`.

### `lca_studies`

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| product_id | uuid, not null | FK -> `lca_products(id)` on delete cascade; index `lca_studies_product_id_idx` |
| fu_amount | numeric, not null | > 0 |
| fu_unit | text, not null | `unit_of_product` / `box` / `pallet` / `kg` / `t` / `m2` / `l` |
| units_per_package | integer, nullable | > 0; only allowed when `fu_unit` is `box` or `pallet` |
| annual_production | numeric, nullable | > 0; required before upload (enforced in the interface) |
| intended_application | text, not null | `hotspot_identification` (default) / `product_improvement` / `b2b_communication` / `ecodesign` |
| intended_audience | text, not null | `internal` (default) / `b2b_customers` |
| comparative_assertion | boolean, not null | `default false`, check forces `false` |
| system_boundary | text, not null | `default 'cradle_to_gate'`, check forces that value |
| cutoff | text, not null | `mass_1pc` (default) / `mass_5pc` / `none` |
| allocation | text, not null | `mass` (default) / `economic` / `not_applicable` |
| data_quality_approach | text, not null | `primary_own_database_background` (default) / `mainly_estimated_screening` |
| geography | text, not null | ISO 3166-1 alpha-2, `default 'ES'` |
| reference_year | integer, not null | 2015-2026, `default 2025` |
| selected_indicators | text[], not null | subset of `gwp`, `water`, `res_minerals`, `res_fossils`, `ecotox`; at least one |
| chain_version | integer, not null | >= 1, `default 1`; incremented whenever the chain changes after an upload |
| status | text, not null | `scope` (default) / `chain` / `data` / `results` |
| is_example | boolean, not null | `default false` |
| created_at | timestamptz, not null | `default now()` |
| updated_at | timestamptz, not null | `default now()`, maintained by trigger |

Trigger `lca_studies_touch_updated_at` (before update) calls
`public.lca_touch_updated_at()`, which sets `updated_at = now()`.

### `lca_processes`

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| study_id | uuid, not null | FK -> `lca_studies(id)` on delete cascade; index `lca_processes_study_id_idx` |
| position | integer, not null | 1-12 |
| name | text, not null | non-blank, max 60 characters |
| name_key | text, generated | `lower(btrim(name))`, stored |

Unique constraints `lca_processes_study_position_uq` on `(study_id, position)` and
`lca_processes_study_name_uq` on `(study_id, name_key)`, both **deferrable initially
deferred**. That matters: the app saves a reordered chain as one bulk upsert, which
PostgREST runs in a single transaction, so positions may swap mid-statement without
tripping the constraint.

### `lca_inventory_rows`

One row per uploaded template row. Per-functional-unit quantities and impacts are
**not** stored; they are recalculated on display and on export.

| Column | Type | Notes |
|---|---|---|
| id | uuid, primary key | `default gen_random_uuid()` |
| study_id | uuid, not null | FK -> `lca_studies(id)` on delete cascade; index `lca_inventory_rows_study_id_idx` |
| process_id | uuid, not null | FK -> `lca_processes(id)` on delete cascade; index `lca_inventory_rows_process_id_idx` |
| source_sheet | text, not null | the template sheet the row came from |
| source_row | integer, not null | > 0, the Excel row number |
| direction | text, not null | `input` / `output` |
| vocabulary_id | text, not null | FK -> `lca_vocabulary(id)` |
| annual_quantity | numeric, not null | > 0; for transport rows this is tonnes moved per year |
| unit | text, not null | copied from the vocabulary item |
| distance_km | numeric, nullable | > 0 |
| data_quality | text, not null | `measured` / `calculated` / `estimated` |
| factor_gwp, factor_water, factor_res_minerals, factor_res_fossils, factor_ecotox | numeric, not null | >= 0, snapshot copied from `lca_vocabulary` at upload |
| created_at | timestamptz, not null | `default now()` |

Check constraint `lca_inventory_rows_transport_distance_chk`: `unit = 'tkm'` if and
only if `distance_km is not null`.

The factor snapshot is deliberate: re-seeding the vocabulary later never changes an
existing study's results.

## Functions

| Function | Notes |
|---|---|
| `public.lca_is_example_study(study_id uuid) returns boolean` | `stable`, `security definer`, `set search_path = ''`. True when the study, its product or its company is an example. Used by the `lca_processes` and `lca_inventory_rows` policies so child rows inherit the parent's protection. `execute` granted to `anon`. |
| `public.lca_touch_updated_at()` | trigger function, `security invoker`, `set search_path = ''`. |

## RLS Policies

RLS is **enabled on all six** `lca_` tables. The role is `anon` throughout; this tool
has no authentication.

| Table | Policy | Command | Rule |
|---|---|---|---|
| `lca_vocabulary` | `lca_vocabulary_anon_select` | select | `using (true)` |
| `lca_companies` | `lca_companies_anon_select` | select | `using (true)` |
| | `lca_companies_anon_insert` | insert | `with check (is_example = false)` |
| | `lca_companies_anon_update` | update | using and with check `is_example = false` |
| | `lca_companies_anon_delete` | delete | `using (is_example = false)` |
| `lca_products` | `lca_products_anon_select` | select | `using (true)` |
| | `lca_products_anon_insert` / `_update` / `_delete` | insert / update / delete | own `is_example = false` **and** parent company not an example |
| `lca_studies` | `lca_studies_anon_select` | select | `using (true)` |
| | `lca_studies_anon_insert` / `_update` / `_delete` | insert / update / delete | own `is_example = false` **and** parent product and company not examples |
| `lca_processes` | `lca_processes_anon_select` | select | `using (true)` |
| | `lca_processes_anon_insert` / `_update` / `_delete` | insert / update / delete | `lca_is_example_study(study_id) = false` |
| `lca_inventory_rows` | `lca_inventory_rows_anon_select` | select | `using (true)` |
| | `lca_inventory_rows_anon_insert` / `_update` / `_delete` | insert / update / delete | `lca_is_example_study(study_id) = false` |

Grants: `select` on `lca_vocabulary`; `select, insert, update, delete` on the other
five tables, to `anon`. RLS still applies on top.

**The Supabase security advisor flags the public select and insert policies as
"always true" / unrestricted. This is intentional and accepted**, exactly as for the
Tool A tables: LCA Studio is an A1 demo with no login, so every anonymous visitor is
equally entitled to read and to create their own studies. It is not a fix-it item.
The example study is protected by the policies above, not by hiding buttons.

Verified on 2026-11-17 with the anon key directly (not through the interface):
update and delete on the example company, product, study, processes and inventory
rows all affect zero rows; insert of a child under the example, and insert of any row
with `is_example = true`, are refused with `42501`; writes to `lca_vocabulary` affect
zero rows.

## Storage

Bucket `lca-product-images` — **public**, file size limit 5 MB, allowed MIME types
`image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`.

Paths: `products/<product_id>.<ext>` for user uploads (uploading a new photo replaces
the old one); `example/` holds the read-only example illustration
(`example/northwind-syringe.svg`, a line drawing of a syringe in granate and sage,
drawn for this build — no stock photography).

Policies on `storage.objects`, role `anon`:

| Policy | Command | Rule |
|---|---|---|
| `lca_storage_product_images_select` | select | `bucket_id = 'lca-product-images'` |
| `lca_storage_product_images_insert` | insert | `bucket_id = 'lca-product-images' and name not like 'example/%'` |
| `lca_storage_product_images_update` | update | same rule, using and with check |
| `lca_storage_product_images_delete` | delete | same rule |

Verified on 2026-11-17: uploading, overwriting or deleting anything under `example/`
is refused with `403 new row violates row-level security policy`, while
`products/...` writes succeed.

Bucket MIME types were narrowed to JPEG, PNG and WebP on 2026-11-18 by migration
`lca_06_storage_tighten`, which also dropped the one-off `lca_storage_seed_tmp_insert`
policy created to place the example illustration. Verified immediately afterwards:
an SVG upload to `products/` is refused with `415 invalid_mime_type`, a PNG upload
still succeeds, any write under `example/` is refused with `403`, and the example
illustration is still served.

The example SVG predates the narrowing and remains readable; no further SVG can be
uploaded by anyone.

## Seed data

- `lca_vocabulary`: 57 rows from `docs/lca-demo-factors.xlsx`, validated first
  (unique ids, both labels present, category and direction in the allowed sets, unit
  present, `tkm` on every transport item, all five factors numeric and >= 0 — zero
  errors). No factor was invented, changed or filled in.
- Example study, `is_example = true`: company **Northwind Medical**, product
  **Single-use syringe**, functional unit 1,000 x one unit of product, annual
  production 50,000,000 units, reference year 2025, geography DE, all five indicators,
  defaults elsewhere. Chain: Component sourcing -> Injection moulding -> Assembly ->
  EtO sterilisation -> Packaging. 28 inventory rows with invented **annual quantities
  only**; factors are joined from `lca_vocabulary`, never typed. The mix covers all
  three data quality levels and includes transport, waste and emission rows.

## Migrations applied

| Name | What it did |
|---|---|
| `lca_01_tables` | six tables, indexes, `lca_touch_updated_at`, `lca_is_example_study` |
| `lca_02_rls` | final `lca_is_example_study`, RLS enabled, all policies, grants |
| `lca_03_storage` | `lca-product-images` bucket and its four storage policies |
| `lca_04_seed_vocabulary` | 57 vocabulary rows |
| `lca_05_seed_example_study` | Northwind Medical example |
| `lca_06_storage_tighten` | dropped the temporary seeding policy; narrowed the bucket to JPEG, PNG and WebP |

**Last updated:** 2026-07-16 — by Claude Code, session 4 (v5.0 build).
**Interim update:** 2026-11-17 — interim status banner, list of undocumented live tables, and LCA tool build rules added. Tool A sections unchanged.
**LCA Studio:** 2026-11-18 — all six `lca_` migrations applied; storage tightened. Tool A sections unchanged.
