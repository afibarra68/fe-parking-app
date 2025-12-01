import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CountriesComponent } from './countries/countries.component';
import { ClientsComponent } from './clients/clients.component';
import { CompaniesComponent } from './companies/companies.component';
import { BusinessServiceComponent } from './business-service/business-service.component';
import { CompanyBusinessServiceComponent } from './company-business-service/company-business-service.component';
import { VehiculosParqueadosComponent } from './vehiculos-parqueados/vehiculos-parqueados.component';
import { ClosedTransactionsComponent } from './closed-transactions/closed-transactions.component';

const routes: Routes = [
  {
    path: 'countries',
    component: CountriesComponent
  },
  {
    path: 'companies',
    component: CompaniesComponent
  },
  {
    path: 'clients',
    component: ClientsComponent
  },
  {
    path: 'business-service',
    component: BusinessServiceComponent
  },
  {
    path: 'company-business-service',
    component: CompanyBusinessServiceComponent
  },
  {
    path: 'vehiculos-parqueados',
    component: VehiculosParqueadosComponent
  },
  {
    path: 'closed-transactions',
    component: ClosedTransactionsComponent
  },
  {
    path: '',
    redirectTo: 'countries',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdministrationRoutingModule { }
