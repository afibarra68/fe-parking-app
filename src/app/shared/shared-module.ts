import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { TableComponent } from './components/table/table.component';
import { SelectComponent } from './components/dropdown/select.component';
import { ErrorComponent } from './components/error/error.component';
import { CalendarComponent } from './components/calendar/calendar.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SpinnerComponent,
    TableComponent,
    SelectComponent,
    ErrorComponent,
    CalendarComponent
  ],
  exports: [
    SpinnerComponent,
    TableComponent,
    SelectComponent,
    ErrorComponent,
    CalendarComponent
  ]
})
export class SharedModule { }

