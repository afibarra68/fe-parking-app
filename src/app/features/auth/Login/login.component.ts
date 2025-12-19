import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { AuthService, LoginRequest } from '../../../core/services/auth.service';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule,
    CardModule,
    InputTextModule,
    ButtonModule,
    PasswordModule,
    MessageModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      username: ['', Validators.required],
      accesKey: ['', Validators.required]
    });
  }

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    const credentials: LoginRequest = this.form.value;
    this.auth.login(credentials).subscribe({
      next: () => {
        this.loading = false;
        // Obtener la URL de retorno de los query params, o usar dashboard por defecto
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/administration/dashboard';
        // Pequeño delay antes de navegar para evitar que el sidebar aparezca brevemente
        setTimeout(() => {
          this.router.navigateByUrl(returnUrl);
        }, 100);
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error en el login';
      }
    });
  }
}


