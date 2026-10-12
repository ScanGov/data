# ScanGov Standards Architecture

How the data files in this repo connect to the scanning and scoring infrastructure.

## Files in this directory

- **audits.json** — Defines the 5 topics and their attributes (the things ScanGov checks)
- **guidance.json** — Defines the standards/guidance documents that justify the audits

Both files are consumed from GitHub raw `main` (`https://github.com/ScanGov/data/raw/refs/heads/main/standards/audits.json`) at build or deploy time by the auditor, my.scangov.com, scangov.org, scangov.com, standards.scangov.org and the ScanGov GitHub Action. A change merged here reaches every site on its next build, so downstream code that enumerates topics must be ready before a topic change merges.

`scripts/check-standards.js` (run in CI) enforces the cross-reference rules at the end of this file.

## Data flow

```
Lighthouse runs on target URL
        |
        v
compose.mjs + runaudit.mjs (in dedicatedlightrunner)
  - Parses raw Lighthouse JSON
  - Maps Lighthouse audit IDs to ScanGov attribute keys
  - Merges fetch-derived checks (social tags, crawlable, text-content, readabilityInfo)
  - Produces per-page boolean pass/fail for each attribute, keyed by topic
        |
        v
POST /lighthouseresults (in auditor)
  - Stores the composed auditData per page in DynamoDB
        |
        v
normalizeaudit.mjs + transform.mjs + scorerecords.mjs (in auditor, at query time)
  - normalizeaudit folds every older schema (aifriendly/seo -> botability,
    content/performance/social -> usability, domain -> security + usability,
    usability.readability -> readability.reading-level) into the current topics
  - transform scores each page: score = correct / all per topic
  - scorerecords aggregates pages into domain-level scores and injects globals
  - overallScore = sum(correct) / sum(all) across every topic (attribute-weighted,
    not a mean of topic scores)
```

Because normalization and scoring run at query time, moving an attribute between topics or renaming a key takes effect on deployment without re-auditing pages.

## Topics

| Topic key | Attributes | Sources |
|---|---|---|
| `botability` | 11 | Lighthouse SEO audits, fetch-derived crawlable/text-content, domain-level sitemap and robots checks, GovernmentOrganization schema |
| `accessibility` | 66 | One attribute per Lighthouse accessibility audit, plus image-aspect-ratio, doctype, charset |
| `usability` | 16 | Title, description, viewport, www, Core Web Vitals (cls, fcp, inp, lcp, ttfb), Open Graph tags |
| `security` | 9 | csp, hsts, securitytxt, xcontenttypeoptions, errors-in-console, clickjacking-mitigation, paste-preventing-inputs, https, dotgov |
| `readability` | 1 | reading-level, derived from the lightrunner's `readabilityInfo` |

Each topic object carries `displayName`, `icon` (Font Awesome solid name), `color` (icon color on the dark theme), `url`, `rankingsUrl`, `scangovUrl`, `description`, `standardsDescription`, `guidanceDescription`, `ogImage`, `why`, `risk`, optional `videos`, and `attributes[]`.

### Accessibility — individual Lighthouse audits

Each attribute maps 1:1 to a Lighthouse accessibility audit. Pass/fail is determined by `score === 1`; audits reported as `notApplicable`, `informative` or `manual` are not emitted, so they are neither scored nor penalized.

### Botability — mixed sources

| ScanGov attribute | Source |
|---|---|
| crawlable | fetch (robots meta / X-Robots-Tag on the page) |
| text-content | fetch (main content present without JavaScript) |
| schema-government-organization | augmentsitedata, domains table `has_gov_schema` (sitewide) |
| status, xml, sitemap-robots | augmentsitedata sitemap checks (sitewide) |
| valid, allowed | augmentsitedata robots.txt checks (sitewide) |
| canonical, link-text, hreflang | Lighthouse SEO audits |

### Usability — Lighthouse plus fetch

