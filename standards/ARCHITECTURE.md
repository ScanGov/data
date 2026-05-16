# ScanGov Standards Architecture

How the data files in this repo connect to the scanning and scoring infrastructure.

## Files in this directory

- **audits.json** — Defines the 7 topics and their attributes (the things ScanGov checks)
- **guidance.json** — Defines the standards/guidance documents that justify the audits

## Data flow

```
Lighthouse runs on target URL
        |
        v
compose.mjs (in dedicatedlightrunner)
  - Parses raw Lighthouse JSON
  - Maps Lighthouse audit IDs to ScanGov attribute keys
  - Produces per-page boolean pass/fail for each attribute
        |
        v
POST /lighthouseresults (in auditor)
  - Stores the composed auditData per page in DynamoDB
        |
        v
scorerecords.mjs + transform.mjs (in auditor)
  - Aggregates per-page results into domain-level scores
  - If ANY page fails an attribute, the domain fails it
  - Calculates percentage: (correct / total) * 100
```

## How each topic is audited

### Accessibility (67 attributes) — individual Lighthouse audits

Each attribute maps 1:1 to a Lighthouse accessibility audit. Pass/fail is determined by `score === 1`.

Previously these were grouped into 9 category-level checks (a11y-aria, a11y-best-practices, etc.) where any single failure within a group failed the whole group. Now each individual audit is tracked separately.

The 63 Lighthouse audits come from these groups:
- **a11y-aria** (23): aria-allowed-attr, aria-roles, aria-valid-attr, duplicate-id-aria, etc.
- **a11y-names-labels** (13): image-alt, button-name, link-name, label, document-title, etc.
- **a11y-tables-lists** (7): definition-list, list, listitem, td-headers-attr, etc.
- **a11y-navigation** (4): accesskeys, bypass, heading-order, tabindex
- **a11y-language** (4): html-has-lang, html-lang-valid, html-xml-lang-mismatch, valid-lang
- **a11y-best-practices** (3): meta-refresh, meta-viewport, target-size
- **a11y-color-contrast** (2): color-contrast, link-in-text-block
- **a11y-audio-video** (1): video-caption
- **hidden** (6): empty-heading, landmark-one-main, identical-links-same-purpose, etc.

Plus 4 non-Lighthouse attributes moved from the old "content" topic:
- image-aspect-ratio, html-lang-valid, doctype, charset

**Code location:** `dedicatedlightrunner/runner/compose.mjs` lines 64-85 (currently still uses group-level logic — needs updating to emit individual audit results)

**Migration needed in compose.mjs:** Instead of collapsing all audits in a group to a single boolean, emit each individual audit's pass/fail status.

### Bot-friendly (11 attributes) — mixed sources

| ScanGov attribute | Source | Lighthouse audit ID / method |
|---|---|---|
| crawlable | Lighthouse (seo category) | `is-crawlable` |
| text-content | augmentsitedata | Custom check (not Lighthouse) |
| schema-government-organization | augmentsitedata | Custom check on domains table (`has_gov_schema`) |
| status | augmentsitedata | HTTP status of /sitemap.xml |
| xml | augmentsitedata | Checks sitemap file type is XML |
| valid | Lighthouse (seo category) | `robots-txt` |
| allowed | Lighthouse (seo category) | `is-crawlable` |
| sitemap-robots | augmentsitedata | Checks robots.txt references sitemap |
| canonical | Lighthouse (seo category) | `canonical` |
| link-text | Lighthouse (seo category) | `link-text` |
| hreflang | Lighthouse (seo category) | `hreflang` |

**Note:** In compose.mjs these are still emitted under `data.seo` and `data.aifriendly` keys (old names). The global attributes (schema-government-organization, valid, xml, allowed, status, sitemap-robots) are added in `scorerecords.mjs` from the domains table, not from per-page Lighthouse results.

### Usability (5 attributes) — individual Lighthouse audits

| ScanGov attribute | Lighthouse audit ID |
|---|---|
| title | `document-title` |
| description | `meta-description` |
| readability | Custom (Flesch-Kincaid via readabilityInfo) |
| viewport | `viewport` |
| zooming-scaling | `meta-viewport` |

