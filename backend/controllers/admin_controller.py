from models.base import db
from models.solicitud import Solicitud          
from models.artesano import Artesano            
from models.rubro import Rubro                  
from models.estado_solicitud import EstadoSolicitud 
from sqlalchemy import or_
from datetime import datetime

# Asumo que tienes una forma de obtener el usuario actual (current_user)
# y que este contiene: {'rol_id': X, 'administrador_id': Y}

class AdminController:
    @staticmethod
    def _check_admin_permissions(current_user):
        """Verifica si el usuario es Administrador (2) u Organizador (3)."""
        if current_user is None or current_user.get('rol_id') not in [2, 3]:
            # Retorna una tupla (respuesta, código HTTP)
            return {'msg': 'Acceso denegado. Se requiere rol de Administrador u Organizador.'}, 403
        return True # Retorna True si los permisos son válidos

    # -------------------------------------------------------------------
    # --- 1. CARGA Y FILTRADO DEL DASHBOARD (GET /solicitudes) ---
    # -------------------------------------------------------------------

    @staticmethod
    def get_solicitudes_dashboard(filtro_estado=None, busqueda_termino=None, current_user=None):
        # Paso 1: Verificación de permisos
        permisos = AdminController._check_admin_permissions(current_user)
        if permisos is not True:
            return permisos

        try:
            # Paso 2: Construcción de la consulta con JOINS
            query = db.session.query(
                Solicitud.solicitud_id,
                # JOINS para obtener datos descriptivos
                Usuario.nombre.label('nombre_artesano'),     # Nombre del artesano (de la tabla Usuario)
                Artesano.dni,                                # DNI del artesano
                Artesano.telefono,                           # Teléfono del artesano
                Rubro.tipo.label('rubro_nombre'),            # Nombre del Rubro (de la tabla Rubro)
                EstadoSolicitud.nombre.label('estado_nombre'), # Nombre del Estado (de la tabla EstadoSolicitud)
                
                # Campos directos de Solicitud
                Solicitud.dimensiones_ancho,
                Solicitud.dimensiones_largo,
                Solicitud.descripcion,
                Solicitud.comentarios_admin,
                Solicitud.fecha_solicitud,
            ).join(Artesano, Solicitud.artesano_id == Artesano.artesano_id
            ).join(Usuario, Artesano.usuario_id == Usuario.usuario_id      # CLAVE: JOIN adicional para obtener el nombre
            ).join(Rubro, Solicitud.rubro_id == Rubro.rubro_id
            ).join(EstadoSolicitud, Solicitud.estado_solicitud_id == EstadoSolicitud.estado_solicitud_id)

            # Paso 3: Aplicar Filtro por Estado (por el nombre descriptivo)
            if filtro_estado and filtro_estado != 'all':
                query = query.filter(EstadoSolicitud.nombre == filtro_estado)

            # Paso 4: Aplicar Búsqueda (por ID, Nombre o Rubro)
            if busqueda_termino:
                term = f"%{busqueda_termino.lower()}%"
                query = query.filter(or_(
                    db.cast(Solicitud.solicitud_id, db.String).ilike(term),
                    db.func.lower(Usuario.nombre).like(term),
                    db.func.lower(Rubro.tipo).like(term)
                ))

            # Paso 5: Ejecutar y formatear resultados
            solicitudes = query.order_by(Solicitud.fecha_solicitud.desc()).all()
            
            data = []
            for item in solicitudes:
                # Mapeo exacto a la estructura de datos que espera tu frontend (AdminDashboard)
                data.append({
                    'id': item.solicitud_id,
                    'nombre': item.nombre_artesano,
                    'rubro': item.rubro_nombre,
                    'dimensiones': f"{float(item.dimensiones_largo)}x{float(item.dimensiones_ancho)}", # Formato LxW
                    'estado': item.estado_nombre,
                    'fechaSolicitud': item.fecha_solicitud.isoformat(),
                    # Datos detallados para el modal de edición/visualización
                    'originalData': {
                        'solicitud_id': item.solicitud_id, 
                        'nombre': item.nombre_artesano,
                        'rubro': item.rubro_nombre,
                        'alto': float(item.dimensiones_largo), 
                        'ancho': float(item.dimensiones_ancho), 
                        'telefono': item.telefono,
                        'dni': item.dni,
                        'descripcion_puesto': item.descripcion,
                        'estado_solicitud': item.estado_nombre,
                        'fecha_solicitud': item.fecha_solicitud.isoformat(),
                        'notas_admin': item.comentarios_admin or "",
                    }
                })
            
            return data, 200

        except Exception as e:
            print(f"Error al obtener solicitudes: {str(e)}")
            return {'msg': 'Error interno al obtener las solicitudes.', 'detalle': str(e)}, 500

    # -------------------------------------------------------------------
    # --- 2. GESTIÓN Y ACTUALIZACIÓN (PATCH /solicitudes/<id>/estado) ---
    # -------------------------------------------------------------------

    @staticmethod
    def actualizar_estado_solicitud(solicitud_id, data, current_user):
        """
        RF5 (Actualización): Permite al administrador/organizador gestionar el estado y notas.
        """
        permisos = AdminController._check_admin_permissions(current_user)
        if permisos is not True:
            return permisos
            
        estado_nombre_nuevo = data.get('estado_solicitud')
        comentarios_admin = data.get('notas_admin')
        administrador_id = current_user.get('administrador_id') 

        if not estado_nombre_nuevo:
            return {'msg': 'El nuevo estado de la solicitud es obligatorio.'}, 400
        
        # 1. Buscar la ID del nuevo estado por su nombre
        nuevo_estado = EstadoSolicitud.query.filter_by(nombre=estado_nombre_nuevo).first()
        if not nuevo_estado:
             return {'msg': f'El estado "{estado_nombre_nuevo}" no es válido.'}, 400

        try:
            solicitud = Solicitud.query.get(solicitud_id)
            if not solicitud:
                return {'msg': f'Solicitud ID {solicitud_id} no encontrada.'}, 404

            # 2. Aplicar cambios transaccionalmente
            solicitud.estado_solicitud_id = nuevo_estado.estado_solicitud_id
            solicitud.comentarios_admin = comentarios_admin
            solicitud.administrador_id = administrador_id
            solicitud.fecha_gestion = datetime.utcnow()
            
            # Gestión de fecha de cancelación (para estados finales negativos)
            if estado_nombre_nuevo in ['Rechazada', 'Cancelada']:
                solicitud.fecha_cancelacion = datetime.utcnow()
            elif estado_nombre_nuevo not in ['Rechazada', 'Cancelada']:
                solicitud.fecha_cancelacion = None

            db.session.commit()

            return {'msg': f'Estado de la solicitud {solicitud_id} actualizado a {estado_nombre_nuevo}'}, 200

        except Exception as e:
            db.session.rollback()
            print(f"Error al actualizar estado de solicitud: {str(e)}")
            return {'msg': 'Error interno al actualizar la solicitud.'}, 500
            
    # -------------------------------------------------------------------
    # --- 3. CANCELACIÓN POR ADMIN (PATCH /solicitudes/<id>/cancelar) ---
    # -------------------------------------------------------------------
            
    @staticmethod
    def cancelar_solicitud_admin(solicitud_id, current_user):
        permisos = AdminController._check_admin_permissions(current_user)
        if permisos is not True:
            return permisos
            
        estado_cancelada = EstadoSolicitud.query.filter_by(nombre='Cancelada').first()
        if not estado_cancelada:
             return {'msg': 'El estado "Cancelada" no existe en la base de datos.'}, 500

        administrador_id = current_user.get('administrador_id')

        try:
            solicitud = Solicitud.query.get(solicitud_id)
            if not solicitud:
                return {'msg': f'Solicitud ID {solicitud_id} no encontrada.'}, 404

        
            solicitud.estado_solicitud_id = estado_cancelada.estado_solicitud_id
            solicitud.administrador_id = administrador_id
            solicitud.fecha_gestion = datetime.utcnow()
            solicitud.fecha_cancelacion = datetime.utcnow()
            solicitud.comentarios_admin = (solicitud.comentarios_admin or "") + f"\n[AUTO-ADMIN] Cancelada por Admin/Organizador (ID: {administrador_id}) el {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            
            db.session.commit()
            
            return {'msg': f'Solicitud ID {solicitud_id} ha sido cancelada exitosamente.'}, 200

        except Exception as e:
            db.session.rollback()
            print(f"Error al cancelar solicitud: {str(e)}")
            return {'msg': 'Error interno del servidor al cancelar la solicitud.'}, 500