import {
  IdAttributePlugin,
  InputPathToUrlTransformPlugin,
  HtmlBasePlugin,
  EleventyRenderPlugin,
} from '@11ty/eleventy'
import pluginSyntaxHighlight from '@11ty/eleventy-plugin-syntaxhighlight'
import fontAwesomePlugin from '@11ty/font-awesome'
import { PurgeCSS } from 'purgecss'
import * as fs from 'fs'
import * as path from 'path'

/** @param {import("@11ty/eleventy").UserConfig} eleventyConfig */
export default async function (eleventyConfig) {

  eleventyConfig.addPlugin(fontAwesomePlugin)
  eleventyConfig.addPlugin(pluginSyntaxHighlight, { preAttributes: { tabindex: 0 } })
  eleventyConfig.addPlugin(HtmlBasePlugin)
  eleventyConfig.addPlugin(InputPathToUrlTransformPlugin)
  eleventyConfig.addPlugin(EleventyRenderPlugin)
  eleventyConfig.addPlugin(IdAttributePlugin)

  // Passthrough: site assets
  eleventyConfig.addPassthroughCopy({ './public/': '/' })
  eleventyConfig.addPassthroughCopy('CNAME')

  // Passthrough: data files — preserve all existing URLs
  const dataFiles = [
    'accessibility.json',
    'domains.csv',
    'metadata.json',
    'metadata.csv',
    'myscangov_homepage_audits.json',
    'performance.json',
    'robots.json',
    'robots.csv',
    'scriptSources.json',
    'security.json',
    'security.csv',
    'sitemap.json',
    'sitemap.csv',
    'status.json',
    'url.json',
    'url.csv',
    'updated_time',
  ]
  dataFiles.forEach((f) => eleventyConfig.addPassthroughCopy(f))
  eleventyConfig.addPassthroughCopy('experimental')
  eleventyConfig.addPassthroughCopy('standards')
  eleventyConfig.addPassthroughCopy('scripts')

  // Changelog: append entry when updated_time changes
  eleventyConfig.on('eleventy.before', async () => {
    const updatedTimePath = './updated_time'
    const changelogPath = './_data/changelog.json'

    if (!fs.existsSync(updatedTimePath)) return

    const updatedTime = fs.readFileSync(updatedTimePath, 'utf8').trim()
    let changelog = []
    if (fs.existsSync(changelogPath)) {
      changelog = JSON.parse(fs.readFileSync(changelogPath, 'utf8'))
    }

    const lastEntry = changelog[changelog.length - 1]
    if (!lastEntry || lastEntry.timestamp !== updatedTime) {
      const date = new Date(parseInt(updatedTime))
      changelog.push({
        timestamp: updatedTime,
        date: date.toISOString().split('T')[0],
        displayDate: date.toLocaleDateString('en-US', {
          timeZone: 'America/Los_Angeles',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        note: 'Datasets updated',
      })
      fs.writeFileSync(changelogPath, JSON.stringify(changelog, null, 2))
    }
  })

  eleventyConfig.addFilter('encodeParameter', (param) => {
    return encodeURIComponent((param || '').trim())
  })

  eleventyConfig.addFilter('standardFormatDate', (time) => {
    return new Date(time).toLocaleDateString('en-US', {
      timeZone: 'America/Los_Angeles',
    })
  })

  eleventyConfig.on('eleventy.after', async ({ dir }) => {
    const purgeCSSResults = await new PurgeCSS().purge({
      content: ['_site/index.html', '_site/search/index.html'],
      css: ['public/assets/bootstrap/css/bootstrap.min.css'],
      safelist: ['alert-dismissible', 'alert-primary', 'fade', 'show', 'btn-close', 'collapsing'],
    })
    fs.writeFileSync('./_site/bootstrap-purged.css', purgeCSSResults[0].css, 'utf8')
  })
}

export const config = {
  templateFormats: ['md', 'njk', 'html', 'liquid', '11ty.js'],
  markdownTemplateEngine: 'njk',
  htmlTemplateEngine: 'njk',
  dir: {
    input: 'content',
    includes: '../_includes',
    data: '../_data',
    output: '_site',
  },
}
