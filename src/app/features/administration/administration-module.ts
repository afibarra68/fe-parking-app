import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdministrationRoutingModule } from './administration-routing-module';
import { CountriesComponent } from './countries/countries.component';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AdministrationRoutingModule,
    CountriesComponent
  ]
})
export class AdministrationModule { }
