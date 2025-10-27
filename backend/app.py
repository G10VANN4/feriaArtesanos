# app.py - REGISTRAR CONTROLLERS DIRECTAMENTE
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from flask_jwt_extended import JWTManager

from config import Config
from models.base import db

# Importar controllers como blueprints
from controllers.auth_controller import auth_bp
from controllers.artesano_controller import artesano_bp
from controllers.solicitud_controller import solicitud_bp
from controllers.system_controller import system_bp
from controllers.config_controller import config_bp
#from controllers.admin_controller import admin_bp

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Inicializar JWT
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

# Inicializar base de datos
db.init_app(app)

# Registrar Blueprints DIRECTAMENTE desde controllers
app.register_blueprint(system_bp)
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(artesano_bp)
app.register_blueprint(solicitud_bp)
app.register_blueprint(config_bp)
#app.register_blueprint(admin_bp)

if __name__ == '__main__':
    print("=" * 70)
    print(" SISTEMA DE FERIAS - TODOS LOS ENDPOINTS EN CONTROLLERS")
    print("=" * 70)
    print("Endpoints disponibles:")
    print("http://localhost:5000/")
    print("http://localhost:5000/api/init-db")
    print("http://localhost:5000/api/status")
    print("http://localhost:5000/api/test-connection")
    print("http://localhost:5000/auth/login")
    print("http://localhost:5000/auth/register")
    print("http://localhost:5000/artesano/perfil")
    print("http://localhost:5000/solicitudes")
    print("http://localhost:5000/config/rubros")
    print("=" * 70)
    app.run(debug=True, port=5000)