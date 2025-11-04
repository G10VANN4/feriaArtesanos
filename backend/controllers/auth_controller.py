from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from models.artesano import Artesano
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta

auth_bp = Blueprint('auth_bp', __name__)

# -----------------------------------------------------------
# REGISTRO DE USUARIO (Artesano por defecto)
# -----------------------------------------------------------
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
        print(f"❌ Error en registro: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor durante el registro.'}), 500


# -----------------------------------------------------------
# LOGIN DE USUARIO (Artesano, Admin o Organizador)
# -----------------------------------------------------------
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

        # Buscar usuario
        user = Usuario.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'msg': 'Credenciales inválidas'}), 401

        # Determinar rol
        rol_id = user.rol_id
        administrador_id = None
        organizador_id = None

        # Asociar ID de perfil según el rol
        if rol_id == 2:  # Administrador
            from models.administrador import Administrador
            admin = Administrador.query.filter_by(usuario_id=user.usuario_id).first()
            if admin:
                administrador_id = admin.administrador_id

        elif rol_id == 3:  # Organizador
            from models.organizador import Organizador
            org = Organizador.query.filter_by(usuario_id=user.usuario_id).first()
            if org:
                organizador_id = org.organizador_id

        # Crear token JWT con datos esenciales
        access_token = create_access_token(
            identity={
                'id': user.usuario_id,
                'rol_id': rol_id,
                'administrador_id': administrador_id,
                'organizador_id': organizador_id
            },
            expires_delta=timedelta(hours=3)  # duración de token (3h)
        )

        return jsonify({
            'access_token': access_token,
            'rol_id': rol_id,
            'usuario_id': user.usuario_id,
            'msg': 'Inicio de sesión exitoso'
        }), 200

    except Exception as e:
        print(f"❌ Error en endpoint login: {str(e)}")
        return jsonify({'msg': f'Error interno del servidor: {str(e)}'}), 500
