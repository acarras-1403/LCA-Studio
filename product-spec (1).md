# Product Spec — LCA Studio

**Version:** 1.0
**Date:** 17 November 2026
**Author:** Andrea Carrascosa
**Status:** Confirmed
> The Tool Architect sets this to **Confirmed** when the builder confirms the Phase 10 summary. The Project Governor will not accept a spec in any other status.

---

> **How to use this template**
> Fill in every section that applies to your tool. Sections marked **CONDITIONAL** can be skipped if the condition does not apply. Text in `[brackets]` is a placeholder — replace it. When complete, this document is handed to the Project Governor skill to produce a CLAUDE.md. For Tier 2 and Tier 3 tools, Claude Code builds all Supabase infrastructure via MCP during the build session using the information in this spec. A Supabase QA skill can be used after the build to verify the setup.

---

## Section 1 — Tool Summary

**Tool name:** LCA Studio

**What it does:** A guided, cradle-to-gate life cycle assessment (LCA) tool for people with no LCA knowledge. The user defines goal and scope, draws their production process as a straight chain of boxes, downloads an Excel template generated from that chain, fills it in with annual data, uploads it, and gets impact results per functional unit (totals, contribution per process, hotspots per input, a heat map of their own process chain, and a data quality analysis), downloadable as a PDF report and an Excel workbook.

**Who uses it:** Prospects of Andrea Carrascosa's sustainability practice (manufacturing and industrial companies) during sales demos, plus Andrea herself when presenting. Users have no LCA training: they know their products, their annual purchases, energy bills and waste, but not datasets, characterisation methods or ISO terminology.

**Why it exists:** It is a **demo tool**. It shows prospects what a structured, ISO 14040/44-style product LCA looks like and how their own data turns into results, without exposing licensed data. **All impact factors are fictional.** The tool must never present itself as a real assessment tool.

**Build status:** First build — no prior web version. The calculation logic comes from Andrea's Excel model (`LCA_Modelling_calculations_v3.xlsx`), which was checked against openLCA. That workbook contains real ecoinvent values and client data and is **not** part of this repo; only the logic described in Section 9 is used.

---

## Section 2 — Classification

This section defines the architecture of the tool. Every downstream decision follows from this.

### Data Model

**Decision:** D3

| Label | What it means | This tool? |
|-------|--------------|-----------|
| D1 — Hardcoded | All data is written into the code by the developer. Users cannot input anything that persists. The tool displays what the developer put in. | No |
| D2 — Session | Data enters the tool during use and disappears when the tab closes. No database. Covers both uploaded files and form inputs. | No |
| D3 — Persisted | Data is written to a database and survives after the session ends. Supabase is required. | Yes |

**Reason:** Studies (goal and scope, process chain, uploaded inventory, results) and product images must be saved so they appear on the homepage and can be reopened, duplicated and shown in later demos.

**D3 is triggered if any of the following are true — check all that apply:**
- [x] Data must be retrievable after the session ends
- [x] Multiple sessions contribute to the same dataset
- [ ] An audit trail or history is needed
- [x] Data submitted by one person must be visible to another
- [x] Results must be accessible via a URL after the session ends
- [x] Files uploaded by users must be stored and retrievable later

---

### Access Model

**Decision:** A1

| Label | What it means | This tool? |
|-------|--------------|-----------|
| A1 — Public | Anyone with the URL can use it. No login, no account required. | Yes |
| A2 — Authentication | Users must log in. All logged-in users see the same thing and have the same permissions. | No |
| A3 — Authorization | Users must log in and have different roles. Different roles see different data or have different permissions. | No |

**Reason:** It is a demo with fictional data; the builder explicitly accepted that anyone with the link can see, edit and delete every study. The single exception is the seeded example study, which the database itself protects from any change (see Section 5).

> **Promotion rule:** Auth requires a database. If the access model is A2 or A3, the data model is D3 — even when all displayed content is fixed. D1/D2 combined with A2/A3 are not valid classifications; they resolve to D3.

---

### If Access Model is A2 — complete both questions

Not applicable — the access model is A1.

---

### If Access Model is A3 — define all roles

Not applicable — the access model is A1. No roles.

---

### Tier

**Tier:** 2

| Tier | D+A combination | Stack | Deployment |
|------|----------------|-------|------------|
| 1 | D1+A1 or D2+A1 | Netlify only | Netlify |
| 2 | D3+A1 | Netlify + Supabase (no auth) | Netlify |
| 3 | D3+A2 or D3+A3 | Netlify + Supabase (auth + RLS) | Netlify |

---

### Standalone or Stack

**This tool is:** Standalone in function — it reads and writes only its own `lca_` tables and storage bucket. It is **co-located** in an existing Supabase project (`purepastures`) that already hosts the unrelated PurePastures GHG tools. It shares no tables or data with them. See the stack block in Section 4 for the co-location rules.

> If this tool has both a public-facing side and a restricted internal side (e.g. a public form + an internal review dashboard), that is a stack — two separate tools sharing one Supabase project. Classify each tool separately.

---

## Section 3 — Arms

Arms are capabilities added to the tool. They do not change the tier. Mark each arm active or not, and complete the detail only for active arms.

> **Document search and AI knowledge bases are outside this framework version.** If your tool needs natural-language search over a document collection (RAG, embeddings, vector search), that is an advanced build with its own architecture, costs, and maintenance — it does not fit the standard AILab pipeline. Note it under Out of Scope (Section 12) and validate the core tool first.

---

### AI API Arm

**Active:** No

Mapping of inputs to datasets is deterministic, through a fixed vocabulary and lookup table (Section 9). No AI service is used anywhere in the tool.

---

### Export Arm

**Active:** Yes

| Detail | Answer |
|--------|--------|
| Format | PDF report + Excel workbook (.xlsx). Both generated in the browser — no server function. (CSV is not offered; the Excel workbook replaces it.) |
| What is exported | **PDF:** the full study report (layout below). **Excel workbook**, sheets in this order: (1) *Summary* — goal and scope fields, functional unit, annual production, selected indicators, totals per indicator per functional unit; (2) *Inventory* — every inventory row per functional unit: process, direction, type label, dataset name, annual quantity, unit, distance (transport), quantity per functional unit, factor per selected indicator, data quality; (3) *Results by process* — impact per process per selected indicator, with % share; (4) *Results by row* — impact per inventory row per selected indicator, with % share, sorted by climate change (or the first selected indicator) descending; (5) *Data quality* — share of each indicator from Measured / Calculated / Estimated rows, and the data quality score and badge per process; (6) *Disclaimer* — the fictional-data statement and the limitations list. Only selected indicators appear. Both exports follow the active interface language (EN-GB or ES-ES), including number formatting (Spanish: comma decimal separator). |
| PDF design intent | **A4 portrait, brand-styled** (Section 10): Source Serif 4 600 for headings, Source Sans 3 for body, granate headings and rules, sage accents, generous white space, no gradients or shadows. Footer on every page: tool name, study name, page X of Y, and the text "Demo database: fictional values". **Pages / sections in order:** (1) **Cover** — Andrea Carrascosa wordmark (logo PNG if present in the repo, otherwise the name set in Source Serif 4 600 in granate), product image (if uploaded; otherwise no image, never a stock photo), company name, product name, functional unit, reference year, report date, and a clearly visible label "Demonstration — fictional data". (2) **Goal and scope** — two-column table of every goal and scope field (Section 8, Step 1), including the locked fields. (3) **Process chain** — the user's chain drawn as boxes left to right with arrows, process names inside. (4) **Results per indicator** — one block per selected indicator: total per functional unit with unit, horizontal bar chart of contribution per process, and a table of the top 5 contributing inventory rows with % share. (5) **Heat map** — the process chain coloured by share of impact, one diagram per selected indicator, with the colour legend. (6) **Data quality analysis** — per selected indicator, a stacked bar of the share from Measured / Calculated / Estimated rows; table of processes with score and badge (Good / Fair / Poor). (7) **Limitations** — fixed text (Section 9, "Limitations"). (8) **Disclaimer** — "All impact factors in this tool are fictional and for demonstration only. Results must not be used for decisions, claims or communication." (and the Spanish equivalent when the language is ES). |

