# PROGRESS — LCA Studio

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 1 — first build (continued)
**Last updated:** 18 November 2026 — by Claude Code
**Live URL:** site created, not yet deployed — https://lca-studio.netlify.app
(Netlify project `lca-studio`, id `84c5f0e6-b557-4bb5-8d80-cbd6b363c9c0`, team
`acarrascosaflores`. Both environment variables are set. No deploy has run yet.)

## Current state

The tool is built and works end to end against the live Supabase project, tested
in a real browser. Not yet deployed.

**Database** (`purepastures`, `ztkgbowwrlszbbfuhkid`): all six migrations applied.
Six `lca_` tables, the
`lca_is_example_study` helper, an `updated_at` trigger, RLS with `lca_`-prefixed
policies on every table, and the public `lca-product-images` bucket with its four
storage policies. `lca_vocabulary` holds all 57 rows of
`docs/lca-demo-factors.xlsx`, verified row for row against the workbook by digest
— no factor invented or changed. The read-only Northwind Medical example study is
seeded: 5 processes, 28 inventory rows with invented annual quantities only, and
a syringe line illustration under `example/`. Example protection was tested with
the anon key directly, outside the interface: every update and delete on the
example affects zero rows, every insert under it is refused with `42501`, and all
writes under `example/` in storage are refused with 403. Full schema in
`docs/supabase-setup.md`. The image bucket accepts JPEG, PNG and WebP only.

**App** (React, Vite, Tailwind, self-hosted fonts): header with EN/ES and
light/dark toggles, fictional-data banner on every view, 4-step stepper that only
opens a step once the previous one is complete, and `/studies/<id>` deep links.
Home groups studies by company then product, example first and labelled
read-only, with open, duplicate and delete. Step 1 carries every goal and scope
field with defaults, locked fields and the product photo upload. Step 2 is the
chain builder. Step 3 generates the Excel template from the chain and validates
uploads. Step 4 is the results dashboard: totals, process bar chart, hotspot
table, heat map and data quality panel, plus the PDF and Excel downloads.

**Verified in the browser against the live database.** Two passes, both with
zero console errors:

1. Full walkthrough — create study, draw a 2-process chain, download the
   template, fill it, upload it, read results, download both exports in English
   and Spanish, have a bad upload rejected whole, see the chain-change warning,
   delete the study and watch the product and company go with it.
2. Acceptance criteria pass — 34 checks covering duplicate, product photos,
   chain editing, the step 1 controls, language and theme persistence, and the
   homepage, all passing.

**Spec Section 13: criteria 1-17 are verified. Criterion 18 (deployment) is the
only one outstanding**, because nothing has been deployed yet. The Section 9
worked check reproduces exactly in the interface (24 kWh, 32 tkm, 64.9% share,
score 1.70 Fair) and as a unit test. 39 unit tests pass (`npm test`).

## Last session

Session 1: moved the reference docs into `docs/`, validated the factor workbook
(57 rows, zero errors), built the whole database and seeded it, then built the
entire front end, the Excel template and parser, the Excel export and the PDF
report. Then worked through the acceptance criteria in a browser, which turned up
two real bugs — inserting a process into an existing chain always failed, and the
document language attribute did not follow a remembered Spanish choice. Both are
fixed, with a regression test for the first.

## Remaining work

- [ ] Get the builder's approval for the dark-mode palette (derived here, every
      text pair measured at 4.5:1 or better; see "Build decisions").
- [ ] **Finish the deploy.** The Netlify project and both environment variables
      exist; only the deploy itself is outstanding. Either connect
      `acarras-1403/LCA-Studio` to the `lca-studio` project in the Netlify
      dashboard so it builds from `main` (the model this spec assumes), or run
      the deploy locally:
      `npx netlify-cli deploy --prod --dir dist --site 84c5f0e6-b557-4bb5-8d80-cbd6b363c9c0`
      after `npm run build`. Then confirm `/studies/<id>` deep links load and put
      the live URL in the header above.
- [ ] Re-check criterion 18 (and spot-check the rest) once the site is live.
      Criteria 1-17 are verified locally against the live database.
- [ ] Add the logo PNG and tree-ring icon when the builder supplies them, and
      swap the text wordmark in the header and on the PDF cover.

## Build decisions

- Code layout: `src/lib` (calculations, formatting, i18n, theme, data access),
  `src/components` (shared UI, `ui/` for primitives), `src/pages` (one per
  route), `src/excel` (template, parser, export workbook), `src/pdf` (report and
  embedded fonts), `src/data` (country list). Root holds only CLAUDE.md,
  PROGRESS.md and README.md.
- shadcn/ui components are hand-written in `src/components/ui` rather than pulled
  with the shadcn CLI: the CLI fetches from `ui.shadcn.com`, which this
  environment's network policy does not allow. Same idiom, no dependency.
