import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { ClientService, Client, Page } from '../../../core/services/client.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-clients',
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
  templateUrl: './clients.component.html',
  styleUrls: ['./clients.component.scss']
})
export class ClientsComponent implements OnDestroy {
  loading = false;
  showForm = false;
  editingClient: Client | null = null;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;
  
  private tableDataSubject = new BehaviorSubject<any>({
    data: [],
    totalRecords: 0,
    isFirst: true
  });
  tableData$: Observable<any> = this.tableDataSubject.asObservable();

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'clientId', header: 'ID', width: '80px' },
    { field: 'fullName', header: 'Nombre Completo', width: '200px' },
    { field: 'typeIdentity', header: 'Tipo Identidad', width: '150px' },
    { field: 'numberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'people', header: 'Personas', width: '120px' },
    { field: 'paymentDay', header: 'Día de Pago', width: '150px' },
    { field: 'clientCompanyId', header: 'ID Compañía', width: '120px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      typeIdentity: [''],
      numberIdentity: [''],
      people: [''],
      clientCompanyId: [null]
    });

    this.searchForm = this.fb.group({
      document: ['']
    });
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  loadClients(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters = {
      document: this.searchForm.value.document?.trim() || undefined
    };
    
    this.subscription = this.clientService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: Page<Client>) => {
          this.tableDataSubject.next({
            data: data.content,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar los clientes';
          this.tableDataSubject.next({
            data: [],
            totalRecords: 0,
            isFirst: true
          });
          this.loading = false;
        }
      });
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

  onTablePagination(event: any): void {
    this.page = event.page || 0;
    this.size = event.rows || environment.rowsPerPage || 10;
    this.first = event.first || 0;
    this.loadClients();
  }

  onTableEdit(selected: any): void {
    if (selected) {
      this.openEditForm(selected);
    }
  }

  onTableDelete(selected: any): void {
    if (selected && confirm(`¿Está seguro de eliminar el cliente "${selected.fullName}"?`)) {
      // Implementar lógica de eliminación si está disponible
      this.error = 'La funcionalidad de eliminar no está disponible';
    }
  }

  openCreateForm(): void {
    this.editingClient = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(client: Client): void {
    this.editingClient = client;
    this.form.patchValue({
      fullName: client.fullName || '',
      typeIdentity: client.typeIdentity || '',
      numberIdentity: client.numberIdentity || '',
      people: client.people || '',
      clientCompanyId: client.clientCompanyId || null
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingClient = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Excluir paymentDay del objeto a enviar
    const { paymentDay, ...formData } = this.form.value;
    const clientData: Client = {
      ...formData
    };

    if (this.editingClient?.clientId) {
      clientData.clientId = this.editingClient.clientId;
    }

    const operation = this.editingClient
      ? this.clientService.update(clientData)
      : this.clientService.create(clientData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingClient = null;
        this.form.reset();
        this.loadClients();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Error al guardar el cliente';
        this.loading = false;
        console.error('Error:', err);
      }
    });
  }
}

