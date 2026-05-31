# ShotSync Browser Extension

Publishes product listings from ShotSync directly into marketplace seller portals without an API.

## Install in Chrome (dev mode)

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select this `extension/` folder

The ShotSync icon will appear in your toolbar.

## Setup

1. Click the extension icon
2. Enter your ShotSync API key (from ShotSync → Settings → API)
3. Enter your ShotSync URL (e.g. `http://localhost:3000` for local dev)
4. Click Connect

## Usage

1. In ShotSync, ensure the product is ready (images, copy, variants filled)
2. Open The Iconic / Myer / David Jones seller portal in Chrome
3. Navigate to "Create new listing"
4. Click the ShotSync extension icon
5. Select the product and colourway
6. Click **Push to [portal]**

The extension fills in all fields automatically. Review and submit.

## Supported portals

| Portal | Status |
|--------|--------|
| The Iconic | ✓ Field mapping implemented (verify selectors on live portal) |
| Myer | Coming soon — needs portal access to map fields |
| David Jones | Coming soon — needs portal access to map fields |

## Notes

- The Iconic field selectors in `content/iconic.js` are based on common portal patterns.
  They need to be verified and adjusted against the live seller portal.
- Myer and DJ content scripts are scaffolded — field mapping is added once portal access is available.
