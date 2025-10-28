# controllers/notificacion_controller.py

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.notificacion import Notificacion
from models.artesano import Artesano # <--- ¡Importante! Lo necesitamos
from models.base import db

notificacion_bp = Blueprint('notificacion_bp', __name__, url_prefix='/notificaciones')

#=================================================
# GET /notificaciones
# Obtiene todas las notificaciones del artesano logueado
#=================================================
@notificacion_bp.route('', methods=['GET'])
@jwt_required()
def get_notificaciones():
    try:
        # 1. Obtener el ID de Usuario (ej: 5) del token JWT
        user_id = int(get_jwt_identity())
        
        # 2. Encontrar el perfil de Artesano (ej: 4) vinculado a ese Usuario
        artesano = Artesano.query.filter_by(usuario_id=user_id).first()
        
        # 3. Si no es un artesano (o no tiene perfil), no tiene notificaciones
        if not artesano:
            return jsonify({'msg': 'Perfil de artesano no encontrado'}), 404
            
        # 4. Usar el artesano.artesano_id para buscar sus notificaciones
        #    Ordenamos por no leídas (leido=False) primero
        notificaciones = Notificacion.query \
                                     .filter_by(artesano_id=artesano.artesano_id) \
                                     .order_by(Notificacion.leido.asc(), Notificacion.fecha_envio.desc()) \
                                     .all()
        
        # 5. Convertir a JSON usando tu método to_dict()
        return jsonify([n.to_dict() for n in notificaciones]), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error al obtener notificaciones', 'error': str(e)}), 500

#=================================================
# PUT /notificaciones/<id>/leer
# Marca una notificación específica como leída
#=================================================
@notificacion_bp.route('/<int:id>/leer', methods=['PUT'])
@jwt_required()
def marcar_como_leida(id):
    try:
        # 1. Obtener el ID de Usuario (ej: 5) del token
        user_id = int(get_jwt_identity())

        # 2. Encontrar el perfil de Artesano (ej: 4)
        artesano = Artesano.query.filter_by(usuario_id=user_id).first()
        if not artesano:
            return jsonify({'msg': 'Acceso no autorizado'}), 403

        # 3. Buscar la notificación específica por su ID (ej: notif_id 12)
        notif = Notificacion.query.get(id)
        
        if not notif:
            return jsonify({'msg': 'Notificación no encontrada'}), 404
            
        # 4. ¡IMPORTANTE! Verificar que esta notificación le pertenezca
        #    Compara el ID del artesano (4) con el ID de la notificación (notif.artesano_id)
        if notif.artesano_id != artesano.artesano_id:
            return jsonify({'msg': 'Acceso no autorizado a este recurso'}), 403
            
        # 5. Marcar como leída y guardar
        notif.leido = True
        
        # (Opcional) Si también quieres cambiar el estado_notificacion_id:
        # notif.estado_notificacion_id = ID_DEL_ESTADO_LEIDO 
        
        db.session.commit()
        
        return jsonify({'msg': 'Notificación marcada como leída', 'notificacion': notif.to_dict()}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al actualizar notificación', 'error': str(e)}), 500