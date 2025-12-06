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

// Configuración de optimización
const IS_PRODUCTION = process.env['NODE_ENV'] === 'production';
const PROXY_TIMEOUT = 30000; // 30 segundos timeout para peticiones al backend
const EXCLUDED_HEADERS = new Set(['host', 'connection', 'content-length', 'origin', 'referer']);

if (!IS_PRODUCTION) {
  console.log(`[Server] Backend URL configurada: ${BACKEND_URL}`);
}

// Middleware para parsear JSON SOLO para rutas /mt-api (optimización)
app.use('/mt-api', express.json({ limit: '10mb' }));
app.use('/mt-api', express.urlencoded({ extended: true, limit: '10mb' }));

/**
 * Proxy optimizado para redirigir peticiones /mt-api al backend
 * Optimizaciones:
 * - Parsing JSON solo para rutas /mt-api
 * - Timeout en peticiones fetch
 * - Streaming para respuestas grandes
 * - Headers optimizados
 * - Logging condicional en producción
 */
app.use('/mt-api', async (req, res, next) => {
  try {
    // Manejar preflight OPTIONS requests (rápido, sin backend)
    if (req.method === 'OPTIONS') {
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(200).end();
    }

    // Construir URL del backend (optimizado)
    const targetPath = req.url.replace('/mt-api', '');
    let targetUrl = BACKEND_URL + targetPath;
    
    // Agregar query string solo si existe
    const queryKeys = Object.keys(req.query);
    if (queryKeys.length > 0) {
      const params = new URLSearchParams();
      for (const key of queryKeys) {
        const value = req.query[key];
        if (typeof value === 'string') {
          params.append(key, value);
        } else if (Array.isArray(value)) {
          for (const v of value) {
            params.append(key, String(v));
          }
        }
      }
      targetUrl += '?' + params.toString();
    }

    if (!IS_PRODUCTION) {
      console.log(`[Proxy] ${req.method} ${req.url} -> ${targetUrl}`);
    }

    // Construir headers de forma optimizada
    const headers: Record<string, string> = {};
    const reqHeaders = req.headers;
    
    for (const key in reqHeaders) {
      const lowerKey = key.toLowerCase();
      if (!EXCLUDED_HEADERS.has(lowerKey)) {
        const value = reqHeaders[key];
        if (typeof value === 'string') {
          headers[key] = value;
        } else if (Array.isArray(value) && value.length > 0) {
          headers[key] = value[0];
        }
      }
    }

    // Agregar Content-Type solo si hay body y no está presente
    const hasBody = req.body && Object.keys(req.body).length > 0;
    if (hasBody && !headers['content-type']) {
      headers['content-type'] = 'application/json';
    }

    // Preparar body solo si es necesario
    let body: string | undefined;
    if (hasBody && req.method !== 'GET' && req.method !== 'HEAD') {
      body = JSON.stringify(req.body);
    }

    // Realizar petición con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROXY_TIMEOUT);

    try {
      const response = await fetch(targetUrl, {
        method: req.method,
        headers: headers,
        body: body,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Copiar headers de respuesta de forma eficiente
      const responseHeaders = response.headers;
      const corsOrigin = req.headers.origin || '*';
      
      // Headers CORS primero
      res.setHeader('Access-Control-Allow-Origin', corsOrigin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');

      // Copiar otros headers (excluyendo algunos que no deben copiarse)
      responseHeaders.forEach((value, key) => {
        const lowerKey = key.toLowerCase();
        // No copiar headers que pueden causar problemas
        if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
          res.setHeader(key, value);
        }
      });

      res.status(response.status);

      // Usar streaming para respuestas grandes (más eficiente en memoria)
      const contentType = responseHeaders.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Para JSON, parsear y enviar (necesario para validación)
        const data = await response.json();
        res.json(data);
      } else {
        // Para otros tipos, usar streaming
        if (response.body) {
          // Stream directamente al cliente (más eficiente)
          const reader = response.body.getReader();
          const pump = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
              }
              res.end();
            } catch (err: any) {
              if (!res.headersSent) {
                res.status(500).end();
              }
            }
          };
          pump();
        } else {
          const text = await response.text();
          res.send(text);
        }
      }

      if (!IS_PRODUCTION) {
        console.log(`[Proxy Response] ${req.url} -> Status: ${response.status}`);
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw fetchError;
    }
  } catch (error: any) {
    if (!IS_PRODUCTION) {
      console.error('[Proxy Error]', error.message);
    }
    
    if (!res.headersSent) {
      const origin = req.headers.origin || '*';
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
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
