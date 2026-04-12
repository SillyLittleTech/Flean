import { fetchWikiData, findMatchingWiki, invalidateIndex, warmIndex } from './scripts/wiki-data-manager.js'

// Initialise wiki data on extension startup and pre-warm the lookup index so the
// first findWiki message from content.js is answered without needing to build the
// index inside the 500ms race window.
async function initWikiData () {
  try {
    await warmIndex()
  } catch (err) {
    if (err) return
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
      } catch (err) {
        if (err) return
      }
    })
  } catch (err) {
    if (err) return
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
