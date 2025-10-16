from flask import Blueprint, request, jsonify
from db import db
from models.usuario import Usuario
from models.artesano import Artesano
from models.rol import Rol
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from passlib.hash import sha256_crypt
from models.estado_usuario import EstadoUsuario

auth_bp = Blueprint('auth_bp', __name__)

ROL_ARTESANO_ID = 1      
ESTADO_USUARIO_ACTIVO_ID = 1


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    
    if not data.get('email') or not data.get('password') or not data.get('nombre'): 
        return jsonify({'msg': 'Email, contraseña y nombre son obligatorios'}), 400

    if Usuario.query.filter_by(email=data['email']).first():
        return jsonify({'msg': 'El email ya existe'}), 409
    
    try:
        new_user = Usuario(
            nombre=data['nombre'], 
            email=data['email'],
            rol_id=ROL_ARTESANO_ID,
            estado_id=ESTADO_USUARIO_ACTIVO_ID 
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
        print(f"Error en COMMIT: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor durante el registro.'}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'): 
        return jsonify({'msg': 'Faltan email o contraseña'}), 400
    user = Usuario.query.filter_by(email=data['email']).first()
    
   
    if not user or not user.check_password(data['password']):
        return jsonify({'msg': 'Credenciales inválidas'}), 401
    
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