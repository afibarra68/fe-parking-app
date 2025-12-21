import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketTemplateService, TicketTemplate, TicketTemplatePageResponse } from '../../../core/services/ticket-template.service';
import { PrinterService } from '../../../core/services/printer.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
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
  ticketTypes: SelectItem[] = [];

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'ticketTemplateId', header: 'ID', width: '80px' },
    { field: 'ticketTypeDisplay', header: 'Tipo Tirilla', width: '180px' },
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
    private printerService: PrinterService,
    private enumService: EnumService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      template: [''],
      ticketType: ['', [Validators.required]],
      invoice: [''],
      entryReceipt: [''],
      companyCompanyId: [null],
      userUserId: [null]
    });

    this.searchForm = this.fb.group({
      ticketType: ['']
    });
  }

  ngOnInit(): void {
    this.loadTicketTypes();
    this.loadTicketTemplates();
  }

  loadTicketTypes(): void {
    this.enumService.getEnumByName('ETicketType').subscribe({
      next: (types: EnumResource[]) => {
        this.ticketTypes = types.map(type => ({
          label: type.description || type.id,
          value: type.id
        }));
      },
      error: (err: any) => {
        console.error('Error al cargar tipos de tirilla:', err);
        // Fallback a valores hardcodeados si falla
        this.ticketTypes = [
          { label: 'ENTRANCE', value: 'ENTRANCE' },
          { label: 'LEAVING_PARKING', value: 'LEAVING_PARKING' },
          { label: 'INVOICE_FINAL', value: 'INVOICE_FINAL' }
        ];
      }
    });
  }

  loadTicketTemplates(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters: any = {
      ticketType: this.searchForm.value.ticketType || undefined
    };
    
    this.subscription = this.ticketTemplateService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: TicketTemplatePageResponse) => {
          // Formatear ticketType para mostrar descripciones en la tabla
          const formattedData = data.content.map(template => ({
            ...template,
            ticketTypeDisplay: this.getTicketTypeDisplay(template.ticketType)
          }));
          this.tableDataSubject.next({
            data: formattedData,
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
    
    // Extraer el valor del ticketType (puede ser string o EnumResource)
    const ticketTypeValue = typeof ticketTemplate.ticketType === 'string' 
      ? ticketTemplate.ticketType 
      : (ticketTemplate.ticketType as any)?.id || '';
    
    this.form.patchValue({
      template: ticketTemplate.template || '',
      ticketType: ticketTypeValue,
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

  getTicketTypeDisplay(ticketType: string | EnumResource | undefined): string {
    if (!ticketType) return '';
    if (typeof ticketType === 'string') {
      // Buscar la descripción en ticketTypes
      const typeOption = this.ticketTypes.find(t => t.value === ticketType);
      return typeOption?.label || ticketType;
    }
    // Si es EnumResource
    return (ticketType as EnumResource).description || (ticketType as EnumResource).id || '';
  }
}

