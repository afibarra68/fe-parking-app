import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketTemplateService, TicketTemplate, TicketTemplatePageResponse } from '../../../core/services/ticket-template.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { SelectItem } from 'primeng/api';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-ticket-templates',
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
  templateUrl: './ticket-templates.component.html',
  styleUrls: ['./ticket-templates.component.scss']
})
export class TicketTemplatesComponent implements OnInit, OnDestroy {
  loading = false;
  showForm = false;
  editingTicketTemplate: TicketTemplate | null = null;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;

  // Opciones para selects
  printerTypes: SelectItem[] = [
    { label: 'COM', value: 'COM' },
    { label: 'WINDOWS', value: 'WINDOWS' },
    { label: 'NETWORK', value: 'NETWORK' }
  ];

  ticketTypes: SelectItem[] = [
    { label: 'INGRESO', value: 'INGRESO' },
    { label: 'SALIDA', value: 'SALIDA' },
    { label: 'FACTURA', value: 'FACTURA' },
    { label: 'COMPROBANTE_INGRESO', value: 'COMPROBANTE_INGRESO' }
  ];

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'ticketTemplateId', header: 'ID', width: '80px' },
    { field: 'printerType', header: 'Tipo Impresora', width: '150px' },
    { field: 'ticketType', header: 'Tipo Tirilla', width: '180px' },
    { field: 'template', header: 'Template', width: '200px' }
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
    private ticketTemplateService: TicketTemplateService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      template: [''],
      printerType: ['', [Validators.required]],
      ticketType: ['', [Validators.required]],
      invoice: [''],
      entryReceipt: [''],
      companyCompanyId: [null],
      userUserId: [null]
    });

    this.searchForm = this.fb.group({
      printerType: [''],
      ticketType: ['']
    });
  }

  ngOnInit(): void {
    this.loadTicketTemplates();
  }

  loadTicketTemplates(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters: any = {
      printerType: this.searchForm.value.printerType || undefined,
      ticketType: this.searchForm.value.ticketType || undefined
    };
    
    this.subscription = this.ticketTemplateService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: TicketTemplatePageResponse) => {
          this.tableDataSubject.next({
            data: data.content,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las plantillas de tirilla';
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
    this.editingTicketTemplate = null;
    this.form.reset();
    this.showForm = true;
  }

  openEditForm(ticketTemplate: TicketTemplate): void {
    this.editingTicketTemplate = ticketTemplate;
    this.form.patchValue({
      template: ticketTemplate.template || '',
      printerType: ticketTemplate.printerType || '',
      ticketType: ticketTemplate.ticketType || '',
      invoice: ticketTemplate.invoice || '',
      entryReceipt: ticketTemplate.entryReceipt || '',
      companyCompanyId: ticketTemplate.companyCompanyId || null,
      userUserId: ticketTemplate.userUserId || null
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingTicketTemplate = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const ticketTemplateData: TicketTemplate = {
      ...this.form.value
    };

    if (this.editingTicketTemplate?.ticketTemplateId) {
      ticketTemplateData.ticketTemplateId = this.editingTicketTemplate.ticketTemplateId;
    }

    const operation = this.editingTicketTemplate
      ? this.ticketTemplateService.update(ticketTemplateData)
      : this.ticketTemplateService.create(ticketTemplateData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingTicketTemplate = null;
        this.form.reset();
        this.loadTicketTemplates();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar la plantilla de tirilla';
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
    this.loadTicketTemplates();
  }
}

