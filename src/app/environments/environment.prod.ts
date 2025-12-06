// Configuración para producción en Google Cloud
export const environment = {
    production: true,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    // URL del backend en Cloud Run (actualizar con la URL real después del despliegue)
    apiAuthJwt: 'https://parking-backend-520107883510.us-central1.run.app',
    apiUrl: 'https://parking-backend-520107883510.us-central1.run.app'
};

