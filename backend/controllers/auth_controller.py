# auth_bp.py
from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity, 
    get_jwt
)
from datetime import timedelta, datetime, timezone
import uuid
from utils.token_manager import TokenManager
from models.active_token import ActiveToken
from models.token_blacklist import TokensBlacklist

import logging

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['OPTIONS'])
@auth_bp.route('/login', methods=['OPTIONS'])
@auth_bp.route('/logout', methods=['OPTIONS'])
@auth_bp.route('/check-auth', methods=['OPTIONS'])
def handle_options():
    return jsonify({'status': 'ok'}), 200

@staticmethod
def can_user_login(usuario_id):
    """Verifica si un usuario puede hacer login (no tiene sesión activa)"""
    try:
        TokenManager.cleanup_expired_tokens()
        
        active_session = TokenManager.get_active_session(usuario_id)
        
        if active_session:
            logger.info(f" Usuario {usuario_id} ya tiene sesión activa - JTI: {active_session.jti}")
            logger.info(f"   Creado: {active_session.created_at}, Expira: {active_session.expires_at}")
            return False
            
        logger.info(f"Usuario {usuario_id} puede hacer login - Sin sesiones activas")
        return True
        
    except Exception as e:
        logger.error(f"Error en can_user_login: {str(e)}")
        return True  
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
        logger.error(f"Error en registro: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor durante el registro.'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        logger.info(f"LOGIN INTENT - Email: {data.get('email')}")
        
        email = data.get('email')
        password = data.get('password')

        if not email or not password:
            return jsonify({'msg': 'Faltan email o contraseña'}), 400

        user = Usuario.query.filter_by(email=email).first()
        if not user or not user.check_password(password):
            return jsonify({'msg': 'Credenciales inválidas'}), 401

        if not TokenManager.can_user_login(user.usuario_id):
            return jsonify({'msg': 'Usuario ya tiene una sesión activa. Cierre sesión en otros dispositivos.'}), 409

        jti = str(uuid.uuid4())
        
        additional_claims = {
            "jti": jti,
            "usuario_id": user.usuario_id,  
            "rol_id": user.rol_id,
            "email": user.email
        }
        
        access_token = create_access_token(
            identity=f"user_{user.usuario_id}",
            additional_claims=additional_claims,  
            expires_delta=timedelta(hours=24)
        )

        expires_at = datetime.now(timezone.utc) + timedelta(hours=24)
        TokenManager.add_active_session(user.usuario_id, jti, expires_at)

        response = jsonify({
            'access_token': access_token,
            'rol_id': user.rol_id,
            'usuario_id': user.usuario_id,
            'email': user.email,
            'msg': 'Inicio de sesión exitoso',
            'session_management': 'single_session'
        })

        response.set_cookie(
            'access_token',
            access_token,
            max_age=60*60*24,
            secure=False,
            httponly=True, 
            samesite='Lax'
        )
        
        
        logger.info(f"LOGIN EXITOSO - User: {user.usuario_id}, JTI: {jti}")
        return response, 200

    except Exception as e:
        logger.error(f"LOGIN ERROR: {str(e)}")
        return jsonify({'msg': f'Error interno: {str(e)}'}), 500


@auth_bp.route('/check-auth', methods=['GET'])
@jwt_required()
def check_auth():
    try:
        claims = get_jwt()
        jti = claims.get('jti')
        usuario_id = claims.get('usuario_id')
        email = claims.get('email')
        
        if not usuario_id:
            current_user = get_jwt_identity()
            usuario_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        logger.info(f"CHECK-AUTH - User: {usuario_id}, JTI: {jti}")
        

        if TokenManager.is_token_revoked(jti):
            logger.info(f"Token revocado detectado: {jti}")
            return jsonify({'authenticated': False, 'msg': 'Token ha sido revocado. Por favor inicie sesión nuevamente.'}), 401
        
        user = Usuario.query.get(usuario_id)
        if not user:
            return jsonify({'authenticated': False, 'msg': 'Usuario no encontrado'}), 401
        
        logger.info(f"Token válido: {jti}")
        
        return jsonify({
            'authenticated': True,
            'user_id': usuario_id,
            'usuario_id': usuario_id,
            'email': email or user.email,
            'rol_id': claims.get('rol_id'),
            'session_valid': True,
            'jti': jti
        }), 200
        
    except Exception as e:
        logger.error(f"Error en check-auth: {str(e)}")
        return jsonify({'authenticated': False, 'msg': str(e)}), 401

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        claims = get_jwt()
        jti = claims.get('jti')
        usuario_id = claims.get('usuario_id')
        
        if not usuario_id:
            current_user = get_jwt_identity()
            usuario_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        logger.info(f"LOGOUT - Usuario ID: {usuario_id}, JTI: {jti}")
        
        TokenManager.terminate_active_session(usuario_id)
        
        response = jsonify({
            'msg': 'Sesión cerrada exitosamente',
            'logout_success': True,
            'user_id': usuario_id
        })
        
        response.set_cookie(
            'access_token',
            '',
            expires=0,
            secure=False,
            httponly=True,
            samesite='Lax'
        )
        
        logger.info(f"Sesión cerrada para usuario {usuario_id}")
        return response, 200
        
    except Exception as e:
        logger.error(f"Error en logout: {str(e)}")
        return jsonify({'msg': 'Error al cerrar sesión'}), 500
    

@auth_bp.route('/force-logout-other-sessions', methods=['POST'])
@jwt_required()
def force_logout_other_sessions():
    try:
        claims = get_jwt()
        usuario_id = claims.get('usuario_id')
        
        if not usuario_id:
            current_user = get_jwt_identity()
            usuario_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        TokenManager.terminate_active_session(usuario_id)
        
        return jsonify({
            'msg': 'Sesiones en otros dispositivos cerradas. Debes volver a iniciar sesión.',
            'usuario_id': usuario_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error forzando logout: {str(e)}")
        return jsonify({'msg': 'Error al forzar cierre de sesiones'}), 500

@auth_bp.route('/clean-session', methods=['POST'])
def clean_session():
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'msg': 'Email requerido'}), 400

        user = Usuario.query.filter_by(email=email).first()
        if not user:
            return jsonify({'msg': 'Usuario no encontrado'}), 404

        usuario_id = user.usuario_id
        
        cleaned = TokenManager.terminate_active_session(usuario_id)
        
        return jsonify({
            'msg': 'Sesión limpiada exitosamente. Ya puede iniciar sesión nuevamente.',
            'cleaned': cleaned,
            'user_id': usuario_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error en clean-session: {str(e)}")
        return jsonify({'msg': 'Error al limpiar sesión'}), 500

@auth_bp.route('/dev-reset-sessions', methods=['POST'])
def dev_reset_sessions():
    try:
        active_sessions = ActiveToken.query.all()
        for session in active_sessions:
            TokenManager.terminate_active_session(session.usuario_id)
        
        return jsonify({
            'msg': ' TODAS las sesiones fueron eliminadas',
            'sessions_cleared': True
        }), 200
        
    except Exception as e:
        logger.error(f"Error en dev-reset-sessions: {str(e)}")
        return jsonify({'msg': 'Error al resetear sesiones'}), 500

@auth_bp.route('/dev-view-sessions', methods=['GET'])
def dev_view_sessions():
    try:
        active_sessions = ActiveToken.query.all()
        blacklisted_tokens = TokensBlacklist.query.all()
        
        sessions_data = {
            'active_sessions_count': len(active_sessions),
            'blacklisted_tokens_count': len(blacklisted_tokens),
            'active_sessions': [
                {
                    'usuario_id': session.usuario_id,
                    'jti': session.jti,
                    'created_at': session.created_at.isoformat(),
                    'expires_at': session.expires_at.isoformat()
                } for session in active_sessions
            ],
            'blacklisted_tokens': [
                {
                    'usuario_id': token.usuario_id,
                    'jti': token.jti,
                    'created_at': token.created_at.isoformat(),
                    'expires_at': token.expires_at.isoformat()
                } for token in blacklisted_tokens
            ]
        }
        
        return jsonify(sessions_data), 200
        
    except Exception as e:
        logger.error(f"Error en dev-view-sessions: {str(e)}")
        return jsonify({'msg': 'Error al ver sesiones'}), 500

@auth_bp.route('/force-clean-session', methods=['POST'])
def force_clean_session():
    """Forzar limpieza de sesión de un usuario (útil para desarrollo)"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'msg': 'Email requerido'}), 400

        user = Usuario.query.filter_by(email=email).first()
        if not user:
            return jsonify({'msg': 'Usuario no encontrado'}), 404

        usuario_id = user.usuario_id
        
        cleaned = TokenManager.terminate_active_session(usuario_id)
        
        return jsonify({
            'msg': 'Sesión limpiada forzosamente. Ya puede iniciar sesión nuevamente.',
            'cleaned': cleaned,
            'user_id': usuario_id
        }), 200
        
    except Exception as e:
        print(f"Error en force-clean-session: {str(e)}")
        return jsonify({'msg': 'Error al limpiar sesión'}), 500
    

@auth_bp.route('/debug-active-sessions', methods=['GET'])
def debug_active_sessions():
    try:
        sessions = TokenManager.debug_all_active_sessions()
        
        return jsonify({
            'total_active_sessions': len(sessions),
            'active_sessions': sessions
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/admin/clean-user-session/<int:user_id>', methods=['POST'])
def admin_clean_user_session(user_id):
    try:
        user = Usuario.query.get(user_id)
        if not user:
            return jsonify({'msg': 'Usuario no encontrado'}), 404
        
        cleaned = TokenManager.terminate_active_session(user_id)
        
        return jsonify({
            'msg': f'Sesión del usuario {user.email} limpiada exitosamente',
            'cleaned': cleaned,
            'user_id': user_id,
            'email': user.email
        }), 200
        
    except Exception as e:
        return jsonify({'msg': f'Error al limpiar sesión: {str(e)}'}), 500

@auth_bp.route('/nuclear-reset-sessions', methods=['POST'])
def nuclear_reset_sessions():
    try:
        count_deleted = TokenManager.nuclear_reset_sessions()
        
        return jsonify({
            'msg': f' RESET NUCLEAR: {count_deleted} sesiones eliminadas',
            'sessions_deleted': count_deleted
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500