// Configuración para producción
export const environment = {
    production: true,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    // Usar /mt-api para que nginx haga proxy al backend
    // Nginx redirige /mt-api a http://10.116.0.5:9000 (configurado en nginx.conf)
    apiAuthJwt: '/mt-api',
    apiUrl: '/mt-api'
};

