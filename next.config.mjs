import { withSentryConfig } from '@sentry/nextjs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
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
