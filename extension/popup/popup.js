// Supported marketplace portals
const PORTALS = {
  'seller.theiconic.com.au':      { name: 'The Iconic', dot: '#ff9f0a', key: 'iconic' },
  'supplier.myer.com.au':         { name: 'Myer',       dot: '#ff3b30', key: 'myer'   },
  'vendorportal.davidjones.com.au':{ name: 'David Jones',dot: '#0a84ff', key: 'dj'    },
}

let selectedProductId = null
let selectedColourwayId = null
let currentPortal = null
let products = []

// ── Boot ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  const { apiKey, shotsyncUrl } = await chrome.storage.local.get(['apiKey', 'shotsyncUrl'])

  if (!apiKey || !shotsyncUrl) {
    showAuthScreen()
  } else {
    await showMainScreen(apiKey, shotsyncUrl)
  }
})

// ── Auth ──────────────────────────────────────────────────────────────────────

function showAuthScreen() {
  document.getElementById('auth-screen').style.display = 'flex'
  document.getElementById('main-screen').style.display = 'none'

  document.getElementById('connect-btn').addEventListener('click', async () => {
    const apiKey = document.getElementById('api-key-input').value.trim()
    const shotsyncUrl = document.getElementById('shotsync-url-input').value.trim().replace(/\/$/, '')
    if (!apiKey || !shotsyncUrl) return

    setAuthStatus('loading', 'Connecting…')
    document.getElementById('connect-btn').disabled = true

    try {
      const res = await fetch(`${shotsyncUrl}/api/extension/verify`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (!res.ok) throw new Error('Invalid API key')
      await chrome.storage.local.set({ apiKey, shotsyncUrl })
      await showMainScreen(apiKey, shotsyncUrl)
    } catch (err) {
      setAuthStatus('error', err.message || 'Could not connect. Check your API key and URL.')
      document.getElementById('connect-btn').disabled = false
    }
  })
}

function setAuthStatus(type, msg) {
  const el = document.getElementById('auth-status')
  el.className = `status-bar ${type}`
  el.textContent = msg
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function showMainScreen(apiKey, shotsyncUrl) {
  document.getElementById('auth-screen').style.display = 'none'
  document.getElementById('main-screen').style.display = 'block'

  // Detect which portal the active tab is on
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const url = tab?.url ?? ''

  for (const [host, portal] of Object.entries(PORTALS)) {
    if (url.includes(host)) {
      currentPortal = portal
      break
    }
  }

  // Update channel indicator in header
  const channelDot = document.getElementById('channel-dot')
  const channelName = document.getElementById('channel-name')
  if (currentPortal) {
    channelDot.style.background = currentPortal.dot
    channelName.textContent = currentPortal.name
    document.getElementById('push-channel-label').textContent = currentPortal.name
  }

  // Show appropriate content
  if (!currentPortal) {
    document.getElementById('no-portal-warning').style.display = 'block'
    document.getElementById('portal-content').style.display = 'none'
    // Still show disconnect
    const actions = document.getElementById('actions')
    actions.style.display = 'flex'
    actions.querySelector('.btn-push').style.display = 'none'
  } else {
    document.getElementById('no-portal-warning').style.display = 'none'
    document.getElementById('portal-content').style.display = 'block'
    document.getElementById('actions').style.display = 'none'
    await loadProducts(apiKey, shotsyncUrl)
  }

  // Disconnect
  document.getElementById('disconnect-btn')?.addEventListener('click', async () => {
    await chrome.storage.local.remove(['apiKey', 'shotsyncUrl'])
    showAuthScreen()
  })

  // Refresh
  document.getElementById('refresh-btn')?.addEventListener('click', () => loadProducts(apiKey, shotsyncUrl))

  // Push button
  document.getElementById('push-btn')?.addEventListener('click', () => pushListing(apiKey, shotsyncUrl))
}

// ── Products ──────────────────────────────────────────────────────────────────

async function loadProducts(apiKey, shotsyncUrl) {
  const listEl = document.getElementById('product-list')
  listEl.innerHTML = '<div style="padding:14px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px">Loading…</div>'

  try {
    const res = await fetch(`${shotsyncUrl}/api/extension/products`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    if (!res.ok) throw new Error('Failed to load products')
    products = await res.json()
    renderProductList()
  } catch (err) {
    listEl.innerHTML = `<div style="padding:14px;text-align:center;color:#ff3b30;font-size:12px">${err.message}</div>`
  }
}

function renderProductList() {
  const listEl = document.getElementById('product-list')
  if (!products.length) {
    listEl.innerHTML = '<div style="padding:14px;text-align:center;color:rgba(255,255,255,0.3);font-size:12px">No products found</div>'
    return
  }

  listEl.innerHTML = ''
  products.forEach(product => {
    const item = document.createElement('div')
    item.className = `product-list-item${selectedProductId === product.id ? ' selected' : ''}`
    item.innerHTML = `
      <div>
        <div class="product-list-item-name">${product.title}</div>
        <div class="product-list-item-sku">${product.sku}</div>
      </div>
      <div style="display:flex;gap:3px">
        ${product.colourways.map(c => `<div style="width:8px;height:8px;border-radius:50%;background:${c.hex};border:1px solid rgba(255,255,255,0.1)"></div>`).join('')}
      </div>
    `
    item.addEventListener('click', () => selectProduct(product.id))
    listEl.appendChild(item)
  })
}

function selectProduct(productId) {
  selectedProductId = productId
  selectedColourwayId = null
  renderProductList()

  const product = products.find(p => p.id === productId)
  if (!product) return

  // Render colourway tabs
  const cwTabs = document.getElementById('cw-tabs')
  cwTabs.innerHTML = ''
  product.colourways.forEach((cw, i) => {
    const tab = document.createElement('button')
    tab.className = `cw-tab${i === 0 ? ' active' : ''}`
    tab.innerHTML = `<div class="cw-swatch" style="background:${cw.hex};border:1px solid rgba(255,255,255,0.1)"></div>${cw.name}`
    tab.addEventListener('click', () => selectColourway(cw.id))
    cwTabs.appendChild(tab)
  })

  selectColourway(product.colourways[0].id)
}

function selectColourway(colourwayId) {
  selectedColourwayId = colourwayId

  // Update tab active state
  const product = products.find(p => p.id === selectedProductId)
  const cwTabs = document.getElementById('cw-tabs').querySelectorAll('.cw-tab')
  product.colourways.forEach((cw, i) => {
    cwTabs[i].className = `cw-tab${cw.id === colourwayId ? ' active' : ''}`
  })

  const cw = product.colourways.find(c => c.id === colourwayId)
  if (!cw) return

  // Product card
  document.getElementById('product-card').style.display = 'block'
  document.getElementById('product-name').textContent = product.title
  document.getElementById('product-sku').textContent = product.sku
  document.getElementById('product-colour').textContent = cw.name

  // Readiness
  const checks = getReadinessChecks(product, cw)
  document.getElementById('readiness').style.display = 'block'
  document.getElementById('readiness-list').innerHTML = checks.map(c => `
    <div class="readiness-item ${c.ok ? 'done' : 'missing'}">
      ${c.ok
        ? `<svg class="check-icon" viewBox="0 0 14 14" fill="none" stroke="#30d158" strokeWidth="2"><path d="M3 7l3 3 5-5" strokeLinecap="round" strokeLinejoin="round"/></svg>`
        : `<svg class="check-icon" viewBox="0 0 14 14" fill="none" stroke="#ff3b30" strokeWidth="2"><path d="M3 3l8 8M11 3L3 11" strokeLinecap="round"/></svg>`
      }
      ${c.label}
    </div>
  `).join('')

  // Field preview — what will be filled in
  document.getElementById('field-preview').style.display = 'block'
  const fields = getFieldPreview(product, cw)
  document.getElementById('field-list').innerHTML = fields.map(f => `
    <div class="field-row">
      <div class="field-label">${f.label}</div>
      <div class="field-value">${f.value}</div>
    </div>
  `).join('')

  // Show actions if all required checks pass
  const allOk = checks.filter(c => c.required).every(c => c.ok)
  document.getElementById('actions').style.display = 'flex'
  document.getElementById('push-btn').disabled = !allOk
}

function getReadinessChecks(product, cw) {
  return [
    { label: 'Product title',  ok: !!product.title,           required: true  },
    { label: 'Images',         ok: cw.images?.length >= 2,    required: true  },
    { label: 'Listing copy',   ok: !!cw.listingDescription,   required: true  },
    { label: 'Variants/sizes', ok: cw.variants?.length > 0,   required: true  },
    { label: 'Attributes',     ok: !!product.attributes,      required: false },
    { label: 'Barcode/EAN',    ok: cw.variants?.some(v => v.barcode), required: false },
  ]
}

function getFieldPreview(product, cw) {
  return [
    { label: 'Title',        value: cw.listingTitle || product.title },
    { label: 'Description',  value: (cw.listingDescription || '').substring(0, 60) + '…' },
    { label: 'Category',     value: product.category || '—' },
    { label: 'Gender',       value: product.gender || '—' },
    { label: 'Colour',       value: cw.name },
    { label: 'Sizes',        value: cw.variants?.map(v => v.size).join(', ') || '—' },
    { label: 'RRP',          value: cw.rrp ? `$${cw.rrp}` : '—' },
    { label: 'Images',       value: `${cw.images?.length || 0} images` },
  ]
}

// ── Push ──────────────────────────────────────────────────────────────────────

async function pushListing(apiKey, shotsyncUrl) {
  if (!selectedProductId || !selectedColourwayId || !currentPortal) return

  const product = products.find(p => p.id === selectedProductId)
  const cw = product.colourways.find(c => c.id === selectedColourwayId)

  setPushStatus('loading', 'Preparing listing data…')
  document.getElementById('push-btn').disabled = true

  try {
    // Fetch full listing payload from ShotSync
    const res = await fetch(`${shotsyncUrl}/api/extension/listing-payload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        productId: selectedProductId,
        colourwayId: selectedColourwayId,
        channel: currentPortal.key,
      }),
    })
    if (!res.ok) throw new Error('Failed to build listing payload')
    const payload = await res.json()

    // Send to content script to fill in the portal forms
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    setPushStatus('loading', `Filling in ${currentPortal.name} portal…`)

    const result = await chrome.tabs.sendMessage(tab.id, {
      type: 'SHOTSYNC_PUSH_LISTING',
      payload,
      channel: currentPortal.key,
    })

    if (result?.success) {
      setPushStatus('success', `Listing pushed to ${currentPortal.name} successfully`)
    } else {
      throw new Error(result?.error || 'Portal automation failed')
    }
  } catch (err) {
    setPushStatus('error', err.message)
    document.getElementById('push-btn').disabled = false
  }
}

function setPushStatus(type, msg) {
  const el = document.getElementById('push-status')
  el.className = `status-bar ${type}`
  el.textContent = msg
}
