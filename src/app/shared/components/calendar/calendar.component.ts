import { Component, EventEmitter, Input, OnInit, Optional, Output, Self } from '@angular/core';
import { ControlValueAccessor, NgControl, ReactiveFormsModule, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { DatePickerModule } from 'primeng/datepicker';
import { FloatLabelModule } from 'primeng/floatlabel';
import { ErrorComponent } from '../error/error.component';

@Component({
  selector: 'app-calendar-lib',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DatePickerModule,
    FloatLabelModule,
    ErrorComponent
  ],
  template: `
    <div class="p-field p-col-12 p-md-6 p-lg-3 p-pt-3">
      @if (label && !floatLabel) {
        <label class="calendar-label">
          {{ label }}
          @if (control && control.errors?.['required']) {
            <span style="font-weight: 900;">*</span>
          }
        </label>
      }
      @if (floatLabel) {
        <span class="p-float-label">
          <p-datepicker
            [formControl]="control"
            [showIcon]="true"
            [readonlyInput]="true"
            [showButtonBar]="showButtonBar"
            [minDate]="minDate"
            [maxDate]="maxDate"
            [defaultDate]="minDate"
            [showTime]="showTime"
            [hourFormat]="hourFormat"
            dateFormat="dd/mm/yy"
            (onSelect)="onSelect.emit($event)">
          </p-datepicker>
          <label for="controltext">
            {{ label }}
            @if (control && control.errors?.['required']) {
              <span style="font-weight: 900;">*</span>
            }
          </label>
        </span>
      } @else {
        <p-datepicker
          [formControl]="control"
          [showIcon]="true"
          [readonlyInput]="true"
          [showButtonBar]="showButtonBar"
          [minDate]="minDate"
          [maxDate]="maxDate"
          [defaultDate]="minDate"
          [showTime]="showTime"
          [hourFormat]="hourFormat"
          dateFormat="dd/mm/yy"
          (onSelect)="onSelect.emit($event)">
        </p-datepicker>
      }
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
    .calendar-label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
      color: #555;
      font-size: 0.875rem;
    }
    ::ng-deep {
      .p-datepicker {
        width: 100%;
      }
    }
  `]
})
export class CalendarComponent implements OnInit, ControlValueAccessor {
  @Output() onSelect = new EventEmitter<any>();
  @Input() isDisabled = false;
  @Input() showTime = false;
  @Input() label = '';
  @Input() minDate: Date | null = null;
  @Input() maxDate: Date | null = null;
  @Input() showTimeOnly = false;
  @Input() stepMinute = 1;
  @Input() showButtonBar = true;
  @Input() hourFormat: '12' | '24' = '24';
  @Input() floatLabel: boolean = true; // Por defecto usa float label, pero se puede desactivar

  es: any;

  get control(): FormControl {
    return this.ngControl?.control as FormControl;
  }

  constructor(@Self() @Optional() public ngControl: NgControl) {
    if (this.ngControl) {
      ngControl.valueAccessor = this;
    }

    this.es = {
      firstDayOfWeek: 0,
      dayNames: ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
      dayNamesShort: ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB'],
      dayNamesMin: ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'],
      monthNames: [
        'ENERO',
        'FEBRERO',
        'MARZO',
        'ABRIL',
        'MAYO',
        'JUNIO',
        'JULIO',
        'AGOSTO',
        'SEPTIEMBRE',
        'OCTUBRE',
        'NOVIEMBRE',
        'DICIEMBRE'
      ],
      monthNamesShort: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
      today: 'Hoy',
      clear: 'Limpiar',
      weekHeader: 'Wk'
    };
  }

  ngOnInit(): void {
    if (this.isDisabled && this.ngControl?.control) {
      this.ngControl.control.disable();
    } else if (this.ngControl?.control) {
      this.ngControl.control.enable();
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
}

