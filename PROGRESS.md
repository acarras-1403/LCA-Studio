# PROGRESS — LCA Studio

> Claude Code: read this file at the start of every session, before touching
> anything. Update it at every save point. Replace content — do not append.
> History lives in git.

**Session:** 0 — build not started
**Last updated:** 17 November 2026 — by Project Governor, pre-build
**Live URL:** none yet [Rule: fill in after the first successful deploy]

## Current state
Nothing built. Repo contains CLAUDE.md, PROGRESS.md, product-spec.md, supabase-setup.md, lca-demo-factors.xlsx.
[Rule: this section describes what exists and works right now — never what is planned. Completed checklist items get absorbed here in compressed form.]

## Last session
None — the first build session has not happened yet.
[Rule: 3–5 lines maximum. Replace each session — what was built, changed, or fixed.]

## Remaining work
- [ ] First Session Setup: create docs/, move product-spec.md, supabase-setup.md and lca-demo-factors.xlsx into it, commit (see CLAUDE.md Session Protocol)
- [ ] Connect to Supabase project "purepastures" and read docs/supabase-setup.md (incl. LCA tool build rules) before any database work; list live tables
- [ ] Validate docs/lca-demo-factors.xlsx against spec Section 5; stop and report any problem
- [ ] Create this tool's lca_ tables, helper function, RLS policies, lca-product-images bucket and policies; seed vocabulary and Northwind Medical example; update docs/supabase-setup.md
- [ ] Build global layout — header, EN/ES toggle, light/dark mode, fictional-data banner, 4-step stepper
- [ ] Build Home — studies menu grouped by company and product; open, duplicate, delete
- [ ] Build Step 1 Goal & scope — ISO-style pick lists with defaults, functional unit, annual production, product photo, indicators
- [ ] Build Step 2 Process chain builder — linear chain of boxes, add / insert / rename / delete / reorder
- [ ] Build Step 3 Data collection — generated Excel template, upload, full validation with error list
- [ ] Build Step 4 Results dashboard — totals, process bars, hotspot table, heat map, data quality panel
- [ ] Wire Export: PDF report and Excel workbook, generated in the browser from the Results view
- [ ] Local test pass — full walkthrough of every view before deploying
- [ ] Acceptance criteria pass — verify every criterion in spec Section "Acceptance Criteria" before deploy
- [ ] Deploy to Netlify via MCP, set environment variables
[Rule: completed items leave this list and are absorbed into Current state. This list only shrinks.]

## Build decisions
None yet.
[Rule: one line per decision made during the build that is not in the spec — prompt structures, field formats, naming choices, library picks. Future sessions depend on these to stay consistent.]

## Known issues
- supabase-setup.md is INTERIM: ef_table, expected_matches, emissions_results are undocumented. This tool does not use them; its LCA tool build rules apply.
- Two copies of supabase-setup.md exist (this repo and the PurePastures repo). Builder decides which is master and syncs the lca_ additions after the build.
- Free plan: project pauses after ~1 week without traffic (shared with PurePastures tools). Restore in the Supabase dashboard before demos.
- Supabase advisor will flag the public lca_ policies as "always true" — expected for an A1 demo; document, do not "fix".
- Logo PNG and tree-ring icon not in repo — text wordmark fallback until the builder adds them.
- Dark-mode palette is not in the brand guidelines — propose it and get builder approval before first deployment.
[Rule: bugs, edge cases, and deferred fixes. One line each. Remove when resolved.]

## Notes for next session
None.
[Rule: the builder writes here between sessions. Claude Code reads these aloud at session start, acts on them, then clears this section.]
