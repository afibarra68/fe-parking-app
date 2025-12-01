import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdministrationRoutingModule } from './administration-routing-module';
import { CountriesComponent } from './countries/countries.component';
import { ClientsComponent } from './clients/clients.component';
import { CompaniesComponent } from './companies/companies.component';
import { BusinessServiceComponent } from './business-service/business-service.component';
import { CompanyBusinessServiceComponent } from './company-business-service/company-business-service.component';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AdministrationRoutingModule,
    CountriesComponent,
    CompaniesComponent,
    ClientsComponent,
    BusinessServiceComponent,
    CompanyBusinessServiceComponent,
    SharedModule
  ],
  exports: [
    SharedModule
  ]
})
export class AdministrationModule { }
