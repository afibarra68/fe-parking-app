import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { AuthRoutingModule } from './auth-routing-module';
import { LoginComponent } from './Login/login.component';
import { SharedModule } from '../../shared/shared-module';


@NgModule({
  declarations: [
  ],
  imports: [
    CommonModule,
    AuthRoutingModule,
    LoginComponent,
    ReactiveFormsModule,
    SharedModule
  ],
  exports: [
    SharedModule
  ]
})
export class AuthModule { }
