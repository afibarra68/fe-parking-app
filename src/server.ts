import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { createProxyMiddleware } from 'http-proxy-middleware';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// URL del backend desde variable de entorno o valor por defecto
const BACKEND_URL = process.env['API_URL'] || process.env['BACKEND_URL'] || 'https://parking-backend-520107883510.us-central1.run.app';

console.log(`[Server] Backend URL configurada: ${BACKEND_URL}`);

/**
 * Proxy para redirigir peticiones /mt-api al backend
 * Esto permite que el frontend use rutas relativas /mt-api y el servidor las redirige al backend
 * IMPORTANTE: Este middleware debe estar ANTES de servir archivos estáticos y renderizar Angular
 */
app.use(
  '/mt-api',
  createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    secure: true, // Usar HTTPS para Cloud Run
    pathRewrite: {
      '^/mt-api': '', // Elimina /mt-api del path antes de enviar al backend
    },
    logLevel: 'info',
    onProxyReq: (proxyReq, req, res) => {
      const targetPath = req.url.replace('/mt-api', '');
      console.log(`[Proxy] ${req.method} ${req.url} -> ${BACKEND_URL}${targetPath}`);
    },
    onProxyRes: (proxyRes, req, res) => {
      console.log(`[Proxy Response] ${req.url} -> Status: ${proxyRes.statusCode}`);
    },
    onError: (err, req, res) => {
      console.error('[Proxy Error]', err.message);
      if (!res.headersSent) {
        res.status(502).json({ 
          error: 'Error connecting to backend', 
          message: err.message,
          backendUrl: BACKEND_URL
        });
      }
    },
  })
);

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
 * Handle all other requests by rendering the Angular application.
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
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
