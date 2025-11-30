import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private collapsedState = signal(false);

  get collapsed() {
    return this.collapsedState.asReadonly();
  }

  toggle(): void {
    this.collapsedState.update(value => !value);
  }

  collapse(): void {
    this.collapsedState.set(true);
  }

  expand(): void {
    this.collapsedState.set(false);
  }
}
