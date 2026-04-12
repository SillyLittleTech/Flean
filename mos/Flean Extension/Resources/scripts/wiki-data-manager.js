// wiki-data-manager.js
// Remote wiki data loading with local caching and heuristic fallback.
// Data source: indie-wiki-buddy (https://github.com/KevinPayravi/indie-wiki-buddy)

const WIKI_DATA_URL = 'https://raw.githubusercontent.com/KevinPayravi/indie-wiki-buddy/main/data/sitesEN.json'
const CACHE_KEY = 'wikiData'
const CACHE_TS_KEY = 'wikiDataLastFetch'
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

const BASE64REGEX = /^[A-Za-z0-9+/]+=*$/

/**
 * Compress a JS value to a gzip+base64 string.
 * Falls back to plain JSON string if CompressionStream is unavailable.
 */
export async function compressJSON (value) {
  const json = JSON.stringify(value)
  if (typeof CompressionStream === 'undefined') return btoa(json)
  try {
    const bytes = new TextEncoder().encode(json)
    const stream = new CompressionStream('gzip')
    const writer = stream.writable.getWriter()
    writer.write(bytes)
    writer.close()
    const compressed = await new Response(stream.readable).arrayBuffer()
    const uint8 = new Uint8Array(compressed)
    let binary = ''
    for (let i = 0; i < uint8.length; i++) binary += String.fromCharCode(uint8[i])
    return btoa(binary)
  } catch {
    return btoa(json)
  }
}

/**
 * Decompress a gzip+base64 string back to the original value.
 * Accepts both gzip-compressed and plain base64-encoded JSON (fallback).
 */
export async function decompressJSON (value) {
  if (!value || !BASE64REGEX.test(value)) throw new Error('Invalid compressed data')
  if (typeof DecompressionStream === 'undefined') return JSON.parse(atob(value))
  try {
    const binary = atob(value)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const stream = new DecompressionStream('gzip')
    const writer = stream.writable.getWriter()
    writer.write(bytes)
    writer.close()
    const decompressed = await new Response(stream.readable).arrayBuffer()
    return JSON.parse(new TextDecoder().decode(decompressed))
  } catch (e) {
    // May be plain base64 JSON (written by the fallback path above)
    try { return JSON.parse(atob(value)) } catch { throw e }
  }
}

/**
 * Fetch fresh wiki data from the GitHub CDN, compress it, and store in browser.storage.local.
 * Returns the raw data array, or throws on failure.
 */
export async function fetchWikiData () {
  const response = await fetch(WIKI_DATA_URL)
  if (!response.ok) throw new Error(`Fetch failed: ${response.status}`)
  const data = await response.json()
  const compressed = await compressJSON(data)
  await browser.storage.local.set({ [CACHE_KEY]: compressed, [CACHE_TS_KEY]: Date.now() })
  return data
}

/**
 * Get wiki data from cache, fetching fresh data if the cache is stale (>7 days) or absent.
 * Returns the data array, or null if unavailable (network failure, etc.).
 */
export async function getWikiData () {
  try {
    const stored = await browser.storage.local.get([CACHE_KEY, CACHE_TS_KEY])
    const ts = stored[CACHE_TS_KEY] || 0
    const compressed = stored[CACHE_KEY]
    if (compressed && (Date.now() - ts) < CACHE_TTL_MS) {
      try {
        return await decompressJSON(compressed)
      } catch {
        // fall through and fetch fresh data
      }
    }
    return await fetchWikiData()
  } catch {
    return null
  }
}

/** Build an in-memory Map from normalised origin host → { wiki, originEntry }. */
function buildIndex (wikiData) {
  const index = new Map()
  if (!Array.isArray(wikiData)) return index
  for (const wiki of wikiData) {
    if (!wiki.origins || !wiki.destination_base_url) continue
    for (const origin of wiki.origins) {
      if (!origin.origin_base_url) continue
      const key = origin.origin_base_url.toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/\/$/, '')
      index.set(key, { wiki, originEntry: origin })
    }
  }
  return index
}

