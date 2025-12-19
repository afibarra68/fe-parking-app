import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { PrintersComponent } from './printers/printers.component';
import { TicketTemplatesComponent } from './ticket-templates/ticket-templates.component';
import { UserPrintersComponent } from './user-printers/user-printers.component';
import { UserPrinterTypesComponent } from './user-printer-types/user-printer-types.component';
import { BillingPriceComponent } from './billing-price/billing-price.component';

const routes: Routes = [
  {
    path: 'billing-prices',
    component: BillingPriceComponent
  },
  {
    path: 'printers',
    component: PrintersComponent
  },
  {
    path: 'ticket-templates',
    component: TicketTemplatesComponent
  },
  {
    path: 'user-printers',
    component: UserPrintersComponent
  },
  {
    path: 'user-printer-types',
    component: UserPrinterTypesComponent
  },
  {
    path: '',
    redirectTo: 'billing-prices',
    pathMatch: 'full'
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ConfigurationRoutingModule { }
