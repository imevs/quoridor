import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

// The game imports the Blender-generated assets (quoridor_board.glb + textures/)
// directly from the parent project folder, so the Python build script stays the
// single source of truth for all 3D content.
export default defineConfig(({ mode }) => {
  const isOffline = mode === 'offline';
  return {
    plugins: [preact()],
    define: {
      __ONLINE__: !isOffline,
    },
    base: isOffline ? './' : '/',
    server: {
      fs: {
        allow: ['..'],
      },
      proxy: {
        '/ws': {
          target: 'ws://localhost:8787',
          ws: true,
        },
      },
    },
    build: {
      outDir: isOffline ? 'dist-offline' : 'dist',
      chunkSizeWarningLimit: 1500,
    },
  };
});
