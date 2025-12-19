import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { ConfigurationRoutingModule } from './configuration-routing-module';
import { BillingPriceComponent } from './billing-price/billing-price.component';
import { PrintersComponent } from './printers/printers.component';
import { TicketTemplatesComponent } from './ticket-templates/ticket-templates.component';
import { UserPrintersComponent } from './user-printers/user-printers.component';
import { UserPrinterTypesComponent } from './user-printer-types/user-printer-types.component';
import { SharedModule } from '../../shared/shared-module';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ConfigurationRoutingModule,
    BillingPriceComponent,
    PrintersComponent,
    TicketTemplatesComponent,
    UserPrintersComponent,
    UserPrinterTypesComponent,
    SharedModule
  ],
  exports: [
    SharedModule
  ]
})
export class ConfigurationModule { }
