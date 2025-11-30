import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { CountriesComponent } from './countries/countries.component';
import { ClientsComponent } from './clients/clients.component';

const routes: Routes = [
  {
    path: 'countries',
    component: CountriesComponent
  },
  {
    path: 'clients',
    component: ClientsComponent
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
