/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // CI runs `typecheck:lib` (and can run eslint) as separate steps; skip ESLint inside `next build`
  // so the build can't stall on the lint/type-validation phase on a constrained machine.
  eslint: { ignoreDuringBuilds: true },
  // On memory-constrained machines the optimized-production-build phase (deck.gl/three/cytoscape) can
  // thrash with parallel workers. Cap webpack parallelism to keep the build from stalling/OOMing.
  webpack: (config, { isServer }) => {
    if (!isServer) config.parallelism = 1;
    return config;
  },
  // The map/graph use deck.gl/three/cytoscape on the CLIENT only (dynamic, ssr:false). Exclude them
  // from server output-file tracing so `next build` ("Collecting build traces") doesn't crawl these
  // very large client-only trees — a likely cause of long/stalled traces on constrained machines.
  outputFileTracingExcludes: {
    "*": [
      "node_modules/three/**",
      "node_modules/@deck.gl/**",
      "node_modules/@luma.gl/**",
      "node_modules/@math.gl/**",
      "node_modules/cytoscape/**",
    ],
  },
};
module.exports = nextConfig;
