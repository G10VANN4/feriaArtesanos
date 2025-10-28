from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.base import db
from models.solicitud import Solicitud          
from models.artesano import Artesano            
from models.rubro import Rubro                  
from models.estado_solicitud import EstadoSolicitud 
from models.usuario import Usuario              
from sqlalchemy import or_
from datetime import datetime
from sqlalchemy.orm import joinedload 

admin_bp = Blueprint('admin', __name__, url_prefix='/api/v1') 

class AdminController:

    @staticmethod
    def _check_admin_permissions(current_user):
        """Verifica si el usuario es Administrador (2) u Organizador (3)."""
        if current_user is None or current_user.get('rol_id') not in [2, 3]:
            return {'msg': 'Acceso denegado. Se requiere rol de Administrador u Organizador.'}, 403
        return True

    @staticmethod
    def get_solicitudes_dashboard(filtro_estado=None, busqueda_termino=None, current_user=None):
        permisos = AdminController._check_admin_permissions(current_user)
        if permisos is not True:
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
                data.append({
                    'id': s.solicitud_id,
                    'nombre': s.artesano_rel.nombre,  
                    'rubro': s.rubro_rel.tipo,
                    'dimensiones': f"{float(s.dimensiones_largo)}x{float(s.dimensiones_ancho)}", 
                    'estado': s.estado_rel.nombre,
                    'fechaSolicitud': s.fecha_solicitud.isoformat(),
                    
                    'originalData': {
                        'solicitud_id': s.solicitud_id, 
                        'nombre': s.artesano_rel.nombre,  
                        'rubro': s.rubro_rel.tipo,
                        'alto': float(s.dimensiones_largo), 
                        'ancho': float(s.dimensiones_ancho), 
                        'telefono': s.artesano_rel.telefono, 
                        'dni': s.artesano_rel.dni,         
                        'descripcion_puesto': s.descripcion,
                        'estado_solicitud': s.estado_rel.nombre,
                        'fecha_solicitud': s.fecha_solicitud.isoformat(),
                        'notas_admin': s.comentarios_admin or "",
                    }
                })
            
            return data, 200

        except Exception as e:
            print(f"Error al obtener solicitudes: {str(e)}")
            return {'msg': 'Error interno al obtener las solicitudes.', 'detalle': str(e)}, 500

    @staticmethod
    def actualizar_estado_solicitud(solicitud_id, data, current_user):
        permisos = AdminController._check_admin_permissions(current_user)
        if permisos is not True:
            return permisos
            
        estado_nombre_nuevo = data.get('estado_solicitud')
        comentarios_admin = data.get('notas_admin')
        administrador_id = current_user.get('administrador_id') 
        nuevo_estado = EstadoSolicitud.query.filter_by(nombre=estado_nombre_nuevo).first()
        if not nuevo_estado:
             return {'msg': f'El estado "{estado_nombre_nuevo}" no es válido.'}, 400

        try:
            solicitud = Solicitud.query.get(solicitud_id)
            if not solicitud: return {'msg': f'Solicitud ID {solicitud_id} no encontrada.'}, 404

            solicitud.estado_solicitud_id = nuevo_estado.estado_solicitud_id
            solicitud.comentarios_admin = comentarios_admin
            solicitud.administrador_id = administrador_id 
            solicitud.fecha_gestion = datetime.utcnow()
            

           # if estado_nombre_nuevo in ['Rechazada', 'Cancelada']:
            #    solicitud.fecha_cancelacion = datetime.utcnow()
           # elif solicitud.fecha_cancelacion is not None:
            #    solicitud.fecha_cancelacion = None

            db.session.commit()
            return {'msg': f'Estado de la solicitud {solicitud_id} actualizado a {estado_nombre_nuevo}'}, 200

        except Exception as e:
            db.session.rollback()
            return {'msg': 'Error interno al actualizar la solicitud.'}, 500

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
            if not solicitud: return {'msg': f'Solicitud ID {solicitud_id} no encontrada.'}, 404

            solicitud.estado_solicitud_id = estado_cancelada.estado_solicitud_id
            solicitud.administrador_id = administrador_id
            solicitud.fecha_gestion = datetime.utcnow()
          #  solicitud.fecha_cancelacion = datetime.utcnow()
            solicitud.comentarios_admin = (solicitud.comentarios_admin or "") + f"\n[AUDITORÍA] Cancelada por Admin/Organizador (ID: {administrador_id}) el {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            
            db.session.commit()
            return {'msg': f'Solicitud ID {solicitud_id} ha sido cancelada exitosamente.'}, 200

        except Exception as e:
            db.session.rollback()
            return {'msg': 'Error interno del servidor al cancelar la solicitud.'}, 500

@admin_bp.route('/solicitudes', methods=['GET'])
@jwt_required() 
def get_solicitudes_route():
    current_user = get_jwt_identity() 
    filtro = request.args.get('filtro_estado')
    busqueda = request.args.get('busqueda_termino')
    
    data, status = AdminController.get_solicitudes_dashboard(
        filtro_estado=filtro, 
        busqueda_termino=busqueda,
        current_user=current_user 
    )
    return jsonify(data), status

@admin_bp.route('/solicitudes/<int:solicitud_id>/estado', methods=['PATCH'])
@jwt_required()
def actualizar_estado_route(solicitud_id):
    current_user = get_jwt_identity() 
    data = request.get_json()
    
    response, status = AdminController.actualizar_estado_solicitud(
        solicitud_id, 
        data, 
        current_user=current_user
    )
    return jsonify(response), status

@admin_bp.route('/solicitudes/<int:solicitud_id>/cancelar', methods=['PATCH'])
@jwt_required()
def cancelar_solicitud_admin_route(solicitud_id):
    current_user = get_jwt_identity() 
    
    response, status = AdminController.cancelar_solicitud_admin(
        solicitud_id, 
        current_user=current_user
    )
    return jsonify(response), status