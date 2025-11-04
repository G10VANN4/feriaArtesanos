# controllers/notification_controller.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db
from models.notificacion import Notificacion
from models.estado_notificacion import EstadoNotificacion
from models.artesano import Artesano

notification_bp = Blueprint('notification', __name__, url_prefix='/api/v1')

class NotificationController:

    @staticmethod
    def _get_artesano_from_user():
        """Obtiene el artesano asociado al usuario autenticado"""
        current_user = get_jwt_identity()
        if not current_user or 'id' not in current_user:
            return None
        return Artesano.query.filter_by(usuario_id=current_user['id']).first()

    @staticmethod
    @notification_bp.route('/artesano/notificaciones', methods=['GET'])
    @jwt_required()
    def obtener_notificaciones_artesano():
        """
        Obtener las notificaciones del artesano
        """
        try:
            artesano = NotificationController._get_artesano_from_user()
            if not artesano:
                return jsonify({'error': 'Artesano no encontrado'}), 404
            
            # Obtener notificaciones ordenadas por fecha (más recientes primero)
            notificaciones = Notificacion.query.filter_by(
                artesano_id=artesano.artesano_id
            ).order_by(Notificacion.fecha_envio.desc()).all()
            
            notificaciones_data = []
            for notif in notificaciones:
                notif_data = notif.to_dict()
                estado = EstadoNotificacion.query.get(notif.estado_notificacion_id)
                notif_data['estado_nombre'] = estado.nombre if estado else 'Desconocido'
                notificaciones_data.append(notif_data)
            
            return jsonify({
                'notificaciones': notificaciones_data,
                'total': len(notificaciones_data)
            }), 200
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @notification_bp.route('/artesano/notificaciones/<int:notificacion_id>/marcar-leida', methods=['PUT'])
    @jwt_required()
    def marcar_notificacion_leida(notificacion_id):
        """
        Marcar una notificación como leída
        """
        try:
            artesano = NotificationController._get_artesano_from_user()
            if not artesano:
                return jsonify({'error': 'Artesano no encontrado'}), 404
            
            # Verificar que la notificación pertenece al artesano
            notificacion = Notificacion.query.filter_by(
                notificacion_id=notificacion_id,
                artesano_id=artesano.artesano_id
            ).first()
            
            if not notificacion:
                return jsonify({'error': 'Notificación no encontrada'}), 404
            
            # Marcar como leída
            notificacion.leido = True
            db.session.commit()
            
            return jsonify({
                'message': 'Notificación marcada como leída',
                'notificacion': notificacion.to_dict()
            }), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

    @staticmethod
    @notification_bp.route('/artesano/notificaciones/marcar-todas-leidas', methods=['PUT'])
    @jwt_required()
    def marcar_todas_como_leidas():
        """
        Marcar todas las notificaciones del artesano como leídas
        """
        try:
            artesano = NotificationController._get_artesano_from_user()
            if not artesano:
                return jsonify({'error': 'Artesano no encontrado'}), 404
            
            Notificacion.query.filter_by(
                artesano_id=artesano.artesano_id,
                leido=False
            ).update({'leido': True})
            
            db.session.commit()
            
            return jsonify({'message': 'Todas las notificaciones marcadas como leídas'}), 200
            
        except Exception as e:
            db.session.rollback()
            return jsonify({'error': str(e)}), 500

# para cuando admin cambie el estado de la solictud
    @staticmethod
    def crear_notificacion(artesano_id, mensaje, estado_notificacion_id=1):
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
            db.session.commit()
            
            return notificacion
        except Exception as e:
            db.session.rollback()
            raise e