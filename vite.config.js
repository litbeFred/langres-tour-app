import { defineConfig } from 'vite';

export default defineConfig({
  // base: '/langres-tour-app/', // Commented out for local development
  base: '/',
  server: {
    // Allow direct access to HTML files
    middlewareMode: false,
    fs: {
      strict: false
    },
    // Ensure proper MIME types for HTML files
    headers: {
      'Cache-Control': 'no-cache'
    }
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        osm: 'test-osm-routing.html',
        routeDemo: 'route-storage-demo.html'
      }
    }
  },
  // Disable HMR for HTML files to prevent conflicts
  optimizeDeps: {
    exclude: ['*.html']
  }
});
