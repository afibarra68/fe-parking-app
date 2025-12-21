# Guía de Código Limpio y Estándares de Desarrollo - t-parking

Este documento contiene las guías y estándares de código que deben seguirse al desarrollar nuevos módulos y componentes en el proyecto t-parking.

## 📋 Tabla de Contenidos

1. [Inyección de Dependencias](#inyección-de-dependencias)
2. [Tipos y TypeScript](#tipos-y-typescript)
3. [Control Flow de Angular](#control-flow-de-angular)
4. [Manejo de Errores](#manejo-de-errores)
5. [Estructura de Componentes](#estructura-de-componentes)
6. [Servicios](#servicios)
7. [Templates HTML](#templates-html)
8. [Accesibilidad](#accesibilidad)
9. [Optimización y Performance](#optimización-y-performance)
10. [Checklist para Nuevos Componentes](#checklist-para-nuevos-componentes)

---

## 🔧 Inyección de Dependencias

### ❌ NO HACER: Constructor Injection (Deprecated)

```typescript
// ❌ INCORRECTO
export class MyComponent {
  constructor(
    private service: MyService,
    private fb: FormBuilder,
    private router: Router
  ) {}
}
```

### ✅ HACER: Usar `inject()` function

```typescript
// ✅ CORRECTO
import { Component, inject } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { Router } from '@angular/router';

export class MyComponent {
  private service = inject(MyService);
  private fb = inject(FormBuilder);
  private router = inject(Router);

  constructor() {
    // Inicialización si es necesaria
  }
}
```

**Razón**: `inject()` es la forma moderna recomendada por Angular y mejora la testabilidad y el tree-shaking.

---

## 📝 Tipos y TypeScript

### ❌ NO HACER: Usar `any`

```typescript
// ❌ INCORRECTO
function processData(data: any): any {
  return data.map((item: any) => item.value);
}

onTableEdit(row: any): void {
  console.log(row);
}
```

### ✅ HACER: Definir interfaces y tipos específicos

```typescript
// ✅ CORRECTO
interface TableRow {
  id: number;
  name: string;
  status: string;
}

interface TableData {
  data: TableRow[];
  totalRecords: number;
  isFirst: boolean;
}

function processData(data: TableRow[]): TableRow[] {
  return data.map((item: TableRow) => item);
}

onTableEdit(row: TableRow): void {
  console.log(row);
}
```

### ❌ NO HACER: Anotaciones de tipo innecesarias

```typescript
// ❌ INCORRECTO
page: number = 0;
size: number = 10;
loading: boolean = false;
message: string = 'Hello';
```

### ✅ HACER: Dejar que TypeScript infiera el tipo

```typescript
// ✅ CORRECTO
page = 0;
size = 10;
loading = false;
message = 'Hello';
```

**Razón**: TypeScript puede inferir automáticamente los tipos de literales, reduciendo código redundante.

### ✅ HACER: Usar `Record` en lugar de index signatures

```typescript
// ❌ INCORRECTO
const currencySymbols: { [key: string]: string } = {
  'USD': '$',
  'EUR': '€'
};

// ✅ CORRECTO
type CurrencySymbols = Record<string, string>;

const currencySymbols: CurrencySymbols = {
  'USD': '$',
  'EUR': '€'
};
```

---

## 🔄 Control Flow de Angular

### ❌ NO HACER: Usar directivas estructurales antiguas

```html
<!-- ❌ INCORRECTO -->
<div *ngIf="loading">Cargando...</div>
<div *ngFor="let item of items">{{ item.name }}</div>
```

### ✅ HACER: Usar el nuevo control flow de Angular

```html
<!-- ✅ CORRECTO -->
@if (loading) {
  <div>Cargando...</div>
}

@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
} @empty {
  <div>No hay items</div>
}
```

**Razón**: El nuevo control flow es más performante, tiene mejor type-checking y es la forma recomendada en Angular 17+.

---

## ⚠️ Manejo de Errores

### ❌ NO HACER: Ignorar errores o usar `any`

```typescript
// ❌ INCORRECTO
catch (error: any) {
  console.log(error);
}

catch (err) {
  // No hacer nada
}
```

### ✅ HACER: Tipar errores y manejarlos apropiadamente

```typescript
// ✅ CORRECTO
interface ApiError {
  error?: {
    message?: string;
  };
  message?: string;
}

try {
  // código
} catch (error: unknown) {
  const apiError = error as ApiError;
  this.error = apiError?.error?.message || apiError?.message || 'Error desconocido';
}

// O si no necesitas el error:
try {
  // código
} catch {
  // Manejo sin usar la variable
  this.error = 'Error al procesar la solicitud';
}
```

---

## 🏗️ Estructura de Componentes

### ✅ Estructura Recomendada

```typescript
import { Component, OnInit, OnDestroy, inject } from '@angular/core';
// ... otros imports

// Interfaces y tipos al inicio
interface ComponentData {
  // ...
}

interface ComponentFilters {
  // ...
}

@Component({
  selector: 'app-my-component',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    // ... otros imports
  ],
  templateUrl: './my-component.component.html',
  styleUrls: ['./my-component.component.scss']
})
export class MyComponent implements OnInit, OnDestroy {
  // 1. Propiedades públicas
  loading = false;
  error: string | null = null;

  // 2. Propiedades privadas
  private subscription?: Subscription;
  private isInitialLoad = true;

  // 3. Inyección de dependencias usando inject()
  private myService = inject(MyService);
  private fb = inject(FormBuilder);

  // 4. FormGroups y formularios
  searchForm: FormGroup;

  // 5. Observables y Subjects
  private dataSubject = new BehaviorSubject<ComponentData>({
    data: [],
    totalRecords: 0
  });
  data$: Observable<ComponentData> = this.dataSubject.asObservable();

  constructor() {
    // Inicialización de formularios
    this.searchForm = this.fb.group({
      // ...
    });
  }

  // 6. Lifecycle hooks
  ngOnInit(): void {
    this.loadData();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  // 7. Métodos públicos
  search(): void {
    // ...
  }

  // 8. Métodos privados
  private loadData(): void {
    // ...
  }
}
```

---

## 🔌 Servicios

### ✅ Estructura de Servicio Recomendada

```typescript
import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

// Interfaces para tipos de datos
export interface MyEntity {
  id: number;
  name: string;
  // ...
}

export interface Page<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MyService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiAuthJwt;

  getPageable(
    page: number,
    size: number,
    filters?: { name?: string; status?: string }
  ): Observable<Page<MyEntity>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (filters?.name) {
      params = params.set('name', filters.name);
    }

    if (filters?.status) {
      params = params.set('status', filters.status);
    }

    return this.http.get<Page<MyEntity>>(`${this.apiUrl}/my-endpoint`, { params });
  }

  getById(id: number): Observable<MyEntity> {
    return this.http.get<MyEntity>(`${this.apiUrl}/my-endpoint/${id}`);
  }

  create(entity: MyEntity): Observable<MyEntity> {
    return this.http.post<MyEntity>(`${this.apiUrl}/my-endpoint`, entity);
  }

  update(entity: MyEntity): Observable<MyEntity> {
    return this.http.put<MyEntity>(`${this.apiUrl}/my-endpoint`, entity);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/my-endpoint/${id}`);
  }
}
```

---

## 📄 Templates HTML

### ✅ Estructura de Template Recomendada

```html
<div class="component-container">
  <!-- 1. Header -->
  <div class="header">
    <h1>Título del Componente</h1>
  </div>

  <!-- 2. Barra de búsqueda/filtros -->
  <div class="search-bar" [formGroup]="searchForm">
    <div class="search-fields">
      <!-- Usar nuevo control flow -->
      @if (statusOptions.length > 0) {
        <div class="search-field">
          <app-select-lib 
            formControlName="status" 
            [options]="statusOptions" 
            label="Estado"
            [filter]="false"
            [showClear]="true">
          </app-select-lib>
        </div>
      }
    </div>
    <div class="search-actions">
      <p-button 
        label="Buscar" 
        icon="pi pi-search" 
        (onClick)="search()" 
        [disabled]="loading">
      </p-button>
    </div>
  </div>

  <!-- 3. Mensajes de error -->
  @if (error) {
    <p-message 
      severity="error" 
      [text]="error"
      [closable]="true"
      (onClose)="error = null">
    </p-message>
  }

  <!-- 4. Contenido principal -->
  <div class="content-container">
    <app-spinner 
      [loading]="loading"
      size="normal"
      message="Cargando datos..."
      [overlay]="true">
    </app-spinner>

    @if (data$ | async; as data) {
      <app-table-lib
        [cols]="cols"
        [dataTable]="data"
        (pagination)="onTablePagination($event)">
      </app-table-lib>
    }
  </div>
</div>
```

### Reglas para Templates:

1. **Siempre usar el nuevo control flow** (`@if`, `@for`, `@switch`)
2. **Usar `track` en `@for`** para mejor performance
3. **Evitar `*ngIf` y `*ngFor`** (deprecated)
4. **Usar `async` pipe con alias** para evitar múltiples suscripciones

---

## ♿ Accesibilidad

### ❌ NO HACER: Eventos sin soporte de teclado

```html
<!-- ❌ INCORRECTO -->
<div (click)="handleClick()">Click me</div>
```

### ✅ HACER: Agregar soporte de teclado y hacer focusable

```html
<!-- ✅ CORRECTO -->
<button 
  (click)="handleClick()"
  (keyup.enter)="handleClick()"
  (keyup.space)="handleClick()">
  Click me
</button>

<!-- O si debe ser un div, hacerlo focusable -->
<div 
  (click)="handleClick()"
  (keyup.enter)="handleClick()"
  (keyup.space)="handleClick()"
  tabindex="0"
  role="button"
  [attr.aria-label]="'Descripción de la acción'">
  Click me
</div>
```

### ✅ HACER: Asociar labels con controles de formulario

```html
<!-- ✅ CORRECTO -->
<label for="username">Usuario</label>
<input id="username" type="text" formControlName="username" />

<!-- O usando app-select-lib con label integrado -->
<app-select-lib 
  formControlName="status" 
  label="Estado"
  [options]="options">
</app-select-lib>
```

---

## 🚀 Optimización y Performance

### ✅ Usar Signals (Angular 16+)

```typescript
import { signal, computed } from '@angular/core';

export class MyComponent {
  // Signals para estado reactivo
  loading = signal(false);
  items = signal<Item[]>([]);
  
  // Computed signals
  totalItems = computed(() => this.items().length);
  
  // Usar en template
  // {{ loading() }}
  // {{ totalItems() }}
}
```

### ✅ Manejar Subscripciones Correctamente

```typescript
export class MyComponent implements OnDestroy {
  private subscription?: Subscription;
  private subscriptions = new Subscription();

  ngOnInit(): void {
    // Opción 1: Una suscripción
    this.subscription = this.service.getData().subscribe({
      next: (data) => {
        // ...
      },
      error: (err: ApiError) => {
        // ...
      }
    });

    // Opción 2: Múltiples suscripciones
    this.subscriptions.add(
      this.service.getData().subscribe(/* ... */)
    );
    this.subscriptions.add(
      this.service.getOtherData().subscribe(/* ... */)
    );
  }

  ngOnDestroy(): void {
    // Opción 1
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    // Opción 2
    this.subscriptions.unsubscribe();
  }
}
```

### ✅ Usar Async Pipe cuando sea posible

```typescript
// ✅ CORRECTO - Usar async pipe
export class MyComponent {
  data$ = this.service.getData();
}

// En template:
@if (data$ | async; as data) {
  <div>{{ data.name }}</div>
}
```

---

## ✅ Checklist para Nuevos Componentes

Antes de considerar un componente completo, verifica:

### TypeScript/Code Quality
- [ ] ✅ Usar `inject()` en lugar de constructor injection
- [ ] ✅ No usar `any`, definir interfaces/tipos específicos
- [ ] ✅ Eliminar anotaciones de tipo innecesarias (`page = 0` no `page: number = 0`)
- [ ] ✅ Usar `Record` en lugar de index signatures
- [ ] ✅ Eliminar variables/imports no usados
- [ ] ✅ Tipar correctamente los errores (no usar `any`)
- [ ] ✅ Usar prefijo `_` para parámetros no usados en guards/callbacks
- [ ] ✅ No dejar lifecycle methods vacíos (eliminar o agregar lógica)

### Templates
- [ ] ✅ Usar nuevo control flow (`@if`, `@for`, `@switch`)
- [ ] ✅ Usar `track` en `@for` loops
- [ ] ✅ Evitar `*ngIf` y `*ngFor`
- [ ] ✅ Usar `async` pipe con alias

### Accesibilidad
- [ ] ✅ Agregar eventos de teclado a elementos clickeables (`keyup.enter`, `keyup.space`)
- [ ] ✅ Hacer elementos focusable si no son botones nativos (`tabindex="0"`, `role="button"`)
- [ ] ✅ Asociar labels con controles de formulario (`for`/`id` o `app-select-lib` con label)
- [ ] ✅ Agregar `aria-label` cuando sea necesario

### Outputs y Eventos
- [ ] ✅ No usar prefijo "on" en nombres de Outputs (`edit` no `onEdit`)
- [ ] ✅ Tipar correctamente los EventEmitters

### Performance
- [ ] ✅ Manejar subscripciones correctamente en `ngOnDestroy`
- [ ] ✅ Usar `async` pipe cuando sea posible
- [ ] ✅ Considerar usar Signals para estado reactivo
- [ ] ✅ Evitar llamadas duplicadas a servicios

### Estructura
- [ ] ✅ Organizar imports correctamente
- [ ] ✅ Definir interfaces/tipos al inicio
- [ ] ✅ Agregar comentarios JSDoc para métodos complejos
- [ ] ✅ Seguir la estructura recomendada del componente

### Testing y Validación
- [ ] ✅ El componente compila sin errores
- [ ] ✅ `ng lint` no muestra errores para el componente
- [ ] ✅ Funcionalidad probada manualmente
- [ ] ✅ Verificar accesibilidad con lectores de pantalla (si aplica)

---

## 🔄 Migración de Código Existente

### Prioridades de Refactorización

Basado en el análisis de 391 errores de lint, las prioridades son:

#### Prioridad ALTA (Impacto en calidad y mantenibilidad)
1. **Reemplazar `any` con tipos específicos** (≈200 errores)
   - Crear interfaces para todos los datos
   - Tipar callbacks y eventos
   - Mejorar type safety general

2. **Migrar a `inject()` function** (≈150 errores)
   - Modernizar inyección de dependencias
   - Mejorar testabilidad

3. **Agregar accesibilidad** (≈10 errores)
   - Eventos de teclado
   - Labels asociados
   - Roles ARIA

#### Prioridad MEDIA (Mejoras de código)
4. **Migrar a nuevo control flow** (≈100 errores)
   - Cambiar `*ngIf` → `@if`
   - Cambiar `*ngFor` → `@for`
   - Mejorar performance

5. **Limpiar código no usado** (≈30 errores)
   - Eliminar imports no usados
   - Eliminar variables no usadas
   - Limpiar lifecycle methods vacíos

6. **Renombrar Outputs** (≈10 errores)
   - Quitar prefijo "on" de nombres de Outputs

#### Prioridad BAJA (Limpieza estética)
7. **Eliminar anotaciones innecesarias** (≈30 errores)
   - Dejar que TypeScript infiera tipos

### Script de Migración Automática

Algunos errores pueden corregirse automáticamente:

```bash
# Corregir errores automáticamente (21 errores fixables)
ng lint --fix

# Ver solo errores de un archivo específico
ng lint --files src/app/features/administration/my-component/my-component.component.ts
```

**Nota**: `--fix` solo corrige errores de formato, no errores lógicos como tipos `any` o estructura.

## 📚 Recursos Adicionales

- [Angular Style Guide](https://angular.dev/style-guide)
- [Angular Signals](https://angular.dev/guide/signals)
- [Angular Control Flow](https://angular.dev/guide/control-flow)
- [TypeScript Best Practices](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)
- [Angular Accessibility Guide](https://angular.dev/guide/accessibility)

---

## 🔍 Errores Comunes del Linter y Soluciones

### Error: `Prefer using the inject() function`
**Solución**: Reemplazar constructor injection con `inject()`
```typescript
// ❌ Antes
constructor(private service: MyService) {}

// ✅ Después
private service = inject(MyService);
```

### Error: `Unexpected any. Specify a different type`
**Solución**: Crear interfaces/tipos específicos
```typescript
// ❌ Antes
function process(data: any): any {}

// ✅ Después
interface MyData { id: number; name: string; }
function process(data: MyData): MyData {}
```

### Error: `Type X trivially inferred from a literal`
**Solución**: Eliminar anotación de tipo, dejar que TypeScript infiera
```typescript
// ❌ Antes
page: number = 0;
loading: boolean = false;
message: string = 'Hello';

// ✅ Después
page = 0;
loading = false;
message = 'Hello';
```

### Error: `Use built-in control flow instead of directive ngIf/ngFor`
**Solución**: Cambiar directivas estructurales por nuevo control flow
```html
<!-- ❌ Antes -->
<div *ngIf="loading">Cargando...</div>
<div *ngFor="let item of items">{{ item.name }}</div>

<!-- ✅ Después -->
@if (loading) {
  <div>Cargando...</div>
}
@for (item of items; track item.id) {
  <div>{{ item.name }}</div>
}
```

### Error: `click must be accompanied by keyup/keydown/keypress`
**Solución**: Agregar eventos de teclado o usar `<button>`
```html
<!-- ❌ Antes -->
<div (click)="handleClick()">Click me</div>

<!-- ✅ Después -->
<button 
  (click)="handleClick()"
  (keyup.enter)="handleClick()"
  (keyup.space)="handleClick()">
  Click me
</button>

<!-- O si debe ser div -->
<div 
  (click)="handleClick()"
  (keyup.enter)="handleClick()"
  tabindex="0"
  role="button">
  Click me
</div>
```

### Error: `Elements with interaction handlers must be focusable`
**Solución**: Agregar `tabindex="0"` y `role` apropiado
```html
<!-- ❌ Antes -->
<div (click)="handleClick()">Click</div>

<!-- ✅ Después -->
<div 
  (click)="handleClick()"
  (keyup.enter)="handleClick()"
  tabindex="0"
  role="button"
  [attr.aria-label]="'Descripción'">
  Click
</div>
```

### Error: `'X' is defined but never used`
**Solución**: Eliminar la variable/import no usado o usar prefijo `_` si es intencional
```typescript
// ❌ Antes
import { UnusedService } from './service';
const unused = 'value';

// ✅ Después - Eliminar
// O si es intencional (parámetros de callback):
catch (_error: unknown) {
  // Manejo sin usar el error
}
```

### Error: `Lifecycle methods should not be empty`
**Solución**: Eliminar el método si está vacío o agregar lógica/comentario
```typescript
// ❌ Antes
ngOnInit(): void {
}

// ✅ Después - Opción 1: Eliminar si no se necesita
// ✅ Después - Opción 2: Agregar lógica
ngOnInit(): void {
  this.loadData();
}
// ✅ Después - Opción 3: Si realmente debe estar vacío
ngOnInit(): void {
  // Intencionalmente vacío - reservado para futura implementación
}
```

### Error: `Output bindings should not be named "on", nor prefixed with it`
**Solución**: Renombrar el output sin prefijo "on"
```typescript
// ❌ Antes
@Output() onEdit = new EventEmitter<any>();

// ✅ Después
@Output() edit = new EventEmitter<EditEvent>();
// O con alias si necesitas mantener compatibilidad
@Output('onEdit') edit = new EventEmitter<EditEvent>();
```

### Error: `A record is preferred over an index signature`
**Solución**: Usar `Record<string, T>` en lugar de index signature
```typescript
// ❌ Antes
const map: { [key: string]: string } = {};

// ✅ Después
type StringMap = Record<string, string>;
const map: StringMap = {};
// O directamente
const map: Record<string, string> = {};
```

### Error: `A label component must be associated with a form element`
**Solución**: Asociar el label con el input usando `for`/`id` o usar `app-select-lib` con label integrado
```html
<!-- ❌ Antes -->
<label>Usuario</label>
<input type="text" />

<!-- ✅ Después - Opción 1 -->
<label for="username">Usuario</label>
<input id="username" type="text" />

<!-- ✅ Después - Opción 2 -->
<app-select-lib 
  formControlName="status" 
  label="Estado"
  [options]="options">
</app-select-lib>
```

### Error: Variables no usadas en Guards
**Solución**: Usar prefijo `_` para parámetros no usados
```typescript
// ❌ Antes
canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
  return true;
}

// ✅ Después
canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
  return true;
}
```

### Error: Imports no usados
**Solución**: Eliminar imports no utilizados
```typescript
// ❌ Antes
import { PLATFORM_ID, isPlatformBrowser } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { MenuItem } from 'primeng/api';

// ✅ Después - Eliminar los que no se usan
// Solo mantener los que realmente se utilizan
```

---

## 📊 Resumen de Errores Más Frecuentes

Basado en el análisis del lint del proyecto, los errores más comunes son:

1. **`Prefer using the inject() function`** (≈150 ocurrencias)
   - Afecta: Componentes, servicios, guards
   - Prioridad: Alta - Modernizar inyección de dependencias

2. **`Unexpected any. Specify a different type`** (≈200 ocurrencias)
   - Afecta: Callbacks, eventos, parámetros de funciones
   - Prioridad: Alta - Mejorar type safety

3. **`Use built-in control flow instead of directive ngIf/ngFor`** (≈100 ocurrencias)
   - Afecta: Templates HTML
   - Prioridad: Media - Migrar a nuevo control flow

4. **`Type X trivially inferred from a literal`** (≈30 ocurrencias)
   - Afecta: Propiedades de componentes
   - Prioridad: Baja - Limpieza de código

5. **`'X' is defined but never used`** (≈20 ocurrencias)
   - Afecta: Imports, variables, parámetros
   - Prioridad: Media - Limpieza de código

6. **`Output bindings should not be named "on"`** (≈10 ocurrencias)
   - Afecta: Componentes compartidos
   - Prioridad: Media - Mejorar nomenclatura

7. **`click must be accompanied by keyup/keydown`** (≈5 ocurrencias)
   - Afecta: Elementos interactivos
   - Prioridad: Alta - Accesibilidad

---

**Última actualización**: 2024
**Versión de Angular**: 17+
**Total de errores de lint**: 391 (al momento de creación de esta guía)

