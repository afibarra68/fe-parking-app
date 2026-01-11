import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CountriesComponent } from './countries/countries.component';
import { ClientsComponent } from './clients/clients.component';
import { CompaniesComponent } from './companies/companies.component';
import { BusinessServiceComponent } from './business-service/business-service.component';
import { CompanyBusinessServiceComponent } from './company-business-service/company-business-service.component';
import { VehiculosParqueadosComponent } from './vehiculos-parqueados/vehiculos-parqueados.component';
import { ClosedTransactionsComponent } from './closed-transactions/closed-transactions.component';
import { UsersComponent } from './users/users.component';
import { UserRolesComponent } from './user-roles/user-roles.component';
import { AboutComponent } from './about/about.component';
import { AboutRolesComponent } from './about-roles/about-roles.component';
import { SubscriptionHistoryStatusComponent } from './subscription-history-status/subscription-history-status.component';

const routes: Routes = [
  {
    path: 'dashboard',
    component: DashboardComponent
  },
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
    path: 'subscription-history-status',
    component: SubscriptionHistoryStatusComponent
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
    path: 'users',
    component: UsersComponent
  },
  {
    path: 'user-roles',
    component: UserRolesComponent
  },
  {
    path: 'about',
    component: AboutComponent
  },
  {
    path: 'about-roles',
    component: AboutRolesComponent
  },
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdministrationRoutingModule { }
