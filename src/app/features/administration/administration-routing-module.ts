import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CountriesComponent } from './countries/countries.component';
import { ClientsComponent } from './clients/clients.component';
import { CompaniesComponent } from './companies/companies.component';
import { BusinessServiceComponent } from './business-service/business-service.component';

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
