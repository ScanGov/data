import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

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

function getGitFileDate(relPath) {
  try {
    const iso = execSync(`git log -1 --format="%cs" -- "${relPath}"`, { cwd: root }).toString().trim()
    if (!iso) return null
    const date = new Date(iso + 'T12:00:00')
    const display = date.toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    const year = iso.split('-')[0]
    return { display, iso, year }
  } catch {
    return null
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
    slug: 'status',
    title: 'Status',
    description: 'HTTP status code definitions and types for websites ScanGov monitors.',
    files: [{ name: 'status.json', type: 'json' }],
    fileDate: true,
    experimental: false,
    fields: [
      { name: 'code', type: 'number', description: 'HTTP status code' },
      { name: 'label', type: 'string', description: 'Standard label for the status code' },
      { name: 'type', type: 'string', description: 'Status type: active, redirect, or inaccessible' },
      { name: 'description', type: 'string', description: 'Plain language description of the status code' },
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
      { name: 'urlkey', type: 'string', description: 'Domain used as the record key' },
      { name: 'status', type: 'number', description: 'HTTP status code of the scanned URL' },
      { name: 'name', type: 'string', description: 'Organization name' },
      { name: 'redirect', type: 'string', description: 'Final URL after any redirects' },
      { name: 'time', type: 'number', description: 'Unix timestamp (ms) of when the scan ran' },
      { name: 'overallScore', type: 'number', description: 'Overall score across all categories (0–100)' },
      { name: 'overallScoreCount', type: 'number', description: 'Number of checks that passed' },
      { name: 'overallPossibleScore', type: 'number', description: 'Total number of checks run' },
      { name: 'botability', type: 'object', description: 'Botability results, one boolean per check: crawlable, text-content, schema-government-organization, status, xml, valid, allowed, sitemap-robots, canonical, link-text, hreflang' },
      { name: 'accessibility', type: 'object', description: 'Accessibility results, one boolean per Lighthouse accessibility audit (aria-*, image-alt, color-contrast, html-has-lang, etc.) plus image-aspect-ratio, doctype, charset' },
      { name: 'usability', type: 'object', description: 'Usability results, one boolean per check: title, description, viewport, www, cls, fcp, inp, lcp, ttfb, ogsitename, ogtype, ogtitle, ogdescription, ogurl, ogimage, ogimagealt' },
      { name: 'security', type: 'object', description: 'Security results, one boolean per check: csp, hsts, securitytxt, xcontenttypeoptions, errors-in-console, clickjacking-mitigation, paste-preventing-inputs, https, dotgov' },
      { name: 'readability', type: 'object', description: 'Readability results, one boolean per check: reading-level (rounded Automated Readability Index of 8 or below)' },
      { name: 'ari', type: 'number', description: 'Automated Readability Index of the homepage text (U.S. grade level); absent when the page is not in English or has no measurable text' },
      { name: 'fk', type: 'number', description: 'Flesch-Kincaid grade level of the homepage text; absent in the same cases as ari' },
      { name: 'scores', type: 'object', description: 'Per-topic scores (botability, accessibility, usability, security, readability), each with attributes (boolean results), score (0–100), correct (passing count), and all (total count)' },
    ],
  }
]

export default function () {
  const globalTime = getUpdatedTime()
  return datasetDefs.map((d) => {
    let timeInfo = globalTime
    if (d.fileDate) {
      const fromFile = d.files.map((f) => getGitFileDate(f.name)).filter(Boolean)
      if (fromFile.length) timeInfo = fromFile.sort((a, b) => b.iso.localeCompare(a.iso))[0]
    }
    const { display: updatedTime, iso: updatedTimeISO, year: updatedYear } = timeInfo
    return {
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
    }
  })
}
