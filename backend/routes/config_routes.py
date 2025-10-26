# routes/config_routes.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.rubro import Rubro
from models.configuracion_grid import ConfiguracionGrid
from models.base import db

config_bp = Blueprint('config_bp', __name__, url_prefix='/config')

@config_bp.route('/rubros', methods=['GET'])
def obtener_rubros():
    """Público - para que los artesanos vean los rubros disponibles"""
    try:
        rubros = Rubro.query.filter_by(es_activo=True).all()
        return jsonify([r.to_dict() for r in rubros]), 200
    except Exception as e:
        return jsonify({'msg': 'Error al obtener rubros', 'error': str(e)}), 500