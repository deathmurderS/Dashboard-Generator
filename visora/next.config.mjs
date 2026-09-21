import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  crossOrigin: 'anonymous',
  // The repo root also has a lockfile (old CRA app); pin the workspace here.
  outputFileTracingRoot: fileURLToPath(new URL('.', import.meta.url)),
  webpack(config) {
    // NOTE: do NOT enable the `layers` experiment here. Next.js App Router
    // manages its own RSC/client/server layers, and overriding that flag
    // causes runtime crashes of the form
    // "TypeError: __webpack_modules__[moduleId] is not a function".
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };
    // Pin duckdb-wasm to its browser ESM bundle in EVERY compilation
    // (client + SSR). Without this the SSR graph resolves the Node build
    // (duckdb-node.cjs) which drags un-analysable requires into the bundle.
    config.resolve.alias = {
      ...config.resolve.alias,
      '@duckdb/duckdb-wasm': fileURLToPath(
        new URL('./node_modules/@duckdb/duckdb-wasm/dist/duckdb-browser.mjs', import.meta.url)
      ),
    };
    // duckdb-wasm and xlsx are browser-only; node builtins are not needed client side.
    config.resolve.fallback = {
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };
    return config;
  },
};

export default nextConfig;