**Code location:** `dedicatedlightrunner/runner/compose.mjs` lines 153-192 (emitted as `data.content`)

### Domain (3 attributes) — Lighthouse + augmentsitedata

| ScanGov attribute | Lighthouse audit ID |
|---|---|
| https | `is-on-https` + `redirect-http` |
| www | augmentsitedata (custom check) |
| dotgov | augmentsitedata (custom check) |

### Performance (5 attributes) — Lighthouse with thresholds

| ScanGov attribute | Lighthouse audit ID | Fail threshold |
|---|---|---|
| fcp | `first-contentful-paint` | > 1800ms (overridden by CrUX "FAST") |
| lcp | `largest-contentful-paint` | > 2500ms (overridden by CrUX "FAST") |
| cls | `cumulative-layout-shift` | > 100 |
| ttfb | `server-response-time` | > 800ms |
| inp | `total-blocking-time` (lab proxy for INP) | > 200ms |

### Security (7 attributes) — Lighthouse best-practices + augmentsitedata

| ScanGov attribute | Lighthouse audit ID |
|---|---|
| csp | `csp-xss` |
| hsts | `has-hsts` |
| securitytxt | augmentsitedata (domains table `has_security_txt`) |
| xcontenttypeoptions | augmentsitedata (custom check) |
| errors-in-console | `errors-in-console` |
| clickjacking-mitigation | `clickjacking-mitigation` |
| paste-preventing-inputs | `paste-preventing-inputs` |

### Social (7 attributes) — fetching.mjs pre-audit

| ScanGov attribute | Source |
|---|---|
| ogsitename | HTML meta tag extraction (fetching.mjs) |
| ogtype | HTML meta tag extraction |
| ogtitle | HTML meta tag extraction |
| ogdescription | HTML meta tag extraction |
| ogurl | HTML meta tag extraction |
| ogimage | HTML meta tag extraction |
| ogimagealt | HTML meta tag extraction |

## Global vs per-page attributes

Most attributes are checked per-page and aggregated. Some "global" attributes are checked once per domain and injected in `scorerecords.mjs`:

- `schema-government-organization` (from domains table `has_gov_schema`)
- `securitytxt` (from domains table `has_security_txt`)
- `valid`, `xml`, `allowed`, `status`, `sitemap-robots` (from domains table `seo` field)

These are excluded from per-page scoring in `transform.mjs` via the `globalAttributes` array.

## Key code locations

| File | Repo | Purpose |
|---|---|---|
| `runner/compose.mjs` | dedicatedlightrunner | Maps Lighthouse results to ScanGov attributes |
| `src/http/post-lighthouseresults/index.mjs` | auditor | Receives and stores per-page audit data |
| `src/shared/scorerecords.mjs` | auditor | Aggregates pages into domain scores, adds globals |
| `src/shared/transform.mjs` | auditor | Per-page attribute counting (excludes globals) |
| `src/events/augmentsitedata/index.mjs` | auditor | Runs non-Lighthouse checks (domain-level) |

## Topic rename migration (pending in downstream repos)

The data files now use these topic names, but the code still uses old names:

| Data file (new) | compose.mjs output key (old) | scorerecords.mjs key (old) |
|---|---|---|
| botfriendly | `data.seo` + `data.aifriendly` | `aifriendly`, `seo` |
| usability | `data.content` | `content` |
| accessibility | `data.accessibility` | `accessibility` (unchanged) |

These code files need updating to match the new topic names:
- `dedicatedlightrunner/runner/compose.mjs`
- `auditor/src/shared/transform.mjs`
- `auditor/src/shared/scorerecords.mjs`

## Cross-reference rules

1. Every `guidance.json` entry's `standards[].url` (stripped of `/`) must match an attribute `key` in `audits.json`
2. Every audit attribute's `guidance[].url` (stripped of `/`) must match a `key` in `guidance.json`
3. Every `topics[]` value in `guidance.json` must match a top-level key in `audits.json`
4. `displayName` values in cross-references should match the canonical `displayName` in the target file
