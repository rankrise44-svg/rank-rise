import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        // three and its ecosystem are the heavy part; keep them in their own
        // long-cached chunk so copy changes don't bust it.
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('@react-three') || id.includes('postprocessing')) return 'three';
          if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
        },
      },
    },
  },
});
