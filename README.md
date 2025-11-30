# TParking

Aplicación web desarrollada con Angular 20 y PrimeNG para la gestión de un sistema de estacionamiento.

## 🚀 Tecnologías

- **Angular** 20.3.0
- **PrimeNG** 20.3.0 - Biblioteca de componentes UI
- **PrimeIcons** 7.0.0 - Iconos
- **TypeScript** 5.9.2
- **RxJS** 7.8.0
- **Angular SSR** - Server-Side Rendering

## 📋 Requisitos Previos

- Node.js (versión 18 o superior)
- npm o yarn
- Backend ejecutándose en `http://localhost:9000`

## 🛠️ Instalación

1. Clonar el repositorio
2. Instalar dependencias:
```bash
npm install
```

## 🏃 Desarrollo

Para iniciar el servidor de desarrollo:

```bash
npm start
# o
ng serve
```

La aplicación estará disponible en `http://localhost:4200/`

### Configuración del Proxy

El proyecto incluye un proxy configurado en `proxy.conf.json` que redirige las peticiones de `/mt-api` a `http://localhost:9000`. Asegúrate de que el backend esté ejecutándose antes de iniciar la aplicación.

## 🏗️ Estructura del Proyecto

```
src/app/
├── core/
│   ├── components/
│   │   ├── dynamic-menu/      # Menú dinámico
│   │   ├── sidebar/           # Sidebar colapsable
│   │   └── user-control/      # Control de usuario (logout)
│   ├── interceptors/
│   │   └── auth.interceptor.ts  # Interceptor HTTP para tokens JWT
│   ├── models/
│   │   └── menu-item.model.ts   # Modelo de items del menú
│   └── services/
│       ├── auth.service.ts      # Servicio de autenticación
│       ├── country.service.ts   # Servicio de países
│       ├── menu.service.ts      # Servicio de menú dinámico
│       └── sidebar.service.ts   # Servicio de sidebar
├── features/
│   ├── auth/
│   │   └── Login/              # Componente de login
│   └── administration/
│       └── countries/          # Gestión de países
└── environments/
    └── environment.ts          # Configuración de entorno
```

## ✨ Funcionalidades Implementadas

### 🔐 Autenticación
- **Login** con validación de formularios
- **Interceptor HTTP** que agrega automáticamente el token JWT a las peticiones
- **Manejo de sesión** con localStorage
- **Logout** con limpieza de datos de sesión
- **Protección de rutas** - El sidebar solo se muestra cuando el usuario está autenticado

### 📱 Interfaz de Usuario
- **Sidebar colapsable** con menú dinámico
- **Header** con control de usuario en la parte superior derecha
- **Menú dinámico** gestionado desde un servicio
- **Diseño responsive** para dispositivos móviles
- **Tema PrimeNG Aura** configurado

### 🌍 Gestión de Países
- **Listado** de países con tabla PrimeNG
- **Búsqueda** por descripción
- **Crear** nuevos países
- **Editar** países existentes
- **Paginación** automática
- **Formulario modal** con validaciones

### 🎨 Estilos y Diseño
- **Fuente Inter** de Google Fonts
- **Fondo blanco** global
- **Componentes PrimeNG** integrados
- **Animaciones** configuradas

## 🔧 Configuración

### Variables de Entorno

El archivo `src/app/environments/environment.ts` contiene:

```typescript
export const environment = {
    production: false,
    applicationTimeout: 300000,
    rowsPerPage: 10,
    activeMocks: false,
    apiAuthJwt: '/mt-api'  // URL base de la API
};
```

### Proxy Configuration

Las peticiones a `/mt-api` se redirigen automáticamente a `http://localhost:9000` mediante el proxy configurado en `proxy.conf.json`.

## 📦 Build

Para compilar el proyecto:

```bash
# Desarrollo
ng build --configuration development

# Producción
ng build --configuration production
```

