import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// `vite build --mode artifact` makes one self-contained bundle (no chunks,
// assets inlined) that scripts/inline-artifact.mjs turns into a single HTML
// file for sharing a preview. The normal build is chunked for real hosting.
export default defineConfig(({ mode }) => {
  const single = mode === 'artifact';
  return {
    plugins: [react(), tailwindcss()],
    base: single ? './' : '/',
    build: {
      target: 'es2022',
      outDir: single ? 'dist-artifact' : 'dist',
      cssCodeSplit: !single,
      assetsInlineLimit: single ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: single
          ? { inlineDynamicImports: true }
          : {
              // three and its ecosystem are the heavy part; keep them in their own
              // long-cached chunk so copy changes don't bust it.
              manualChunks(id: string) {
                if (id.includes('node_modules/three') || id.includes('@react-three') || id.includes('postprocessing')) return 'three';
                if (id.includes('node_modules/gsap') || id.includes('node_modules/lenis')) return 'motion';
              },
            },
      },
    },
  };
});