- Charts are hand-rolled SVG and CSS rather than a charting library: exact brand
  control, no extra dependency, and the chain diagram and heat map share one
  layout module (`src/components/chainLayout.js`) with the PDF.
- Step 2 draws the chain as an SVG diagram and puts the editable name fields in
  cards beneath it, so editing stays accessible. Step 4's heat map reuses the
  same SVG component, so the two pictures match.
- `exceljs`, `jspdf` and the export modules are imported dynamically, so none of
  them is in the first load. Main bundle is about 400 kB; the Excel writer only
  arrives when someone downloads something.
- **Build-time environment variables are mandatory.** `configError` is evaluated
  from `import.meta.env` at build time, so a build without
  `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` tree-shakes the entire app
  down to the error message. Netlify must have both set before the first deploy.
- `lca_processes` uses **deferrable** unique constraints on `(study_id, position)`
  and `(study_id, name_key)`, and the app saves a reordered chain as a single
  bulk upsert. PostgREST wraps one request in one transaction, so positions can
  swap without tripping the constraint mid-statement.
- The Supabase client uses a `fetch` wrapper with `cache: 'no-store'`. Without it
  the homepage could re-render a study the user had just deleted.
- Template layout is frozen in `src/excel/layout.js` and stamped with
  `LCA_STUDIO_TEMPLATE_V1`. Headers sit on row 6, data on rows 7-206, and hidden
  locked columns H-L carry the marker, study id, process id, chain version and
  position. Changing any of that means changing the version string.
- The template's Unit column is a locked `INDEX`/`MATCH` formula. A workbook that
  has never been opened in Excel has no cached result, so the parser accepts a
  blank Unit cell and takes the unit from the Type; a Unit that contradicts the
  Type is an error.
- Upload errors are shown as a four-column table (sheet, row, column, reason)
  rather than the spec's "sheet · row · column · reason" string: the brand rules
  forbid middle dots in interface copy. The copy button writes the same four
  fields joined with em dashes.
- Scientific notation uses real superscripts (`3.34 × 10⁻⁵`). Source Sans 3 and
  Source Serif 4 only ship superscript 1, 2 and 3, so
  `scripts/build-pdf-fonts.py` synthesises the rest as scaled, raised copies of
  the normal digits while subsetting the fonts for jsPDF. Re-run that script if
  the fonts are ever updated.
- Dark-mode palette, derived from the brand palette and measured: background
  `#161513`, surface `#221F1D`, alt `#2B2724`, text `#F2EFEA` (12.9-15.9:1),
  secondary `#C3CDB6` (9.0-11.1:1), metadata `#ADA6A0` (6.2-7.6:1), action
  `#D4717F` (4.6-5.6:1) on `#1F1D1B` for button text (5.2:1). Granate stays the
  only action colour, sage stays decorative.
- Duplicating the example points the copy's `image_path` at the example
  illustration in place rather than copying the file: anonymous users cannot
  write under `example/`, and the bucket is public so the image still loads.
- Country names come from `Intl.DisplayNames` over a fixed ISO code list, so the
  geography dropdown follows the active language without a translation table.
- A chain write gives **every** row an id, new ones included
  (`buildChainPayload` in `src/lib/api.js`). PostgREST refuses a bulk write whose
  objects do not all share the same keys, so a chain mixing saved and new
  processes was rejected outright. `src/lib/chain.test.js` guards the shape.
- `I18nProvider` sets `document.documentElement.lang` from an effect, not only
  when the toggle is used, so a remembered Spanish choice also sets the attribute
  on first paint after a reload.

## Known issues

- `docs/supabase-setup.md` is still INTERIM for the PurePastures side:
  `ef_table`, `expected_matches` and `emissions_results` remain undocumented.
  This tool does not use them and did not touch them.
- Two copies of `supabase-setup.md` exist (this repo and the PurePastures repo).
  The builder decides which is master and syncs the `lca_` section across.
- Free plan: the project pauses after about a week without traffic, shared with
  the PurePastures tools. Restore it in the Supabase dashboard before a demo.
- The Supabase advisor flags the public `lca_` policies as "always true". Expected
  and accepted for an A1 demo; documented as intentional, not to be "fixed".
- Logo PNG and tree-ring icon are not in the repo, so the header and the PDF
  cover use a text wordmark in granate.
- Work is on branch `claude/practical-mccarthy-n6p96b`, not `main`: this session
  is only permitted to push to that branch. Merge it to `main` when you are happy
  with it, since Netlify deploys from `main`.
- **Deploy blocked in this session.** Netlify's own deploy command
  (`npx @netlify/mcp ... --proxy-path ...`, which zips the repo and builds it on
  Netlify) was refused twice by this session's command-permission classifier, so
  no deploy has run. The project and its environment variables are in place, so
  this is the only step left. See "Remaining work" for the two ways to finish it.

## Notes for next session

None.
