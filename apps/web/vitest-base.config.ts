import { defineConfig } from 'vitest/config';

// @allyworld/alloy-time 0.1.0 ships extensionless relative ESM imports in its
// dist (e.g. `export * from './zone-catalog'`), which Node's ESM loader rejects
// when Vitest externalizes the package. Inline it so Vite's resolver (which
// accepts extensionless paths) processes it instead. The production build is
// unaffected — esbuild resolves extensionless imports natively.
export default defineConfig({
  test: {
    server: {
      deps: {
        inline: ['@allyworld/alloy-time'],
      },
    },
  },
});
