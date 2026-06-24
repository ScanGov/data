export const data = {
  permalink: '/data.json',
  eleventyExcludeFromCollections: true,
  sitemap: false,
  layout: false,
}

export function render({ datasets, site }) {
  const mediaTypes = { json: 'application/json', csv: 'text/csv' }

  const catalog = {
    conformsTo: 'https://project-open-data.cio.gov/v1.1/schema',
    dataset: datasets.filter((d) => !d.experimental).map((d) => ({
      title: d.title,
      description: d.description,
      modified: d.updatedTimeISO,
      publisher: { name: 'ScanGov', '@type': 'org:Organization' },
      contactPoint: {
        '@type': 'vcard:Contact',
        fn: 'ScanGov',
        hasEmail: 'mailto:hello@scangov.com',
      },
      identifier: `${site.url}/datasets/${d.slug}/`,
      accessLevel: 'public',
      license: 'https://creativecommons.org/licenses/by/4.0/',
      distribution: d.files.map((f) => ({
        '@type': 'dcat:Distribution',
        downloadURL: `${site.url}${f.downloadUrl}`,
        mediaType: mediaTypes[f.type] || 'application/octet-stream',
        format: f.type.toUpperCase(),
      })),
    })),
  }

  return JSON.stringify(catalog, null, 2)
}
