import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl } from '@angular/forms';

@Component({
  selector: 'app-error',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (input && input.invalid && (input.dirty || input.touched)) {
      <small class="p-error">
        @if (input.errors?.['required']) {
          Este campo es requerido
        } @else if (input.errors?.['email']) {
          Debe ser un email válido
        } @else if (input.errors?.['minlength']) {
          Mínimo {{ input.errors?.['minlength']?.requiredLength }} caracteres
        } @else if (input.errors?.['maxlength']) {
          Máximo {{ input.errors?.['maxlength']?.requiredLength }} caracteres
        } @else if (input.errors?.['pattern']) {
          Formato inválido
        } @else if (input.errors?.['min']) {
          Valor mínimo: {{ input.errors?.['min']?.min }}
        } @else if (input.errors?.['max']) {
          Valor máximo: {{ input.errors?.['max']?.max }}
        } @else {
          Campo inválido
        }
      </small>
    }
  `,
  styles: [`
    .p-error {
      display: block;
      margin-top: 0.25rem;
      color: #e24c4c;
      font-size: 0.875rem;
    }
  `]
})
export class ErrorComponent {
  @Input() input: AbstractControl | null = null;
}

