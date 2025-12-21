import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { PrinterService, Printer, PrinterPageResponse } from '../../../core/services/printer.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { CheckboxModule } from 'primeng/checkbox';
import { SharedModule } from '../../../shared/shared-module';
import { SelectItem } from 'primeng/api';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { OnInit } from '@angular/core';

@Component({
  selector: 'app-printers',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    DialogModule,
    MessageModule,
    CheckboxModule,
    SharedModule
  ],
  templateUrl: './printers.component.html',
  styleUrls: ['./printers.component.scss']
})
export class PrintersComponent implements OnInit, OnDestroy {
  loading = false;
  showForm = false;
  editingPrinter: Printer | null = null;
  error: string | null = null;
  
  // Paginación
  page: number = 0;
  size: number = environment.rowsPerPage || 10;
  first = 0;
  
  private subscription?: Subscription;

  // Opciones para selects
  printerTypes: SelectItem[] = [];
  paperTypes: SelectItem[] = [];

  statusOptions: SelectItem[] = [
    { label: 'Activo', value: true },
    { label: 'Inactivo', value: false }
  ];

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'printerId', header: 'ID', width: '80px' },
    { field: 'printerName', header: 'Nombre', width: '200px' },
    { field: 'printerTypeDisplay', header: 'Tipo', width: '120px' },
    { field: 'paperTypeDisplay', header: 'Tipo Papel', width: '120px' },
    { field: 'connectionString', header: 'Conexión', width: '200px' },
    { field: 'isActive', header: 'Activo', width: '100px' }
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
    private printerService: PrinterService,
    private enumService: EnumService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      printerName: ['', [Validators.required]],
      printerType: ['', [Validators.required]],
      paperType: ['', [Validators.required]],
      connectionString: ['', [Validators.required]],
      isActive: [true],
      companyCompanyId: [null],
      userUserId: [null]
    });

    this.searchForm = this.fb.group({
      printerName: [''],
      printerType: [''],
      isActive: [null]
    });
  }

  ngOnInit(): void {
    this.loadPrinterTypes();
    this.loadPaperTypes();
    this.loadPrinters();
  }

  loadPrinterTypes(): void {
    this.enumService.getEnumByName('EPrinterType').subscribe({
      next: (types: EnumResource[]) => {
        this.printerTypes = types.map(type => ({
          label: type.description || type.id,
          value: type.id
        }));
      },
      error: (err: any) => {
        console.error('Error al cargar tipos de impresora:', err);
        // Fallback a valores hardcodeados si falla
        this.printerTypes = [
          { label: 'COM', value: 'COM' },
          { label: 'WINDOWS', value: 'WINDOWS' },
          { label: 'NETWORK', value: 'NETWORK' }
        ];
      }
    });
  }

  loadPaperTypes(): void {
    this.enumService.getEnumByName('ELargeVariableTicket').subscribe({
      next: (types: EnumResource[]) => {
        this.paperTypes = types.map(type => ({
          label: type.description || type.id,
          value: type.id
        }));
      },
      error: (err: any) => {
        console.error('Error al cargar tipos de papel:', err);
        // Fallback a valores hardcodeados si falla
        this.paperTypes = [
          { label: '58mm', value: 'E58MM' },
          { label: '88mm', value: 'E88MM' }
        ];
      }
    });
  }

  loadPrinters(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }

    this.loading = true;
    this.error = null;
    
    const filters: any = {
      printerName: this.searchForm.value.printerName?.trim() || undefined,
      printerType: this.searchForm.value.printerType || undefined,
      isActive: this.searchForm.value.isActive !== null ? this.searchForm.value.isActive : undefined
    };
    
    this.subscription = this.printerService.getPageable(this.page, this.size, filters)
      .subscribe({
        next: (data: PrinterPageResponse) => {
          // Formatear printerType y paperType para mostrar descripciones en la tabla
          const formattedData = data.content.map(printer => ({
            ...printer,
            printerTypeDisplay: this.getPrinterTypeDisplay(printer.printerType),
            paperTypeDisplay: this.getPaperTypeDisplay(printer.paperType)
          }));
          this.tableDataSubject.next({
            data: formattedData,
            totalRecords: data.totalElements,
            isFirst: this.page === 0
          });
          this.loading = false;
        },
        error: (err: any) => {
          this.error = err?.error?.message || err?.message || 'Error al cargar las impresoras';
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
    this.editingPrinter = null;
    this.form.reset();
    this.form.patchValue({ isActive: true });
    this.showForm = true;
  }

  openEditForm(printer: Printer): void {
    this.editingPrinter = printer;
    // Extraer el valor del printerType (puede ser string o EnumResource)
    const printerTypeValue = typeof printer.printerType === 'string' 
      ? printer.printerType 
      : (printer.printerType as any)?.id || '';
    
    // Extraer el valor del paperType (puede ser string o EnumResource)
    const paperTypeValue = typeof printer.paperType === 'string' 
      ? printer.paperType 
      : (printer.paperType as any)?.id || '';
    
    this.form.patchValue({
      printerName: printer.printerName || '',
      printerType: printerTypeValue,
      paperType: paperTypeValue,
      connectionString: printer.connectionString || '',
      isActive: printer.isActive !== undefined ? printer.isActive : true,
      companyCompanyId: printer.companyCompanyId || null,
      userUserId: printer.userUserId || null
    });
    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingPrinter = null;
    this.form.reset();
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    const printerData: Printer = {
      ...this.form.value
    };

    if (this.editingPrinter?.printerId) {
      printerData.printerId = this.editingPrinter.printerId;
    }

    const operation = this.editingPrinter
      ? this.printerService.update(printerData)
      : this.printerService.create(printerData);

    operation.subscribe({
      next: () => {
        this.loading = false;
        this.showForm = false;
        this.editingPrinter = null;
        this.form.reset();
        this.loadPrinters();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al guardar la impresora';
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
    this.loadPrinters();
  }

  getPrinterTypeDisplay(printerType: string | EnumResource | undefined): string {
    if (!printerType) return '';
    if (typeof printerType === 'string') {
      // Buscar la descripción en printerTypes
      const typeOption = this.printerTypes.find(t => t.value === printerType);
      return typeOption?.label || printerType;
    }
    // Si es EnumResource
    return (printerType as EnumResource).description || (printerType as EnumResource).id || '';
  }

  getPaperTypeDisplay(paperType: string | EnumResource | undefined): string {
    if (!paperType) return '';
    if (typeof paperType === 'string') {
      // Buscar la descripción en paperTypes
      const typeOption = this.paperTypes.find(t => t.value === paperType);
      return typeOption?.label || paperType;
    }
    // Si es EnumResource
    return (paperType as EnumResource).description || (paperType as EnumResource).id || '';
  }
}

