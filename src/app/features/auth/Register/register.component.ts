import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, CreateUserRequest } from '../../../core/services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    MessageModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      firstName: ['', [Validators.required]],
      secondName: ['', []],
      lastName: ['', [Validators.required]],
      secondLastName: ['', []],
      numberIdentity: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      phoneNumber: ['', []]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    return null;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    
    this.loading = true;
    this.error = null;
    this.success = null;

    const userData: CreateUserRequest = {
      firstName: this.form.value.firstName,
      secondName: this.form.value.secondName || '',
      lastName: this.form.value.lastName,
      secondLastName: this.form.value.secondLastName || '',
      numberIdentity: this.form.value.numberIdentity,
      password: this.form.value.password,
      phoneNumber: this.form.value.phoneNumber || undefined
    };

    this.auth.createUser(userData).subscribe({
      next: (response) => {
        this.loading = false;
        this.success = `Usuario creado exitosamente. ID: ${response.appUserId}`;
        this.form.reset();
        // Redirigir al login después de 2 segundos
        setTimeout(() => {
          this.router.navigate(['/auth/login']);
        }, 2000);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error al crear el usuario';
        console.error('Error:', err);
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }
}

