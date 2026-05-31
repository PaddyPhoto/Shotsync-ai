// Service worker — handles extension lifecycle events

chrome.runtime.onInstalled.addListener(() => {
  console.log('ShotSync extension installed')
})

// Forward messages between popup and content scripts if needed
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ status: 'ok' })
  }
})
