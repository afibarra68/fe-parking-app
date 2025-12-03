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
    <div class="select-field">
      @if (label && !floatLabel) {
        <label class="select-label">
          {{ label }} 
          @if (control && control.errors?.['required']) {
            <span style="font-weight: 900;">*</span>
          }
        </label>
      }
      @if (floatLabel) {
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
            [scrollHeight]="scrollHeight"
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
      } @else {
        <p-select
          emptyMessage="NO RECORDS FOUND"
          [formControl]="control"
          [options]="options"
          [filter]="filter"
          [showClear]="showClear && !readonly"
          [readonly]="readonly"
          [virtualScroll]="virtualScroll"
          [virtualScrollItemSize]="itemSize"
          [scrollHeight]="scrollHeight"
          [appendTo]="appendTo"
          (onChange)="onChange.emit($event)"
          (onLazyLoad)="onLazyLoad.emit($event)"
          optionLabel="label"
          optionValue="value">
        </p-select>
      }
      <app-error [input]="control"></app-error>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
    }
    .select-field {
      width: 100%;
    }
    .select-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
    }
    .w-full {
      width: 100%;
    }
    ::ng-deep {
      .p-select {
        width: 100%;
      }
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
  @Input() floatLabel: boolean = false; // Si es true, usa p-float-label, si es false, label arriba
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

