# backend/utils/pdf_generator.py
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.platypus import Table, TableStyle
from datetime import datetime
import tempfile

def generar_comprobante_pago(pago, solicitud, artesano, usuario, rubro, parcelas):
    """
    Genera un comprobante de pago en PDF - VERSIÓN CORREGIDA
    """
    try:
        # Crear archivo temporal
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
        pdf_path = temp_file.name
        
        # Crear canvas PDF
        c = canvas.Canvas(pdf_path, pagesize=A4)
        width, height = A4
        
        # ============ CONFIGURACIONES ============
        margin = 50
        current_y = height - margin
        
        # ============ ENCABEZADO ============
        # Fondo verde
        c.setFillColor(HexColor("#2E7D32"))
        c.rect(0, height - 80, width, 80, fill=1, stroke=0)
        
        # Título principal
        c.setFillColorRGB(1, 1, 1)  # Blanco
        c.setFont("Helvetica-Bold", 22)
        c.drawCentredString(width/2, height - 50, "FERIA ARTESANAL")
        
        c.setFont("Helvetica", 12)
        c.drawCentredString(width/2, height - 70, "Comprobante de Pago")
        
        current_y = height - 100
        
        # ============ INFORMACIÓN DEL COMPROBANTE ============
        c.setFillColor(HexColor("#1B5E20"))
        c.setFont("Helvetica-Bold", 14)
        c.drawString(margin, current_y, "COMPROBANTE DE PAGO EXITOSO")
        current_y -= 20
        
        # Línea separadora
        c.setStrokeColor(HexColor("#1B5E20"))
        c.setLineWidth(1)
        c.line(margin, current_y, width - margin, current_y)
        current_y -= 30
        
        # ============ INFORMACIÓN BÁSICA ============
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 10)
        
        # Datos en dos columnas
        datos_basicos = [
            ["COMPROBANTE N°:", f"PF-{pago.pago_id:06d}"],
            ["FECHA:", datetime.now().strftime('%d/%m/%Y %H:%M')],
            ["ARTESANO:", artesano.nombre],
            ["DNI:", artesano.dni],
            ["EMAIL:", usuario.email],
            ["TELÉFONO:", artesano.telefono],
            ["RUBRO:", rubro.tipo],
        ]
        
        # Dibujar datos básicos
        for label, value in datos_basicos:
            c.drawString(margin, current_y, label)
            c.drawString(margin + 150, current_y, value)
            current_y -= 20
        
        current_y -= 10  # Espacio
        
        # ============ DETALLE DEL PAGO ============
        c.setFillColor(HexColor("#1B5E20"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(margin, current_y, "DETALLE DEL PAGO")
        current_y -= 15
        
        # Línea
        c.setStrokeColor(HexColor("#CCCCCC"))
        c.setLineWidth(0.5)
        c.line(margin, current_y, width - margin, current_y)
        current_y -= 20
        
        c.setFillColorRGB(0, 0, 0)
        c.setFont("Helvetica", 10)
        
        # Items del pago
        items = [
            ["DESCRIPCIÓN", "CANTIDAD", "PRECIO UNITARIO", "TOTAL"],
            [f"Reserva de parcela(s) - {rubro.tipo}", 
             f"{pago.parcelas_calculadas}", 
             f"$ {float(rubro.precio_parcela):,.2f}", 
             f"$ {float(pago.monto):,.2f}"],
        ]
        
        # Crear tabla simple
        col_widths = [200, 60, 100, 80]
        table_data = []
        
        for row in items:
            table_row = []
            for i, cell in enumerate(row):
                table_row.append(cell)
            table_data.append(table_row)
        
        # Dibujar tabla manualmente
        row_height = 25
        for row_idx, row in enumerate(table_data):
            x_pos = margin
            for col_idx, cell in enumerate(row):
                c.setFont("Helvetica-Bold" if row_idx == 0 else "Helvetica", 
                         10 if row_idx == 0 else 9)
                c.drawString(x_pos + 5, current_y - (row_idx * row_height), str(cell))
                x_pos += col_widths[col_idx]
        
        current_y -= (len(table_data) * row_height) + 20
        
        # ============ TOTAL ============
        c.setFillColor(HexColor("#1B5E20"))
        c.setFont("Helvetica-Bold", 12)
        c.drawString(width - margin - 180, current_y, "IMPORTE TOTAL:")
        c.drawString(width - margin - 80, current_y, f"$ {float(pago.monto):,.2f}")
        
        current_y -= 30
        
        # ============ PARCELAS ASIGNADAS ============
        if parcelas and len(parcelas) > 0:
            c.setFillColor(HexColor("#1B5E20"))
            c.setFont("Helvetica-Bold", 12)
            c.drawString(margin, current_y, "PARCELAS ASIGNADAS:")
            current_y -= 20
            
            c.setFillColorRGB(0, 0, 0)
            c.setFont("Helvetica", 10)
            
            # Agrupar parcelas en columnas
            parcelas_por_columna = 5
            columnas = []
            for i in range(0, len(parcelas), parcelas_por_columna):
                columnas.append(parcelas[i:i + parcelas_por_columna])
            
            # Calcular ancho de columna
            col_width = (width - 2 * margin) / len(columnas) if columnas else 0
            
            # Dibujar parcelas en columnas
            max_parcelas_en_columna = max([len(col) for col in columnas]) if columnas else 0
            
            for col_idx, columna in enumerate(columnas):
                x_pos = margin + (col_idx * col_width)
                y_pos = current_y
                
                for parcela in columna:
                    texto = f"• Parcela {parcela.get('parcela_id')}: F{parcela.get('fila')}C{parcela.get('columna')}"
                    c.drawString(x_pos, y_pos, texto)
                    y_pos -= 15
            
            current_y -= (max_parcelas_en_columna * 15) + 20
        
        # ============ INFORMACIÓN ADICIONAL ============
        current_y -= 20
        c.setFillColor(HexColor("#555555"))
        c.setFont("Helvetica-Bold", 10)
        c.drawString(margin, current_y, "INFORMACIÓN ADICIONAL:")
        current_y -= 15
        
        c.setFont("Helvetica", 9)
        
        info_adicional = [
            f"• ID de Transacción: {pago.payment_id or 'Pendiente'}",
            f"• ID de Preferencia: {pago.preference_id}",
            f"• Solicitud ID: {solicitud.solicitud_id}",
            f"• Fecha de Creación: {pago.fecha_creacion.strftime('%d/%m/%Y %H:%M') if pago.fecha_creacion else 'N/A'}",
            f"• Fecha de Pago: {pago.fecha_pago.strftime('%d/%m/%Y %H:%M') if pago.fecha_pago else 'N/A'}",
            f"• Método de Pago: Pago Fácil",
            f"• Estado: Aprobado",
        ]
        
        for info in info_adicional:
            c.drawString(margin + 10, current_y, info)
            current_y -= 14
        
        # ============ PIE DE PÁGINA ============
        # Línea separadora
        current_y -= 10
        c.setStrokeColor(HexColor("#CCCCCC"))
        c.setLineWidth(0.5)
        c.line(margin, current_y, width - margin, current_y)
        current_y -= 20
        
        # Texto del pie
        c.setFillColor(HexColor("#666666"))
        c.setFont("Helvetica", 8)
        
        footer_lines = [
            "Este documento es un comprobante de pago generado automáticamente.",
            "Para consultas o reclamos, contactar a la administración de la Feria Artesanal.",
            f"Documento generado el {datetime.now().strftime('%d/%m/%Y a las %H:%M:%S')}",
            "¡Gracias por tu participación en la Feria Artesanal!"
        ]
        
        for line in footer_lines:
            c.drawCentredString(width/2, current_y, line)
            current_y -= 12
        
        # ============ GUARDAR PDF ============
        c.save()
        
        print(f"PDF generado correctamente: {pdf_path}")
        return pdf_path
        
    except Exception as e:
        print(f"Error generando PDF: {e}")
        import traceback
        traceback.print_exc()
        raise e