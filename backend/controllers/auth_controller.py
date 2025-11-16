
from flask import Blueprint, request, jsonify
from models.base import db
from models.usuario import Usuario
from models.artesano import Artesano
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, get_jwt
from datetime import timedelta
try:
    from session_manager import session_manager
    SESSION_MANAGER_ACTIVE = True
    print(f"✅ Auth BP: SessionManager cargado - Tipo: {type(session_manager)}")
except ImportError as e:
    print(f"❌ Error cargando SessionManager: {e}")
    SESSION_MANAGER_ACTIVE = False

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['OPTIONS'])
@auth_bp.route('/login', methods=['OPTIONS'])
@auth_bp.route('/logout', methods=['OPTIONS'])
@auth_bp.route('/check-auth', methods=['OPTIONS'])
@auth_bp.route('/force-logout', methods=['OPTIONS'])
@auth_bp.route('/cleanup-sessions', methods=['OPTIONS'])
@auth_bp.route('/dev-reset-sessions', methods=['OPTIONS'])
@auth_bp.route('/dev-view-sessions', methods=['OPTIONS'])
@auth_bp.route('/session-status', methods=['OPTIONS'])

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

        user_id = int(user.usuario_id)
        
        # ✅ VERIFICAR SI PUEDE HACER LOGIN PRIMERO
        if SESSION_MANAGER_ACTIVE:
            try:
              
                if not session_manager.can_user_login(user_id):
                    return jsonify({'msg': 'Usuario ya tiene una sesión activa'}), 409
                
                user_data = {
                    'email': user.email,
                    'rol_id': user.rol_id,
                    'estado_id': user.estado_id
                }
                session_manager.login_user(user_id, user_data)
                print(f"✅ SessionManager: Usuario {user_id} registrado")
            except Exception as e:
                print(f"⚠️ SessionManager error (continuando sin él): {e}")
            
        # Crear token JWT
        user_identity = f"user_{user.usuario_id}"
        access_token = create_access_token(identity=user_identity)

        return jsonify({
            'access_token': access_token,
            'rol_id': user.rol_id,
            'usuario_id': user.usuario_id,
            'msg': 'Inicio de sesión exitoso'
        }), 200

    except Exception as e:
        print(f"Error en login: {str(e)}")
        return jsonify({'msg': f'Error interno: {str(e)}'}), 500


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

        # ✅ CORREGIDO: Usar user_id como ENTERO
        user_id = user.usuario_id
        
        cleaned = session_manager.force_clean_user(user_id)
        
        return jsonify({
            'msg': 'Sesión limpiada exitosamente. Ya puede iniciar sesión nuevamente.',
            'cleaned': cleaned,
            'user_id': user_id,
            'active_sessions': session_manager.debug_status()
        }), 200
        
    except Exception as e:
        print(f"Error en clean-session: {str(e)}")
        return jsonify({'msg': 'Error al limpiar sesión'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        current_user = get_jwt_identity()
        # ✅ CORREGIDO: Extraer como entero
        user_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        # ✅ AGREGAR LOGS PARA DEBUG
        print(f"🔍 LOGOUT ENDPOINT - User ID: {user_id}")
        
        # Llamar al session manager
        logout_result = session_manager.logout_user(user_id)
        
        print(f"🔍 LOGOUT RESULT: {logout_result}")
        
        return jsonify({
            'msg': 'Sesión cerrada exitosamente',
            'logout_success': True,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        print(f"❌ Error en logout: {str(e)}")
        return jsonify({'msg': 'Error al cerrar sesión'}), 500


@auth_bp.route('/dev-reset-sessions', methods=['POST'])
def dev_reset_sessions():
    try:
        session_manager.reset_sessions()
        return jsonify({
            'msg': '✅ TODAS las sesiones fueron eliminadas',
            'sessions_cleared': True
        }), 200
        
    except Exception as e:
        print(f" Error en dev-reset-sessions: {str(e)}")
        return jsonify({'msg': 'Error al resetear sesiones'}), 500

@auth_bp.route('/dev-view-sessions', methods=['GET'])
def dev_view_sessions():
    try:
        return jsonify(session_manager.debug_status()), 200
        
    except Exception as e:
        print(f" Error en dev-view-sessions: {str(e)}")
        return jsonify({'msg': 'Error al ver sesiones'}), 500
    
@auth_bp.route('/check-auth', methods=['GET'])
@jwt_required()
def check_auth():
    try:
        current_user = get_jwt_identity()
        # ✅ CORREGIDO: Extraer como entero
        user_id = int(current_user.split('_')[1]) if '_' in current_user else int(current_user)
        
        session_manager.update_activity(user_id)
        
        return jsonify({
            'authenticated': True,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        return jsonify({'authenticated': False, 'msg': str(e)}), 401