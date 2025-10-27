# controllers/config_controller.py
from flask import Blueprint, jsonify
from models.rubro import Rubro

# Crear blueprint directamente
config_bp = Blueprint('config_bp', __name__, url_prefix='/config')

@config_bp.route('/rubros', methods=['GET'])
def obtener_rubros():
    """Público - para que los artesanos vean los rubros disponibles"""
    try:
        rubros = Rubro.query.filter_by(es_activo=True).all()
        return jsonify([r.to_dict() for r in rubros]), 200
    except Exception as e:
        return jsonify({'msg': 'Error al obtener rubros', 'error': str(e)}), 500