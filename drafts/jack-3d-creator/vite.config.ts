import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base + an in-repo output folder so the built draft can be served
// straight from the static RankRise site at /drafts/jack-3d-creator/preview/.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'preview',
    emptyOutDir: true,
  },
});
