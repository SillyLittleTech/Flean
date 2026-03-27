import { getWikiData, fetchWikiData, findMatchingWiki, invalidateIndex } from './scripts/wiki-data-manager.js'


// Initialise wiki data on extension startup (loads from cache or fetches fresh)
async function initWikiData () {
  try {
    await getWikiData()
  } catch {
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
      } catch {
      }
    })
  } catch {
  }
}

browser.runtime.onMessage.addListener((request) => {
  if (request.greeting === 'hello') {
    return Promise.resolve({ farewell: 'goodbye' })
  }

  if (request.action === 'findWiki') {
    return findMatchingWiki(request.url).catch(() => null)
  }

  return undefined
})

initWikiData()
setupRefreshAlarm()
