from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from models.artesano import Artesano
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import timedelta

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['OPTIONS'])
@auth_bp.route('/login', methods=['OPTIONS'])
@auth_bp.route('/logout', methods=['OPTIONS'])
@auth_bp.route('/check-auth', methods=['OPTIONS'])
def handle_options():
    return jsonify({'status': 'ok'}), 200

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400

        if not data.get('email') or not data.get('password'):
            return jsonify({'msg': 'Email y contraseña son obligatorios'}), 400

        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'msg': 'El email ya está registrado'}), 409

        new_user = Usuario(
            email=data['email'],
            rol_id=1,
            estado_id=1
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

        # MANTENER: Crear token JWT (sin SessionManager)
        user_identity = f"user_{user.usuario_id}"
        access_token = create_access_token(identity=user_identity)

        # MANTENER: Respuesta CON COOKIE
        response = jsonify({
            'access_token': access_token,
            'rol_id': user.rol_id,
            'usuario_id': user.usuario_id,
            'msg': 'Inicio de sesión exitoso'
        })

        # MANTENER: Establecer cookie
        response.set_cookie(
            'access_token',
            access_token,
            max_age=60*60*24,
            secure=False,
            httponly=True,
            samesite='Lax'
        )

        print(f"Cookie establecida para usuario {user.usuario_id}")
        return response, 200

    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({'msg': f'Error interno: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        current_user = get_jwt_identity()
        user_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        print(f"LOGOUT ENDPOINT - User ID: {user_id}")
        
        # MANTENER: Respuesta QUE ELIMINA LA COOKIE (sin SessionManager)
        response = jsonify({
            'msg': 'Sesión cerrada exitosamente',
            'logout_success': True,
            'user_id': user_id
        })
        
        # MANTENER: Eliminar cookie
        response.set_cookie(
            'access_token',
            '',
            expires=0,
            secure=False,
            httponly=True,
            samesite='Lax'
        )
        
        print(f"Cookie eliminada para usuario {user_id}")
        return response, 200
        
    except Exception as e:
        print(f"Error en logout: {str(e)}")
        return jsonify({'msg': 'Error al cerrar sesión'}), 500

@auth_bp.route('/check-auth', methods=['GET'])
@jwt_required()
def check_auth():
    try:
        current_user = get_jwt_identity()
        user_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        return jsonify({
            'authenticated': True,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        return jsonify({'authenticated': False, 'msg': str(e)}), 401