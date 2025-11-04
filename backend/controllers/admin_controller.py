from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.solicitud import Solicitud          
from models.artesano import Artesano            
from models.rubro import Rubro                  
from models.estado_solicitud import EstadoSolicitud 
from models.usuario import Usuario              
from models.administrador import Administrador
from models.solicitud_foto import SolicitudFoto
from models.notificacion import Notificacion
from sqlalchemy import or_, func
from datetime import datetime, timedelta
from sqlalchemy.orm import joinedload 
import io
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch

# Blueprint con prefix
admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1') 

def get_usuario_actual():
    """Obtiene el usuario actual desde el token JWT"""
    user_identity = get_jwt_identity()
    usuario_id = int(user_identity.split('_')[1])
    return Usuario.query.get(usuario_id)

def get_administrador_actual():
    """Obtiene el administrador actual basado en el usuario del token"""
    usuario = get_usuario_actual()
    if not usuario:
        return None
    return Administrador.query.filter_by(usuario_id=usuario.usuario_id).first()

class AdminController:

    @staticmethod
    def _check_admin_permissions(usuario):
        """Verifica si el usuario es Administrador (2) u Organizador (3)."""
        if not usuario:
            return {'msg': 'Usuario no encontrado'}, 404
            
        if usuario.rol_id not in [2, 3]:
            return {'msg': 'Acceso denegado. Se requiere rol de Administrador u Organizador.'}, 403
            
        administrador = Administrador.query.filter_by(usuario_id=usuario.usuario_id).first()
        if not administrador:
            return {'msg': 'Perfil de administrador no encontrado'}, 404
            
        return administrador

    @staticmethod
    def crear_notificacion_artesano(artesano_id, mensaje, estado_notificacion_id=1):
        """
        Crear una nueva notificación para un artesano
        """
        try:
            notificacion = Notificacion(
                artesano_id=artesano_id,
                mensaje=mensaje,
                estado_notificacion_id=estado_notificacion_id
            )
            db.session.add(notificacion)
            return notificacion
        except Exception as e:
            print(f"Error al crear notificación: {str(e)}")
            raise e

    @staticmethod
    def get_solicitudes_dashboard(filtro_estado=None, busqueda_termino=None):
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos

        try:
            query = Solicitud.query.options(
                joinedload(Solicitud.estado_rel),
                joinedload(Solicitud.rubro_rel),
                joinedload(Solicitud.artesano_rel)
            )
            query = query.join(Solicitud.estado_rel).join(Solicitud.rubro_rel).join(Solicitud.artesano_rel)

            if filtro_estado and filtro_estado != 'all':
                query = query.filter(EstadoSolicitud.nombre == filtro_estado)

            if busqueda_termino:
                term = f"%{busqueda_termino.lower()}%"
                query = query.filter(or_(
                    db.cast(Solicitud.solicitud_id, db.String).ilike(term),
                    db.func.lower(Artesano.nombre).like(term), 
                    db.func.lower(Rubro.tipo).like(term)      
                ))

            solicitudes = query.order_by(Solicitud.fecha_solicitud.desc()).all()
            
            data = []
            for s in solicitudes: 
                artesano = s.artesano_rel
                
                foto_principal = s.fotos_rel[0] if s.fotos_rel else None
                foto_url = foto_principal.get_image_url() if foto_principal else None
                
                original_data = {
                    'solicitud_id': s.solicitud_id, 
                    'nombre': artesano.nombre if artesano else 'Sin nombre',
                    'rubro': s.rubro_rel.tipo if s.rubro_rel else 'No especificado',
                    'alto': float(s.dimensiones_largo) if s.dimensiones_largo else None, 
                    'ancho': float(s.dimensiones_ancho) if s.dimensiones_ancho else None, 
                    'descripcion_puesto': s.descripcion or 'Sin descripción proporcionada',
                    'estado_solicitud': s.estado_rel.nombre if s.estado_rel else 'Pendiente',
                    'fecha_solicitud': s.fecha_solicitud.isoformat() if s.fecha_solicitud else None,
                    'notas_admin': s.comentarios_admin or "",
                    'foto_puesto': foto_url,
                    'fotos': [foto.get_image_url() for foto in s.fotos_rel] if s.fotos_rel else []
                }
                
                if artesano:
                    if hasattr(artesano, 'telefono'):
                        original_data['telefono'] = artesano.telefono
                    else:
                        original_data['telefono'] = 'No especificado'
                    
                    if hasattr(artesano, 'dni'):
                        original_data['dni'] = artesano.dni
                    else:
                        original_data['dni'] = 'No especificado'
                    
                    original_data['email'] = 'No disponible'
                else:
                    original_data['telefono'] = 'No especificado'
                    original_data['dni'] = 'No especificado'
                    original_data['email'] = 'No disponible'
                
                data.append({
                    'id': s.solicitud_id,
                    'nombre': artesano.nombre if artesano else 'Sin nombre',
                    'rubro': s.rubro_rel.tipo if s.rubro_rel else 'No especificado',
                    'dimensiones': f"{float(s.dimensiones_largo)}x{float(s.dimensiones_ancho)}", 
                    'estado': s.estado_rel.nombre if s.estado_rel else 'Pendiente',
                    'fechaSolicitud': s.fecha_solicitud.isoformat() if s.fecha_solicitud else None,
                    'artesano_id': artesano.artesano_id if artesano else None,
                    'originalData': original_data
                })
            
            return data, 200

        except Exception as e:
            print(f"Error al obtener solicitudes: {str(e)}")
            return {'msg': 'Error interno al obtener las solicitudes.', 'detalle': str(e)}, 500

    @staticmethod
    def actualizar_estado_solicitud(solicitud_id, data):
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos
            
        estado_nombre_nuevo = data.get('estado_solicitud')
        comentarios_admin = data.get('notas_admin')
        administrador = permisos
        
        nuevo_estado = EstadoSolicitud.query.filter_by(nombre=estado_nombre_nuevo).first()
        if not nuevo_estado:
             return {'msg': f'El estado "{estado_nombre_nuevo}" no es válido.'}, 400

        try:
            solicitud = Solicitud.query.get(solicitud_id)
            if not solicitud: 
                return {'msg': f'Solicitud ID {solicitud_id} no encontrada.'}, 404

            estado_anterior = solicitud.estado_rel.nombre if solicitud.estado_rel else 'Sin estado'
            
            solicitud.estado_solicitud_id = nuevo_estado.estado_solicitud_id
            solicitud.comentarios_admin = comentarios_admin
            solicitud.administrador_id = administrador.administrador_id 
            solicitud.fecha_gestion = datetime.utcnow()

            if solicitud.artesano_id:
                mensaje_notificacion = f"El estado de tu solicitud cambio de ' {estado_anterior} ' a ' {estado_nombre_nuevo} '."
                
                if comentarios_admin:
                    mensaje_notificacion += f" Comentarios del administrador: {comentarios_admin}"
                
                AdminController.crear_notificacion_artesano(
                    solicitud.artesano_id, 
                    mensaje_notificacion
                )

            db.session.commit()
            return {'msg': f'Estado de la solicitud {solicitud_id} actualizado a {estado_nombre_nuevo}'}, 200

        except Exception as e:
            db.session.rollback()
            return {'msg': 'Error interno al actualizar la solicitud.', 'error': str(e)}, 500

    @staticmethod
    def cancelar_solicitud_admin(solicitud_id):
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos
            
        estado_cancelada = EstadoSolicitud.query.filter_by(nombre='Cancelada').first()
        if not estado_cancelada:
             return {'msg': 'El estado "Cancelada" no existe en la base de datos.'}, 500

        administrador = permisos

        try:
            solicitud = Solicitud.query.get(solicitud_id)
            if not solicitud: 
                return {'msg': f'Solicitud ID {solicitud_id} no encontrada.'}, 404

            estado_anterior = solicitud.estado_rel.nombre if solicitud.estado_rel else 'Sin estado'
            
            solicitud.estado_solicitud_id = estado_cancelada.estado_solicitud_id
            solicitud.administrador_id = administrador.administrador_id
            solicitud.fecha_gestion = datetime.utcnow()
            solicitud.comentarios_admin = (solicitud.comentarios_admin or "") + f"\n[AUDITORÍA] Cancelada por Admin/Organizador (ID: {administrador.administrador_id}) el {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            
            if solicitud.artesano_id:
                mensaje_notificacion = f"Tu solicitud fue cancelada por el administrador. Estado anterior: {estado_anterior}"
                
                AdminController.crear_notificacion_artesano(
                    solicitud.artesano_id, 
                    mensaje_notificacion
                )
            
            db.session.commit()
            return {'msg': f'Solicitud ID {solicitud_id} ha sido cancelada exitosamente.'}, 200

        except Exception as e:
            db.session.rollback()
            return {'msg': 'Error interno del servidor al cancelar la solicitud.', 'error': str(e)}, 500

    @staticmethod
    def get_estadisticas_usuarios(fecha_inicio, fecha_fin, agrupacion='dia'):
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos

        try:
            if fecha_inicio > fecha_fin:
                return {'msg': 'La fecha de inicio no puede ser mayor a la fecha de fin'}, 400

            hoy = datetime.utcnow().date()
            if fecha_inicio > hoy:
                fecha_inicio = hoy
            if fecha_fin > hoy:
                fecha_fin = hoy

            fecha_inicio_dt = datetime.combine(fecha_inicio, datetime.min.time())
            fecha_fin_dt = datetime.combine(fecha_fin, datetime.max.time())

            query = db.session.query(
                func.date(Usuario.fecha_registro).label('fecha'),
                func.count(Usuario.usuario_id).label('total')
            ).filter(
                Usuario.fecha_registro.between(fecha_inicio_dt, fecha_fin_dt)
            ).group_by(func.date(Usuario.fecha_registro))

            resultados = query.all()

            if not resultados:
                return {
                    'total_general': 0,
                    'rango_fechas': {
                        'inicio': fecha_inicio.strftime('%d/%m/%Y'),
                        'fin': fecha_fin.strftime('%d/%m/%Y')
                    },
                    'agrupacion': agrupacion,
                    'datos': []
                }, 200

            datos_agrupados = []
            total_general = 0

            if agrupacion == 'dia':
                for fecha, total in resultados:
                    datos_agrupados.append({
                        'periodo': fecha.strftime('%Y-%m-%d'),
                        'fecha': fecha.isoformat(),
                        'total': total,
                        'label': fecha.strftime('%d/%m/%Y')
                    })
                    total_general += total

            elif agrupacion == 'semana':
                semanas = {}
                for fecha, total in resultados:
                    año, semana_num, dia_semana = fecha.isocalendar()
                    
                    inicio_semana = fecha - timedelta(days=dia_semana-1)
                    fin_semana = inicio_semana + timedelta(days=6)
                    
                    clave_semana = f"{año}-W{semana_num:02d}"
                    
                    if clave_semana not in semanas:
                        semanas[clave_semana] = {
                            'periodo': clave_semana,
                            'total': 0,
                            'label': f"Semana {semana_num:02d} ({inicio_semana.strftime('%d/%m')} - {fin_semana.strftime('%d/%m')})",
                            'fecha_inicio': inicio_semana.strftime('%d/%m/%Y'),
                            'fecha_fin': fin_semana.strftime('%d/%m/%Y')
                        }
                    semanas[clave_semana]['total'] += total
                    total_general += total

                datos_agrupados = list(semanas.values())

            elif agrupacion == 'mes':
                meses = {}
                for fecha, total in resultados:
                    clave_mes = f"{fecha.year}-{fecha.month:02d}"
                    
                    if clave_mes not in meses:
                        meses_es = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
                        nombre_mes = meses_es[fecha.month - 1]
                        
                        meses[clave_mes] = {
                            'periodo': clave_mes,
                            'total': 0,
                            'label': f"{nombre_mes} {fecha.year}",
                            'fecha_inicio': fecha.replace(day=1).strftime('%d/%m/%Y'),
                            'fecha_fin': (fecha.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
                        }
                    meses[clave_mes]['total'] += total
                    total_general += total

                datos_agrupados = list(meses.values())

            return {
                'total_general': total_general,
                'rango_fechas': {
                    'inicio': fecha_inicio.strftime('%d/%m/%Y'),
                    'fin': fecha_fin.strftime('%d/%m/%Y')
                },
                'agrupacion': agrupacion,
                'datos': datos_agrupados
            }, 200

        except Exception as e:
            print(f"❌ Error al obtener estadísticas: {str(e)}")
            return {'msg': 'Error interno al obtener las estadísticas.', 'detalle': str(e)}, 500

    @staticmethod
    def exportar_estadisticas_excel(fecha_inicio, fecha_fin, agrupacion='dia'):
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos

        try:
            datos_response, status = AdminController.get_estadisticas_usuarios(fecha_inicio, fecha_fin, agrupacion)
            
            if status != 200:
                return datos_response, status

            datos = datos_response['datos']
            total_general = datos_response['total_general']
            rango_fechas = datos_response['rango_fechas']

            import pandas as pd
            from io import BytesIO
            
            df_data = []
            for item in datos:
                df_data.append({
                    'Período': item['label'],
                    'Total de Usuarios': item['total']
                })
            
            df = pd.DataFrame(df_data)
            
            output = BytesIO()
            with pd.ExcelWriter(output, engine='openpyxl') as writer:
                df.to_excel(writer, sheet_name='Estadísticas Usuarios', index=False)
                
                workbook = writer.book
                worksheet = writer.sheets['Estadísticas Usuarios']
                
                worksheet['E1'] = 'Reporte de Usuarios Registrados'
                worksheet['E2'] = f"Rango de fechas: {rango_fechas['inicio']} - {rango_fechas['fin']}"
                worksheet['E3'] = f"Agrupación: {agrupacion.capitalize()}"
                worksheet['E4'] = f"Total general: {total_general} usuarios"
                worksheet['E5'] = f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}"

            output.seek(0)
            return output, 200

        except ImportError:
            return {'msg': 'Error: Biblioteca pandas no instalada. Ejecute: pip install pandas openpyxl'}, 500
        except Exception as e:
            print(f"❌ Error al generar Excel: {str(e)}")
            return {'msg': 'Error interno al generar el reporte Excel.', 'detalle': str(e)}, 500

    @staticmethod
    def exportar_artesanos_pdf():
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos

        try:
            artesanos_aprobados = db.session.query(
                Artesano.artesano_id,
                Artesano.nombre,
                Artesano.telefono,
                Artesano.dni,
                Rubro.tipo.label('rubro'),
                Solicitud.dimensiones_largo,
                Solicitud.dimensiones_ancho,
                Solicitud.descripcion
            ).join(Solicitud, Solicitud.artesano_id == Artesano.artesano_id
            ).join(EstadoSolicitud, EstadoSolicitud.estado_solicitud_id == Solicitud.estado_solicitud_id
            ).join(Rubro, Rubro.rubro_id == Solicitud.rubro_id
            ).filter(EstadoSolicitud.nombre == 'Aprobada'
            ).order_by(Artesano.nombre).all()

            buffer = io.BytesIO()
            pdf = canvas.Canvas(buffer, pagesize=letter)
            width, height = letter

            pdf.setFont("Helvetica-Bold", 16)
            pdf.drawString(1 * inch, height - 1 * inch, "Listado de Artesanos Aprobados")

            pdf.setFont("Helvetica", 10)
            pdf.drawString(1 * inch, height - 1.3 * inch, f"Total de artesanos: {len(artesanos_aprobados)}")
            pdf.drawString(1 * inch, height - 1.5 * inch, f"Generado el: {datetime.now().strftime('%d/%m/%Y %H:%M')}")

            y_position = height - 2 * inch
            pdf.setFont("Helvetica-Bold", 10)
            pdf.drawString(1 * inch, y_position, "Nombre")
            pdf.drawString(3 * inch, y_position, "DNI")
            pdf.drawString(4 * inch, y_position, "Teléfono")
            pdf.drawString(5 * inch, y_position, "Rubro")
            pdf.drawString(6 * inch, y_position, "Dimensiones")

            pdf.setFont("Helvetica", 9)
            y_position -= 0.2 * inch

            for artesano in artesanos_aprobados:
                if y_position < 1 * inch:
                    pdf.showPage()
                    y_position = height - 1 * inch
                    pdf.setFont("Helvetica-Bold", 10)
                    pdf.drawString(1 * inch, y_position, "Nombre")
                    pdf.drawString(3 * inch, y_position, "DNI")
                    pdf.drawString(4 * inch, y_position, "Teléfono")
                    pdf.drawString(5 * inch, y_position, "Rubro")
                    pdf.drawString(6 * inch, y_position, "Dimensiones")
                    y_position -= 0.2 * inch
                    pdf.setFont("Helvetica", 9)

                nombre = artesano.nombre[:20] + "..." if len(artesano.nombre) > 20 else artesano.nombre
                dimensiones = f"{artesano.dimensiones_largo or 'N/A'}x{artesano.dimensiones_ancho or 'N/A'}"

                pdf.drawString(1 * inch, y_position, nombre)
                pdf.drawString(3 * inch, y_position, artesano.dni or 'N/A')
                pdf.drawString(4 * inch, y_position, artesano.telefono or 'N/A')
                pdf.drawString(5 * inch, y_position, artesano.rubro or 'N/A')
                pdf.drawString(6 * inch, y_position, dimensiones)
                y_position -= 0.2 * inch

            pdf.setFont("Helvetica", 8)
            pdf.drawString(1 * inch, 0.5 * inch, f"Feria Artesanal - Listado de Artesanos Aprobados")

            pdf.save()
            buffer.seek(0)

            return buffer, 200

        except Exception as e:
            print(f"❌ Error al generar PDF de artesanos: {str(e)}")
            return {'msg': 'Error interno al generar el reporte PDF.', 'detalle': str(e)}, 500
    
    @staticmethod
    def get_estadisticas_rubros():
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos

        try:
            estadisticas = db.session.query(
                Rubro.tipo.label('rubro'),
                func.count(Solicitud.solicitud_id).label('total')
            ).join(Solicitud, Solicitud.rubro_id == Rubro.rubro_id
            ).join(EstadoSolicitud, EstadoSolicitud.estado_solicitud_id == Solicitud.estado_solicitud_id
            ).filter(EstadoSolicitud.nombre == 'Aprobada'
            ).group_by(Rubro.tipo).all()
            
            resultado = {est.rubro: est.total for est in estadisticas}
            return resultado, 200

        except Exception as e:
            print(f"❌ Error al obtener estadísticas de rubros: {str(e)}")
            return {'msg': 'Error interno al obtener las estadísticas de rubros.', 'detalle': str(e)}, 500

    @staticmethod
    def get_estadisticas_rubros_todas():
        usuario = get_usuario_actual()
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return permisos

        try:
            estadisticas = db.session.query(
                Rubro.tipo.label('rubro'),
                func.count(Solicitud.solicitud_id).label('total')
            ).join(Solicitud, Solicitud.rubro_id == Rubro.rubro_id
            ).group_by(Rubro.tipo).all()
            
            resultado = {est.rubro: est.total for est in estadisticas}
            return resultado, 200

        except Exception as e:
            print(f"❌ Error al obtener estadísticas de rubros (todas): {str(e)}")
            return {'msg': 'Error interno al obtener las estadísticas de rubros.', 'detalle': str(e)}, 500

