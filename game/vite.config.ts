import { defineConfig } from 'vite';

// The game imports the Blender-generated assets (quoridor_board.glb + textures/)
// directly from the parent project folder, so the Python build script stays the
// single source of truth for all 3D content.
export default defineConfig({
  server: {
    fs: {
      allow: ['..'],
    },
  },
  build: {
    chunkSizeWarningLimit: 1500,
  },
});
