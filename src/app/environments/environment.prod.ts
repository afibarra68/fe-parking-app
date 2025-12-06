// Configuración para producción en Google Cloud
export const environment = {
    production: true,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    // Usar /mt-api para que el servidor SSR haga proxy al backend
    // El servidor SSR (server.ts) redirige /mt-api a la URL del backend configurada en BACKEND_URL
    apiAuthJwt: '/mt-api',
    apiUrl: '/mt-api'
};

