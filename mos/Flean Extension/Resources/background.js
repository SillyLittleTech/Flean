import { getWikiData, fetchWikiData, findMatchingWiki, invalidateIndex } from './scripts/wiki-data-manager.js'

const log = {
  info: () => {},
  warn: () => {}
}

// Initialise wiki data on extension startup (loads from cache or fetches fresh)
async function initWikiData () {
  try {
    await getWikiData()
    log.info('Flean: wiki data ready')
  } catch (e) {
    log.warn('Flean: wiki data init failed, heuristics will be used', e)
  }
}

// Schedule a weekly background refresh using browser.alarms (if supported)
function setupRefreshAlarm () {
  if (typeof browser === 'undefined' || !browser.alarms) return
  try {
    browser.alarms.create('wikiDataRefresh', { periodInMinutes: 7 * 24 * 60 })
    browser.alarms.onAlarm.addListener(async (alarm) => {
      if (alarm.name !== 'wikiDataRefresh') return
      try {
        await fetchWikiData()
        invalidateIndex()
        log.info('Flean: wiki data refreshed')
      } catch (e) {
        log.warn('Flean: scheduled wiki data refresh failed', e)
      }
    })
  } catch (e) {
    log.warn('Flean: could not set up refresh alarm', e)
  }
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.greeting === 'hello') {
    return Promise.resolve({ farewell: 'goodbye' })
  }

  if (request.action === 'findWiki') {
    return findMatchingWiki(request.url).catch(() => null)
  }
})

initWikiData()
setupRefreshAlarm()
