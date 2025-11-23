import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { catchError, map, switchMap, startWith } from 'rxjs/operators';
import { UserService } from '../../../core/services/user.service';
import { User, UserCreateRequest, UserUpdateRequest, UserQueryParams } from '../../../core/models/user.model';

interface UsersState {
  users: User[];
  error: string | null;
  loading: boolean;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.scss']
})
export class UsersComponent implements OnInit {
  // Signals para estado reactivo
  searchTerm = signal<string>('');
  showForm = signal<boolean>(false);
  editingUser = signal<User | null>(null);
  error = signal<string | null>(null);
  
  // Observable para los usuarios
  users$: Observable<User[]>;
  usersState$: Observable<UsersState>;
  
  // Formulario para crear/editar
  userForm: FormGroup;
  
  // Subject para disparar recargas
  private reloadSubject = new BehaviorSubject<void>(undefined);

  constructor(
    private userService: UserService,
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      numberIdentity: [''],
      firstName: [''],
      lastName: [''],
      secondName: [''],
      secondLastname: [''],
      email: [''],
      phone: [''],
      accesKey: ['']
    });

    // Observable que reacciona a cambios en searchTerm y reloadSubject
    this.users$ = this.reloadSubject.pipe(
      switchMap(() => {
        const params = this.getSearchParams();
        return this.userService.getUsers(params).pipe(
          catchError(err => {
            this.handleError(err);
            return of([]);
          })
        );
      })
    );

    // Estado completo con loading y error
    this.usersState$ = this.users$.pipe(
      map(users => ({
        users: Array.isArray(users) ? users : [],
        error: this.error(),
        loading: false
      })),
      startWith({ users: [], error: null, loading: true })
    );
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  private getSearchParams(): UserQueryParams | undefined {
    const term = this.searchTerm().trim();
    return term ? { numberIdentity: term } : undefined;
  }

  loadUsers(): void {
    this.error.set(null);
    this.reloadSubject.next();
  }

  private handleError(err: any): void {
    let errorMessage = 'Error al cargar los usuarios';
    
    if (err?.status === 401 || err?.status === 403) {
      errorMessage = 'No tiene permisos para acceder a esta información';
    } else if (err?.status === 0) {
      errorMessage = 'Error de conexión con el servidor. Verifique que el backend esté disponible en http://localhost:9000';
    } else if (err?.status === 500) {
      errorMessage = 'Error interno del servidor. Por favor, contacte al administrador.';
    } else if (err?.status === 404) {
      errorMessage = 'El endpoint no fue encontrado. Verifique la configuración del backend.';
    } else {
      errorMessage = err?.error?.message || err?.message || errorMessage;
    }
    
    this.error.set(errorMessage);
    console.error('Error loading users:', err);
  }

  search(): void {
    this.loadUsers();
  }

  clearSearch(): void {
    this.searchTerm.set('');
    this.loadUsers();
  }

  onSearchTermChange(value: string): void {
    this.searchTerm.set(value);
  }

  openCreateForm(): void {
    this.editingUser.set(null);
    this.userForm.reset();
    this.showForm.set(true);
  }

  openEditForm(user: User): void {
    this.editingUser.set(user);
    this.userForm.patchValue({
      numberIdentity: user.numberIdentity || '',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      secondName: user.secondName || '',
      secondLastname: user.secondLastname || '',
      email: user.email || '',
      phone: user.phone || '',
      accesKey: '' // No mostrar la contraseña
    });
    this.showForm.set(true);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingUser.set(null);
    this.userForm.reset();
    this.error.set(null);
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      return;
    }

    this.error.set(null);

    const editing = this.editingUser();
    
    if (editing) {
      // Actualizar usuario
      this.userService.updateUser({
        appUserId: editing.appUserId!,
        ...this.userForm.value
      } as UserUpdateRequest).subscribe({
        next: () => {
          this.closeForm();
          this.loadUsers();
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || 'Error al actualizar el usuario';
          this.error.set(errorMsg);
        }
      });
    } else {
      // Crear usuario
      this.userService.createUser(this.userForm.value as UserCreateRequest).subscribe({
        next: () => {
          this.closeForm();
          this.loadUsers();
        },
        error: (err: any) => {
          const errorMsg = err?.error?.message || 'Error al crear el usuario';
          this.error.set(errorMsg);
        }
      });
    }
  }

  deleteUser(user: User): void {
    if (!user.numberIdentity) {
      this.error.set('No se puede eliminar: el usuario no tiene número de identidad');
      return;
    }

    const userDocument = parseInt(user.numberIdentity);
    if (isNaN(userDocument)) {
      this.error.set('No se puede eliminar: número de identidad inválido');
      return;
    }

    if (!confirm(`¿Está seguro de eliminar el usuario ${user.firstName} ${user.lastName} (${user.numberIdentity})?`)) {
      return;
    }

    this.userService.deleteUser(userDocument).subscribe({
      next: () => {
        this.loadUsers();
      },
      error: (err: any) => {
        this.error.set(err?.error?.message || 'Error al eliminar el usuario');
      }
    });
  }

  // Getters computados para el template
  get isEditing(): boolean {
    return this.editingUser() !== null;
  }

  get currentError(): string | null {
    return this.error();
  }
}

