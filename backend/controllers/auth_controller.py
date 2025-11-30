from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, 
    get_jwt, verify_jwt_in_request
)
from datetime import timedelta, datetime, timezone
import uuid
from utils.token_manager import TokenManager  # NUEVA IMPORTACIÓN

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
        print(f"Error en registro: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor durante el registro.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        print(f"🔐 LOGIN INTENT - Email: {data.get('email')}")
        
        email = data.get('email')
        password = data.get('password')

        user = Usuario.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'msg': 'Credenciales inválidas'}), 401

        # Terminar sesión anterior
        TokenManager.terminate_active_session(user.usuario_id)

        # Crear nuevo token CON TODOS LOS CLAIMS NECESARIOS
        jti = str(uuid.uuid4())
        
        additional_claims = {
            "jti": jti,
            "usuario_id": user.usuario_id,  # ✅ Asegurar que esto está incluido
            "rol_id": user.rol_id,
            "email": user.email
        }
        
        access_token = create_access_token(
            identity=f"user_{user.usuario_id}",
            additional_claims=additional_claims,  # ✅ Pasar los claims correctamente
            expires_delta=timedelta(hours=24)
        )

        # Registrar token como activo
        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        TokenManager.add_active_session(user.usuario_id, jti, expires_at)

        response = jsonify({
            'access_token': access_token,
            'rol_id': user.rol_id,
            'usuario_id': user.usuario_id,
            'msg': 'Inicio de sesión exitoso',
            'session_management': 'single_session'
        })

        response.set_cookie(
            'access_token',  # ✅ Esta cookie debe contener el JWT token
            access_token,
            max_age=60*60*24,
            secure=False,
            httponly=True,
            samesite='Lax'
        )

        print(f"✅ LOGIN EXITOSO - User: {user.usuario_id}, JTI: {jti}")
        return response, 200

    except Exception as e:
        print(f"❌ LOGIN ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'msg': f'Error interno: {str(e)}'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        # Obtener claims del token
        claims = get_jwt()
        jti = claims.get('jti')
        usuario_id = claims.get('usuario_id')
        
        # Si no tenemos usuario_id en claims, obtenerlo del identity
        if not usuario_id:
            current_user = get_jwt_identity()
            usuario_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        print(f"LOGOUT - Usuario ID: {usuario_id}, JTI: {jti}")
        
        # NUEVO: Terminar sesión activa
        TokenManager.terminate_active_session(usuario_id)
        
        response = jsonify({
            'msg': 'Sesión cerrada exitosamente',
            'logout_success': True,
            'user_id': usuario_id
        })
        
        # Eliminar cookie
        response.set_cookie(
            'access_token',
            '',
            expires=0,
            secure=False,
            httponly=True,
            samesite='Lax'
        )
        
        print(f"Sesión cerrada para usuario {usuario_id}")
        return response, 200
        
    except Exception as e:
        print(f"Error en logout: {str(e)}")
        return jsonify({'msg': 'Error al cerrar sesión'}), 500

@auth_bp.route('/check-auth', methods=['GET'])
@jwt_required()
def check_auth():
    try:
        claims = get_jwt()
        jti = claims.get('jti')
        usuario_id = claims.get('usuario_id')
        
        # Si no tenemos usuario_id en claims, obtenerlo del identity
        if not usuario_id:
            current_user = get_jwt_identity()
            usuario_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        # NUEVO: Debug para ver qué token se está verificando
        print(f"🔐 CHECK-AUTH - User: {usuario_id}, JTI: {jti}")
        
        # Verificar que el token no esté revocado
        if TokenManager.is_token_revoked(jti):
            print(f"❌ Token revocado detectado: {jti}")
            return jsonify({'authenticated': False, 'msg': 'Token ha sido revocado. Por favor inicie sesión nuevamente.'}), 401
        
        print(f"✅ Token válido: {jti}")
        return jsonify({
            'authenticated': True,
            'user_id': usuario_id,
            'rol_id': claims.get('rol_id'),
            'session_valid': True
        }), 200
        
    except Exception as e:
        print(f"❌ Error en check-auth: {str(e)}")
        return jsonify({'authenticated': False, 'msg': str(e)}), 401

# NUEVO: Endpoint para forzar cierre de sesión en otros dispositivos
@auth_bp.route('/force-logout-other-sessions', methods=['POST'])
@jwt_required()
def force_logout_other_sessions():
    try:
        claims = get_jwt()
        usuario_id = claims.get('usuario_id')
        
        if not usuario_id:
            current_user = get_jwt_identity()
            usuario_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        # Terminar sesión activa actual
        TokenManager.terminate_active_session(usuario_id)
        
        return jsonify({
            'msg': 'Sesiones en otros dispositivos cerradas. Debes volver a iniciar sesión.',
            'usuario_id': usuario_id
        }), 200
        
    except Exception as e:
        print(f"Error forzando logout: {str(e)}")
        return jsonify({'msg': 'Error al forzar cierre de sesiones'}), 500