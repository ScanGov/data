#!/usr/bin/env node
// Enforces the cross-reference rules in standards/ARCHITECTURE.md between
// standards/audits.json and standards/guidance.json:
//   1. every guidance entry's standards[].url (without the leading /) is an attribute key
//   2. every attribute's guidance[].url (without the leading /) is a guidance key
//   3. every guidance entry's topics[] value is a top-level audits.json topic key
//   4. displayName in a cross-reference matches the canonical displayName
//   5. every attribute's scorekey equals its key (the auditor and my.scangov.com
//      syncs refuse the file otherwise), and no attribute key is also a topic key
//      (standards.scangov.org builds /<topic>/ and /<attribute>/ at the same level)
// Exits non-zero with every violation listed.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const audits = JSON.parse(fs.readFileSync(path.join(root, 'standards/audits.json'), 'utf8'))
const guidance = JSON.parse(fs.readFileSync(path.join(root, 'standards/guidance.json'), 'utf8'))

const strip = (url) => String(url || '').replace(/^\//, '').replace(/\/$/, '')
const problems = []

const topics = Object.keys(audits)
const attributes = new Map()
for (const topic of topics) {
  for (const attr of audits[topic].attributes || []) {
    if (attributes.has(attr.key)) problems.push(`duplicate attribute key ${attr.key} (${attributes.get(attr.key).topic} and ${topic})`)
    attributes.set(attr.key, { topic, attr })
    if (attr.scorekey !== undefined && attr.scorekey !== attr.key) problems.push(`${topic}/${attr.key}: scorekey "${attr.scorekey}" must equal key`)
    if (topics.includes(attr.key)) problems.push(`${topic}/${attr.key}: attribute key collides with topic key ${attr.key}`)
  }
}

const guidanceByKey = new Map(guidance.map((g) => [g.key, g]))

for (const g of guidance) {
  for (const t of g.topics || []) {
    if (!topics.includes(t)) problems.push(`guidance ${g.key}: topic "${t}" is not a topic in audits.json`)
  }
  for (const s of g.standards || []) {
    const key = strip(s.url)
    const found = attributes.get(key)
    if (!found) problems.push(`guidance ${g.key}: standards url ${s.url} is not an attribute key`)
    else if (s.displayName && s.displayName !== found.attr.displayName) problems.push(`guidance ${g.key}: standards displayName "${s.displayName}" for ${key} should be "${found.attr.displayName}"`)
  }
}

for (const [key, { topic, attr }] of attributes) {
  for (const ref of attr.guidance || []) {
    const gkey = strip(ref.url)
    const g = guidanceByKey.get(gkey)
    if (!g) problems.push(`${topic}/${key}: guidance url ${ref.url} is not a guidance key`)
    else if (ref.displayName && ref.displayName !== g.displayName) problems.push(`${topic}/${key}: guidance displayName "${ref.displayName}" for ${gkey} should be "${g.displayName}"`)
  }
}

if (problems.length) {
  console.error(`check-standards: ${problems.length} problem(s)`)
  for (const p of problems) console.error('  - ' + p)
  process.exit(1)
}
console.log(`check-standards: ok (${topics.length} topics, ${attributes.size} attributes, ${guidance.length} guidance entries)`)
