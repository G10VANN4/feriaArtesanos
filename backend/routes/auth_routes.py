from flask import Blueprint, request, jsonify
from controllers.auth_controller import AuthController

auth_bp = Blueprint('auth_bp', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400
            
        result, status_code = AuthController.register_user(data)
        return jsonify(result), status_code
        
    except Exception as e:
        print(f"Error en endpoint register: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'msg': 'Datos JSON requeridos'}), 400
            
        result, status_code = AuthController.login_user(data)
        return jsonify(result), status_code
        
    except Exception as e:
        print(f"Error en endpoint login: {str(e)}")
        return jsonify({'msg': 'Error interno del servidor'}), 500