# RUTAS
@admin_bp.route('/solicitudes', methods=['GET'])
@jwt_required() 
def get_solicitudes_route():
    filtro = request.args.get('filtro_estado')
    busqueda = request.args.get('busqueda_termino')
    
    data, status = AdminController.get_solicitudes_dashboard(
        filtro_estado=filtro, 
        busqueda_termino=busqueda
    )
    return jsonify(data), status

@admin_bp.route('/solicitudes/<int:solicitud_id>/estado', methods=['PATCH'])
@jwt_required()
def actualizar_estado_route(solicitud_id):
    data = request.get_json()
    
    response, status = AdminController.actualizar_estado_solicitud(
        solicitud_id, 
        data
    )
    return jsonify(response), status

@admin_bp.route('/solicitudes/<int:solicitud_id>/cancelar', methods=['PATCH'])
@jwt_required()
def cancelar_solicitud_admin_route(solicitud_id):
    response, status = AdminController.cancelar_solicitud_admin(solicitud_id)
    return jsonify(response), status

@admin_bp.route('/<int:solicitud_id>/fotos', methods=['GET'])
@jwt_required()
def obtener_fotos_solicitud(solicitud_id):
    try:
        usuario = get_usuario_actual()
        
        permisos = AdminController._check_admin_permissions(usuario)
        if not isinstance(permisos, Administrador):
            return jsonify(permisos[0]), permisos[1]
            
        solicitud = Solicitud.query.get(solicitud_id)
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        fotos = SolicitudFoto.query.filter_by(solicitud_id=solicitud_id).all()
        
        fotos_respuesta = []
        for foto in fotos:
            foto_data = foto.to_dict()
            foto_data['image_url'] = foto.get_image_url()
            fotos_respuesta.append(foto_data)
        
        return jsonify({
            'fotos': fotos_respuesta
        }), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error al obtener fotos', 'error': str(e)}), 500

