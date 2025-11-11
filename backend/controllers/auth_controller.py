from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from models.artesano import Artesano
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from utils.session_manager import SessionManager
from flask_jwt_extended import jwt_required, get_jwt_identity

auth_bp = Blueprint('auth_bp', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400

        if not data.get('email') or not data.get('password'):
            return jsonify({'msg': 'Email y contraseña son obligatorios'}), 400

        # Verificar si el email ya existe
        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'msg': 'El email ya está registrado'}), 409

        # Crear usuario tipo Artesano
        new_user = Usuario(
            email=data['email'],
            rol_id=1,      # Artesano
            estado_id=1    # Activo
        )
        new_user.set_password(data['password'])
        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            'msg': 'Registro exitoso. Complete su perfil de artesano.',
            'usuario_id': new_user.usuario_id
        }), 201

    except Exception as e:
        db.session.rollback()
        print(f" Error en registro: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor durante el registro.'}), 500


session_manager = SessionManager.get_instance()

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400

        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'msg': 'Faltan email o contraseña'}), 400

        user = Usuario.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'msg': 'Credenciales inválidas'}), 401

        # Crear token JWT único
        access_token = create_access_token(identity=str(user.usuario_id), expires_delta=timedelta(hours=2))

        # Guardar o reemplazar sesión activa del usuario
        session_manager.set_session(user.usuario_id, access_token)

        return jsonify({
            'access_token': access_token,
            'rol_id': user.rol_id,
            'usuario_id': user.usuario_id,
            'msg': 'Inicio de sesión exitoso'
        }), 200

    except Exception as e:
        print(f" Error en endpoint login: {str(e)}")
        return jsonify({'msg': f'Error interno del servidor: {str(e)}'}), 500
    
@auth_bp.route('/validate-session', methods=['POST'])
@jwt_required()
def validate_session():
    try:
        usuario_id = int(get_jwt_identity())
        current_token = request.headers.get("Authorization", "").replace("Bearer ", "")

        active_token = session_manager.get_session(usuario_id)
        if active_token == current_token:
            return jsonify({"valid": True}), 200
        else:
            return jsonify({"valid": False}), 401
    except Exception as e:
        print(f"Error validando sesión: {e}")
        return jsonify({"valid": False}), 401