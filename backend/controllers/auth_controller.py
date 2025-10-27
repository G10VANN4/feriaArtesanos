# controllers/auth_controller.py
from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from models.artesano import Artesano
from models.rol import Rol
from models.estado_usuario import EstadoUsuario
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from passlib.hash import sha256_crypt

# Crear blueprint directamente
auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400

        # Validaciones
        if not data.get('email') or not data.get('password'):
            return jsonify({'msg': 'Email y contraseña son obligatorios'}), 400

        # Verificar si el usuario ya existe
        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'msg': 'El email ya existe'}), 409
        
        try:
            # Lógica de creación
            new_user = Usuario(
                email=data['email'],
                rol_id=1,  # Artesano
                estado_id=1  # Activo
            )
            
            new_user.set_password(data['password'])
            db.session.add(new_user)
            db.session.commit()
            
            return jsonify({
                'msg': 'Registro inicial exitoso. Debe completar su perfil.',
                'usuario_id': new_user.usuario_id,
                'next_step': '/perfil/completar'
            }), 201

        except Exception as e:
            db.session.rollback()
            print(f"Error en registro: {str(e)}")
            return jsonify({'msg': 'Error interno del servidor durante el registro.'}), 500
        
    except Exception as e:
        print(f"Error en endpoint register: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400

        if not data.get('email') or not data.get('password'): 
            return jsonify({'msg': 'Faltan email o contraseña'}), 400

        user = Usuario.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'msg': 'Credenciales inválidas'}), 401
        
        # Generar token JWT
        token = create_access_token(identity={
            'id': user.usuario_id, 
            'email': user.email,
            'rol_id': user.rol_id 
        })
        
        return jsonify({
            'access_token': token, 
            'rol_id': user.rol_id,
            'msg': 'Inicio de sesión exitoso'
        }), 200
        
    except Exception as e:
        print(f"Error en endpoint login: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor'}), 500