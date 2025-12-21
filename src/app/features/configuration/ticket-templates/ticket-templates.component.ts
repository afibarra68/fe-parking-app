import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TicketTemplateService, TicketTemplate, TicketTemplatePageResponse } from '../../../core/services/ticket-template.service';
import { PrinterService, Printer } from '../../../core/services/printer.service';
import { EnumService, EnumResource } from '../../../core/services/enum.service';
import { AuthService } from '../../../core/services/auth.service';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { SharedModule } from '../../../shared/shared-module';
import { SelectItem } from 'primeng/api';
import { TableColumn } from '../../../shared/components/table/table.component';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable, Subscription, debounceTime, distinctUntilChanged } from 'rxjs';
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
  private printerSubscription?: Subscription;

  // Lista de impresoras
  printers: Printer[] = [];
  printerOptions: SelectItem[] = [];

  ticketTypes: SelectItem[] = [];

  paperSizes: SelectItem[] = [];

  // Configuración de columnas para la tabla
  cols: TableColumn[] = [
    { field: 'ticketTypeDisplay', header: 'Tipo Tirilla', width: '180px' },
    { field: 'template', header: 'Template Excel POS', width: '400px' }
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
    private authService: AuthService,
    private fb: FormBuilder
  ) {
    this.form = this.fb.group({
      printerPrinterId: [null], // Relación con la impresora
      ticketType: ['', [Validators.required]],
      template: ['', [Validators.required]],
      paperSize: [{ value: null, disabled: true }, [Validators.required]] // Tamaño de papel deshabilitado, se establece desde la impresora
    });

    this.searchForm = this.fb.group({
      ticketType: ['']
    });
  }

  ngOnInit(): void {
    this.loadTicketTypes();
    this.loadPaperSizes();
    this.loadPrinters();
    this.loadTicketTemplates();
    this.setupPrinterChangeListener();
  }

  loadPaperSizes(): void {
    this.enumService.getEnumByName('ELargeVariableTicket').subscribe({
      next: (sizes: EnumResource[]) => {
        this.paperSizes = sizes.map(size => ({
          label: size.description || size.id,
          value: size.id
        }));
      },
      error: (err: any) => {
        console.error('Error al cargar tamaños de papel:', err);
        // Fallback a valores hardcodeados si falla
        this.paperSizes = [
          { label: 'E58MM', value: 'E58MM' },
          { label: 'E80MM', value: 'E80MM' }
        ];
      }
    });
  }

  // Configurar listener para cuando cambie la impresora seleccionada
  setupPrinterChangeListener(): void {
    this.form.get('printerPrinterId')?.valueChanges.subscribe((printerId: number | null) => {
      if (printerId) {
        const selectedPrinter = this.printers.find(p => p.printerId === printerId);
        if (selectedPrinter && selectedPrinter.paperType) {
          // Extraer el valor del paperType (puede ser string o EnumResource)
          let paperTypeValue: string = '';
          if (typeof selectedPrinter.paperType === 'string') {
            paperTypeValue = selectedPrinter.paperType;
          } else {
            // Si es EnumResource, extraer el id
            paperTypeValue = (selectedPrinter.paperType as any)?.id || '';
          }

          // Establecer el valor del enum directamente (E58MM, E80MM, etc.)
          if (paperTypeValue) {
            this.form.get('paperSize')?.setValue(paperTypeValue, { emitEvent: false });
          }
        }
      } else {
        // Si no hay impresora seleccionada, limpiar el valor
        this.form.get('paperSize')?.setValue(null, { emitEvent: false });
      }
    });
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
    if (this.printerSubscription) {
      this.printerSubscription.unsubscribe();
    }
    this.tableDataSubject.complete();
  }

  // Cargar impresoras filtradas por compañía del usuario autenticado
  loadPrinters(): void {
    if (this.printerSubscription) {
      this.printerSubscription.unsubscribe();
    }

    const userData = this.authService.getUserData();
    const companyId = userData?.companyId;

    this.printerSubscription = this.printerService.getQueryable({
      companyCompanyId: companyId || undefined
    }).subscribe({
      next: (printers: Printer[]) => {
        this.printers = printers;
        this.printerOptions = printers
          .filter(p => p.isActive !== false)
          .map(p => ({
            label: `${p.printerName} (${p.connectionString || 'N/A'})`,
            value: p.printerId
          }));
      },
      error: (err: any) => {
        console.error('Error al cargar impresoras:', err);
        this.printerOptions = [];
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

  openCreateForm(): void {
    this.editingTicketTemplate = null;
    this.form.reset();
    // Deshabilitar paperSize (se establecerá automáticamente cuando se seleccione una impresora)
    this.form.get('paperSize')?.setValue(null, { emitEvent: false });
    this.form.get('paperSize')?.disable();
    this.printerOptions = []; // Limpiar opciones de impresoras
    this.showForm = true;
  }

  openEditForm(ticketTemplate: TicketTemplate): void {
    this.editingTicketTemplate = ticketTemplate;

    // Extraer el valor del ticketType (puede ser string o EnumResource)
    const ticketTypeValue = typeof ticketTemplate.ticketType === 'string'
      ? ticketTemplate.ticketType
      : (ticketTemplate.ticketType as any)?.id || '';

    // Cargar impresoras para asegurar que estén disponibles
    this.loadPrinters();

    // Deshabilitar paperSize
    this.form.get('paperSize')?.disable();

    // Esperar a que se carguen las impresoras antes de establecer los valores
    setTimeout(() => {
      this.form.patchValue({
        ticketType: ticketTypeValue,
        template: ticketTemplate.template || '',
        printerPrinterId: ticketTemplate.printerPrinterId || null
      });

      // El paperSize se establecerá automáticamente cuando se establezca la impresora
      // Si ya hay una impresora seleccionada, actualizar el paperSize manualmente
      if (ticketTemplate.printerPrinterId) {
        const selectedPrinter = this.printers.find(p => p.printerId === ticketTemplate.printerPrinterId);
        if (selectedPrinter && selectedPrinter.paperType) {
          let paperTypeValue: string = '';
          if (typeof selectedPrinter.paperType === 'string') {
            paperTypeValue = selectedPrinter.paperType;
          } else {
            paperTypeValue = (selectedPrinter.paperType as any)?.id || '';
          }

          // Establecer el valor del enum directamente
          if (paperTypeValue) {
            this.form.get('paperSize')?.setValue(paperTypeValue, { emitEvent: false });
          }
        }
      }
    }, 500);

    this.showForm = true;
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingTicketTemplate = null;
    this.form.reset();
    // Mantener deshabilitado (se establecerá automáticamente cuando se seleccione una impresora)
    this.form.get('paperSize')?.setValue(null, { emitEvent: false });
    this.form.get('paperSize')?.disable();
    this.printerOptions = []; // Limpiar opciones de impresoras
  }

  submitForm(): void {
    if (this.form.invalid) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Usar getRawValue() para incluir campos deshabilitados (como paperSize)
    const ticketTemplateData: TicketTemplate = {
      ...this.form.getRawValue()
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
        // Mantener paperSize deshabilitado después del reset
        this.form.get('paperSize')?.setValue(null, { emitEvent: false });
        this.form.get('paperSize')?.disable();
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

  // Obtener el ancho del preview según el tamaño de papel
  getPreviewWidth(): string {
    const paperSize = this.form.get('paperSize')?.value;
    if (!paperSize) {
      return '58mm'; // Valor por defecto
    }

    // Convertir el valor del enum a formato de visualización (E58MM -> 58mm, E80MM -> 80mm)
    if (paperSize.includes('58') || paperSize === 'E58MM') {
      return '58mm';
    } else if (paperSize.includes('80') || paperSize === 'E80MM') {
      return '80mm';
    }

    // Si no coincide, buscar en paperSizes para obtener la descripción
    const paperSizeOption = this.paperSizes.find(p => p.value === paperSize);
    if (paperSizeOption) {
      return paperSizeOption.label || '58mm';
    }

    return '58mm'; // Valor por defecto
  }

  // Procesar el template y reemplazar placeholders con datos de ejemplo
  getPreviewContent(): string {
    const template = this.form.get('template')?.value || '';
    if (!template) {
      return 'Ingrese el template para ver la vista previa';
    }

    // Datos de ejemplo para el preview
    const sampleData: { [key: string]: string } = {
      '{des_empresa}': 'EMPRESA EJEMPLO S.A.',
      '{des_nit}': '900123456-7',
      '{des_placa}': 'ABC123',
      '{des_fecha}': new Date().toLocaleDateString('es-CO'),
      '{des_hora}': new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      '{des_hora_ingreso}': new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      '{des_hora_salida}': new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      '{des_fecha_salida}': new Date().toLocaleDateString('es-CO'),
      '{des_tiempo_transcurrido}': '2:30',
      '{des_tipo_vehiculo}': 'Automóvil',
      '{des_tiempo}': '2:30',
      '{des_monto}': '$15.000',
      '{des_total}': '$15.000',
      '{valor_total}': '$15.000',
      '{des_descuento}': '$0',
      '{des_vendedor}': 'Carlos Asesor',
      '{des_espacios}': 'B12',
      '{des_observaciones}': 'Sin observaciones'
    };

    let preview = template;
    // Reemplazar placeholders
    Object.keys(sampleData).forEach(key => {
      const regex = new RegExp(key.replace(/[{}]/g, '\\$&'), 'g');
      preview = preview.replace(regex, sampleData[key]);
    });

    return preview;
  }

  // Convertir strings literales de escape a caracteres reales
  private convertEscapeSequences(text: string): string {
    // Reemplazar secuencias de escape literales por caracteres reales
    // Primero los más específicos, luego los generales
    let result = text;

    // Secuencias Unicode escapadas
    result = result.replace(/\\u001B/g, '\u001B');  // ESC
    result = result.replace(/\\u001D/g, '\u001D');  // GS
    result = result.replace(/\\u000A/g, '\n');     // LF
    result = result.replace(/\\u000D/g, '\r');     // CR
    result = result.replace(/\\u0002/g, '\u0002'); // STX
    result = result.replace(/\\u0001/g, '\u0001'); // SOH

    // Secuencias de escape comunes
    result = result.replace(/\\n/g, '\n');         // \n literal
    result = result.replace(/\\r/g, '\r');       // \r literal
    result = result.replace(/\\t/g, '\t');       // \t literal

    // Si todavía hay secuencias \uXXXX sin procesar, intentar convertirlas
    result = result.replace(/\\u([0-9a-fA-F]{4})/g, (match, hex) => {
      return String.fromCharCode(parseInt(hex, 16));
    });

    return result;
  }

  // Convertir template con ESC/POS a HTML para visualización
  getPreviewHTML(): string {
    const content = this.getPreviewContent();
    if (!content || content === 'Ingrese el template para ver la vista previa') {
      return content;
    }

    // Convertir secuencias de escape literales a caracteres reales
    const processedContent = this.convertEscapeSequences(content);

    let html = '';
    let currentStyle = {
      bold: false,
      doubleHeight: false,
      doubleWidth: false,
      align: 'left' // 'left', 'center', 'right'
    };

    let i = 0;
    while (i < processedContent.length) {
      const char = processedContent[i];
      const charCode = processedContent.charCodeAt(i);

      // ESC @ - Inicializar impresora (reset)
      if (char === '\u001B' && i + 1 < processedContent.length && processedContent[i + 1] === '@') {
        currentStyle = { bold: false, doubleHeight: false, doubleWidth: false, align: 'left' };
        i += 2;
        continue;
      }

      // ESC d - Avanzar líneas
      if (char === '\u001B' && i + 1 < processedContent.length && processedContent[i + 1] === 'd') {
        const lines = i + 2 < processedContent.length ? processedContent.charCodeAt(i + 2) : 1;
        html += '<br>'.repeat(Math.max(1, lines));
        i += 3;
        continue;
      }

      // ESC a - Justificación (0=izquierda, 1=centro, 2=derecha)
      if (char === '\u001B' && i + 1 < processedContent.length && processedContent[i + 1] === 'a') {
        const alignCode = i + 2 < processedContent.length ? processedContent.charCodeAt(i + 2) : 0;
        if (alignCode === 0) currentStyle.align = 'left';
        else if (alignCode === 1) currentStyle.align = 'center';
        else if (alignCode === 2) currentStyle.align = 'right';
        i += 3;
        continue;
      }

      // ESC ! - Formato de texto
      if (char === '\u001B' && i + 1 < processedContent.length && processedContent[i + 1] === '!') {
        const formatCode = i + 2 < processedContent.length ? processedContent.charCodeAt(i + 2) : 0;
        currentStyle.bold = (formatCode & 0x08) !== 0;
        currentStyle.doubleHeight = (formatCode & 0x10) !== 0;
        currentStyle.doubleWidth = (formatCode & 0x20) !== 0;
        i += 3;
        continue;
      }

      // GS V - Corte de papel (ignorar para preview)
      if (char === '\u001D' && i + 1 < processedContent.length && processedContent[i + 1] === 'V') {
        i += 3;
        continue;
      }

      // LF - Line feed
      if (char === '\n' || char === '\u000A') {
        html += '<br>';
        i++;
        continue;
      }

      // CR - Carriage return (ignorar)
      if (char === '\r' || char === '\u000D') {
        i++;
        continue;
      }

      // STX, SOH - Control characters (ignorar)
      if (char === '\u0002' || char === '\u0001') {
        i++;
        continue;
      }

      // Carácter normal - aplicar estilos
      if (char !== '\u001B' && char !== '\u001D' && charCode >= 32) {
        // Agrupar caracteres consecutivos con los mismos estilos
        let textGroup = '';
        let groupStart = i;
        const groupStyle = { ...currentStyle };

        while (i < processedContent.length) {
          const currentChar = processedContent[i];
          const currentCharCode = processedContent.charCodeAt(i);

          // Si encontramos un código de control o cambio de estilo, salir
          if (currentChar === '\u001B' || currentChar === '\u001D' ||
            currentChar === '\n' || currentChar === '\r' ||
            currentCharCode < 32) {
            break;
          }

          textGroup += currentChar;
          i++;
        }

        i--; // Retroceder uno porque el while avanzó de más

        if (textGroup.length > 0) {
          const styleClasses: string[] = [];
          if (groupStyle.bold) styleClasses.push('esc-bold');
          if (groupStyle.doubleHeight) styleClasses.push('esc-double-height');
          if (groupStyle.doubleWidth) styleClasses.push('esc-double-width');

          const classAttr = styleClasses.length > 0 ? ` class="${styleClasses.join(' ')}"` : '';

          if (groupStyle.align !== 'left') {
            // Para texto centrado o alineado a la derecha, usar div
            html += `<div${classAttr} style="text-align: ${groupStyle.align}; width: 100%;">${this.escapeHtml(textGroup)}</div>`;
          } else if (classAttr) {
            // Para texto con estilos pero alineado a la izquierda, usar span
            html += `<span${classAttr}>${this.escapeHtml(textGroup)}</span>`;
          } else {
            // Texto normal sin estilos
            html += this.escapeHtml(textGroup);
          }
        }
      }

      i++;
    }

    return html || 'Template procesado (sin texto visible)';
  }

  // Escapar HTML para seguridad
  private escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
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

