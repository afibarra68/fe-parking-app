import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SpinnerComponent } from './components/spinner/spinner.component';
import { TableComponent } from './components/table/table.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    SpinnerComponent,
    TableComponent
  ],
  exports: [
    SpinnerComponent,
    TableComponent
  ]
})
export class SharedModule { }

