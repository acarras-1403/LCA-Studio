# LCA Studio

A guided cradle-to-gate life cycle assessment demonstration: define the goal and
scope, draw a linear process chain, fill in an Excel template generated from that
chain, and read the impact results, heat map and data quality analysis.

**All impact factors in this tool are fictional and for demonstration only.
Results must not be used for decisions, claims or communication.**

## Running it

```
npm install
npm run dev
```

Copy `.env.example` to `.env.local` and fill in both values before building.
A build without them produces a page that only reports the missing configuration.

```
npm run build
npm test
```

## Where things are

| Path | What it holds |
|---|---|
| `src/lib` | calculations, number formatting, translations, theme, database access |
| `src/components` | shared interface pieces, with `ui/` for the primitives |
| `src/pages` | one module per route |
| `src/excel` | the data template, the upload parser and the export workbook |
| `src/pdf` | the report and its embedded, subset fonts |
| `scripts/build-pdf-fonts.py` | regenerates those fonts from the self-hosted packages |
| `docs/` | product spec, database schema, factor workbook, brand guidelines |

`PROGRESS.md` is the current state of the build. `docs/supabase-setup.md` is the
schema source of truth.
