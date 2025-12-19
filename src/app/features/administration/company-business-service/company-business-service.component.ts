import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CompanyBusinessServiceService, CompanyBusinessService } from '../../../core/services/company-business-service.service';
import { CompanyService, Company } from '../../../core/services/company.service';
import { BusinessServiceService, BusinessService } from '../../../core/services/business-service.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { SelectItem } from 'primeng/api';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-company-business-service',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    SharedModule
  ],
  templateUrl: './company-business-service.component.html',
  styleUrls: ['./company-business-service.component.scss']
})
export class CompanyBusinessServiceComponent implements OnDestroy {
  loading = false;
  showForm = false;
  editingRelation: CompanyBusinessService | null = null;
  error: string | null = null;
  
  companies: Company[] = [];
  businessServices: BusinessService[] = [];
  companyOptions: SelectItem[] = [];
  businessServiceOptions: SelectItem[] = [];
  
  private subscription?: Subscription;
  private companiesSubscription?: Subscription;
  private businessServicesSubscription?: Subscription;
  
  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'companyBusinessServiceId', header: 'ID', width: '80px' },
    { field: 'company.companyName', header: 'Empresa', width: '250px' },
    { field: 'businessService.principalName', header: 'Servicio de Negocio', width: '250px' },
    { field: 'businessService.code', header: 'Código', width: '150px' },
    { field: 'createdDate', header: 'Fecha Creación', width: '180px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private companyBusinessServiceService: CompanyBusinessServiceService,
    private companyService: CompanyService,
    private businessServiceService: BusinessServiceService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      companyId: [null, [Validators.required]],
      businessServiceId: [null, [Validators.required]]
    });

    this.searchForm = this.fb.group({
      companyId: [null],
      businessServiceId: [null]
    });
    
    this.loadCompanies();
    this.loadBusinessServices();
    this.loadRelations();
  }

  loadCompanies(): void {
    if (this.companiesSubscription) {
      this.companiesSubscription.unsubscribe();
    }

    this.companiesSubscription = this.companyService.getList()
      .subscribe({
        next: (data: Company[]) => {
          this.companies = Array.isArray(data) ? data : [];
          this.companyOptions = this.companies.map(company => ({
            label: company.companyName || '',
            value: company.companyId
          }));
        },
        error: (err: any) => {
          this.companies = [];
          this.companyOptions = [];
        }
      });
  }

  loadBusinessServices(): void {
    if (this.businessServicesSubscription) {
      this.businessServicesSubscription.unsubscribe();
    }

    this.businessServicesSubscription = this.businessServiceService.getQueryable()
      .subscribe({
        next: (data: BusinessService[]) => {
          this.businessServices = Array.isArray(data) ? data : [];
          this.businessServiceOptions = this.businessServices.map(service => ({
            label: `${service.principalName} (${service.code})`,
            value: service.businessServiceId
          }));
        },
        error: (err: any) => {
          this.businessServices = [];
          this.businessServiceOptions = [];
        }
      });
  }

  loadRelations(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters = {
      companyId: this.searchForm.value.companyId || undefined,
      businessServiceId: this.searchForm.value.businessServiceId || undefined
    };
    
    this.subscription = this.companyBusinessServiceService.getList(filters)
      .subscribe({
        next: (data: CompanyBusinessService[]) => {
          this.tableDataSubject.next({
            data: Array.isArray(data) ? data : [],
            totalRecords: Array.isArray(data) ? data.length : 0,
            isFirst: true
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las relaciones';
          this.tableDataSubject.next({
            data: [],
            totalRecords: 0,
            isFirst: true
          });
          this.loading = false;
        }
      });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    if (this.companiesSubscription) {
      this.companiesSubscription.unsubscribe();
    }
    if (this.businessServicesSubscription) {
      this.businessServicesSubscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  search(): void {
    this.loadRelations();
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.loadRelations();
  }

  openCreateForm(): void {
    this.editingRelation = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(relation: CompanyBusinessService): void {
    this.editingRelation = relation;
    this.form.patchValue({
      companyId: relation.company?.companyId || null,
      businessServiceId: relation.businessService?.businessServiceId || null
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingRelation = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Buscar los objetos completos de los arrays
    const selectedCompany = this.companies.find(c => c.companyId === this.form.value.companyId);
    const selectedBusinessService = this.businessServices.find(bs => bs.businessServiceId === this.form.value.businessServiceId);

    if (!selectedCompany || !selectedBusinessService) {
      this.error = 'Debe seleccionar una empresa y un servicio de negocio válidos';
      this.loading = false;
      return;
    }

    const relationData: CompanyBusinessService = {
      company: selectedCompany,
      businessService: selectedBusinessService
    };

    if (this.editingRelation?.companyBusinessServiceId) {
      relationData.companyBusinessServiceId = this.editingRelation.companyBusinessServiceId;
    }

    const operation = this.editingRelation
      ? this.companyBusinessServiceService.update(relationData)
      : this.companyBusinessServiceService.create(relationData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingRelation = null;
        this.form.reset();
        this.loadRelations();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar la relación';
        this.loading = false;
      }
    });
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && selected.companyBusinessServiceId) {
      this.confirmationService.confirmDelete('esta relación')
        .pipe(
          filter(confirmed => confirmed),
          switchMap(() => {
            this.loading = true;
            return this.companyBusinessServiceService.delete(selected.companyBusinessServiceId);
          })
        )
        .subscribe({
          next: () => {
            this.loading = false;
            this.loadRelations();
          },
          error: (err: any) => {
            this.error = err?.error?.message || 'Error al eliminar la relación';
            this.loading = false;
          }
        });
    }
  }

  onTablePagination(event: any): void {
    // No hay paginación server-side para relaciones
  }
}

