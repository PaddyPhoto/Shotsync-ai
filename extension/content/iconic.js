// ShotSync content script — The Iconic Seller Portal
// Listens for SHOTSYNC_PUSH_LISTING messages from the popup and fills in product forms.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== 'SHOTSYNC_PUSH_LISTING' || message.channel !== 'iconic') return

  fillIconicListing(message.payload)
    .then(result => sendResponse(result))
    .catch(err => sendResponse({ success: false, error: err.message }))

  return true // keep channel open for async response
})

async function fillIconicListing(payload) {
  const { title, description, category, gender, colour, rrp, attributes, variants, images } = payload

  // Navigate to new product page if not already there
  if (!window.location.pathname.includes('/products/new') && !window.location.pathname.includes('/listing/create')) {
    // Signal to user to navigate to the new product page
    showOverlay('Navigate to "Create new listing" in The Iconic portal, then click Push again.', 'info')
    return { success: false, error: 'Navigate to new listing page first' }
  }

  showOverlay('Filling in listing data…', 'loading')

  try {
    // Title
    await fillField('[data-field="product-title"], #product-title, input[name="title"]', title)

    // Description
    await fillField('[data-field="description"], #description, textarea[name="description"]', description)

    // Category — attempt to select from dropdown
    await selectDropdown('[data-field="category"], #category, select[name="category"]', category)

    // Gender
    await selectDropdown('[data-field="gender"], #gender, select[name="gender"]', gender)

    // Colour
    await fillField('[data-field="colour"], #colour, input[name="colour"]', colour)

    // RRP
    await fillField('[data-field="rrp"], #rrp, input[name="rrp"], input[name="price"]', String(rrp))

    // Attributes
    if (attributes) {
      await fillField('[data-field="composition"], input[name="composition"]', attributes.composition || '')
      await fillField('[data-field="care"], input[name="care_instructions"], textarea[name="care"]', attributes.care || '')
      await fillField('[data-field="fit"], input[name="fit"]', attributes.fit || '')
      await fillField('[data-field="origin"], input[name="country_of_origin"]', attributes.origin || '')
    }

    // Variants — fill size/barcode/stock rows
    if (variants?.length) {
      await fillVariants(variants)
    }

    // Images — trigger file upload for each image URL
    if (images?.length) {
      await uploadImages(images)
    }

    showOverlay(`Done — ${variants?.length || 0} variants filled, ${images?.length || 0} images uploaded. Review and submit.`, 'success')
    return { success: true }

  } catch (err) {
    showOverlay(`Error: ${err.message}`, 'error')
    return { success: false, error: err.message }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function fillField(selectors, value) {
  if (!value) return
  const el = findElement(selectors)
  if (!el) return

  el.focus()
  el.value = ''
  el.value = value
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
  await wait(80)
}

async function selectDropdown(selectors, value) {
  if (!value) return
  const el = findElement(selectors)
  if (!el) return

  // Try matching option by text or value
  const options = Array.from(el.options || [])
  const match = options.find(o =>
    o.text.toLowerCase().includes(value.toLowerCase()) ||
    o.value.toLowerCase().includes(value.toLowerCase())
  )
  if (match) {
    el.value = match.value
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }
  await wait(80)
}

async function fillVariants(variants) {
  // Attempt to find variant rows — selector patterns vary per portal version
  for (const variant of variants) {
    const sizeEl = findElement(`[data-size="${variant.size}"], tr[data-variant="${variant.size}"]`)
    if (!sizeEl) continue

    const barcodeInput = sizeEl.querySelector('input[name*="barcode"], input[name*="ean"]')
    const stockInput   = sizeEl.querySelector('input[name*="stock"], input[name*="quantity"]')
    const priceInput   = sizeEl.querySelector('input[name*="price"]')

    if (barcodeInput && variant.barcode) {
      barcodeInput.value = variant.barcode
      barcodeInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
    if (stockInput) {
      stockInput.value = variant.stock
      stockInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
    if (priceInput && variant.price) {
      priceInput.value = variant.price
      priceInput.dispatchEvent(new Event('input', { bubbles: true }))
    }
    await wait(50)
  }
}

async function uploadImages(images) {
  // Convert remote image URLs to File objects and inject into the file input
  const fileInput = document.querySelector('input[type="file"][name*="image"], input[type="file"][accept*="image"]')
  if (!fileInput) return

  const files = await Promise.all(
    images.map(async (img) => {
      const res = await fetch(img.url)
      const blob = await res.blob()
      return new File([blob], img.filename || `image-${img.angle}.jpg`, { type: blob.type })
    })
  )

  const dt = new DataTransfer()
  files.forEach(f => dt.items.add(f))
  fileInput.files = dt.files
  fileInput.dispatchEvent(new Event('change', { bubbles: true }))
  await wait(500)
}

function findElement(selectors) {
  for (const sel of selectors.split(',').map(s => s.trim())) {
    const el = document.querySelector(sel)
    if (el) return el
  }
  return null
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── Overlay UI ────────────────────────────────────────────────────────────────

function showOverlay(message, type = 'info') {
  let overlay = document.getElementById('shotsync-overlay')
  if (!overlay) {
    overlay = document.createElement('div')
    overlay.id = 'shotsync-overlay'
    overlay.style.cssText = `
      position: fixed; bottom: 20px; right: 20px; z-index: 999999;
      max-width: 320px; padding: 12px 16px; border-radius: 10px;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px; line-height: 1.5;
      display: flex; align-items: flex-start; gap: 10px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      transition: opacity 0.2s;
    `
    document.body.appendChild(overlay)
  }

  const styles = {
    loading: { bg: 'rgba(0,0,0,0.9)',    border: 'rgba(0,122,255,0.4)',  color: '#fff' },
    success: { bg: 'rgba(0,0,0,0.9)',    border: 'rgba(48,209,88,0.4)',  color: '#30d158' },
    error:   { bg: 'rgba(0,0,0,0.9)',    border: 'rgba(255,59,48,0.4)',  color: '#ff3b30' },
    info:    { bg: 'rgba(0,0,0,0.9)',    border: 'rgba(255,255,255,0.15)', color: '#fff' },
  }
  const s = styles[type] || styles.info

  overlay.style.background = s.bg
  overlay.style.border = `1px solid ${s.border}`
  overlay.style.color = s.color
  overlay.innerHTML = `
    <div style="flex-shrink:0;margin-top:1px">
      ${type === 'loading'
        ? '<div style="width:12px;height:12px;border:2px solid rgba(255,255,255,0.2);border-top-color:#007aff;border-radius:50%;animation:shotsync-spin 0.6s linear infinite"></div>'
        : type === 'success'
        ? '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#30d158" stroke-width="2"><path d="M3 7l3 3 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 1L1 13h12L7 1z" stroke-linejoin="round"/></svg>'
      }
    </div>
    <div>
      <div style="font-weight:600;margin-bottom:2px">ShotSync</div>
      <div style="opacity:0.85">${message}</div>
    </div>
  `

  if (!document.getElementById('shotsync-spin-style')) {
    const style = document.createElement('style')
    style.id = 'shotsync-spin-style'
    style.textContent = '@keyframes shotsync-spin { to { transform: rotate(360deg); } }'
    document.head.appendChild(style)
  }

  if (type === 'success' || type === 'error') {
    setTimeout(() => { overlay.style.opacity = '0'; setTimeout(() => overlay.remove(), 200) }, 5000)
  }
}
