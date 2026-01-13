import { Component, OnDestroy, ChangeDetectorRef } from '@angular/core';
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

  // Propiedades para manejo de imágenes
  selectedImage: File | null = null;
  selectedImagePreview: string | null = null;
  imageEscPosCode: string | null = null;

  constructor(
    private ticketTemplateService: TicketTemplateService,
    private printerService: PrinterService,
    private enumService: EnumService,
    private authService: AuthService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
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
        console.log('Impresoras recibidas del servicio:', printers);
        this.printers = printers || [];
        this.printerOptions = (printers || [])
          .filter(p => p.isActive !== false)
          .map(p => ({
            label: `${p.printerName || 'Sin nombre'} (${p.connectionString || 'N/A'})`,
            value: p.printerId
          }));
        console.log('Opciones de impresoras mapeadas:', this.printerOptions);
        // Forzar detección de cambios para actualizar el selector
        this.cdr.detectChanges();
      },
      error: (err: any) => {
        console.error('Error al cargar impresoras:', err);
        this.printerOptions = [];
        this.printers = [];
        this.cdr.detectChanges();
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
    // Limpiar imagen seleccionada
    this.clearImage();
    // Asegurar que las impresoras estén cargadas antes de abrir el modal
    if (this.printerOptions.length === 0) {
      this.loadPrinters();
    }
    this.showForm = true;
  }

  openEditForm(ticketTemplate: TicketTemplate): void {
    this.editingTicketTemplate = ticketTemplate;

    // Extraer el valor del ticketType (puede ser string o EnumResource)
    const ticketTypeValue = typeof ticketTemplate.ticketType === 'string'
      ? ticketTemplate.ticketType
      : (ticketTemplate.ticketType as any)?.id || '';

    // Deshabilitar paperSize
    this.form.get('paperSize')?.disable();

    // Función para establecer los valores del formulario
    const setFormValues = () => {
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
    };

    // Limpiar imagen seleccionada al editar
    this.clearImage();
    
    // Si ya hay opciones cargadas, establecer valores inmediatamente
    if (this.printerOptions.length > 0) {
      setFormValues();
      this.showForm = true;
    } else {
      // Cargar impresoras y esperar a que se completen antes de establecer valores
      this.loadPrinters();
      // Esperar un momento para que se complete la suscripción
      setTimeout(() => {
        setFormValues();
        this.showForm = true;
      }, 300);
    }
  }

  cancelForm(): void {
    this.showForm = false;
    this.editingTicketTemplate = null;
    this.form.reset();
    // Mantener deshabilitado (se establecerá automáticamente cuando se seleccione una impresora)
    this.form.get('paperSize')?.setValue(null, { emitEvent: false });
    this.form.get('paperSize')?.disable();
    // Limpiar imagen seleccionada
    this.clearImage();
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

  // Reemplazar códigos de imagen ESC/POS con placeholders para facilitar el renderizado
  private replaceImageCodesWithPlaceholders(content: string): string {
    let result = content;
    let i = 0;
    const placeholders: Array<{start: number, end: number, width: number, height: number}> = [];
    
    while (i < content.length) {
      const char = content[i];
      
      // Detectar ESC * (comando de gráficos raster)
      if (char === '\u001B' && i + 1 < content.length && content[i + 1] === '*') {
        const startPos = i;
        i += 2; // ESC *
        
        if (i < content.length) {
          const mode = content.charCodeAt(i++); // m
          if (i + 1 < content.length) {
            const nL = content.charCodeAt(i++); // nL
            const nH = content.charCodeAt(i++); // nH
            const dataLength = nL + (nH << 8);
            
            // Calcular dimensiones aproximadas basadas en el modo y datos
            // Modo 0: 8-dot single-density, 1 píxel por bit
            // Modo 1: 8-dot double-density, 1 píxel por bit (más ancho)
            // Modo 32: 24-dot single-density, 3 píxeles por bit
            // Modo 33: 24-dot double-density, 3 píxeles por bit (más ancho)
            let bytesPerLine = dataLength;
            let width = bytesPerLine * 8;
            let height = 1; // Una línea por comando
            
            // Buscar líneas consecutivas de imágenes para calcular altura
            let nextLineStart = i + dataLength;
            let lineCount = 1;
            while (nextLineStart < content.length && 
                   content[nextLineStart] === '\u001B' && 
                   nextLineStart + 1 < content.length && 
                   content[nextLineStart + 1] === '*') {
              lineCount++;
              nextLineStart += 2; // ESC *
              if (nextLineStart < content.length) {
                nextLineStart++; // m
                if (nextLineStart + 1 < content.length) {
                  const nextNL = content.charCodeAt(nextLineStart++);
                  const nextNH = content.charCodeAt(nextLineStart++);
                  const nextDataLength = nextNL + (nextNH << 8);
                  nextLineStart += nextDataLength;
                }
              }
            }
            
            height = lineCount;
            
            placeholders.push({
              start: startPos,
              end: i + dataLength,
              width: width,
              height: height
            });
            
            i += dataLength;
            continue;
          }
        }
      }
      
      i++;
    }
    
    // Reemplazar desde el final para mantener las posiciones correctas
    for (let j = placeholders.length - 1; j >= 0; j--) {
      const ph = placeholders[j];
      const placeholder = '\uFFFD\uFFFE' + ph.width + ',' + ph.height + '\uFFFF';
      result = result.substring(0, ph.start) + placeholder + result.substring(ph.end);
    }
    
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
    
    // Detectar y reemplazar códigos de imagen ESC/POS con placeholders visuales
    const contentWithImagePlaceholders = this.replaceImageCodesWithPlaceholders(processedContent);

    let html = '';
    let currentStyle = {
      bold: false,
      doubleHeight: false,
      doubleWidth: false,
      align: 'left' // 'left', 'center', 'right'
    };

    let i = 0;
    
    while (i < contentWithImagePlaceholders.length) {
      const char = contentWithImagePlaceholders[i];
      
      // Detectar placeholder de imagen (marcadores especiales)
      if (char === '\uFFFD' && i + 1 < contentWithImagePlaceholders.length && 
          contentWithImagePlaceholders[i + 1] === '\uFFFE') {
        // Encontrar el final del placeholder
        let endIndex = i + 2;
        while (endIndex < contentWithImagePlaceholders.length && 
               contentWithImagePlaceholders[endIndex] !== '\uFFFF') {
          endIndex++;
        }
        
        if (endIndex < contentWithImagePlaceholders.length) {
          // Extraer información de la imagen del placeholder
          const imageInfo = contentWithImagePlaceholders.substring(i + 2, endIndex);
          const [width, height] = imageInfo.split(',').map(Number);
          
          // Mostrar placeholder visual para la imagen
          html += `<div class="image-placeholder" style="width: ${Math.min(width || 200, 300)}px; height: ${Math.min(height || 100, 200)}px; border: 2px dashed #ccc; display: inline-block; margin: 0.5rem 0; background: #f5f5f5; text-align: center; line-height: ${Math.min(height || 100, 200)}px; color: #999; font-size: 0.75rem;">[Imagen ${width || 200}x${height || 100}]</div>`;
          i = endIndex + 1;
          continue;
        }
      }
      
      const charCode = contentWithImagePlaceholders.charCodeAt(i);

      // ESC @ - Inicializar impresora (reset)
      if (char === '\u001B' && i + 1 < contentWithImagePlaceholders.length && contentWithImagePlaceholders[i + 1] === '@') {
        currentStyle = { bold: false, doubleHeight: false, doubleWidth: false, align: 'left' };
        i += 2;
        continue;
      }

      // ESC d - Avanzar líneas
      if (char === '\u001B' && i + 1 < contentWithImagePlaceholders.length && contentWithImagePlaceholders[i + 1] === 'd') {
        const lines = i + 2 < contentWithImagePlaceholders.length ? contentWithImagePlaceholders.charCodeAt(i + 2) : 1;
        html += '<br>'.repeat(Math.max(1, lines));
        i += 3;
        continue;
      }

      // ESC a - Justificación (0=izquierda, 1=centro, 2=derecha)
      if (char === '\u001B' && i + 1 < contentWithImagePlaceholders.length && contentWithImagePlaceholders[i + 1] === 'a') {
        const alignCode = i + 2 < contentWithImagePlaceholders.length ? contentWithImagePlaceholders.charCodeAt(i + 2) : 0;
        if (alignCode === 0) currentStyle.align = 'left';
        else if (alignCode === 1) currentStyle.align = 'center';
        else if (alignCode === 2) currentStyle.align = 'right';
        i += 3;
        continue;
      }

      // ESC ! - Formato de texto
      if (char === '\u001B' && i + 1 < contentWithImagePlaceholders.length && contentWithImagePlaceholders[i + 1] === '!') {
        const formatCode = i + 2 < contentWithImagePlaceholders.length ? contentWithImagePlaceholders.charCodeAt(i + 2) : 0;
        currentStyle.bold = (formatCode & 0x08) !== 0;
        currentStyle.doubleHeight = (formatCode & 0x10) !== 0;
        currentStyle.doubleWidth = (formatCode & 0x20) !== 0;
        i += 3;
        continue;
      }

      // GS V - Corte de papel (ignorar para preview)
      if (char === '\u001D' && i + 1 < contentWithImagePlaceholders.length && contentWithImagePlaceholders[i + 1] === 'V') {
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

        while (i < contentWithImagePlaceholders.length) {
          const currentChar = contentWithImagePlaceholders[i];
          const currentCharCode = contentWithImagePlaceholders.charCodeAt(i);

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

  // Métodos para manejo de imágenes
  selectImageFile(): void {
    const fileInput = document.getElementById('imageUpload') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validar tipo de archivo
      if (!file.type.match(/^image\/(png|jpeg|jpg|gif)$/)) {
        this.error = 'Por favor seleccione una imagen válida (PNG, JPG, GIF)';
        return;
      }

      // Validar tamaño (máximo 2MB)
      if (file.size > 2 * 1024 * 1024) {
        this.error = 'La imagen es demasiado grande. Máximo 2MB';
        return;
      }

      this.selectedImage = file;
      
      // Crear vista previa
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.selectedImagePreview = e.target.result;
        // Convertir a ESC/POS
        this.convertImageToEscPos(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  }

  clearImage(): void {
    this.selectedImage = null;
    this.selectedImagePreview = null;
    this.imageEscPosCode = null;
  }

  insertImageIntoTemplate(): void {
    if (!this.imageEscPosCode) {
      this.error = 'No hay imagen para insertar';
      return;
    }

    const templateControl = this.form.get('template');
    if (!templateControl) return;

    const currentTemplate = templateControl.value || '';
    const imageCode = this.imageEscPosCode; // Guardar en variable local para evitar problemas de null
    
    // Usar setTimeout para asegurar que el DOM esté actualizado
    setTimeout(() => {
      const textarea = document.getElementById('template') as HTMLTextAreaElement;
      const cursorPosition = textarea ? (textarea.selectionStart || 0) : currentTemplate.length;
      
      // Insertar el código ESC/POS de la imagen en la posición del cursor
      const newTemplate = 
        currentTemplate.slice(0, cursorPosition) + 
        '\n' + imageCode + '\n' +
        currentTemplate.slice(cursorPosition);
      
      templateControl.setValue(newTemplate);
      
      // Restaurar el cursor después de la inserción
      setTimeout(() => {
        if (textarea) {
          const newPosition = cursorPosition + imageCode.length + 2; // +2 por los \n
          textarea.setSelectionRange(newPosition, newPosition);
          textarea.focus();
        }
      }, 0);
      
      this.error = null;
    }, 0);
  }

  private convertImageToEscPos(imageDataUrl: string): void {
    const img = new Image();
    img.onload = () => {
      try {
        // Obtener el ancho máximo según el tamaño de papel
        const paperSize = this.form.get('paperSize')?.value || 'E58MM';
        const maxWidth = paperSize.includes('80') || paperSize === 'E80MM' ? 400 : 300;
        
        // Redimensionar imagen si es necesario
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          this.error = 'Error al procesar la imagen';
          return;
        }

        // Dibujar imagen en canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convertir a escala de grises y luego a bitmap (1 bit por píxel)
        const imageData = ctx.getImageData(0, 0, width, height);
        const bitmap = this.imageDataToBitmap(imageData);
        
        // Generar código ESC/POS
        this.imageEscPosCode = this.bitmapToEscPos(bitmap, width, height);
        this.error = null;
      } catch (error) {
        console.error('Error al convertir imagen:', error);
        this.error = 'Error al procesar la imagen';
      }
    };
    
    img.onerror = () => {
      this.error = 'Error al cargar la imagen';
    };
    
    img.src = imageDataUrl;
  }

  private imageDataToBitmap(imageData: ImageData): boolean[] {
    const bitmap: boolean[] = [];
    const data = imageData.data;
    
    for (let i = 0; i < data.length; i += 4) {
      // Convertir RGB a escala de grises
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const gray = (r * 0.299 + g * 0.587 + b * 0.114);
      
      // Umbral: si es más oscuro que 128, es negro (true), si no es blanco (false)
      bitmap.push(gray < 128);
    }
    
    return bitmap;
  }

  private bitmapToEscPos(bitmap: boolean[], width: number, height: number): string {
    // ESC/POS comando para imprimir gráficos raster: ESC * m nL nH d1...dk
    // m = modo (0 = 8-dot single-density, 1 = 8-dot double-density, 32 = 24-dot single-density, 33 = 24-dot double-density)
    // nL, nH = bytes de datos (little-endian)
    // d1...dk = datos de la imagen
    
    const bytesPerLine = Math.ceil(width / 8);
    const totalBytes = bytesPerLine * height;
    
    // Convertir bitmap a bytes (8 píxeles por byte)
    const imageBytes: number[] = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < bytesPerLine; x++) {
        let byte = 0;
        for (let bit = 0; bit < 8; bit++) {
          const pixelX = x * 8 + bit;
          if (pixelX < width) {
            const index = y * width + pixelX;
            if (bitmap[index]) {
              byte |= (1 << (7 - bit)); // MSB primero
            }
          }
        }
        imageBytes.push(byte);
      }
    }
    
    // Generar código ESC/POS
    // Usar modo 0 (8-dot single-density) para mejor compatibilidad
    let escPosCode = '\u001B@'; // Inicializar impresora
    escPosCode += '\u001Ba\u0001'; // Centrar
    
    // Imprimir línea por línea para mejor control
    for (let y = 0; y < height; y++) {
      const lineStart = y * bytesPerLine;
      const lineBytes = imageBytes.slice(lineStart, lineStart + bytesPerLine);
      const nL = lineBytes.length & 0xFF;
      const nH = (lineBytes.length >> 8) & 0xFF;
      
      // ESC * m nL nH d1...dk
      escPosCode += '\u001B*' + String.fromCharCode(0) + String.fromCharCode(nL) + String.fromCharCode(nH);
      escPosCode += String.fromCharCode(...lineBytes);
      escPosCode += '\n'; // Avanzar línea
    }
    
    escPosCode += '\u001Ba\u0000'; // Volver a alineación izquierda
    
    return escPosCode;
  }
}

