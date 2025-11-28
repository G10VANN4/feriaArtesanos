from dotenv import load_dotenv
import os
from flask import Flask
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models.base import db
from datetime import timedelta  # ✅ NUEVO IMPORT

load_dotenv()

# Importar controllers como blueprints
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
CORS(app, supports_credentials=True)  # ✅ MODIFICADO: agregar supports_credentials
app.config.from_object(Config)

# ✅ NUEVA CONFIGURACIÓN JWT COMPLETA
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24)
app.config["JWT_TOKEN_LOCATION"] = ["headers", "cookies"]
app.config["JWT_COOKIE_SECURE"] = False
app.config["JWT_COOKIE_CSRF_PROTECT"] = False
app.config["JWT_COOKIE_SAMESITE"] = "Lax"
app.config["JWT_ACCESS_COOKIE_NAME"] = "access_token"

jwt = JWTManager(app)
db.init_app(app)

# Registrar Blueprints DIRECTAMENTE desde controllers
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

if __name__ == '__main__':
    print("=" * 70)
    print(" SISTEMA DE FERIAS - AUTENTICACIÓN CON COOKIES ACTIVADA")
    print("=" * 70)
    print("🔐 Endpoints de Auth con Cookies:")
    print("http://localhost:5000/auth/login")
    print("http://localhost:5000/auth/logout") 
    print("http://localhost:5000/auth/check-auth")
    print("=" * 70)
    
    # 🔍 DEBUG: Mostrar configuración JWT
    print("⚙️  Configuración JWT:")
    print(f"   - Token Location: {app.config['JWT_TOKEN_LOCATION']}")
    print(f"   - Cookie Name: {app.config['JWT_ACCESS_COOKIE_NAME']}")
    print(f"   - Cookie Secure: {app.config['JWT_COOKIE_SECURE']}")
    print(f"   - Cookie CSRF: {app.config['JWT_COOKIE_CSRF_PROTECT']}")
    print("=" * 70)
    
    app.run(debug=True, port=5000)