@admin_bp.route('/estadisticas/usuarios', methods=['GET'])
@jwt_required()
def get_estadisticas_usuarios_route():
    try:
        fecha_inicio_str = request.args.get('fecha_inicio')
        fecha_fin_str = request.args.get('fecha_fin')
        agrupacion = request.args.get('agrupacion', 'dia')

        if not fecha_inicio_str or not fecha_fin_str:
            return jsonify({'msg': 'Se requieren las fechas de inicio y fin'}), 400

        fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
        fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

        if agrupacion not in ['dia', 'semana', 'mes']:
            return jsonify({'msg': 'Agrupación no válida. Use: dia, semana o mes'}), 400

        data, status = AdminController.get_estadisticas_usuarios(fecha_inicio, fecha_fin, agrupacion)
        return jsonify(data), status

    except ValueError:
        return jsonify({'msg': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'msg': 'Error interno del servidor', 'error': str(e)}), 500

@admin_bp.route('/estadisticas/usuarios/exportar-excel', methods=['GET'])
@jwt_required()
def exportar_estadisticas_excel_route():
    try:
        fecha_inicio_str = request.args.get('fecha_inicio')
        fecha_fin_str = request.args.get('fecha_fin')
        agrupacion = request.args.get('agrupacion', 'dia')

        if not fecha_inicio_str or not fecha_fin_str:
            return jsonify({'msg': 'Se requieren las fechas de inicio y fin'}), 400

        fecha_inicio = datetime.strptime(fecha_inicio_str, '%Y-%m-%d').date()
        fecha_fin = datetime.strptime(fecha_fin_str, '%Y-%m-%d').date()

        if agrupacion not in ['dia', 'semana', 'mes']:
            return jsonify({'msg': 'Agrupación no válida. Use: dia, semana o mes'}), 400

        excel_buffer, status = AdminController.exportar_estadisticas_excel(fecha_inicio, fecha_fin, agrupacion)
        
        if status != 200:
            return excel_buffer, status

        nombre_archivo = f"reporte_usuarios_{fecha_inicio}_{fecha_fin}.xlsx"

        return send_file(
            excel_buffer,
            as_attachment=True,
            download_name=nombre_archivo,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        )

    except ValueError:
        return jsonify({'msg': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        return jsonify({'msg': 'Error interno del servidor', 'error': str(e)}), 500

@admin_bp.route('/artesanos/exportar-pdf', methods=['GET'])
@jwt_required()
def exportar_artesanos_pdf_route():
    try:
        pdf_buffer, status = AdminController.exportar_artesanos_pdf()
        
        if status != 200:
            return pdf_buffer, status

        nombre_archivo = f"listado_artesanos_{datetime.now().strftime('%Y%m%d_%H%M')}.pdf"

        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=nombre_archivo,
            mimetype='application/pdf'
        )

    except Exception as e:
        return jsonify({'msg': 'Error interno del servidor', 'error': str(e)}), 500

@admin_bp.route('/estadisticas/rubros', methods=['GET'])
@jwt_required()
def get_estadisticas_rubros_route():
    try:
        data, status = AdminController.get_estadisticas_rubros()
        return jsonify(data), status

    except Exception as e:
        return jsonify({'msg': 'Error interno del servidor', 'error': str(e)}), 500

@admin_bp.route('/estadisticas/rubros/todas', methods=['GET'])
@jwt_required()
def get_estadisticas_rubros_todas_route():
    try:
        data, status = AdminController.get_estadisticas_rubros_todas()
        return jsonify(data), status

    except Exception as e:
        return jsonify({'msg': 'Error interno del servidor', 'error': str(e)}), 500