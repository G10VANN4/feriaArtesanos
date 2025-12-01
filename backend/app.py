from dotenv import load_dotenv
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models.base import db
from datetime import timedelta

from utils.token_manager import TokenManager

load_dotenv()

from controllers.auth_controller import auth_bp
from controllers.artesano_controller import artesano_bp
from controllers.solicitud_controller import solicitud_bp
from controllers.system_controller import system_bp
from controllers.config_controller import config_bp
from controllers.admin_controller import admin_bp
from controllers.usuarios_controller import usuarios_bp
from controllers.notification_controller import notification_bp
from controllers.mapa_controller import parcela_bp
from controllers.organizador_controller import organizador_bp
from controllers.pago_controller import pago_bp

app = Flask(__name__)
CORS(app, supports_credentials=True)
app.config.from_object(Config)

app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"

jwt = JWTManager(app)
db.init_app(app)

@jwt.token_in_blocklist_loader
def check_if_token_revoked(jwt_header, jwt_payload):
    """
    Callback que verifica si un token JWT está en la lista negra
    Se ejecuta automáticamente en cada request protegido con @jwt_required()
    """
    try:
        jti = jwt_payload.get("jti")
        if not jti:
            return True  
        
        is_revoked = TokenManager.is_token_revoked(jti)
        if is_revoked:
            print(f"Token revocado detectado: JTI {jti}")
        
        return is_revoked
        
    except Exception as e:
        print(f"Error verificando token revocado: {str(e)}")
        return True  
    
@jwt.additional_claims_loader
def add_claims_to_access_token(identity):
    """
    Puedes usar esto para agregar claims adicionales si lo necesitas
    """
    return {
        "user_identity": identity,
        "system": "sistema_ferias"
    }

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return {
        'msg': 'Token ha sido revocado. Por favor inicie sesión nuevamente.',
        'authenticated': False
    }, 401



# Registrar Blueprints
app.register_blueprint(system_bp)
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(artesano_bp)
app.register_blueprint(solicitud_bp)
app.register_blueprint(config_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')
app.register_blueprint(notification_bp)
app.register_blueprint(parcela_bp)
app.register_blueprint(organizador_bp, url_prefix="/api")
app.register_blueprint(pago_bp)

with app.app_context():
    try:
        db.create_all()
        print("Tablas de la base de datos verificadas/creadas")
        
        cleanup_result = TokenManager.cleanup_expired_tokens()
        if cleanup_result:
            print("Tokens expirados limpiados al iniciar")
        else:
            print("No se pudieron limpiar tokens expirados")
            
    except Exception as e:
        print(f"Error al inicializar base de datos: {str(e)}")

if __name__ == '__main__':
    print("   http://localhost:5000/api/test-connection")
    print("   http://localhost:5000/api/init-db")
    print("   http://localhost:5000/api/status")
    
    app.run(debug=True, port=5000)