| ScanGov attribute | Source |
|---|---|
| title, description, viewport | Lighthouse `document-title`, `meta-description`, `viewport` |
| www | augmentsitedata (sitewide) |
| fcp, lcp, cls, ttfb, inp | Lighthouse lab numbers with thresholds (fcp > 1800ms, lcp > 2500ms, cls > 0.1, ttfb > 800ms, tbt > 200ms as the inp proxy), overridden by CrUX field data when available |
| ogsitename, ogtype, ogtitle, ogdescription, ogurl, ogimage, ogimagealt | fetch, HTML meta tag extraction |

### Security — Lighthouse best practices plus augmentsitedata

| ScanGov attribute | Source |
|---|---|
| csp, hsts, errors-in-console, clickjacking-mitigation, paste-preventing-inputs, https | Lighthouse |
| securitytxt, xcontenttypeoptions | augmentsitedata (sitewide) |
| dotgov | pure function of domain and site type (sitewide) |

### Readability — derived from readabilityInfo

The lightrunner extracts the main text of each English page (unfluff, after dropping navigation, header, footer and headings) and computes `readabilityInfo`: word, sentence and character counts, the Automated Readability Index (ARI) and the Flesch-Kincaid grade. The auditor derives `reading-level` from `readabilityInfo` at query time: a page passes when `Math.round(automatedReadabilityIndex) <= 8` (about a 7th grade reading level). Pages that are not in English (`lang` not starting with `en`) are excluded from the attribute, and pages whose text extraction was skipped or found no words are not scored.

The pass/fail boolean the lightrunner still sends (`usability.attributes.readability` in stored data) is a fallback for rows that predate `readabilityInfo`. Keeping the threshold in the auditor means a per-site formula or grade target can be applied without re-auditing.

## Global (sitewide) vs per-page attributes

Most attributes are checked per page and aggregated. Sitewide attributes (`"sitewide": true` in audits.json) are checked once per domain by `augmentsitedata`, stored on the domains table, excluded from per-page scoring by the `globalAttributes` list in `transform.mjs`, and injected at domain level by `scorerecords.mjs`:

- `schema-government-organization`, `valid`, `xml`, `allowed`, `status`, `sitemap-robots` (botability)
- `securitytxt`, `xcontenttypeoptions`, `dotgov` (security)
- `www` (usability)

## Key code locations

| File | Repo | Purpose |
|---|---|---|
| `runner/compose.mjs`, `runaudit.mjs` | dedicatedlightrunner | Maps Lighthouse results to ScanGov attributes, merges fetch-derived data |
| `runner/readabilitywebpage.mjs` | dedicatedlightrunner | Text extraction and readabilityInfo |
| `src/http/post-lighthouseresults/index.mjs` | auditor | Receives and stores per-page audit data |
| `src/shared/normalizeaudit.mjs` | auditor | Folds older schemas and key names into the current topics |
| `src/shared/transform.mjs` | auditor | Per-page scoring, query-time derivations (cls, reading-level) |
| `src/shared/scorerecords.mjs` | auditor | Aggregates pages into domain scores, adds sitewide attributes |
| `src/events/augmentsitedata/index.mjs` | auditor | Runs sitewide checks, writes the domain record and score history |
| `scripts/sync-audits.mjs` | auditor | Copies audits.json into each Lambda directory on deploy |
| `scripts/get-data-repo-files.js` | my.scangov.com | Copies audits.json and guidance.json on deploy |

## Cross-reference rules

Enforced by `scripts/check-standards.js`:

1. Every `guidance.json` entry's `standards[].url` (stripped of `/`) must match an attribute `key` in `audits.json`
2. Every audit attribute's `guidance[].url` (stripped of `/`) must match a `key` in `guidance.json`
3. Every `topics[]` value in `guidance.json` must match a top-level key in `audits.json`
4. `displayName` values in cross-references must match the canonical `displayName` in the target file
5. Every attribute's `scorekey` must equal its `key`, and no attribute key may equal a topic key (standards.scangov.org builds `/<topic>/` and `/<attribute>/` at the same path level)
