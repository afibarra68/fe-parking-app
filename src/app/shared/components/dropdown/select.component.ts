import { Component, EventEmitter, Input, OnInit, Optional, Output, Self } from '@angular/core';
import { ControlValueAccessor, NgControl, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { SelectModule } from 'primeng/select';
import { SelectItem } from 'primeng/api';
import { ErrorComponent } from '../error/error.component';

@Component({
  selector: 'app-select-lib',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    ErrorComponent
  ],
  template: `
    <div class="p-field p-col-12 p-md-6 p-lg-3 p-pt-3">
      <span class="p-float-label">
        <p-select
          emptyMessage="NO RECORDS FOUND"
          [formControl]="control"
          [options]="options"
          [filter]="filter"
          [showClear]="showClear && !readonly"
          [readonly]="readonly"
          [virtualScroll]="virtualScroll"
          [virtualScrollItemSize]="itemSize"
          [appendTo]="appendTo"
          (onChange)="onChange.emit($event)"
          (onLazyLoad)="onLazyLoad.emit($event)"
          optionLabel="label"
          optionValue="value">
        </p-select>
        <label for="dropdown">
          {{ label }} 
          @if (control && control.errors?.['required']) {
            <span style="font-weight: 900;">*</span>
          }
        </label>
      </span>
      <app-error [input]="control"></app-error>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
    .w-full {
      width: 100%;
    }
  `]
})
export class SelectComponent implements OnInit, ControlValueAccessor {
  @Input() isDisabled = false;
  @Input() readonly = false;
  @Input() label = '';
  @Input() filter = false;
  @Input() virtualScroll = true;
  @Input() itemSize: number = 15;
  @Input() options: SelectItem[] = [];
  @Input() showClear = true;
  @Input() appendTo: string | HTMLElement = 'body';
  @Input() scrollHeight: string = '200px';
  @Input() lazy = false;
  @Input() totalRecords = 0;
  @Output() onChange = new EventEmitter<any>();
  @Output() onLazyLoad = new EventEmitter<any>();

  get control(): FormControl {
    return this.ngControl?.control as FormControl;
  }

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      ngControl.valueAccessor = this;
    }
  }

  writeValue(value: any): void {
    // El valor se maneja a través del formControl
  }

  registerOnChange(fn: any): void {
    // El cambio se maneja a través del formControl
  }

  registerOnTouched(fn: any): void {
    // El touched se maneja a través del formControl
  }

  setDisabledState?(isDisabled: boolean): void {
    // El estado disabled se maneja a través del formControl
  }

  ngOnInit(): void {
    if (this.isDisabled && this.ngControl?.control) {
      this.ngControl.control.disable();
    } else if (this.ngControl?.control) {
      this.ngControl.control.enable();
    }
  }
}

