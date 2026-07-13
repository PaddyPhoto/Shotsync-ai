import { withSentryConfig } from '@sentry/nextjs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Content Security Policy — shipped in REPORT-ONLY mode first (browser reports
// violations to /api/csp-report but blocks nothing). Refine from real reports,
// then switch the header key to 'Content-Security-Policy' to enforce.
// 'unsafe-inline' is currently required (inline styles + LinkedIn tag); tighten
// to nonces later. 'wasm-unsafe-eval' + blob worker-src are for pica/onnx.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://js.stripe.com https://snap.licdn.com https://*.vercel-insights.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https: wss: blob:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "report-uri /api/csp-report",
].join('; ')

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  serverExternalPackages: ['sharp'],
  async headers() {
    // Baseline security headers applied site-wide. Safe set (won't break the app).
    // TODO: add Content-Security-Policy + X-Frame-Options after per-route testing
    // (inline scripts, Stripe, and any Shopify embedding need care).
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Content-Security-Policy-Report-Only', value: CSP_REPORT_ONLY },
        ],
      },
    ]
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // On the server, never bundle onnxruntime packages — they pull in Node.js
      // ESM files (ort.node.min.mjs) that Terser can't minify.
      const existingExternals = Array.isArray(config.externals) ? config.externals : [config.externals].filter(Boolean)
      config.externals = [
        ...existingExternals,
        ({ request }, callback) => {
          if (request === 'onnxruntime-web' || request === 'onnxruntime-web/webgpu' || request === 'onnxruntime-node') {
            return callback(null, `commonjs ${request}`)
          }
          callback()
        },
      ]
    } else {
      // On the client, force onnxruntime-web to the browser bundle.
      // Next.js webpack uses conditionNames: ["node", "import"] which would otherwise
      // resolve to the Node.js backend (ort.node.min.mjs).
      config.resolve.alias = {
        ...config.resolve.alias,
        // Exact-match aliases ($) so prefix matching doesn't mangle subpaths.
        // Both point to the CJS WASM build — no import.meta, no import/export, Terser-safe.
        'onnxruntime-web$': path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.wasm.min.js'),
        'onnxruntime-web/webgpu$': path.resolve(__dirname, 'node_modules/onnxruntime-web/dist/ort.webgpu.min.js'),
      }

      config.resolve.fallback = {
        ...config.resolve.fallback,
        'onnxruntime-node': false,
        'fs': false,
        'path': false,
      }
    }

    return config
  },
}

export default withSentryConfig(nextConfig, {
  org: 'shotsync',
  project: 'shotsync-ai',
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
})
