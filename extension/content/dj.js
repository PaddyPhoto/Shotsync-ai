// ShotSync content script — David Jones Vendor Portal
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SHOTSYNC_PUSH_LISTING' || message.channel !== 'dj') return
  fillDJListing(message.payload)
    .then(result => sendResponse(result))
    .catch(err => sendResponse({ success: false, error: err.message }))
  return true
})

async function fillDJListing(payload) {
  // Field mapping TBD — requires access to David Jones vendor portal to verify selectors
  showOverlay('David Jones portal automation coming soon. Field mapping requires portal access.', 'info')
  return { success: false, error: 'DJ automation not yet configured' }
}

function showOverlay(message, type = 'info') {
  let overlay = document.getElementById('shotsync-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'shotsync-overlay'
    overlay.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:999999;max-width:320px;padding:12px 16px;border-radius:10px;font-family:-apple-system,sans-serif;font-size:13px;line-height:1.5;box-shadow:0 4px 24px rgba(0,0,0,0.3);background:rgba(0,0,0,0.9);border:1px solid rgba(255,255,255,0.15);color:#fff;`
    document.body.appendChild(overlay)
  }
  overlay.innerHTML = `<strong>ShotSync</strong> — ${message}`
  setTimeout(() => overlay.remove(), 6000)
}
