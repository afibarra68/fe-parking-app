import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { AdministrationRoutingModule } from './administration-routing-module';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CountriesComponent } from './countries/countries.component';
import { ClientsComponent } from './clients/clients.component';
import { CompaniesComponent } from './companies/companies.component';
import { BusinessServiceComponent } from './business-service/business-service.component';
import { CompanyBusinessServiceComponent } from './company-business-service/company-business-service.component';
import { VehiculosParqueadosComponent } from './vehiculos-parqueados/vehiculos-parqueados.component';
import { ClosedTransactionsComponent } from './closed-transactions/closed-transactions.component';
import { AboutComponent } from './about/about.component';
import { SubscriptionHistoryStatusComponent } from './subscription-history-status/subscription-history-status.component';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    AdministrationRoutingModule,
    DashboardComponent,
    CountriesComponent,
    CompaniesComponent,
    ClientsComponent,
    BusinessServiceComponent,
    CompanyBusinessServiceComponent,
    VehiculosParqueadosComponent,
    ClosedTransactionsComponent,
    AboutComponent,
    SubscriptionHistoryStatusComponent,
    SharedModule
  ],
  exports: [
    SharedModule
  ]
})
export class AdministrationModule { }
