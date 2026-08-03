import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Relative output paths keep the build portable at /shared/hobbit-threejs/sol/.
  base: './',
  build: {
    target: 'es2022',
    // Three.js is intentionally shipped as one cacheable vendor chunk (≈545 kB,
    // ≈138 kB gzip); the application chunk remains below 120 kB.
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          return id.includes('/node_modules/three/') ? 'three' : undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
  },
});
