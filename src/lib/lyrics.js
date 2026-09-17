import yaml from 'js-yaml'
import { lyricsSources } from '../generated-lyrics.js'

const slugify = (filename) =>
  filename
    .replace(/\.yaml$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/--+/g, '-')

const isValidRecord = (doc) =>
  doc &&
  typeof doc.title === 'string' &&
  typeof doc.artist === 'string' &&
  Array.isArray(doc.languages)

const parseRecord = (filename, content) => {
  let doc
  try {
    doc = yaml.load(content)
  } catch (err) {
    console.warn(`[lyrics] skipping ${filename}: invalid YAML — ${err.message}`)
    return null
  }
  if (!isValidRecord(doc)) {
    console.warn(`[lyrics] skipping ${filename}: missing title, artist, or languages`)
    return null
  }
  return {
    slug: slugify(filename),
    title: doc.title,
    artist: doc.artist,
    description: typeof doc.description === 'string' ? doc.description : undefined,
    pdfUrl: typeof doc.pdf_url === 'string' ? doc.pdf_url : undefined,
    intro: typeof doc.intro === 'string' && doc.intro.trim() !== '' ? doc.intro : undefined,
    languages: doc.languages,
    footnotes: Array.isArray(doc.footnotes) ? doc.footnotes : [],
  }
}

export const listLyrics = () => {
  const records = []
  const seen = new Set()
  for (const [filename, content] of Object.entries(lyricsSources)) {
    const record = parseRecord(filename, content)
    if (!record) continue
    if (seen.has(record.slug)) {
      console.warn(`[lyrics] skipping ${filename}: slug "${record.slug}" already used`)
      continue
    }
    seen.add(record.slug)
    records.push(record)
  }
  return records.sort((a, b) => a.title.localeCompare(b.title))
}

export const getLyricsBySlug = (slug) => listLyrics().find((r) => r.slug === slug)