---

### Email Arm

**Active:** No

---

### Scheduled Automation Arm

**Active:** No

---

## Section 4 — Stack and Deployment

### All Tiers

| Detail | Answer |
|--------|--------|
| Frontend framework | React + Vite + Tailwind |
| Deployment target | Netlify |
| Netlify MCP | Active — Netlify is connected via Claude Desktop Connectors. Claude Code will create the site, set environment variables, and deploy automatically. Configure SPA routing so deep links such as `/studies/<id>` load correctly (redirect all paths to `index.html`). |

**GitHub — pre-build requirement for all Tier 1, 2, and 3 tools:**
The user creates the GitHub repo before the first Claude Code session. The product-spec.md, CLAUDE.md, and PROGRESS.md must be uploaded to the repo root before Claude Code opens. Claude Code assumes the repo exists, commits changes regularly, and pushes to main. It does not create or configure the repo.

**Additional files for this tool, uploaded flat to the repo root:** `supabase-setup.md` (the interim file from the PurePastures build — required, see below) and `lca-demo-factors.xlsx` (the builder's fictional factor file — required, see Section 9). Optional: the logo PNG and tree-ring icon from the brand guidelines.

**Library guidance (Claude Code may substitute equivalents with the same capability):** an Excel library that can write **data-validation dropdowns, formulas, hidden sheets and locked cells** (e.g. ExcelJS) for the template and the Excel export; a browser PDF library for the report; a charting library for bar charts; a simple SVG implementation (not a heavy diagram framework) for the linear process chain and heat map; self-hosted fonts (e.g. Fontsource packages) — do not load Google Fonts from Google's servers.

---

### CONDITIONAL: Supabase project — only complete if Tier 2 or Tier 3

**Supabase project status:** Existing — a project already exists for this context

**Supabase plan:** Free — pauses after roughly one week of no traffic. Deliberate choice by the builder. All tools in this project share the limit. Before a prospect meeting, the builder opens the tool (or restores the project in the Supabase dashboard if it is paused).

**If existing:**

| Detail | Answer |
|--------|--------|
| Project name | purepastures |
| Project ID | ztkgbowwrlszbbfuhkid |
| Project URL | https://ztkgbowwrlszbbfuhkid.supabase.co |
| Region | eu-central-1 (Frankfurt) |
| supabase-setup.md location | docs/supabase-setup.md in the project folder (uploaded to the repo root by the builder; Claude Code moves it to docs/ in First Session Setup) |

> Claude Code will read supabase-setup.md before making any schema changes. It will not recreate tables or policies that already exist.

**The supabase-setup.md for this project is marked INTERIM.** It documents only two of the five existing tables. Its section "LCA tool build rules" is binding for this build and is repeated here so it cannot be missed:

1. **Project:** build in `purepastures` (`ztkgbowwrlszbbfuhkid`) only. Never touch `purepastures-ghg` or `acarras-1403's Project`.
2. **Naming:** every new table, view, function, trigger and policy this tool creates starts with `lca_`. The storage bucket is named `lca-product-images` (bucket names use hyphens); its storage policies start with `lca_`.
3. **Existing tables are off limits:** never alter, drop, rename, add columns to, or change RLS on `facility_reporting_period`, `activity_data`, `ef_table`, `expected_matches` or `emissions_results`. LCA Studio does not read them either — it needs nothing from them.
4. **Before any migration:** list the live tables and confirm nothing new has appeared since 2026-11-17 beyond this tool's own `lca_` objects. If something has, stop and report to the builder.
5. **After each save point:** add every new `lca_` table, function, policy and the storage bucket to docs/supabase-setup.md (columns, constraints, RLS), in the same format as the existing Tool A tables. Do not edit the PurePastures sections.
6. **Free plan:** the project pauses after about a week with no traffic.

**supabase-setup.md — all Tier 2 and Tier 3 tools:**
This file is created by Claude Code at the end of the first build session and updated every time Claude Code touches the database. It lives permanently in docs/ and records the project name, project ID, all tables and fields, RLS policies, and auth configuration. It is the schema source of truth for all future build sessions and for the Supabase QA skill.

---

### CONDITIONAL: Only complete if this tool is part of a stack

**Stack name / Supabase project name:** purepastures (shared project — co-location only, no data flow between tools)

**This tool's role in the stack:** Independent tenant. LCA Studio shares the Supabase project, its free-plan limits and its pause behaviour with the PurePastures tools. It does not read or write their tables, and they do not read or write its tables.

**Other tools in this stack:**

| Tool | Tier | Role in the stack |
|------|------|------------------|
| PurePastures GHG Data Entry Tool (Tool A) | Tier 2 | Owns `facility_reporting_period` and `activity_data`. Already built. |
| PurePastures EF database / calculation (Tool B) | Unknown | Most likely owns `ef_table`, `expected_matches`, `emissions_results` (undocumented). |
| LCA Studio (this tool) | Tier 2 | Owns every `lca_` table, function and policy, and the `lca-product-images` bucket. |

> **Build order:** the tool that creates the schema builds first (usually the public/submission side) — its spec marks the Supabase project as new. Every other tool in the stack marks the project as existing, and their build sessions must not start until the first build is complete and docs/supabase-setup.md exists. Each tool gets its own spec, its own repo, its own CLAUDE.md, and its own Netlify site — the shared Supabase project is the only thing connecting them.

Build-order status: satisfied. The project and its (interim) supabase-setup.md already exist. LCA Studio gets its own repo and its own Netlify site.

---

## Section 5 — Data Architecture

### CONDITIONAL: Only complete if Data Model is D3

This section is the input Claude Code uses to build the database schema via MCP. Describe tables and fields in plain language — Claude Code handles the technical implementation.

**What data is collected or stored in this tool:**

| Field name | Plain language label | Data type | Who provides it | Required? |
|-----------|---------------------|-----------|----------------|-----------|
| company_name | Company name | Text | User (Step 1) | Yes |
| product_name | Product name | Text | User (Step 1) | Yes |
| product_image | Product photo | Image file (JPG / PNG / WebP, max 5 MB) | User (Step 1) | No |
| fu_amount | Functional unit — amount | Number > 0 | User (Step 1) | Yes |
| fu_unit | Functional unit — unit | One of: `unit_of_product`, `box`, `pallet`, `kg`, `t`, `m2`, `l` | User (Step 1) | Yes |
| units_per_package | Units of product per box / pallet | Integer > 0 | User (Step 1, shown only for box / pallet) | No |
| annual_production | Annual production, in the functional unit's unit | Number > 0 | User (Step 1) | Yes (before upload) |
| intended_application | Intended application | Pick list | User (Step 1) | Yes (default set) |
| intended_audience | Intended audience | Pick list | User (Step 1) | Yes (default set) |
| comparative_assertion | Comparative assertion disclosed to the public | Boolean, locked to false | Automatic | Yes |
| system_boundary | System boundary | Text, locked to `cradle_to_gate` | Automatic | Yes |
| cutoff | Cut-off criteria | Pick list | User (Step 1) | Yes (default set) |
| allocation | Allocation procedure | Pick list | User (Step 1) | Yes (default set) |
| data_quality_approach | Data quality approach | Pick list | User (Step 1) | Yes (default set) |
| geography | Geography | Country (ISO code) | User (Step 1) | Yes (default ES) |
| reference_year | Reference year | Integer | User (Step 1) | Yes (default 2025) |
| selected_indicators | Impact indicators to assess | List of indicator codes (min. 1) | User (Step 1) | Yes |
| process name / position | Processes in the chain | Text + order | User (Step 2) | Min. 1 process |
| inventory rows | One row per input or output per process (Section 9) | Mixed | User (Excel upload, Step 3) | Yes, to see results |
| created_at / updated_at | Timestamps | Timestamp | Automatic | Yes |

**Tables needed:**

| Table name | What it stores | Key fields |
|-----------|---------------|-----------|
| `lca_vocabulary` | The fixed vocabulary and lookup table: every input/output type a user may pick, its fixed unit, its (fictional) dataset name and one factor per indicator. Seeded from `lca-demo-factors.xlsx`; read-only for the app. | id (text code, e.g. `ELEC_ES_GRID`), label_en, label_es, category (`material` / `energy` / `transport` / `waste` / `emission`), direction (`input` / `output`), unit (text; `tkm` for transport), dataset_name, factor_gwp, factor_water, factor_res_minerals, factor_res_fossils, factor_ecotox (all numeric ≥ 0), sort_order |
| `lca_companies` | One row per company | id (uuid), name (unique, case-insensitive), is_example (bool, default false), created_at |
| `lca_products` | One row per product of a company | id, company_id (FK → lca_companies, on delete cascade), name (unique per company, case-insensitive), image_path (nullable, path in `lca-product-images`), is_example, created_at |
| `lca_studies` | One row per LCA study: all goal and scope fields from the table above, plus status | id, product_id (FK → lca_products, on delete cascade), all goal and scope fields, chain_version (integer, incremented every time the chain changes), status (`scope` / `chain` / `data` / `results`), is_example, created_at, updated_at |
| `lca_processes` | One row per box in a study's chain | id, study_id (FK → lca_studies, on delete cascade), position (1..n, unique per study), name (unique per study, case-insensitive) |
| `lca_inventory_rows` | One row per uploaded template row | id, study_id (FK, cascade), process_id (FK → lca_processes, cascade), source_sheet, source_row (Excel row number), direction, vocabulary_id (FK → lca_vocabulary), annual_quantity (numeric > 0), unit, distance_km (nullable; required for transport), data_quality (`measured` / `calculated` / `estimated`), factor snapshot: factor_gwp, factor_water, factor_res_minerals, factor_res_fossils, factor_ecotox (copied from lca_vocabulary at upload time), created_at |

Rules for the schema:
- `is_example` is set to true only on the seeded example rows. Child tables (`lca_processes`, `lca_inventory_rows`) inherit protection through their parent study: create a SQL helper function `lca_is_example_study(study_id)` and use it in policies.
- Quantity per functional unit and impacts are **not** stored; they are recalculated from annual values, the study's functional unit and annual production, and the factor snapshot whenever the study is displayed or exported (Section 9). This means changing the functional unit or annual production updates results immediately without a new upload.
- The factor snapshot keeps a study's results stable if the vocabulary is re-seeded later.

**Access rules for the anonymous (public) role — implement as RLS policies prefixed `lca_`:**

| Table | Read | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| `lca_vocabulary` | All rows | No | No | No |
| `lca_companies` | All rows | Yes (is_example must be false) | Only where is_example = false | Only where is_example = false |
| `lca_products` | All rows | Yes, only under a company where is_example = false | Only where is_example = false | Only where is_example = false |
| `lca_studies` | All rows | Yes, only under a product where is_example = false | Only where is_example = false | Only where is_example = false |
| `lca_processes` | All rows | Only for a non-example study | Only for a non-example study | Only for a non-example study |
| `lca_inventory_rows` | All rows | Only for a non-example study | Only for a non-example study | Only for a non-example study |

The Supabase security advisor will flag the unrestricted public policies. **This is intentional** (A1 demo tool, accepted by the builder) — document it in supabase-setup.md as accepted, like the existing Tool A note. The example study's protection must be enforced by these policies, not only by hiding buttons in the interface.

**File storage:** Yes
Product photos, for visual purposes only. Public bucket `lca-product-images`. One image per product, path `products/<product_id>.<ext>`; uploading a new one replaces the old one. Accepted: JPG, PNG, WebP, max 5 MB (validated in the interface and by bucket settings). Anonymous users can read all, and insert / update / delete any object except under the prefix `example/`. Deleting a product deletes its image. The example product's image is a simple line illustration of a syringe in brand colours (granate and sage), created by Claude Code as an SVG and stored under `example/` (no stock photography — brand rule). Images appear on the homepage product card, the study header and the PDF cover. The upload control shows the hint "Product photo only — please do not upload images of people or confidential documents."

**Derived or calculated data:** Yes
Quantity per functional unit, impact per row / process / study for each indicator, % shares, data quality shares and scores, and heat map colours. All derived from the stored annual inventory rows, study fields and factor snapshot. Full logic in Section 9.

**Seed data (created by migration, is_example = true):**
- `lca_vocabulary`: every row of `lca-demo-factors.xlsx`. Validation before seeding: unique IDs, both labels present, category and direction in the allowed sets, unit present (`tkm` for every transport item), all five factors numeric and ≥ 0. If the file fails validation, stop and report the problems to the builder — never invent or fill factor values.
- **Example study** — company *Northwind Medical*; product *Single-use syringe* (polypropylene); functional unit 1,000 × unit of product; annual production 50,000,000 units; reference year 2025; geography Germany; all five indicators selected; defaults for the remaining scope fields. Chain: (1) Component sourcing → (2) Injection moulding → (3) Assembly → (4) EtO sterilisation → (5) Packaging. Claude Code invents plausible **annual quantities** (not factors) using only vocabulary items present in the builder's file, with a mix of all three data quality levels and at least one transport row, one waste row and one emission row (e.g. ethylene oxide released at sterilisation). If the file lacks items needed for a realistic example, Claude Code asks the builder to add them — it does not add vocabulary items itself.

---

## Section 6 — Access and Permissions

### CONDITIONAL: Only complete if Access Model is A2 or A3

Not applicable — the access model is A1 (no login, no accounts, no roles). The anonymous access rules, including the database-level protection of the example study, are defined in Section 5.

---

## Section 7 — GDPR

### MANDATORY DECISION: Complete this section for every D3 tool. It is never skipped — the outcome is either the consent framework below or an explicit, confirmed "not applicable".

**GDPR outcome:** Not applicable — confirmed during the interview that this tool collects no personal data through its forms or uploads.

The tool stores company names, product names, product photos, goal and scope choices and process data only. It has no fields for personal names, email addresses, phone numbers or job titles, and no login. The product photo upload carries the hint not to upload images of people (Section 5). If a future version adds contact fields, lead capture or login, this section must be revisited before that build.

---

## Section 8 — Screen and UI Structure

**Global elements (every view):**
- Header: tool name "LCA Studio" (Source Serif 4), link to Home, **language toggle EN / ES**, **light / dark mode toggle**.
- Persistent banner (slim, sage background in light mode): "Demo database: fictional values — not for real assessments." / "Base de datos de demostración: valores ficticios, no apta para evaluaciones reales."
- Language: interface in British English (en-GB) and Spain Spanish (es-ES). All interface text lives in translation files; nothing hard-coded. User-entered content (company, product and process names) is never translated. Default language: browser language if Spanish, otherwise English. Choice remembered in browser storage (wrapped in try/catch; falls back to default).
- Theme: light and dark modes. Default follows the system setting; choice remembered in browser storage (try/catch). Dark mode keeps the brand logic (granate as the only action colour, sage for accents) with colours adjusted so all text meets 4.5:1 contrast.
- Every study has its own URL (`/studies/<id>`), so a study or its results can be opened directly from a link.
- Inside a study, a 4-step stepper: **1 Goal & scope → 2 Process chain → 3 Data → 4 Results**. A step is reachable only when the previous one is complete. Completed steps stay clickable.
- Responsive: designed for desktop / laptop (demo setting); usable on tablet; on phones the homepage and results are readable, and the process builder may show a "best on a larger screen" note.

### Home — Studies menu

- **Purpose:** Show every LCA study in the tool, organised by company and product, and start new ones.
- **What is visible:** Title and one-line intro. Button "New study". A list grouped by **company** (example company first, then alphabetical), each company showing its **products** as cards (product image thumbnail or a neutral placeholder, product name). Under each product, its studies: reference year, functional unit, status, last updated. The example is labelled "Example — read-only". Empty state when no user studies exist yet.
- **User actions:** Open a study. Duplicate a study. Delete a study (confirmation dialog stating that anyone with the link could have created it and the deletion cannot be undone). Start a new study. The example has Open and Duplicate only.
- **What happens next:** Open → the study at its furthest completed step (Results if available). New study → Step 1 with empty fields. Duplicate → dialog asking for company name and product name (prefilled with "<company> (copy)" and the same product name; existing non-example companies can be chosen), then a full copy of scope, chain and inventory rows (with factor snapshots) is created and opened. Delete → removes the study; if the product has no studies left, the product and its image are removed; if the company has no products left, the company is removed.

### Step 1 — Goal & scope

- **Purpose:** Capture everything ISO 14040/44 asks for in goal and scope, in a form a non-expert can complete with defaults.
- **What is visible:** Each field has a short plain-language help text (one sentence, tooltip or inline).

| Field | Control | Options (default first) |
|---|---|---|
| Company name | Text, with suggestions of existing non-example companies | — |
| Product name | Text | — |
| Product photo | Image upload with preview | Optional; JPG / PNG / WebP ≤ 5 MB |
| Functional unit | Number + unit dropdown | Units: one unit of the product / one box of products / one pallet / kg / t / m² / L. Default: 1 × one unit of the product |
| Units per box / pallet | Integer, shown only for box or pallet | Optional; reported, not used in the calculation |
| Annual production | Number, with the unit shown next to it ("units / year", "boxes / year", "t / year", …) | Required before the data step |
| Intended application | Dropdown | Hotspot identification / Product improvement / B2B customer communication / Ecodesign |
| Intended audience | Dropdown | Internal / B2B customers |
| Comparative assertion disclosed to the public | Locked: No | Note: "Public comparative claims require a critical review panel and are out of scope." |
| System boundary | Locked: Cradle-to-gate | Short explanation of what is included |
| Cut-off criteria | Dropdown | 1% of mass / 5% of mass / None |
| Allocation | Dropdown | Mass / Economic / Not applicable |
| Data quality approach | Dropdown | Primary data for own processes, database for background / Mainly estimated data (screening) |
| Geography | Country dropdown | Spain |
| Reference year | Year dropdown (2015–2026) | 2025 |
| LCIA method / database | Locked label | "Demo database: fictional values" |
| Impact indicators | Checkboxes (min. 1) | All five selected: Climate change (GWP100) / Water use (AWARE) / Resource use, minerals and metals / Resource use, fossils / Freshwater ecotoxicity |

- **User actions:** Fill in, save, continue. On the example study every field is read-only.
- **What happens next:** Saving creates or updates the company, product and study. Continue → Step 2. If the functional unit or annual production changes after data was uploaded, results recalculate automatically (no new upload needed).

### Step 2 — Process chain builder

- **Purpose:** Let the user draw their production process as a straight chain, intuitively.
- **What is visible:** Boxes arranged left to right, joined by arrows (process 1 → process 2 → …). Each box shows its name, a small arrow on top labelled "inputs" and a small arrow below labelled "outputs" (visual cue only). Under each box: "+" (insert a new process after this one) and "Delete". At the end of the chain: a dashed box with "+" to add the next process. A short helper text: "Add one box per production step, in order. Raw materials and energy are entered later as inputs of each step."
- **User actions:** Add, insert, rename (click the name), delete, reorder (move left / right buttons; drag-and-drop optional). Rules: 1 to 12 processes; names required, unique within the study, max 60 characters.
- **What happens next:** Continue → Step 3. **If inventory data has already been uploaded and the user changes the chain** (add, delete, rename or reorder), a warning dialog says the uploaded data will be cleared and a new template must be downloaded. On confirm: inventory rows are deleted, chain_version increments, status returns to `chain`. The example study's chain is read-only.

### Step 3 — Data collection

- **Purpose:** Get the user's annual data into the tool through an Excel template generated from their chain.
- **What is visible:** Three numbered instructions: (1) download the template, (2) fill in one sheet per process, (3) upload it. Button "Download template". Upload area (drag-and-drop or file picker, .xlsx only, max 5 MB). After an upload: either a success summary (rows read per process, processes with no rows flagged "No data") or the error list. If data already exists: when it was uploaded, and a note that a new upload replaces all current data.
- **Template (generated per study, in the active language):**
  - Sheet "Instructions": what to fill in, that all quantities are **annual totals for the reference year**, an explanation of each column and of the three data quality levels, and a filled example row.
  - One sheet per process, in chain order, named after the process (truncated to 31 characters; characters Excel forbids removed). Process name and study name shown at the top.
  - Hidden, locked cells carrying study ID, process IDs and chain_version, so the upload can be matched to the study and chain.
  - Hidden sheet "Lists" holding the vocabulary labels in the active language, used by the dropdowns.
  - Columns per process sheet: **Input or output** (dropdown: Input / Output) · **Type** (dropdown from the vocabulary; transport items are the transport modes, e.g. "Transport — lorry", "Transport — sea freight", so the transport mode is chosen here) · **Annual quantity** (number) · **Unit** (filled automatically from the type by formula; locked) · **Distance (km)** (transport rows only) · **Data quality** (dropdown: Measured / Calculated / Estimated). For transport rows, Annual quantity is the tonnes of goods moved per year (unit `t`).
  - Room for at least 200 rows per process sheet, with dropdowns active on all of them.
- **Upload validation — the whole upload is rejected if any error exists; nothing is saved:**
  - File is .xlsx and contains the hidden study ID of **this** study; otherwise: "This template belongs to another study."
  - chain_version matches the current chain; otherwise: "Your process chain changed after this template was downloaded. Please download a new template."
  - For every non-empty row: Input or output is valid; Type matches a vocabulary label (English or Spanish label, case- and whitespace-insensitive); the type's direction matches the Input / Output column; Annual quantity is a number > 0; Unit equals the type's fixed unit; Distance is a number > 0 for transport rows; Data quality is one of the three levels.
  - Each error is listed as **sheet name · row number · column · reason** in plain language (e.g. "Injection moulding · row 7 · Type · 'Electrcity' is not in the list. Choose a value from the dropdown."). The list is copyable.
  - The upload must contain at least one valid row in total. A process sheet with no rows is allowed and is shown as "No data" in the results.
  - Annual production must be set in Step 1 before upload is enabled.
- **User actions:** Download template, upload, re-upload. On the example study: download template disabled, upload disabled, a note explains it is read-only and offers "Duplicate this example".
- **What happens next:** Successful upload → all previous inventory rows for the study are replaced (in one operation), factor snapshots are copied from `lca_vocabulary`, status becomes `results`, and the user is taken to Step 4.

### Step 4 — Results dashboard

- **Purpose:** The demo's centrepiece: show impacts per functional unit, where they come from, and how reliable the data is.
- **What is visible:**
  - **Header:** product image, company, product, functional unit, reference year, "Demo database: fictional values" label.
  - **Indicator switch:** tabs or segmented control with the selected indicators; it drives the bar chart, row table and heat map.
  - **Totals:** one card per selected indicator — total per functional unit, unit, and the process contributing most.
  - **Contribution per process:** horizontal bar chart, one bar per process in chain order, value and % share.
  - **Hotspots per input row:** sortable table — process, type, quantity per functional unit, unit, impact, % share, data quality. Default sort: impact descending.
  - **Heat map:** the user's own chain redrawn as in Step 2, each box filled on a scale from light sage `#E6EBE1` (lowest share) to granate `#7A1F2B` (highest share among processes) for the selected indicator, with its % share printed in the box (text colour switching to white on dark fills for contrast). Processes with no data appear grey with "No data". Legend below. Dark mode uses a dark-theme equivalent scale that keeps the same order and readable labels.
  - **Data quality panel:** for each selected indicator, a stacked bar showing the share of impact from Measured / Calculated / Estimated rows; a badge per process (Good / Fair / Poor) with its score, for the indicator selected in the switch; a one-line plain explanation of the scale.
  - **Downloads:** "Download PDF report" and "Download Excel".
  - **Limitations:** a collapsible block with the limitations text (Section 9).
- **User actions:** Switch indicator, sort the table, download PDF, download Excel, go back to any step.
- **What happens next:** Downloads generate in the browser in the active language. Editing earlier steps follows the rules above.

---

## Section 9 — Logic and Calculations

### CONDITIONAL: Only complete if the tool calculates, scores, or applies decision rules

**What is calculated or scored:** Cradle-to-gate impacts per functional unit for up to five indicators, by multiplying each inventory quantity (converted from annual totals to per functional unit) by a fictional per-activity impact factor, then summing by process and by study. Plus a data quality share and score.

> **Important for the build:** the factors in `lca_vocabulary` are **aggregated impact factors per unit of activity** (e.g. kg CO2-eq per kWh, per kg of material, per tkm), not characterisation factors of elementary flows. The calculation is a simple sum of quantity × factor. Do **not** build an inventory matrix, a matrix inversion or any elementary-flow logic.

**Indicators:**

| Code | Name (EN) | Name (ES) | Unit |
|---|---|---|---|
| `gwp` | Climate change, GWP100 | Cambio climático, GWP100 | kg CO2-eq |
| `water` | Water use (AWARE) | Uso de agua (AWARE) | m³ world-eq deprived |
| `res_minerals` | Resource use, minerals and metals | Uso de recursos, minerales y metales | kg Sb-eq |
| `res_fossils` | Resource use, fossils | Uso de recursos, fósiles | MJ |
| `ecotox` | Freshwater ecotoxicity | Ecotoxicidad en agua dulce | CTUe |

All five are always calculated; only the study's selected indicators are displayed and exported.

**Inputs:**
- From Step 1: `fu_amount`, `fu_unit`, `annual_production` (in the functional unit's unit, per year).
- From the upload: per row — direction, vocabulary item, annual quantity, distance (transport), data quality.
- From `lca_vocabulary` (snapshot on the row): unit and five factors.

**The builder's factor file `lca-demo-factors.xlsx` (pre-build task)** — one row per vocabulary item, one header row, these columns exactly: `id`, `label_en`, `label_es`, `category` (material / energy / transport / waste / emission), `direction` (input / output), `unit`, `dataset_name`, `factor_gwp`, `factor_water`, `factor_res_minerals`, `factor_res_fossils`, `factor_ecotox`. Values are invented. Transport items have unit `tkm` and their factor is per tonne-kilometre. Emission items cover direct emissions, including combined production + combustion factors for fuels burned on site (e.g. "Diesel burned on site", unit kg).

**Formula or rules:**

1. **Number of functional units per year:**
   `N_FU = annual_production ÷ fu_amount`
   (annual_production is expressed in the same unit as the functional unit; e.g. FU = 1,000 units of product and annual production = 50,000,000 units → N_FU = 50,000.)
2. **Quantity per functional unit (non-transport rows):**
   `q_FU = annual_quantity ÷ N_FU` (in the item's unit).
3. **Quantity per functional unit (transport rows):**
   `q_FU = (annual_quantity [t] × distance_km) ÷ N_FU` (in tkm).
4. **Impact per row and indicator:** `impact_i = q_FU × factor_i` (from the row's factor snapshot).
5. **Impact per process** = sum of its rows; **study total** = sum of all processes; **share** = part ÷ total × 100 (shown only when the total is > 0).
6. **Data quality:**
   - Row score: Measured = 1, Calculated = 2, Estimated = 3.
   - Share per level (study, per indicator) = sum of impacts of rows at that level ÷ study total.
   - Process score (per indicator) = Σ(impact_i × score) ÷ Σ impact_i over the process's rows. If the process's total for that indicator is 0, use the unweighted mean of its row scores.
   - Badge: **Good** if score < 1.5; **Fair** if 1.5 ≤ score ≤ 2.5; **Poor** if score > 2.5. No badge for processes with no data.
7. **Heat map colour:** for the selected indicator, each process's colour position = process impact ÷ the largest process impact (0 → light sage, 1 → granate), linear interpolation. If all processes are 0, all boxes are light sage with "0%".
8. **Recorded but not used in the calculation:** intended application, intended audience, cut-off, allocation, data quality approach, geography, units per box / pallet. They appear in goal and scope, the PDF and the Excel export. Do not invent logic for them.
9. **Display:** 3 significant figures in the interface and PDF; full precision in the Excel export and in all intermediate calculations. Scientific notation for values below 0.001. Number format follows the active language.

**Worked check (illustrative factors, use as a unit test):** FU = 1,000 × unit of product; annual production = 50,000,000 units → N_FU = 50,000. Electricity 1,200,000 kWh/year → q_FU = 24 kWh; with factor_gwp 0.25 kg CO2-eq/kWh → 6 kg CO2-eq per FU. Lorry transport 2,000 t × 800 km → 1,600,000 tkm/year → q_FU = 32 tkm; with factor_gwp 0.1 kg CO2-eq/tkm → 3.2 kg CO2-eq per FU. Process total = 9.2 kg CO2-eq per FU; electricity share = 65.2%. If the electricity row is Measured and the transport row Estimated: process score = (6 × 1 + 3.2 × 3) ÷ 9.2 = 1.70 → Fair.

**Output:** Totals per selected indicator per functional unit; impact and % share per process and per row; data quality shares and process badges; heat map colours; PDF and Excel exports.

**Edge cases:**
- Annual production missing or ≤ 0 → upload disabled, message pointing to Step 1.
- Functional unit or annual production changed after upload → recalculate immediately from stored annual values.
- Chain changed after upload → warning, inventory cleared on confirm (Section 8, Step 2).
- Upload with any invalid row → entire upload rejected with the full error list; existing data untouched.
- Template from another study or an older chain_version → rejected with a specific message.
- Empty template (no valid rows) → rejected: "The template is empty."
- Process with no rows → "No data" in results, grey in the heat map, excluded from data quality badges.
- Vocabulary re-seeded later → existing studies keep their factor snapshots; new uploads use the new factors.
- Study total for an indicator = 0 → show 0 and "—" for shares.
- Two people editing the same study at the same time → last save wins (accepted for a demo; no locking).

**Limitations (fixed text, shown in Results and in the PDF; EN and ES):**
1. All impact factors are fictional, for demonstration only.
2. Cradle-to-gate only: distribution, use and end of life are excluded.
3. One annual production figure applies to every process, so the model assumes all processes serve the same production volume (one site). Processes at suppliers with different volumes are not represented accurately.
4. The process chain is linear: no branching, merging or co-products.
5. Allocation and cut-off choices are recorded but not applied in the calculation.
6. The data quality analysis uses a simplified three-level scale, not the pedigree matrix.
7. No critical review has been performed; results do not support comparative assertions disclosed to the public.

---

## Section 10 — Brand and Visual Direction

**Brand reference:** No brand skill file. The brand guidelines live in the Claude project document "BRAND GUIDELINES" (Andrea Carrascosa). The values Claude Code needs are copied below so the build does not depend on that document.

If no brand skill:
- **Primary colour:** Granate `#7A1F2B` — the **only** action colour: buttons, links, active states, headings. Hover / active: granate oscuro `#5C1520`. Primary button: granate background, white text.
- **Secondary colour:** Sage `#8A9A7B` — decorative accents only (lines, icons, details), never for text or buttons. Sage dark `#5E6E52` — secondary text and labels. Sage light `#E6EBE1` — card and section backgrounds, and the low end of the heat map scale.
- **Other colours:** Background `#F7F5F2` (warm off-white). Ink `#1F1D1B` (main text). Warm grey `#6B6560` (auxiliary text, metadata). Minimum text contrast 4.5:1 (WCAG AA) in both light and dark modes. Dark mode is not defined in the brand guidelines: derive it from the same palette (ink-based background, off-white text, lightened granate for actions) and verify contrast.
- **Font:** Headings Source Serif 4, weight 600. Body Source Sans 3, weights 400 and 600. Both self-hosted. Base body size 17–18 px, line height 1.6. Text columns max ~70 characters where text runs long.
- **Logo:** Available as a PNG (the name "Andrea Carrascosa" in granate) and a tree-ring icon in granate and sage — only if the builder adds the files to the repo. If absent: set the name as a text wordmark in Source Serif 4 600, granate; do not recreate or imitate the icon. On granate backgrounds the logo is white. Never distort, recolour outside the palette, or add effects.

**Visual feel:** Clean and minimal, sober and technical: generous white space, corners rounded 6–8 px on cards and buttons, simple line icons in granate or sage dark, no gradients, no strong shadows, no flashy animations, no stock "sustainability" imagery. Data views should feel precise and calm, not a marketing dashboard.

**Voice and copy:** Direct and concrete; data, standards and results before adjectives. English in British spelling ("organisation", "decarbonisation"); Spanish of Spain, using "tú". No middle dots (·) as separators in interface copy. No marketing filler. Figures always state their basis ("per functional unit", "fictional demo factors").

**Reference or inspiration:** Andrea Carrascosa's professional website (andreacarrascosa.com) uses the same palette and typography.

---

## Section 11 — API and Credentials

List every external service this tool connects to.

| Service | What it does in this tool | Key required | Where key is stored |
|---------|--------------------------|-------------|-------------------|
| Supabase (`purepastures`, `ztkgbowwrlszbbfuhkid`) | Database (`lca_` tables) and file storage (`lca-product-images`). No Auth. | Anon / publishable key (public, browser-safe). The service role key is **not used** by this tool and must never be added to the frontend or to Netlify. | Netlify environment variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| Netlify | Hosting and deployment | Handled by the Netlify MCP connection | — |

No AI API and no email service are used.

> **Security rule — no exceptions:** No API key, token, password, or credential may appear in any HTML file, any JavaScript file, or any file committed to GitHub. Key storage follows function placement: keys used by Netlify Functions and the frontend are stored as **Netlify environment variables**; keys used by Supabase Edge Functions (database-triggered arms) are stored as **Supabase Edge Function secrets** — Edge Functions cannot read Netlify environment variables. Claude Code must enforce this regardless of tier or context.

**Credentials readiness — filled during the architect interview for every active arm:**

| Credential | Status | Where to get it |
|-----------|--------|----------------|
| Supabase anon key | Available — existing project; Claude Code retrieves it via Supabase MCP and sets it as a Netlify environment variable | Supabase dashboard → Project Settings → API |
| Supabase service role key | Not needed for this tool | — |

> Any credential marked "Needs creating" is a pre-build task for the builder — create the account before opening Claude Code. The Project Governor reads this table and writes the exact environment variable names and setup instructions into CLAUDE.md so Claude Code prompts for them at session start. Credentials are entered as Netlify environment variables, or as Supabase Edge Function secrets for database-triggered arms — never typed into any project file.

---

## Section 12 — Out of Scope — Phase 2

List everything this build will NOT include. Be explicit. Claude Code will not build anything listed here.

| Deferred feature | Reason it is deferred |
|-----------------|----------------------|
| Login, user accounts, roles and permissions | Builder decision: public demo with fictional data; only the example study is protected |
| AI matching of free-text inputs to datasets | Builder decision: fixed vocabulary is predictable in front of prospects; no AI cost |
| Branching or merging process chains, co-products | Builder decision: straight chain only for this version |
| Distribution, use phase and end of life | Builder decision: cradle-to-gate only |
| Bill of materials as a separate input | Builder decision: materials are entered as inputs on each process sheet |
| Pedigree matrix data quality | Builder decision: simplified three-level scale for non-experts |
| Separate production volume per process | Validate core tool first; listed as a limitation |
| Comparative assertions disclosed to the public | Requires a critical review panel |
| Real ecoinvent (or any licensed) data | Licence restrictions; demo uses fictional factors only |
| Typing inventory data directly into forms | Builder decision: data enters through the generated Excel template |
| Study version history, edit locking for simultaneous users | Not needed to validate the demo |
| CSV export | Excel workbook covers it |

---

## Section 13 — Acceptance Criteria

| # | What to verify | Expected result | Done? |
|---|---------------|-----------------|-------|
| 1 | Supabase safety rules | Only `lca_`-prefixed objects and the `lca-product-images` bucket were created in `purepastures`; the five PurePastures tables are unchanged (columns, RLS, policies); no other project was touched; docs/supabase-setup.md updated with every `lca_` object | [ ] |
| 2 | Vocabulary seed | `lca_vocabulary` row count equals the number of valid rows in `lca-demo-factors.xlsx`; no invented factors | [ ] |
| 3 | Example study protection | Using the anon key directly (not the UI), update and delete on the example company, product, study, processes and inventory rows, and on objects under `example/` in storage, are all refused | [ ] |
| 4 | Homepage | Studies grouped by company then product, example first and labelled read-only; open, duplicate and delete work; deleting the last study removes the empty product (and image) and company | [ ] |
| 5 | Duplicate example | Duplicating the example creates an editable copy under a new company with the same chain, inventory and results | [ ] |
| 6 | Step 1 Goal & scope | All fields from Section 8 present with defaults; locked fields cannot change; all seven functional unit options available, units per box / pallet appears only for box and pallet; at least one indicator required | [ ] |
| 7 | Product image | JPG / PNG / WebP ≤ 5 MB accepted and shown on homepage card, study header and PDF cover; other types or larger files rejected with a message | [ ] |
| 8 | Step 2 Chain builder | Add, insert, rename, delete, reorder work; 1–12 processes; unique names enforced; changing the chain after upload shows the warning and clears data on confirm | [ ] |
| 9 | Template generation | Downloaded .xlsx has an Instructions sheet and one sheet per process in chain order with working dropdowns, auto-filled locked Unit, hidden study ID and chain_version, in the active language | [ ] |
| 10 | Upload validation | A file with one bad row is rejected entirely with sheet · row · column · reason; nothing saved; a template from another study or older chain is rejected with its specific message | [ ] |
| 11 | Calculation | The Section 9 worked check reproduces exactly (24 kWh, 6 kg CO2-eq; 32 tkm, 3.2 kg CO2-eq; 65.2%; score 1.70, Fair); changing annual production recalculates without re-upload | [ ] |
| 12 | Results dashboard | Totals, process bar chart, hotspot table, heat map and data quality panel show only selected indicators and update with the indicator switch; "No data" processes shown grey | [ ] |
| 13 | Heat map | Colours run from `#E6EBE1` to `#7A1F2B` relative to the largest process; % labels readable in light and dark modes | [ ] |
| 14 | PDF export | Contains the 8 sections of Section 3 in order, brand typography and colours, footer with fictional-data text, active language | [ ] |
| 15 | Excel export | Contains the 6 sheets of Section 3 with full-precision values, active language | [ ] |
| 16 | Language and theme | EN / ES toggle switches all interface text, template, PDF and Excel; light / dark toggle works; contrast ≥ 4.5:1 for text in both modes; choices remembered | [ ] |
| 17 | Fictional-data disclaimer | Banner visible on every view; label in results header, PDF footer and disclaimer page, Excel Disclaimer sheet | [ ] |
| 18 | Deployment | Tool live at the Netlify URL; `/studies/<id>` deep links load; works on desktop and tablet; no service role key or other secret in the bundle or repo | [ ] |

> Criteria are derived from Sections 8 (views), 9 (logic), 3 (arms), 7 (GDPR), and 6 (RLS rules). One criterion per view, one per active arm, one per critical business rule. Claude Code must not mark a feature complete without meeting its acceptance criterion.

---

## Section 14 — Build Path

**This tool's tier:** Tier 2

---

### Pre-build steps — complete these before opening Claude Code

These steps apply to all tiers. Do not open Claude Code until every applicable item is checked.

- [x] Tool Architect skill — interview complete, this spec is written and confirmed by the builder
- [ ] Project Governor skill — CLAUDE.md and PROGRESS.md produced from this spec
- [ ] GitHub repo created by the builder
- [ ] product-spec.md uploaded to the GitHub repo root
- [ ] CLAUDE.md uploaded to the GitHub repo root
- [ ] PROGRESS.md uploaded to the GitHub repo root
- [ ] Brand skill file uploaded to the GitHub repo root (if applicable) — not applicable; brand values are in Section 10. Optional: upload the logo PNG and tree-ring icon
- [ ] Netlify connected to the GitHub repo (skip if Netlify MCP is active) — skipped, Netlify MCP is active
- [ ] All credentials identified and ready to enter as environment variables — not written in any file (see Section 11 credentials readiness check)
- [ ] **Tool-specific:** `supabase-setup.md` (interim PurePastures version with "LCA tool build rules") uploaded to the repo root
- [ ] **Tool-specific:** `lca-demo-factors.xlsx` with fictional values, in the exact column format of Section 9, uploaded to the repo root. The real `LCA_Modelling_calculations_v3.xlsx` is **never** uploaded

> Claude Code organizes these files into the correct folder structure (docs/, .claude/skills/) automatically at the start of the first session.

---

### Tier 2 — build session

- [ ] Open Claude Code in the project folder
- [ ] Claude Code runs First Session Setup: creates docs/, moves reference files, installs brand skill if provided
- [ ] Claude Code reads product-spec.md, CLAUDE.md, and PROGRESS.md
- [ ] **Supabase — existing project:** Claude Code reads docs/supabase-setup.md, connects to the existing project `purepastures` (`ztkgbowwrlszbbfuhkid`), lists the live tables and reviews the current schema before making any changes (stop and report if anything new appeared since 2026-11-17)
- [ ] Claude Code validates `lca-demo-factors.xlsx` and reports any problems before seeding
- [ ] Claude Code builds all `lca_` tables, helper function, RLS policies, storage bucket and storage policies via Supabase MCP, then seeds the vocabulary and the example study
- [ ] Claude Code updates docs/supabase-setup.md with every `lca_` object (existing PurePastures sections untouched)
- [ ] Claude Code builds the frontend
- [ ] Test locally before deploying (including the anon-key tests of acceptance criterion 3)
- [ ] **If Netlify MCP active:** Claude Code sets environment variables and deploys automatically
- [ ] Optional post-build: run Supabase QA skill to verify schema and RLS policies

---

## Section 15 — Open Questions

| Question | Who answers it | Blocking? |
|----------|---------------|-----------|
| `lca-demo-factors.xlsx` must exist in the exact format of Section 9, with enough items for the Northwind Medical example (e.g. polypropylene granulate, steel for needles, rubber, electricity grid, natural gas, ethylene oxide, cardboard, plastic film, lorry and sea transport, plastic waste, EtO emission) | Builder | Yes — must resolve before build |
| supabase-setup.md is interim: three PurePastures tables (`ef_table`, `expected_matches`, `emissions_results`) are undocumented. LCA Studio does not use them, so this does not block, but the rules in Section 4 apply | Builder (eventual full version) | No |
| This repo holds a **copy** of supabase-setup.md, and the PurePastures repo holds another. Decide which copy is the master and sync the `lca_` additions into it after the build | Builder | No — can resolve after build |
| Logo PNG and tree-ring icon files: add to the repo for the cover and favicon, or use the text wordmark fallback | Builder | No — fallback defined in Section 10 |
| Dark-mode palette is not in the brand guidelines; Claude Code proposes it within the rules of Section 10 and shows it to the builder | Claude Code / Builder | No — can resolve during build |

---

## Section 16 — Tool Version History

> This section tracks changes to the tool being built — not to this template. Each row represents a build session that changed what the tool does, how it works, or how it is structured. See the Template Changelog at the bottom of this document for changes to the template itself.

Bump the version whenever the spec changes: new arm added, access model changes, tier changes, new views added, logic updated. Small bug fixes and UI polish do not require a version bump.

| Version | Date | What changed in the tool |
|---------|------|--------------------------|
| v1.0 | 17 November 2026 | Initial build |

---

*This spec is written for Claude Code. It assumes zero prior context. Every decision, rule, and requirement must be explicit enough that the builder can hand this document to Claude Code without a single verbal explanation.*

---

---

## Template Changelog

> **This section is about the template itself — not about any tool built with it.**
> It tracks structural changes to this product spec template: new sections added, sections removed, flow changes, new arms, updated instructions. Use this when revisiting or updating the template. Do not add entries here for changes to a specific tool — those belong in Section 15.
>
> Maintained by Zyad Hatquai. Updated by Claude when structural changes are made to the template.

| Template version | Date | Changes made | Reason |
|-----------------|------|-------------|--------|
| v1.0 | June 2026 | Initial template. 14 sections covering D/A/Tier classification, four arms (AI API, Export, Email, Scheduled Automation), Stack and Deployment, Data Architecture, Access and Permissions, GDPR, Screen and UI Structure, Logic, Brand, Credentials, Out of Scope, Build Path, Open Questions. Pre-Supabase MCP flow — Supabase Expert skill was a required pre-build step for Tier 2 and 3. | First version of the upgraded spec template replacing the old tool-architect output format. |
| v2.0 | June 2026 | Supabase Expert removed from pre-build path. Claude Code now builds all Supabase infrastructure via MCP during the build session. Knowledge Base arm added as fifth arm (always requires D3, pgvector). Section 4 restructured: Netlify MCP added as optional field with active/not-active paths, Supabase project section added with new/existing branch and confirmed project name field, GitHub stated as explicit pre-build requirement. Section 5 framing updated: input for Claude Code, not for a human expert. Section 6 footnote updated: Claude Code builds RLS via MCP, QA skill verifies post-build. Section 11: credentials readiness table added. Section 13 fully rewritten: unified pre-build checklist, per-tier build session checklists, Netlify MCP fork and Supabase new/existing fork explicit at each tier, post-build QA noted as optional. supabase-setup.md introduced and described. Section 15 (Tool Version History) added. Template Changelog added. Final line updated to remove Supabase Expert reference. | New MCP-first build flow. Supabase Expert repositioned as post-build QA skill. Netlify MCP optional by user choice confirmed in architect interview. |
| v2.1 | June 2026 | Tier 0 removed — tiers are 1, 2, 3 only; local testing folded into every build session as an explicit step. D3 promotion rule added to Section 2: A2/A3 always implies D3, invalid D+A combinations eliminated. Knowledge Base arm: challenge-then-defer guidance added (confirm the first build needs it or defer to Section 12), per-user scope requires A2/A3. AI API arm: Expected input size row added, token cap defaults set (500 / 1,500 / 4,000) with cap required for A1 access. Section 6: auth method now derived by the architect and confirmed by the builder; A2/A3 privacy note added. Section 4: Supabase plan field added (Free pauses when idle / Pro always on), build-order rule added to the stack section (schema-creating tool first, one spec/repo/CLAUDE.md/site per tool). Section 11: credentials readiness filled during the architect interview, Supabase keys marked as Claude Code-created, Governor handoff for env var setup described. Section 13: Tier 0 build session removed, local test step added to all tiers. | v2.1 hardening pass from full-framework stress test — every template field is now gathered by the architect interview, no field left for spec generation to invent. |
| v2.2 | June 2026 | Token cap scope corrected in Section 3 AI API arm: cap now required for any tool accessible to unvetted users (A1 at any tier, or A2/A3 with open signup); invite-only tools explicitly exempt. Brand field updated in Section 10 and Section 14 pre-build checklist: brand is now a skill file uploaded flat to the repo root and installed by Claude Code to .claude/skills/ in First Session Setup. Project Governor output updated throughout Section 14: Governor now produces CLAUDE.md and PROGRESS.md; both appear in the pre-build checklist and upload steps; First Session Setup step added to all tier build session checklists. Acceptance Criteria added back as Section 13 (sections renumbered: Build Path 14, Open Questions 15, Tool Version History 16). | Project Governor v3.0 introduced PROGRESS.md as a second standing output file and the four-document model. Acceptance Criteria section restored after being dropped by mistake in v2.1. |
| v2.3 | June 2026 | Knowledge Base arm removed from the framework — Section 3 now carries an explicit out-of-scope note routing KB/RAG requests to Out of Scope; vectors table block removed from Section 5; "arms do not change the tier" is now unconditionally true. Status field: explicit note that the Tool Architect sets Confirmed at Phase 10 (closes the Governor Gate 2 handoff gap). GDPR (Section 7) restructured as a mandatory decision for every D3 tool — outcome is either the full consent framework or a confirmed "not applicable"; scope rule added distinguishing form-collected personal data (triggers) from auth login emails on invite-only tools (covered by the Section 6 privacy note); open-signup auth emails trigger. Key storage made placement-aware in Sections 3 and 11: Netlify env vars for Netlify Functions, Supabase Edge Function secrets for database-triggered arms. Email arm: generated-PDF attachments now require the Export arm's design intent. Section 4 GitHub paragraph corrected to include PROGRESS.md. | v2.3 hardening pass from the two-skill stress test: cross-skill handoff fixes (Status, key placement), KB removed as out of audience scope, GDPR ambiguity resolved for Tier 3 tools. |
