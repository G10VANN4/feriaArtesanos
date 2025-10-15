from flask import Blueprint, request, jsonify
from db import db
from models import Usuario, Artesano, Rol
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    print("DATA RECIBIDA:", data)
    # Validamos los campos obligatorios
    if not data.get('email') or not data.get('contrasena') or not data.get('nombre'):
        return jsonify({'msg': 'Faltan datos'}), 400

    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'msg': 'El email ya existe'}), 409

    user = Usuario(
        nombre=data['nombre'],
        email=data['email'],
        contrasena=data['contrasena'],  # Guardamos directamente la contraseña
        estado_id=data.get('estado_id'), 
        fecha_registro=data.get('fecha_registro') 
    )

    db.session.add(user)
    db.session.commit()

    return jsonify({'msg': 'Usuario creado correctamente'}), 201


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data.get('email') or not data.get('contrasena'):
        return jsonify({'msg': 'Faltan datos'}), 400

    user = Usuario.query.filter_by(email=data['email']).first()
    if not user or user.contrasena != data['contrasena']:
        return jsonify({'msg': 'Credenciales inválidas'}), 401

    token = create_access_token(identity={'id': user.usuario_id, 'email': user.email})
    return jsonify({'access_token': token}), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def me():
    identity = get_jwt_identity()
    return jsonify(identity), 200
