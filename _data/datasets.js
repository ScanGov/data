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
    slug: 'accessibility',
    title: 'Accessibility',
    description: 'Accessibility scan results for U.S. government websites.',
    files: [{ name: 'accessibility.json', type: 'json' }],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'scores', type: 'object', description: 'Accessibility score breakdown by category' },
      { name: 'overallScore', type: 'number', description: 'Overall accessibility score (0–100)' },
    ],
  },
  {
    slug: 'domains',
    title: 'Domains',
    description: 'Names, agencies, and types for U.S. government websites.',
    files: [{ name: 'domains.csv', type: 'csv' }],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain (e.g. usa.gov)' },
      { name: 'agency', type: 'string', description: 'Agency or organization name' },
      { name: 'organization', type: 'string', description: 'Parent organization' },
      { name: 'city', type: 'string', description: 'City of the organization' },
      { name: 'state', type: 'string', description: 'State of the organization' },
      { name: 'type', type: 'string', description: 'Domain type (federal, state, city, etc.)' },
    ],
  },
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
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'audits', type: 'object', description: 'Detailed audit results per category' },
      { name: 'scores', type: 'object', description: 'Score breakdown by audit category' },
    ],
  },
  {
    slug: 'metadata',
    title: 'Metadata',
    description: 'HTML metadata scan results for U.S. government websites.',
    files: [
      { name: 'metadata.json', type: 'json' },
      { name: 'metadata.csv', type: 'csv' },
    ],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'title', type: 'string', description: 'Page title tag value' },
      { name: 'description', type: 'string', description: 'Meta description value' },
      { name: 'ogTitle', type: 'string', description: 'Open Graph title' },
      { name: 'ogDescription', type: 'string', description: 'Open Graph description' },
      { name: 'scores', type: 'object', description: 'Metadata score breakdown by category' },
    ],
  },
  {
    slug: 'performance',
    title: 'Performance',
    description: 'Performance scan results for U.S. government websites.',
    files: [{ name: 'performance.json', type: 'json' }],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'scores', type: 'object', description: 'Performance score breakdown by category' },
      { name: 'overallScore', type: 'number', description: 'Overall performance score (0–100)' },
    ],
  },
  {
    slug: 'robots',
    title: 'Robots',
    description: 'Robots.txt scan results for U.S. government websites.',
    files: [
      { name: 'robots.json', type: 'json' },
      { name: 'robots.csv', type: 'csv' },
    ],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'hasRobots', type: 'boolean', description: 'Whether a robots.txt file exists' },
      { name: 'scores', type: 'object', description: 'Robots compliance score breakdown' },
    ],
  },
  {
    slug: 'script-sources',
    title: 'Script Sources',
    description: 'Third-party scripts detected on U.S. government websites.',
    files: [{ name: 'scriptSources.json', type: 'json' }],
    experimental: true,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'scripts', type: 'array', description: 'List of third-party script source URLs detected' },
    ],
  },
  {
    slug: 'security',
    title: 'Security',
    description: 'Security scan results for U.S. government websites.',
    files: [
      { name: 'security.json', type: 'json' },
      { name: 'security.csv', type: 'csv' },
    ],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'hasSecurityTxt', type: 'boolean', description: 'Whether a security.txt file exists' },
      { name: 'scores', type: 'object', description: 'Security score breakdown by header' },
    ],
  },
  {
    slug: 'sitemap',
    title: 'Sitemap',
    description: 'Sitemap scan results for U.S. government websites.',
    files: [
      { name: 'sitemap.json', type: 'json' },
      { name: 'sitemap.csv', type: 'csv' },
    ],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'hasSitemap', type: 'boolean', description: 'Whether a sitemap.xml file exists' },
      { name: 'scores', type: 'object', description: 'Sitemap compliance score breakdown' },
    ],
  },
  {
    slug: 'url',
    title: 'URL',
    description: 'URL scan results for U.S. government websites.',
    files: [
      { name: 'url.json', type: 'json' },
      { name: 'url.csv', type: 'csv' },
    ],
    experimental: false,
    fields: [
      { name: 'domain', type: 'string', description: 'Government domain' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scan' },
      { name: 'redirectsToHttps', type: 'boolean', description: 'Whether HTTP redirects to HTTPS' },
      { name: 'scores', type: 'object', description: 'URL compliance score breakdown' },
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
