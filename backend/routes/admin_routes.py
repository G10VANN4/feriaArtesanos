# routes/admin_routes.py
from flask import Blueprint, request, jsonify  
from flask_jwt_extended import jwt_required, get_jwt_identity
from controllers.admin_controller import AdminController

admin_bp = Blueprint('admin_bp', __name__, url_prefix='/admin')

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
def crear_usuario():
    """Crear usuarios (solo administradores/organizadores)"""
    current_user = get_jwt_identity()
    
    # Verificar permisos
    if current_user['rol_id'] not in [2, 3]:  # 2=Admin, 3=Organizador
        return jsonify({'msg': 'No autorizado'}), 403
    
    data = request.get_json()
    result, status_code = AdminController.crear_usuario(data, current_user)
    return jsonify(result), status_code