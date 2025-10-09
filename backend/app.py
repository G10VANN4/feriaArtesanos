from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from config import Config
from db import db
from routes.parcela_routes import auth_bp


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = "mysql+mysqlconnector://admin:admin@localhost:3306/sistema_ferias"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    # JWT
    app.config['JWT_SECRET_KEY'] = 'clave_super_secreta'
    jwt = JWTManager(app)

    # Registrar blueprint
    app.register_blueprint(auth_bp, url_prefix='/auth')

    return app  # <-- Esto termina la función


# -----------------------------
# Bloque para ejecutar el servidor
# -----------------------------
if __name__ == "__main__":
    app = create_app()
    CORS(app)
    Migrate(app, db)
    app.run(debug=True)  # Levanta el servidor en http://127.0.0.1:5000