Los archivos compilados se guardarán en `dist/t-parking/`

## 🧪 Testing

```bash
# Ejecutar tests unitarios
ng test

# Ejecutar tests con cobertura
ng test --code-coverage
```

## 📝 Scripts Disponibles

- `npm start` - Inicia el servidor de desarrollo
- `npm run build` - Compila el proyecto
- `npm run watch` - Compila en modo watch
- `npm test` - Ejecuta los tests
- `npm run serve:ssr:t-parking` - Sirve la aplicación con SSR

## 🔑 Autenticación

### Login
- Endpoint: `POST /mt-api/auth/login`
- Credenciales requeridas:
  - `username`: Nombre de usuario
  - `accesKey`: Contraseña

### Token JWT
El token JWT se guarda automáticamente en `localStorage` después del login y se incluye en todas las peticiones HTTP mediante el interceptor.

## 🎯 Rutas Principales

- `/auth/login` - Página de login
- `/administration/countries` - Gestión de países (requiere autenticación)

## 🛡️ Seguridad

- **Interceptor HTTP**: Agrega automáticamente el header `Authorization: Bearer <token>` a todas las peticiones
- **Manejo de errores 401**: Redirige automáticamente al login cuando el token expira
- **Protección SSR**: Verifica si está en el navegador antes de acceder a `localStorage`

## 📚 Componentes Principales

### LoginComponent
Componente de autenticación con:
- Formulario reactivo con validaciones
- Manejo de errores
- Integración con PrimeNG (Card, InputText, Password, Button)

### CountriesComponent
Gestión de países con:
- Tabla PrimeNG con paginación
- Búsqueda por descripción
- Formulario modal para crear/editar
- Validaciones de formulario

### SidebarComponent
Sidebar colapsable con:
- Menú dinámico
- Estado persistente
- Animaciones suaves

### UserControlComponent
Control de usuario con:
- Avatar con iniciales
- Nombre del usuario
- Botón de logout

## 🔄 Servicios

### AuthService
- `login()` - Autenticación de usuario
- `logout()` - Cerrar sesión
- `getToken()` - Obtener token JWT
- `getUserData()` - Obtener datos del usuario
- `isAuthenticated()` - Verificar si está autenticado
- `hasRole()` - Verificar roles del usuario

### CountryService
- `getCountries()` - Obtener lista de países
- `createCountry()` - Crear nuevo país
- `updateCountry()` - Actualizar país existente

### MenuService
- `getMenuItems()` - Obtener items del menú
- `addMenuItem()` - Agregar item al menú
- `removeMenuItem()` - Eliminar item del menú

## 🎨 Personalización

### Agregar Items al Menú

Edita `src/app/core/services/menu.service.ts`:

```typescript
private menuItems = signal<MenuItem[]>([
  {
    label: 'Países',
    icon: 'pi pi-globe',
    routerLink: '/administration/countries',
    visible: true
  },
  // Agregar más items aquí
]);
```

### Cambiar el Tema de PrimeNG

Edita `src/app/app.config.ts`:

```typescript
providePrimeNG({
  theme: {
    preset: Aura  // Cambiar por otro tema disponible
  }
})
```

## 🐛 Solución de Problemas

### Error: "Unexpected token '<'"
- Verifica que el backend esté ejecutándose en `http://localhost:9000`
- Verifica la configuración del proxy en `proxy.conf.json`

### El sidebar aparece brevemente durante el login
- Ya está corregido con verificaciones de ruta mejoradas

### Error de localStorage en SSR
- Los servicios ya están configurados para verificar `isPlatformBrowser()` antes de usar `localStorage`

## 📖 Recursos Adicionales

- [Angular Documentation](https://angular.dev)
- [PrimeNG Documentation](https://primeng.org)
- [Angular CLI](https://angular.dev/tools/cli)

## 👥 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto es privado.

---

**Desarrollado con ❤️ usando Angular y PrimeNG**
