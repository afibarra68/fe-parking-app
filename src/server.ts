import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// URL del backend desde variable de entorno o valor por defecto
const BACKEND_URL = process.env['API_URL'] || process.env['BACKEND_URL'] || 'https://parking-backend-520107883510.us-central1.run.app';

console.log(`[Server] Backend URL configurada: ${BACKEND_URL}`);

// Middleware para parsear JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * Proxy para redirigir peticiones /mt-api al backend
 * Esto permite que el frontend use rutas relativas /mt-api y el servidor las redirige al backend
 * IMPORTANTE: Este middleware debe estar ANTES de servir archivos estáticos y renderizar Angular
 */
app.use('/mt-api', async (req, res, next) => {
  try {
    const targetPath = req.url.replace('/mt-api', '');
    const targetUrl = `${BACKEND_URL}${targetPath}${req.url.includes('?') ? '' : (Object.keys(req.query).length > 0 ? '?' + new URLSearchParams(req.query as Record<string, string>).toString() : '')}`;
    
    console.log(`[Proxy] ${req.method} ${req.url} -> ${targetUrl}`);

    // Copiar headers relevantes, excluyendo algunos que no deben ser proxyados
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach(key => {
      const lowerKey = key.toLowerCase();
      if (!['host', 'connection', 'content-length'].includes(lowerKey)) {
        const value = req.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          headers[key] = value[0];
        }
      }
    });

    // Realizar la petición al backend
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: headers,
      body: req.method !== 'GET' && req.method !== 'HEAD' ? JSON.stringify(req.body) : undefined,
    });

    // Copiar headers de respuesta
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });

    // Enviar status code
    res.status(response.status);

    // Enviar body
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      res.json(data);
    } else {
      const data = await response.text();
      res.send(data);
    }

    console.log(`[Proxy Response] ${req.url} -> Status: ${response.status}`);
  } catch (error: any) {
    console.error('[Proxy Error]', error.message);
    if (!res.headersSent) {
      res.status(502).json({
        error: 'Error connecting to backend',
        message: error.message,
        backendUrl: BACKEND_URL
      });
    }
  }
});

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
