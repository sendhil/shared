import { defineConfig } from 'vite';

export default defineConfig({
  // A relative base lets the same build work at /shared/hobbit-threejs/luna/.
  base: process.env.VITE_BASE ?? './',
});
