# routes/solicitud_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.solicitud import Solicitud
from models.artesano import Artesano
from models.rubro import Rubro
from models.estado_solicitud import EstadoSolicitud
from models.solicitud_foto import SolicitudFoto 
from models.base import db
from datetime import datetime

solicitud_bp = Blueprint('solicitud_bp', __name__, url_prefix='/solicitudes')

@solicitud_bp.route('', methods=['POST'])
@jwt_required()
def crear_solicitud():
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # Verificar que sea artesano y tenga perfil
        if current_user['rol_id'] != 1:
            return jsonify({'msg': 'Solo artesanos pueden crear solicitudes'}), 403
        
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Complete su perfil primero'}), 400
        
        # Validar datos requeridos
        required_fields = ['descripcion', 'dimensiones_ancho', 'dimensiones_largo', 'rubro_id', 'terminos_aceptados']
        for field in required_fields:
            if field not in data:
                return jsonify({'msg': f'Campo {field} es requerido'}), 400
        
        if not data['terminos_aceptados']:
            return jsonify({'msg': 'Debe aceptar los términos y condiciones'}), 400
        
        # Obtener rubro y calcular costo
        rubro = Rubro.query.get(data['rubro_id'])
        if not rubro:
            return jsonify({'msg': 'Rubro no válido'}), 400
        
        # Calcular parcelas necesarias (RF9)
        ancho = float(data['dimensiones_ancho'])
        largo = float(data['dimensiones_largo'])
        parcelas_necesarias = max(1, round((ancho / 3.0) * (largo / 3.0)))
        costo_total = parcelas_necesarias * float(rubro.precio_parcela)
        
        # Estado inicial
        estado_pendiente = EstadoSolicitud.query.filter_by(nombre='Pendiente').first()
        
        nueva_solicitud = Solicitud(
            artesano_id=artesano.artesano_id,
            estado_solicitud_id=estado_pendiente.estado_solicitud_id,
            descripcion=data['descripcion'],
            dimensiones_ancho=ancho,
            dimensiones_largo=largo,
            rubro_id=data['rubro_id'],
            parcelas_necesarias=parcelas_necesarias,
            costo_total=costo_total,
            terminos_aceptados=True,
            fecha_solicitud=datetime.utcnow()
        )
        
        db.session.add(nueva_solicitud)
        db.session.commit()
        
        # Fotos de la solicitud
        fotos_urls = data.get('fotos', [])
        fotos_creadas = []  
        
        for url_foto in fotos_urls:
            nueva_foto = SolicitudFoto(
                solicitud_id=nueva_solicitud.solicitud_id,
                url_foto=url_foto
            )
            db.session.add(nueva_foto)
            fotos_creadas.append(nueva_foto)  
        
        db.session.commit()

        # Notificación si supera dimensiones estándar (RF21)
        mensaje_notificacion = ""
        if parcelas_necesarias > 1:
            mensaje_notificacion = f"Su puesto requiere {parcelas_necesarias} parcelas. Costo total: ${costo_total}"
        
        return jsonify({
            'msg': 'Solicitud creada exitosamente',
            'solicitud': nueva_solicitud.to_dict(),
            'fotos': [f.to_dict() for f in fotos_creadas], 
            'notificacion': mensaje_notificacion
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al crear solicitud', 'error': str(e)}), 500

@solicitud_bp.route('', methods=['GET'])
@jwt_required()
def obtener_solicitudes_artesano():
    current_user = get_jwt_identity()
    
    artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
    if not artesano:
        return jsonify({'msg': 'Perfil no encontrado'}), 404
    
    solicitudes = Solicitud.query.filter_by(artesano_id=artesano.artesano_id).all()
    
    return jsonify({
        'solicitudes': [s.to_dict() for s in solicitudes]
    }), 200

@solicitud_bp.route('/<int:solicitud_id>/cancelar', methods=['POST'])
@jwt_required()
def cancelar_solicitud(solicitud_id):
    try:
        current_user = get_jwt_identity()
        
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
        
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        # Verificar que esté en estado aprobado o pendiente (RF6)
        estado_actual = EstadoSolicitud.query.get(solicitud.estado_solicitud_id)
        if estado_actual.nombre not in ['Aprobada', 'Pendiente']:
            return jsonify({'msg': 'No se puede cancelar la solicitud en su estado actual'}), 400
        
        estado_cancelada = EstadoSolicitud.query.filter_by(nombre='Cancelada').first()
        solicitud.estado_solicitud_id = estado_cancelada.estado_solicitud_id
        solicitud.fecha_cancelacion = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({'msg': 'Solicitud cancelada exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al cancelar solicitud', 'error': str(e)}), 500
    
@solicitud_bp.route('/<int:solicitud_id>/fotos', methods=['POST'])
@jwt_required()
def agregar_foto_solicitud(solicitud_id):
    """Agregar una foto a una solicitud existente"""
    try:
        current_user = get_jwt_identity()
        
        # Verificar que la solicitud pertenezca al artesano
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        data = request.get_json()
        if not data.get('url_foto'):
            return jsonify({'msg': 'URL de foto es requerida'}), 400
        
        nueva_foto = SolicitudFoto(
            solicitud_id=solicitud_id,
            url_foto=data['url_foto']
        )
        
        db.session.add(nueva_foto)
        db.session.commit()
        
        return jsonify({
            'msg': 'Foto agregada exitosamente',
            'foto': nueva_foto.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al agregar foto', 'error': str(e)}), 500

@solicitud_bp.route('/<int:solicitud_id>/fotos', methods=['GET'])
@jwt_required()
def obtener_fotos_solicitud(solicitud_id):
    """Obtener todas las fotos de una solicitud"""
    try:
        current_user = get_jwt_identity()
        
        # Verificar que la solicitud pertenezca al artesano
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        solicitud = Solicitud.query.filter_by(
            solicitud_id=solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'Solicitud no encontrada'}), 404
        
        fotos = SolicitudFoto.query.filter_by(solicitud_id=solicitud_id).all()
        
        return jsonify({
            'fotos': [foto.to_dict() for foto in fotos]
        }), 200
        
    except Exception as e:
        return jsonify({'msg': 'Error al obtener fotos', 'error': str(e)}), 500

@solicitud_bp.route('/fotos/<int:foto_id>', methods=['DELETE'])
@jwt_required()
def eliminar_foto_solicitud(foto_id):
    """Eliminar una foto de una solicitud"""
    try:
        current_user = get_jwt_identity()
        
        # Buscar la foto y verificar permisos
        foto = SolicitudFoto.query.get(foto_id)
        if not foto:
            return jsonify({'msg': 'Foto no encontrada'}), 404
            
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
            
        # Verificar que la solicitud de la foto pertenezca al artesano
        solicitud = Solicitud.query.filter_by(
            solicitud_id=foto.solicitud_id, 
            artesano_id=artesano.artesano_id
        ).first()
        
        if not solicitud:
            return jsonify({'msg': 'No tiene permisos para eliminar esta foto'}), 403
        
        db.session.delete(foto)
        db.session.commit()
        
        return jsonify({'msg': 'Foto eliminada exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al eliminar foto', 'error': str(e)}), 500