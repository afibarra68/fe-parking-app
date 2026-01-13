import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express, { Request, Response } from 'express';
import { join } from 'node:path';
// Use require to avoid TypeScript compilation issues during Angular build
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createProxyMiddleware } = require('http-proxy-middleware');

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// Configuración del proxy para API - Soporta contenido dinámico
const apiUrl = process.env['API_URL'] || 'http://10.116.0.5:9000';
const apiProxy = createProxyMiddleware({
  target: apiUrl,
  changeOrigin: true,
  pathRewrite: {
    '^/mt-api': '', // Elimina /mt-api del path antes de enviar al backend
  },
  logLevel: process.env['NODE_ENV'] === 'production' ? 'error' : 'debug',
  onProxyReq: (proxyReq: any, req: Request, res: Response) => {
    // Log de peticiones en desarrollo
    if (process.env['NODE_ENV'] !== 'production') {
      console.log(`[Proxy] ${req.method} ${req.url} -> ${apiUrl}${req.url.replace('/mt-api', '')}`);
    }
  },
  onError: (err: Error, req: Request, res: Response) => {
    console.error('[Proxy Error]', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Proxy error', message: err.message });
    }
  },
} as any);

// Proxy para /mt-api - Redirige al backend configurado
app.use('/mt-api', apiProxy);

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application (SSR).
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build).
 */
export const reqHandler = createNodeRequestHandler(app);
