# routes/artesano_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.artesano import Artesano
from models.usuario import Usuario
from models.base import db

artesano_bp = Blueprint('artesano_bp', __name__, url_prefix='/artesano')

@artesano_bp.route('/perfil', methods=['POST'])
@jwt_required()
def completar_perfil():
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        # Verificar que el usuario sea artesano
        if current_user['rol_id'] != 1:
            return jsonify({'msg': 'Solo artesanos pueden completar perfil'}), 403
        
        # Verificar si ya tiene perfil
        artesano_existente = Artesano.query.filter_by(usuario_id=current_user['id']).first()
        if artesano_existente:
            return jsonify({'msg': 'El perfil ya fue completado'}), 400
        
        # Crear perfil de artesano
        nuevo_artesano = Artesano(
            usuario_id=current_user['id'],
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
    current_user = get_jwt_identity()
    
    artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
    if not artesano:
        return jsonify({'msg': 'Perfil no encontrado'}), 404
    
    return jsonify(artesano.to_dict()), 200

@artesano_bp.route('/perfil', methods=['PUT'])
@jwt_required()
def actualizar_perfil():
    try:
        current_user = get_jwt_identity()
        data = request.get_json()
        
        artesano = Artesano.query.filter_by(usuario_id=current_user['id']).first()
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