import { Component } from '@angular/core';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [ToastModule],
  template: `
    <p-toast 
      [position]="'top-right'" 
      [baseZIndex]="10000"
      [showTransformOptions]="'translateX(100%)'"
      [hideTransformOptions]="'translateX(100%)'"
      [showTransitionOptions]="'300ms ease-out'"
      [hideTransitionOptions]="'250ms ease-in'">
    </p-toast>
  `
})
export class ToastComponent {
}
