import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray, FormControl } from '@angular/forms';
import { ClientService, Client, Page } from '../../../core/services/client.service';
import { ConfirmationService } from '../../../core/services/confirmation.service';
import { NotificationService } from '../../../core/services/notification.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { filter, switchMap } from 'rxjs/operators';

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
    { field: 'numberIdentity', header: 'Número Identidad', width: '150px' },
    { field: 'aceptedPlatesDisplay', header: 'Placas Aceptadas', width: '250px' },
    { field: 'subscriptionValidityDisplay', header: 'Vigencia Suscripción', width: '150px' },
    { field: 'clientCompanyId', header: 'ID Compañía', width: '120px' }
  ];

  form: FormGroup;
  searchForm: FormGroup;
  maxPlates = 5;

  constructor(
    private clientService: ClientService,
    private confirmationService: ConfirmationService,
    private notificationService: NotificationService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      fullName: ['', [Validators.required]],
      numberIdentity: [''],
      clientCompanyId: [null],
      plates: this.fb.array([]) // FormArray para las placas
    });

    this.searchForm = this.fb.group({
      document: ['']
    });
  }

  get platesFormArray(): FormArray {
    return this.form.get('plates') as FormArray;
  }

  getPlateControl(index: number): FormControl {
    return this.platesFormArray.at(index) as FormControl;
  }

  addPlate(): void {
    if (this.platesFormArray.length < this.maxPlates) {
      this.platesFormArray.push(this.fb.control('', [Validators.required]));
    }
  }

  removePlate(index: number): void {
    this.platesFormArray.removeAt(index);
  }

  canAddPlate(): boolean {
    return this.platesFormArray.length < this.maxPlates;
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
          // Mapear los datos para agregar el campo de display de placas y vigencia de suscripción
          const mappedData = data.content.map(client => ({
            ...client,
            aceptedPlatesDisplay: client.aceptedPlates || '-',
            subscriptionValidityDisplay: client.subscriptionValidity ? this.formatDate(client.subscriptionValidity) : '-'
          }));
          this.tableDataSubject.next({
            data: mappedData,
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
    if (selected) {
      const itemName = selected.fullName 
        ? `el cliente "${selected.fullName}"`
        : 'este cliente';
      
      this.confirmationService.confirmDelete(itemName)
        .pipe(filter((confirmed: boolean) => confirmed))
        .subscribe(() => {
          // Implementar lógica de eliminación si está disponible
          this.error = 'La funcionalidad de eliminar no está disponible';
        });
    }
  }

  openCreateForm(): void {
    this.editingClient = null;
    this.form.reset();
    // Limpiar el FormArray de placas
    while (this.platesFormArray.length !== 0) {
      this.platesFormArray.removeAt(0);
    }
    this.showForm = true;
  }

  openEditForm(client: Client): void {
    this.editingClient = client;
    
    // Limpiar el FormArray de placas
    while (this.platesFormArray.length !== 0) {
      this.platesFormArray.removeAt(0);
    }

    // Si hay placas, dividirlas por comas y agregarlas al FormArray
    if (client.aceptedPlates) {
      const plates = client.aceptedPlates.split(',').map(p => p.trim()).filter(p => p);
      plates.forEach(plate => {
        this.platesFormArray.push(this.fb.control(plate, [Validators.required]));
      });
    }

    this.form.patchValue({
      fullName: client.fullName || '',
      numberIdentity: client.numberIdentity || '',
      clientCompanyId: client.clientCompanyId || null
    });
    this.showForm = true;

    // Verificar si la vigencia de suscripción está vencida
    if (this.isSubscriptionValidityExpired(client)) {
      this.checkAndRenewSubscriptionValidity(client);
    }
  }

  /**
   * Verifica si la vigencia de suscripción está vencida
   */
  isSubscriptionValidityExpired(client: Client): boolean {
    if (!client.subscriptionValidity) {
      return true; // Si no hay fecha, se considera vencida
    }
    const validityDate = new Date(client.subscriptionValidity);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    validityDate.setHours(0, 0, 0, 0);
    return validityDate < today;
  }

  /**
   * Verifica si la vigencia está vencida y pregunta si desea renovar la suscripción
   */
  checkAndRenewSubscriptionValidity(client: Client): void {
    if (!client.clientId) {
      return;
    }

    const clientName = client.fullName || 'este cliente';
    const plates = client.aceptedPlates ? client.aceptedPlates.split(',').join(', ') : 'sin placas';
    
    this.confirmationService.confirm({
      message: `La vigencia de suscripción para ${clientName} (Placas: ${plates}) está vencida. ¿Desea renovar la vigencia para estas placas?`,
      header: 'Vigencia de Suscripción Vencida',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Renovar Vigencia',
      rejectLabel: 'Cancelar'
    })
    .pipe(
      filter((confirmed: boolean) => confirmed),
      switchMap(() => {
        this.loading = true;
        return this.clientService.renewPaymentPeriod(client.clientId!);
      })
    )
    .subscribe({
      next: (updatedClient) => {
        this.loading = false;
        this.notificationService.success(
          `Vigencia de suscripción renovada exitosamente para ${clientName}. Nueva fecha de vigencia: ${this.formatDate(updatedClient.subscriptionValidity)}`,
          'Vigencia Renovada'
        );
        // Actualizar el cliente en la lista
        this.loadClients();
        // Si el formulario está abierto, actualizar el cliente en edición
        if (this.editingClient?.clientId === updatedClient.clientId) {
          this.editingClient = updatedClient;
        }
      },
      error: (err) => {
        this.loading = false;
        this.notificationService.error(
          err?.error?.message || 'Error al renovar la vigencia de suscripción',
          'Error'
        );
      }
    });
  }

  /**
   * Formatea una fecha ISO string a formato dd/MM/yyyy
   */
  formatDate(dateString: string | undefined | null): string {
    if (!dateString) {
      return '-';
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingClient = null;
    this.form.reset();
    // Limpiar el FormArray de placas
    while (this.platesFormArray.length !== 0) {
      this.platesFormArray.removeAt(0);
    }
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Obtener las placas del FormArray y unirlas por comas
    const plates = this.platesFormArray.value
      .map((plate: string) => plate?.trim())
      .filter((plate: string) => plate && plate.length > 0);
    
    const acceptedPlatesString = plates.length > 0 ? plates.join(',') : undefined;

    // Excluir subscriptionValidity y plates del objeto a enviar, y agregar acceptedPlates
    const { subscriptionValidity, plates: formPlates, ...formData } = this.form.value;
    const clientData: Client = {
      ...formData,
      aceptedPlates: acceptedPlatesString
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

