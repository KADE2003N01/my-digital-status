import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { getLegacyPagePath, getPageForPath, pageRegistry } from './src/app/pageRegistry.js';

const frontendRoot = path.dirname(fileURLToPath(import.meta.url));
const backendPort = Number(process.env.VITE_PORTFOLIO_API_PORT) || 5000;

function reactSinglePageApp() {
  return {
    name: 'portfolio-react-single-page-app',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const requestUrl = request.url || '/';
        const requestUrlObject = new URL(requestUrl, 'http://localhost');
        const legacyPath = getLegacyPagePath(requestUrlObject.pathname);
        if (!legacyPath) return next();
        response.statusCode = 302;
        response.setHeader('Location', `${legacyPath}${requestUrlObject.search}`);
        response.end();
      });
    },
    transformIndexHtml: {
      order: 'pre',
      handler(_html, context) {
        const pathname = new URL(context.path || '/', 'http://localhost').pathname;
        const page = getPageForPath(pathname);
        if (!page) return undefined;
        return [
          { tag: 'title', children: page.title, injectTo: 'head' },
          ...(page.noIndex ? [{ tag: 'meta', attrs: { name: 'robots', content: 'noindex, nofollow' }, injectTo: 'head' }] : [])
        ];
      }
    },
    closeBundle() {
      const outputDirectory = path.join(frontendRoot, 'dist');
      const redirects = pageRegistry
        .flatMap((page) => page.aliases.map((alias) => `${alias} ${page.path} 301!`))
        .concat('/* /index.html 200')
        .join('\n');
      writeFileSync(path.join(outputDirectory, '_redirects'), `${redirects}\n`);
    }
  };
}

export default defineConfig({
  plugins: [reactSinglePageApp()],
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.{js,jsx}']
  },
  publicDir: false,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: false,
    proxy: {
      '/api': `http://127.0.0.1:${backendPort}`
    }
  },
  build: {
    rollupOptions: { input: path.join(frontendRoot, 'index.html') }
  }
});
