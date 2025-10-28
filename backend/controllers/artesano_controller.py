# controllers/artesano_controller.py
from flask import Blueprint, request, jsonify
# ¡Importante! Añade get_jwt
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models.artesano import Artesano
from models.usuario import Usuario
from models.base import db

# (Asegúrate que tu blueprint se llame así, o ajústalo)
artesano_bp = Blueprint('artesano_bp', __name__, url_prefix='/artesano')

@artesano_bp.route('/perfil', methods=['POST'])
@jwt_required()
def completar_perfil():
    try:
        # --- ESTA ES LA CORRECCIÓN IMPORTANTE ---
        
        # 1. Obtener el ID del usuario (el 'sub') y convertirlo a entero
        user_id = int(get_jwt_identity())
        
        # 2. Obtener los claims adicionales (rol_id, email)
        claims = get_jwt()
        user_rol = claims['rol_id']
        
        # --- FIN DE LA CORRECCIÓN ---

        data = request.get_json()
        
        # 3. Usar las variables correctas
        if user_rol != 1:
            return jsonify({'msg': 'Solo artesanos pueden completar perfil'}), 403
        
        # 4. Usar las variables correctas
        artesano_existente = Artesano.query.filter_by(usuario_id=user_id).first()
        if artesano_existente:
            return jsonify({'msg': 'El perfil ya fue completado'}), 400
        
        # Crear perfil de artesano
        nuevo_artesano = Artesano(
            usuario_id=user_id, # 5. Usar las variables correctas
            nombre=data['nombre'],
            dni=data['dni'],
            telefono=data['telefono']
        )
        
        db.session.add(nuevo_artesano)
        db.session.commit()
        
        return jsonify({
            'msg': 'Perfil completado exitosamente',
            'artesano': nuevo_artesano.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al completar perfil', 'error': str(e)}), 500

@artesano_bp.route('/perfil', methods=['GET'])
@jwt_required()
def obtener_perfil():
    # 1. Obtener el ID (string) y convertirlo a entero
    user_id = int(get_jwt_identity())
    
    # 2. Usar la variable correcta
    artesano = Artesano.query.filter_by(usuario_id=user_id).first()
    if not artesano:
        return jsonify({'msg': 'Perfil no encontrado'}), 404
    
    return jsonify(artesano.to_dict()), 200

@artesano_bp.route('/perfil', methods=['PUT'])
@jwt_required()
def actualizar_perfil():
    try:
        # 1. Obtener el ID (string) y convertirlo a entero
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # 2. Usar la variable correcta
        artesano = Artesano.query.filter_by(usuario_id=user_id).first()
        if not artesano:
            return jsonify({'msg': 'Perfil no encontrado'}), 404
        
        # Actualizar campos
        if 'nombre' in data:
            artesano.nombre = data['nombre']
        if 'telefono' in data:
            artesano.telefono = data['telefono']
        
        db.session.commit()
        
        return jsonify({
            'msg': 'Perfil actualizado exitosamente',
            'artesano': artesano.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'msg': 'Error al actualizar perfil', 'error': str(e)}), 500