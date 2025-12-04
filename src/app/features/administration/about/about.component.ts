import { Component, OnInit, OnDestroy, ChangeDetectorRef, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';
import { AuthService } from '../../../core/services/auth.service';
import { CompanyService, Company } from '../../../core/services/company.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-about',
  standalone: true,
  imports: [
    CommonModule,
    CardModule
  ],
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit, OnDestroy {
  loading = signal(false);
  companyInfo = signal<any>({
    name: 'Sistema de Gestión de Estacionamiento',
    version: '2.0.0',
    description: 'Sistema integral para la gestión y administración de estacionamientos',
    features: [
      'Gestión de vehículos y transacciones',
      'Control de tarifas',
      'Administración de clientes y empresas',
      'Sistema de roles y permisos',
      'Reportes y transacciones cerradas'
    ],
    contact: {
      email: 'soporte@estacionamiento.com',
      phone: '+1 (555) 123-4567'
    },
    copyright: `© ${new Date().getFullYear()} Todos los derechos reservados`
  });
  isMultiCompany = signal(false);
  private subscription?: Subscription;

  constructor(
    private authService: AuthService,
    private companyService: CompanyService
  ) {}

  ngOnInit(): void {
    this.loadCompanyInfo();
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  loadCompanyInfo(): void {
    // Consultar información de la empresa del usuario autenticado
    // El backend obtiene el companyId automáticamente del usuario en sesión
    this.loading.set(true);
    
    this.subscription = this.companyService.getCurrentUserCompany().subscribe({
      next: (company: Company) => {
        this.companyInfo.set({
          name: company.companyName || 'Sistema de Gestión de Estacionamiento',
          version: '2.0.0',
          description: company.numberIdentity || 'Sistema integral para la gestión y administración de estacionamientos',
          features: [
            'Gestión de vehículos y transacciones',
            'Control de tarifas',
            'Administración de clientes y empresas',
            'Sistema de roles y permisos',
            'Reportes y transacciones cerradas'
          ],
          contact: {
            email: 'soporte@estacionamiento.com',
            phone: '+1 (555) 123-4567'
          },
          copyright: `© ${new Date().getFullYear()} ${company.companyName || ''} - Todos los derechos reservados`
        });
        this.isMultiCompany.set(false);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error al cargar información de la empresa:', err);
        // Si falla (usuario sin empresa o error), mostrar datos de acceso en modo multiempresa
        this.setMultiCompanyMode();
        this.loading.set(false);
      }
    });
  }

  private setMultiCompanyMode(): void {
    this.isMultiCompany.set(true);
    this.companyInfo.set({
      name: 'Sistema Multiempresa',
      version: '2.0.0',
      description: 'Acceso en modo multiempresa - Gestión centralizada de múltiples empresas',
      features: [
        'Gestión de vehículos y transacciones',
        'Control de tarifas',
        'Administración de clientes y empresas',
        'Sistema de roles y permisos',
        'Reportes y transacciones cerradas',
        'Acceso multiempresa habilitado'
      ],
      contact: {
        email: 'soporte@estacionamiento.com',
        phone: '+1 (555) 123-4567'
      },
      copyright: `© ${new Date().getFullYear()} Todos los derechos reservados - Modo Multiempresa`
    });
  }
}

