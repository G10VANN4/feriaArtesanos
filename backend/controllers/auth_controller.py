# controllers/auth_controller.py
from models.base import db
from models.usuario import Usuario
from models.artesano import Artesano
from models.rol import Rol
from models.estado_usuario import EstadoUsuario
from flask_jwt_extended import create_access_token
from passlib.hash import sha256_crypt

class AuthController:
    
    ROL_ARTESANO_ID = 1      
    ESTADO_USUARIO_ACTIVO_ID = 1

    @staticmethod
    def register_user(data):
        """
        Lógica de registro de usuario
        Retorna: (dict_response, status_code)
        """
        # Validaciones
        if not data.get('email') or not data.get('password'):
            return {'msg': 'Email y contraseña son obligatorios'}, 400

        # Verificar si el usuario ya existe
        if Usuario.query.filter_by(email=data['email']).first():
            return {'msg': 'El email ya existe'}, 409
        
        try:
            # Lógica de creación
            new_user = Usuario(
                email=data['email'],
                rol_id=AuthController.ROL_ARTESANO_ID,
                estado_id=AuthController.ESTADO_USUARIO_ACTIVO_ID
            )
            
            new_user.set_password(data['password'])
            db.session.add(new_user)
            db.session.commit()
            
            return {
                'msg': 'Registro inicial exitoso. Debe completar su perfil.',
                'usuario_id': new_user.usuario_id,
                'next_step': '/perfil/completar'
            }, 201

        except Exception as e:
            db.session.rollback()
            print(f"Error en registro: {str(e)}")
            return {'msg': 'Error interno del servidor durante el registro.'}, 500

    @staticmethod
    def login_user(data):
        """
        Lógica de login de usuario
        Retorna: (dict_response, status_code)
        """
        if not data or not data.get('email') or not data.get('password'): 
            return {'msg': 'Faltan email o contraseña'}, 400

        user = Usuario.query.filter_by(email=data['email']).first()
        
        if not user or not user.check_password(data['password']):
            return {'msg': 'Credenciales inválidas'}, 401
        
        # Generar token JWT
        token = create_access_token(identity={
            'id': user.usuario_id, 
            'email': user.email,
            'rol_id': user.rol_id 
        })
        
        return {
            'access_token': token, 
            'rol_id': user.rol_id,
            'msg': 'Inicio de sesión exitoso'
        }, 200