export const environment = {
    production: true,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    // Conexión directa al backend sin pasar por Nginx (evita 302)
    // Las peticiones van directamente al backend sin proxy
    apiAuthJwt: 'https://adminparquear-z6mc5.ondigitalocean.app',
    apiUrl: 'https://adminparquear-z6mc5.ondigitalocean.app'
};
