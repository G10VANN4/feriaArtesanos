# app.py
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from flask_jwt_extended import JWTManager
from config import Config
from models.base import db
from routes.system_routes import system_bp
from routes.auth_routes import auth_bp
from routes.admin_routes import admin_bp

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)
app.config.from_object(Config)

# Inicializar JWT usando la clave de tu .env
app.config["JWT_SECRET_KEY"] = os.getenv("JWT_SECRET_KEY")
jwt = JWTManager(app)

# Inicializar base de datos
db.init_app(app)

# Registrar Blueprints
app.register_blueprint(system_bp)
app.register_blueprint(auth_bp, url_prefix='/auth')
app.register_blueprint(admin_bp) 

if __name__ == '__main__':
    print("=" * 70)
    print("🚀 SISTEMA DE FERIAS - MYSQL (Blueprints Activos)")
    print("=" * 70)
    print("📊 Endpoints disponibles:")
    print("   ➤ http://localhost:5000/api/test-connection")
    print("   ➤ http://localhost:5000/api/init-db")
    print("   ➤ http://localhost:5000/api/status")
    print("   ➤ http://localhost:5000/auth/login")
    print("   ➤ http://localhost:5000/auth/register")
    print("=" * 70)
    app.run(debug=True, port=5000)
