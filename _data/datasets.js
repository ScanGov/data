import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

function getSize(filepath) {
  try {
    const bytes = fs.statSync(filepath).size
    const large = bytes > 1000000
    if (bytes >= 1048576) return { display: (bytes / 1048576).toFixed(1) + ' MB', bytes, large }
    if (bytes >= 1024) return { display: (bytes / 1024).toFixed(0) + ' KB', bytes, large }
    return { display: bytes + ' B', bytes, large: false }
  } catch {
    return { display: 'Unknown', bytes: 0, large: false }
  }
}

function getUpdatedTime() {
  try {
    const ts = fs.readFileSync(path.join(root, 'updated_time'), 'utf8').trim()
    const date = new Date(parseInt(ts))
    const display = date.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const iso = date.toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' }) // YYYY-MM-DD
    const year = iso.split('-')[0]
    return { display, iso, year }
  } catch {
    return { display: 'Unknown', iso: '', year: '' }
  }
}

const license = 'CC BY 4.0'
const licenseUrl = 'https://creativecommons.org/licenses/by/4.0/'

const datasetDefs = [
  {
    slug: 'email-dns',
    title: 'Email DNS',
    description: 'Email DNS scan results for U.S. government websites.',
    files: [{ name: 'experimental/emaildns.json', type: 'json' }],
    experimental: true,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'spf', type: 'boolean', description: 'Whether an SPF record exists' },
      { name: 'dmarc', type: 'boolean', description: 'Whether a DMARC record exists' },
    ],
  },
  {
    slug: 'homepage-audits',
    title: 'Homepage Audits',
    description: 'Homepage audit results for U.S. government websites.',
    files: [{ name: 'myscangov_homepage_audits.json', type: 'json' }],
    experimental: false,
    fields: [
      { name: 'urlkey', type: 'string', description: 'Domain used as the record key' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scanned URL' },
      { name: 'name', type: 'string', description: 'Organization name' },
      { name: 'redirect', type: 'string', description: 'Final URL after any redirects' },
      { name: 'time', type: 'number', description: 'Unix timestamp (ms) of when the scan ran' },
      { name: 'overallScore', type: 'number', description: 'Overall score across all categories (0–100)' },
      { name: 'overallScoreCount', type: 'number', description: 'Total number of checks run' },
      { name: 'overallPossibleScore', type: 'number', description: 'Number of checks that passed' },
      { name: 'aifriendly', type: 'object', description: 'AI-friendliness audit: url, status, name, crawlable, text-content' },
      { name: 'accessibility', type: 'object', description: 'Accessibility audit: url, status, name, a11y-best-practices, a11y-aria, a11y-audio-video, a11y-color-contrast, hidden, a11y-language, a11y-names-labels, a11y-navigation, a11y-tables-lists' },
      { name: 'content', type: 'object', description: 'Content audit: url, status, name, title, description, viewport, image_aspect_ratio, html_lang_valid, zooming-scaling, doctype, charset' },
      { name: 'domain', type: 'object', description: 'Domain audit: url, status, name, https, www, dotgov' },
      { name: 'performance', type: 'object', description: 'Performance audit: url, status, name, cls, fcp, inp, lcp, ttfb' },
      { name: 'seo', type: 'object', description: 'SEO audit: url, status, name, xml, valid, allowed, sitemap-robots, canonical, link-text, hreflang' },
      { name: 'security', type: 'object', description: 'Security audit: url, status, name, csp, hsts, securityTxt, xContentTypeOptions, errors_in_console, clickjacking_mitigation, paste_preventing_inputs' },
      { name: 'social', type: 'object', description: 'Social metadata audit: url, status, name, ogSiteName, ogType, ogTitle, ogDescription, ogUrl, ogImage, ogImageAlt' },
      { name: 'scores', type: 'object', description: 'Per-category scores, each with attributes (boolean results), score (0–100), correct (passing count), and all (total count)' },
    ],
  }
]

export default function () {
  const { display: updatedTime, iso: updatedTimeISO, year: updatedYear } = getUpdatedTime()
  return datasetDefs.map((d) => ({
    ...d,
    updatedTime,
    updatedTimeISO,
    updatedYear,
    license,
    licenseUrl,
    files: d.files.map((f) => ({
      ...f,
      size: getSize(path.join(root, f.name)),
      downloadUrl: '/' + f.name,
    })),
  }))
}
