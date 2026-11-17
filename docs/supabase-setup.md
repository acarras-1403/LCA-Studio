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

**Last updated:** 2026-07-16 — by Claude Code, session 4 (v5.0 build).
**Interim update:** 2026-11-17 — interim status banner, list of undocumented live tables, and LCA tool build rules added. Tool A sections unchanged.
