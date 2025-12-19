import { Injectable, inject } from '@angular/core';
import { ConfirmationService as PrimeConfirmationService } from 'primeng/api';
import { Observable } from 'rxjs';

export interface ConfirmationOptions {
  message?: string;
  header?: string;
  icon?: string;
  acceptLabel?: string;
  rejectLabel?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ConfirmationService {
  private confirmationService = inject(PrimeConfirmationService);

  /**
   * Muestra un diálogo de confirmación y retorna un Observable que emite true si se acepta, false si se rechaza
   */
  confirm(options: ConfirmationOptions = {}): Observable<boolean> {
    return new Observable<boolean>(observer => {
      this.confirmationService.confirm({
        message: options.message || '¿Está seguro de realizar esta acción?',
        header: options.header || 'Confirmación',
        icon: options.icon || 'pi pi-exclamation-triangle',
        acceptLabel: options.acceptLabel || 'Sí',
        rejectLabel: options.rejectLabel || 'No',
        accept: () => {
          observer.next(true);
          observer.complete();
        },
        reject: () => {
          observer.next(false);
          observer.complete();
        }
      });
    });
  }

  /**
   * Muestra un diálogo de confirmación para eliminar un elemento
   */
  confirmDelete(itemName?: string): Observable<boolean> {
    const message = itemName 
      ? `¿Está seguro de eliminar "${itemName}"?`
      : '¿Está seguro de eliminar este elemento?';
    
    return this.confirm({
      message,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar'
    });
  }
}