let _wikiIndex = null
let _wikiIndexPromise = null

/** Ensure the in-memory lookup index is built. */
function ensureIndex () {
  if (_wikiIndex !== null) return Promise.resolve(_wikiIndex)
  if (_wikiIndexPromise) return _wikiIndexPromise
  _wikiIndexPromise = getWikiData().then(data => {
    _wikiIndex = buildIndex(data)
    _wikiIndexPromise = null
    return _wikiIndex
  }).catch(() => {
    _wikiIndex = new Map()
    _wikiIndexPromise = null
    return _wikiIndex
  })
  return _wikiIndexPromise
}

/**
 * Invalidate the in-memory index so it is rebuilt on the next lookup.
 * Call this after a successful data refresh.
 */
export function invalidateIndex () {
  _wikiIndex = null
}

/**
 * Pre-build the in-memory wiki lookup index.
 * Call this during extension startup so the first findMatchingWiki request
 * does not stall waiting for index construction within the content-script timeout.
 */
export async function warmIndex () {
  return ensureIndex()
}

/**
 * Given a URL string, find the best matching independent wiki destination.
 * Returns { destinationUrl: string, wikiName: string } or null if no match found.
 */
export async function findMatchingWiki (urlString) {
  try {
    const url = new URL(urlString)
    const host = url.host.toLowerCase()
    const index = await ensureIndex()

    // Try exact host, then without leading 'www.'
    const match = index.get(host) || (host.startsWith('www.') ? index.get(host.slice(4)) : undefined)
    if (!match) return null

    const { wiki, originEntry } = match

    // Extract the article name from the path using the origin's content path prefix.
    // indie-wiki-buddy templates use a single `$1` placeholder (e.g. "/wiki/$1").
    // We strip everything from `$1` onward to obtain just the path prefix.
    const originPathPrefix = (originEntry.origin_content_path || '/wiki/')
      .replace(/\$1.*$/, '')
    let article = url.pathname
    // Case-insensitive prefix match is intentional: wiki path prefixes like /wiki/
    // are the same regardless of casing on every platform targeted by this data.
    if (article.toLowerCase().startsWith(originPathPrefix.toLowerCase())) {
      article = article.slice(originPathPrefix.length)
    }
    try { article = decodeURIComponent(article) } catch { /* keep encoded */ }

    // If the article is empty (wiki root) or matches the origin's main page, redirect to
    // the destination's declared main page to honour cross-wiki naming differences.
    if (wiki.destination_main_page) {
      const normalize = title => (title || '').replace(/_/g, ' ').toLowerCase().trim()
      if (!article || normalize(article) === normalize(originEntry.origin_main_page || '')) {
        article = wiki.destination_main_page
      }
    }

    // Build destination URL based on platform
    const destBase = wiki.destination_base_url
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
    const platform = (wiki.destination_platform || 'mediawiki').toLowerCase()
    let destPath = ''
    const encodedArticle = encodeURIComponent(article.replace(/ /g, '_'))

    if (wiki.destination_content_path) {
      if (wiki.destination_content_path.includes('$1')) {
        // Template-style path: replace the $1 placeholder with the article name
        destPath = wiki.destination_content_path.replace('$1', encodedArticle)
      } else {
        // Prefix-style path (e.g. "/wiki/"): append the article name to the prefix
        destPath = wiki.destination_content_path + encodedArticle
      }
    } else if (platform === 'dokuwiki') {
      destPath = `/doku.php?id=${encodeURIComponent(article.replace(/ /g, '_').toLowerCase())}`
    } else {
      // Default: MediaWiki-style /wiki/ArticleName
      destPath = `/wiki/${encodedArticle}`
    }

    const destinationUrl = `https://${destBase}${destPath}${url.search}${url.hash}`
    const wikiName = wiki.destination || wiki.article || destBase
    return { destinationUrl, wikiName }
  } catch {
    return null
  }
}
