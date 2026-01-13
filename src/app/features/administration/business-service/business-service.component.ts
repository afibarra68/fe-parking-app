import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { BusinessServiceService, BusinessService, BusinessServicePageResponse } from '../../../core/services/business-service.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-business-service',
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
  templateUrl: './business-service.component.html',
  styleUrls: ['./business-service.component.scss']
})
export class BusinessServiceComponent implements OnDestroy {
  loading = false;
  showForm = false;
  editingBusinessService: BusinessService | null = null;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'businessServiceId', header: 'ID', width: '80px' },
    { field: 'principalName', header: 'Nombre Principal', width: '200px' },
    { field: 'description', header: 'Descripción', width: '250px' },
    { field: 'code', header: 'Código', width: '150px' }
  ];

  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private businessServiceService: BusinessServiceService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      principalName: ['', [Validators.required]],
      description: [''],
      code: ['', [Validators.required]]
    });

    this.searchForm = this.fb.group({
      principalName: [''],
      code: [''],
      description: ['']
    });
  }

  loadBusinessServices(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters = {
      principalName: this.searchForm.value.principalName?.trim() || undefined,
      code: this.searchForm.value.code?.trim() || undefined,
      description: this.searchForm.value.description?.trim() || undefined
    };
    
    this.subscription = this.businessServiceService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: BusinessServicePageResponse) => {
          this.tableDataSubject.next({
            data: data.content,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar los servicios de negocio';
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
    this.tableDataSubject.complete();
  }

  search(): void {
    this.page = 0;
    this.first = 0;
    this.onTablePagination({ page: 0, first: 0, rows: this.size, pageCount: 0 });
  }

  clearSearch(): void {
    this.searchForm.reset();
    this.search();
  }

  openCreateForm(): void {
    this.editingBusinessService = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(businessService: BusinessService): void {
    this.editingBusinessService = businessService;
    this.form.patchValue({
      principalName: businessService.principalName || '',
      description: businessService.description || '',
      code: businessService.code || ''
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingBusinessService = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const businessServiceData: BusinessService = {
      ...this.form.value
    };

    if (this.editingBusinessService?.businessServiceId) {
      businessServiceData.businessServiceId = this.editingBusinessService.businessServiceId;
    }

    const operation = this.editingBusinessService
      ? this.businessServiceService.update(businessServiceData)
      : this.businessServiceService.create(businessServiceData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingBusinessService = null;
        this.form.reset();
        this.loadBusinessServices();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar el servicio de negocio';
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
    if (selected) {
      this.error = 'La funcionalidad de eliminar no está disponible';
    }
  }

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadBusinessServices();
  }
}

